//! The Mortal v4 network in plain Rust (inference only).
//!
//! Brain: Conv1d(1012 -> C, k=3) then N pre-activation residual blocks
//! (BN, Mish, Conv, BN, Mish, Conv, channel attention, + skip), BN, Mish,
//! Conv1d(C -> 32, k=3, bias), Mish, flatten, Linear(32*34 -> 1024), Mish.
//! DQN v4: Linear(1024 -> 1 + 46) as value + advantages, q = v + a - mean(a)
//! over the legal actions. Mirrors mortal/model.py at the pinned commit; the
//! weight names are PyTorch's state-dict names.
//!
//! Activations are kept time-major (`[t][channel]`) with a zero row before and
//! after the 34 tile positions, so a kernel-3 convolution at position t reads
//! one contiguous window of 3 * channels values.

use anyhow::{Context, Result, bail, ensure};
use serde::Deserialize;
use std::collections::HashMap;

pub const L: usize = 34;
pub const OBS_CHANNELS: usize = 1012;
pub const ACTIONS: usize = 46;
const BN_EPS: f32 = 1e-3;

#[derive(Deserialize)]
struct Index {
    tensors: Vec<TensorInfo>,
}

#[derive(Deserialize)]
struct TensorInfo {
    name: String,
    shape: Vec<usize>,
    offset: usize,
}

struct Bn {
    scale: Vec<f32>,
    shift: Vec<f32>,
}

/// Kernel-3 convolution, weights repacked to `[out][k][in]`.
struct Conv {
    cin: usize,
    cout: usize,
    w: Vec<f32>,
    b: Option<Vec<f32>>,
}

struct Linear {
    cin: usize,
    cout: usize,
    w: Vec<f32>, // [out][in]
    b: Option<Vec<f32>>,
}

struct Block {
    bn1: Bn,
    conv1: Conv,
    bn2: Bn,
    conv2: Conv,
    ca1: Linear,
    ca2: Linear,
}

pub struct Net {
    channels: usize,
    stem: Conv,
    blocks: Vec<Block>,
    bn_out: Bn,
    conv_out: Conv,
    fc: Linear,
    dqn: Linear,
}

struct Weights<'a> {
    map: HashMap<String, (Vec<usize>, usize)>,
    data: &'a [u8],
    half: bool,
}

impl Weights<'_> {
    fn get(&self, name: &str, shape: &[usize]) -> Result<Vec<f32>> {
        let (have, offset) = self.map.get(name).with_context(|| format!("missing tensor {name}"))?;
        ensure!(have == shape, "tensor {name}: shape {have:?}, expected {shape:?}");
        let n: usize = shape.iter().product();
        let size = if self.half { 2 } else { 4 };
        let bytes = self
            .data
            .get(offset * size..(offset + n) * size)
            .with_context(|| format!("tensor {name} is outside the weight file"))?;
        Ok(if self.half {
            bytes.chunks_exact(2).map(|b| f16_to_f32(u16::from_le_bytes([b[0], b[1]]))).collect()
        } else {
            bytes.chunks_exact(4).map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]])).collect()
        })
    }

    fn bn(&self, prefix: &str, c: usize) -> Result<Bn> {
        let w = self.get(&format!("{prefix}.weight"), &[c])?;
        let b = self.get(&format!("{prefix}.bias"), &[c])?;
        let mean = self.get(&format!("{prefix}.running_mean"), &[c])?;
        let var = self.get(&format!("{prefix}.running_var"), &[c])?;
        let scale: Vec<f32> = (0..c).map(|i| w[i] / (var[i] + BN_EPS).sqrt()).collect();
        let shift = (0..c).map(|i| b[i] - mean[i] * scale[i]).collect();
        Ok(Bn { scale, shift })
    }

    fn conv(&self, prefix: &str, cin: usize, cout: usize, bias: bool) -> Result<Conv> {
        let raw = self.get(&format!("{prefix}.weight"), &[cout, cin, 3])?;
        let mut w = vec![0.0; raw.len()];
        for o in 0..cout {
            for i in 0..cin {
                for k in 0..3 {
                    w[o * 3 * cin + k * cin + i] = raw[(o * cin + i) * 3 + k];
                }
            }
        }
        let b = if bias { Some(self.get(&format!("{prefix}.bias"), &[cout])?) } else { None };
        Ok(Conv { cin, cout, w, b })
    }

    fn linear(&self, prefix: &str, cin: usize, cout: usize) -> Result<Linear> {
        let w = self.get(&format!("{prefix}.weight"), &[cout, cin])?;
        let b = Some(self.get(&format!("{prefix}.bias"), &[cout])?);
        Ok(Linear { cin, cout, w, b })
    }
}

pub fn f16_to_f32(h: u16) -> f32 {
    let sign = ((h >> 15) as u32) << 31;
    let exp = ((h >> 10) & 0x1f) as u32;
    let frac = (h & 0x3ff) as u32;
    let bits = if exp == 0 {
        if frac == 0 {
            sign
        } else {
            // Subnormal: normalise.
            let mut e = 127 - 15 + 1;
            let mut f = frac;
            while f & 0x400 == 0 {
                f <<= 1;
                e -= 1;
            }
            sign | ((e as u32) << 23) | ((f & 0x3ff) << 13)
        }
    } else if exp == 0x1f {
        sign | 0x7f80_0000 | (frac << 13)
    } else {
        sign | ((exp + 127 - 15) << 23) | (frac << 13)
    };
    f32::from_bits(bits)
}

impl Net {
    /// `index_json`: the export's s42.json; `data`: float32 or float16
    /// little-endian values in the same order.
    pub fn load(index_json: &str, data: &[u8], half: bool) -> Result<Self> {
        let index: Index = serde_json::from_str(index_json).context("bad weight index")?;
        let map = index.tensors.into_iter().map(|t| (t.name, (t.shape, t.offset))).collect();
        let w = Weights { map, data, half };
        let stem_shape = w.map.get("mortal.encoder.net.0.weight").context("missing stem")?.0.clone();
        if stem_shape.len() != 3 || stem_shape[1] != OBS_CHANNELS {
            bail!("not a Mortal v4 network: stem {stem_shape:?}");
        }
        let c = stem_shape[0];
        let mut blocks = vec![];
        let mut i = 1;
        while w.map.contains_key(&format!("mortal.encoder.net.{i}.res_unit.2.weight")) {
            let p = format!("mortal.encoder.net.{i}");
            let hidden = w.map.get(&format!("{p}.ca.shared_mlp.0.weight")).context("missing attention")?.0[0];
            blocks.push(Block {
                bn1: w.bn(&format!("{p}.res_unit.0"), c)?,
                conv1: w.conv(&format!("{p}.res_unit.2"), c, c, false)?,
                bn2: w.bn(&format!("{p}.res_unit.3"), c)?,
                conv2: w.conv(&format!("{p}.res_unit.5"), c, c, false)?,
                ca1: w.linear(&format!("{p}.ca.shared_mlp.0"), c, hidden)?,
                ca2: w.linear(&format!("{p}.ca.shared_mlp.2"), hidden, c)?,
            });
            i += 1;
        }
        ensure!(!blocks.is_empty(), "no residual blocks");
        let n = i;
        Ok(Self {
            channels: c,
            stem: w.conv("mortal.encoder.net.0", OBS_CHANNELS, c, false)?,
            blocks,
            bn_out: w.bn(&format!("mortal.encoder.net.{n}"), c)?,
            conv_out: w.conv(&format!("mortal.encoder.net.{}", n + 2), c, 32, true)?,
            fc: w.linear(&format!("mortal.encoder.net.{}", n + 5), 32 * L, 1024)?,
            dqn: w.linear("current_dqn.net", 1024, 1 + ACTIONS)?,
        })
    }

    /// Q-values for one observation (`obs` channel-major `[1012][34]`, as
    /// libriichi encodes it). Illegal actions get `f32::NEG_INFINITY`.
    pub fn q_values(&self, obs: &[f32], mask: &[bool]) -> [f32; ACTIONS] {
        assert_eq!(obs.len(), OBS_CHANNELS * L);
        let c = self.channels;
        // Input to time-major, padded.
        let mut x_in = vec![0.0f32; (L + 2) * OBS_CHANNELS];
        for ch in 0..OBS_CHANNELS {
            for t in 0..L {
                x_in[(t + 1) * OBS_CHANNELS + ch] = obs[ch * L + t];
            }
        }
        let mut x = vec![0.0f32; (L + 2) * c];
        conv(&self.stem, &x_in, &mut x);
        let mut h = vec![0.0f32; (L + 2) * c];
        let mut h2 = vec![0.0f32; (L + 2) * c];
        for b in &self.blocks {
            h.copy_from_slice(&x);
            bn_mish(&b.bn1, &mut h, c);
            conv(&b.conv1, &h, &mut h2);
            bn_mish(&b.bn2, &mut h2, c);
            conv(&b.conv2, &h2, &mut h);
            attention(b, &mut h, c);
            for (xv, hv) in x.iter_mut().zip(&h) {
                *xv += hv;
            }
        }
        bn_mish(&self.bn_out, &mut x, c);
        let mut y = vec![0.0f32; (L + 2) * 32];
        conv(&self.conv_out, &x, &mut y);
        // Mish, then flatten channel-major like torch's Flatten on [32][34].
        let mut flat = vec![0.0f32; 32 * L];
        for t in 0..L {
            for ch in 0..32 {
                flat[ch * L + t] = mish(y[(t + 1) * 32 + ch]);
            }
        }
        let mut phi = linear(&self.fc, &flat);
        for v in &mut phi {
            *v = mish(*v);
        }
        let out = linear(&self.dqn, &phi);
        let v = out[0];
        let a = &out[1..];
        let legal: Vec<usize> = (0..ACTIONS).filter(|&i| mask[i]).collect();
        let mean = if legal.is_empty() { 0.0 } else { legal.iter().map(|&i| a[i]).sum::<f32>() / legal.len() as f32 };
        let mut q = [f32::NEG_INFINITY; ACTIONS];
        for &i in &legal {
            q[i] = v + a[i] - mean;
        }
        q
    }
}

#[inline]
fn mish(x: f32) -> f32 {
    if x > 20.0 {
        return x;
    }
    let e = x.exp();
    let n = e * (e + 2.0);
    x * n / (n + 2.0)
}

/// BN + Mish on the 34 real rows (the padding rows stay zero).
fn bn_mish(bn: &Bn, x: &mut [f32], c: usize) {
    for t in 0..L {
        let row = &mut x[(t + 1) * c..(t + 2) * c];
        for i in 0..c {
            row[i] = mish(row[i] * bn.scale[i] + bn.shift[i]);
        }
    }
}

#[inline]
fn dot(a: &[f32], b: &[f32]) -> f32 {
    // Eight independent sums so the compiler can use SIMD lanes.
    let mut acc = [0.0f32; 8];
    let ca = a.chunks_exact(8);
    let cb = b.chunks_exact(8);
    let (ra, rb) = (ca.remainder(), cb.remainder());
    for (x, y) in ca.zip(cb) {
        for k in 0..8 {
            acc[k] += x[k] * y[k];
        }
    }
    let mut s = (acc[0] + acc[4]) + (acc[1] + acc[5]) + (acc[2] + acc[6]) + (acc[3] + acc[7]);
    for (x, y) in ra.iter().zip(rb) {
        s += x * y;
    }
    s
}

/// Four dot products sharing the window `x` (one pass over it).
#[inline]
fn dot4(w0: &[f32], w1: &[f32], w2: &[f32], w3: &[f32], x: &[f32]) -> [f32; 4] {
    let n = x.len() / 4 * 4;
    let mut a = [[0.0f32; 4]; 4];
    let mut i = 0;
    while i < n {
        let xv = [x[i], x[i + 1], x[i + 2], x[i + 3]];
        for k in 0..4 {
            a[0][k] += w0[i + k] * xv[k];
            a[1][k] += w1[i + k] * xv[k];
            a[2][k] += w2[i + k] * xv[k];
            a[3][k] += w3[i + k] * xv[k];
        }
        i += 4;
    }
    let mut out = [0.0f32; 4];
    for r in 0..4 {
        out[r] = (a[r][0] + a[r][2]) + (a[r][1] + a[r][3]);
    }
    for j in n..x.len() {
        out[0] += w0[j] * x[j];
        out[1] += w1[j] * x[j];
        out[2] += w2[j] * x[j];
        out[3] += w3[j] * x[j];
    }
    out
}

fn conv(cv: &Conv, x: &[f32], out: &mut [f32]) {
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        if cv.cout % 4 == 0 && (3 * cv.cin) % 4 == 0 {
            // SAFETY: the shapes are checked above; slices are in bounds
            // (window t+1 ends at (t + 4) * cin <= (L + 2) * cin).
            unsafe { simd::conv(cv, x, out) };
            finish_conv(cv, out);
            return;
        }
    }
    let (cin, cout) = (cv.cin, cv.cout);
    let k = 3 * cin;
    for t in 0..L {
        let window = &x[t * cin..t * cin + k];
        let row = &mut out[(t + 1) * cout..(t + 2) * cout];
        let mut o = 0;
        while o + 4 <= cout {
            let r = dot4(
                &cv.w[o * k..(o + 1) * k],
                &cv.w[(o + 1) * k..(o + 2) * k],
                &cv.w[(o + 2) * k..(o + 3) * k],
                &cv.w[(o + 3) * k..(o + 4) * k],
                window,
            );
            row[o..o + 4].copy_from_slice(&r);
            o += 4;
        }
        while o < cout {
            row[o] = dot(&cv.w[o * k..(o + 1) * k], window);
            o += 1;
        }
    }
    finish_conv(cv, out);
}

/// Bias, and zero padding rows.
fn finish_conv(cv: &Conv, out: &mut [f32]) {
    let cout = cv.cout;
    if let Some(b) = &cv.b {
        for t in 0..L {
            for (v, bv) in out[(t + 1) * cout..(t + 2) * cout].iter_mut().zip(b) {
                *v += bv;
            }
        }
    }
    out[..cout].fill(0.0);
    out[(L + 1) * cout..].fill(0.0);
}

#[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
mod simd {
    use super::{Conv, L};
    use core::arch::wasm32::*;

    #[inline(always)]
    unsafe fn hsum(v: v128) -> f32 {
        f32x4_extract_lane::<0>(v) + f32x4_extract_lane::<1>(v) + f32x4_extract_lane::<2>(v) + f32x4_extract_lane::<3>(v)
    }

    /// 4 output channels x 2 positions per pass: 8 vector accumulators, each
    /// weight vector loaded once for both positions.
    pub unsafe fn conv(cv: &Conv, x: &[f32], out: &mut [f32]) {
        let (cin, cout) = (cv.cin, cv.cout);
        let k = 3 * cin;
        let w = cv.w.as_ptr();
        let xp = x.as_ptr();
        let op = out.as_mut_ptr();
        let mut t = 0;
        while t < L {
            let two = t + 1 < L;
            let x0 = unsafe { xp.add(t * cin) };
            let x1 = unsafe { xp.add((t + 1) * cin) };
            let mut o = 0;
            while o < cout {
                let mut a = [f32x4_splat(0.0); 8];
                let w0 = unsafe { w.add(o * k) };
                let mut i = 0;
                while i < k {
                    unsafe {
                        let xa = v128_load(x0.add(i) as *const v128);
                        let xb = if two { v128_load(x1.add(i) as *const v128) } else { xa };
                        for r in 0..4 {
                            let wv = v128_load(w0.add(r * k + i) as *const v128);
                            a[r] = f32x4_add(a[r], f32x4_mul(wv, xa));
                            a[4 + r] = f32x4_add(a[4 + r], f32x4_mul(wv, xb));
                        }
                    }
                    i += 4;
                }
                for r in 0..4 {
                    unsafe {
                        *op.add((t + 1) * cout + o + r) = hsum(a[r]);
                        if two {
                            *op.add((t + 2) * cout + o + r) = hsum(a[4 + r]);
                        }
                    }
                }
                o += 4;
            }
            t += 2;
        }
    }
}

fn linear(l: &Linear, x: &[f32]) -> Vec<f32> {
    (0..l.cout)
        .map(|o| dot(&l.w[o * l.cin..(o + 1) * l.cin], x) + l.b.as_ref().map_or(0.0, |b| b[o]))
        .collect()
}

fn attention(b: &Block, h: &mut [f32], c: usize) {
    let mut avg = vec![0.0f32; c];
    let mut mx = vec![f32::NEG_INFINITY; c];
    for t in 0..L {
        let row = &h[(t + 1) * c..(t + 2) * c];
        for i in 0..c {
            avg[i] += row[i];
            mx[i] = mx[i].max(row[i]);
        }
    }
    for v in &mut avg {
        *v /= L as f32;
    }
    let mlp = |v: &[f32]| {
        let mut hid = linear(&b.ca1, v);
        for x in &mut hid {
            *x = mish(*x);
        }
        linear(&b.ca2, &hid)
    };
    let (a, m) = (mlp(&avg), mlp(&mx));
    let w: Vec<f32> = (0..c).map(|i| 1.0 / (1.0 + (-(a[i] + m[i])).exp())).collect();
    for t in 0..L {
        let row = &mut h[(t + 1) * c..(t + 2) * c];
        for i in 0..c {
            row[i] *= w[i];
        }
    }
}
