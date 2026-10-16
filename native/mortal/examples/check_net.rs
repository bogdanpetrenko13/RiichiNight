//! Compares the Rust network with PyTorch's Q-values (reference from the
//! "Mortal kit" workflow).
//!     cargo run --release --example check_net -- <s42.json> <s42.bin> <ref dir> [f16]
use riichinight_mortal::net::{ACTIONS, L, Net, OBS_CHANNELS};
use std::time::Instant;

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let index = std::fs::read_to_string(&a[1]).unwrap();
    let data = std::fs::read(&a[2]).unwrap();
    let half = a.get(4).is_some_and(|s| s == "f16");
    let net = Net::load(&index, &data, half).unwrap();
    let obs: Vec<f32> = std::fs::read(format!("{}/obs.f32", a[3])).unwrap()
        .chunks_exact(4).map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]])).collect();
    let mask: Vec<bool> = std::fs::read(format!("{}/mask.u8", a[3])).unwrap().iter().map(|&b| b != 0).collect();
    let q: Vec<f32> = std::fs::read(format!("{}/q.f32", a[3])).unwrap()
        .chunks_exact(4).map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]])).collect();
    let n = mask.len() / ACTIONS;
    let (mut worst, mut argmax_same) = (0.0f32, 0);
    let start = Instant::now();
    for i in 0..n {
        let o = &obs[i * OBS_CHANNELS * L..(i + 1) * OBS_CHANNELS * L];
        let m = &mask[i * ACTIONS..(i + 1) * ACTIONS];
        let mine = net.q_values(o, m);
        let theirs = &q[i * ACTIONS..(i + 1) * ACTIONS];
        let am = |v: &[f32]| (0..ACTIONS).filter(|&j| m[j]).max_by(|&x, &y| v[x].total_cmp(&v[y])).unwrap();
        if am(&mine) == am(theirs) { argmax_same += 1; }
        for j in 0..ACTIONS {
            if m[j] { worst = worst.max((mine[j] - theirs[j]).abs()); }
        }
    }
    let ms = start.elapsed().as_secs_f64() * 1000.0 / n as f64;
    println!("{n} decisions: max |dq| {worst:.2e}, same best action {argmax_same}/{n}, {ms:.1} ms each");
}
