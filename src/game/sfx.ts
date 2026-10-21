// Table sound effects. Tile, riichi-stick, dice and shuffle sounds are real
// recordings (public/audio/sfx, T-Studio "Free Sound Mahjong Sound Pack");
// the rest, and the fallback when a file cannot be loaded, is synthesised:
// each synthesised sound is rendered once in an OfflineAudioContext from noise and
// decaying sine "modes" (like a struck tile or a bell), cached as an
// AudioBuffer and played with a tiny random pitch change so repeats do not
// sound mechanical.

export type SfxName = "discard" | "draw" | "riichi" | "call" | "win" | "roundEnd" | "tap" | "dice" | "shuffle" | "sticks";
/** Tile sounds follow the table style: a hard wooden clack or a soft felt mat. */
export type SfxSurface = "wood" | "felt";

const SR = 44100;

/** Deterministic noise, so every device renders the same sounds. */
function noise(length: number, seed: number): Float32Array {
  let s = seed >>> 0;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  return out;
}

type Ctx = OfflineAudioContext;

/** Exponentially decaying envelope (e^-t/tau) starting at `at`. */
function decay(ctx: Ctx, at: number, peak: number, tau: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, 0);
  g.gain.setValueAtTime(peak, at);
  g.gain.setTargetAtTime(0, at, tau);
  return g;
}

/** Filtered noise burst. */
function burst(ctx: Ctx, out: AudioNode, at: number, lo: number, hi: number, tau: number, peak: number, seed: number) {
  const len = Math.ceil(SR * Math.min(1, tau * 12));
  const buf = ctx.createBuffer(1, len, SR);
  buf.getChannelData(0).set(noise(len, seed));
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = Math.sqrt(lo * hi);
  f.Q.value = Math.sqrt(lo * hi) / (hi - lo);
  const g = decay(ctx, at, peak, tau);
  src.connect(f).connect(g).connect(out);
  src.start(at);
}

/** Decaying sine partials (a struck object's resonances). */
function modes(ctx: Ctx, out: AudioNode, at: number, parts: [freq: number, tau: number, amp: number][]) {
  for (const [freq, tau, amp] of parts) {
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = decay(ctx, at, amp, tau);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + tau * 10);
  }
}

/** One tile hitting the table. */
function clack(ctx: Ctx, out: AudioNode, at: number, surface: SfxSurface, scale = 1, gain = 1, seed = 1) {
  if (surface === "wood") {
    burst(ctx, out, at, 2200, 7000, 0.004, 1.2 * gain, seed);
    modes(ctx, out, at, [
      [2150 * scale, 0.035, 0.35 * gain],
      [3420 * scale, 0.022, 0.25 * gain],
      [5230 * scale, 0.012, 0.14 * gain],
      [1180 * scale, 0.05, 0.18 * gain],
      [190, 0.018, 0.6 * gain],
    ]);
  } else {
    burst(ctx, out, at, 900, 3500, 0.005, 1.2 * gain, seed);
    modes(ctx, out, at, [
      [980 * scale, 0.025, 0.35 * gain],
      [1650 * scale, 0.016, 0.21 * gain],
      [2600 * scale, 0.01, 0.1 * gain],
      [140, 0.025, 0.9 * gain],
    ]);
  }
}

/** A tile set down on the table: a dry, very short tick with almost no ring. */
function tick(ctx: Ctx, out: AudioNode, at: number, surface: SfxSurface) {
  if (surface === "wood") {
    burst(ctx, out, at, 2500, 6000, 0.0015, 0.7, 6);
    modes(ctx, out, at, [
      [1900, 0.012, 0.3],
      [3000, 0.007, 0.15],
      [260, 0.01, 0.4],
    ]);
  } else {
    burst(ctx, out, at, 900, 2800, 0.002, 0.6, 6);
    modes(ctx, out, at, [
      [900, 0.01, 0.25],
      [1500, 0.006, 0.1],
      [150, 0.014, 0.6],
    ]);
  }
}

function bell(ctx: Ctx, out: AudioNode, at: number, freq: number, length: number, gain: number) {
  modes(
    ctx,
    out,
    at,
    ([
      [1, 1, 0.5],
      [2.01, 0.45, 0.3],
      [3.0, 0.25, 0.2],
      [4.2, 0.12, 0.12],
    ] as const).map(([r, a, k]) => [freq * r, length * k, a * gain] as [number, number, number]),
  );
}

interface Recipe {
  length: number;
  peak: number;
  draw: (ctx: Ctx, out: AudioNode) => void;
}

function recipe(name: SfxName, surface: SfxSurface): Recipe {
  switch (name) {
    case "discard":
      return { length: 0.1, peak: 0.8, draw: (c, o) => tick(c, o, 0, surface) };
    case "draw":
      return {
        length: 0.3,
        peak: 0.35,
        draw: (c, o) => {
          // A short slide, then a soft touch.
          const len = Math.ceil(SR * 0.16);
          const buf = c.createBuffer(1, len, SR);
          const n = noise(len, 7);
          for (let i = 0; i < len; i++) n[i] *= Math.sin((Math.PI * i) / len) ** 2;
          buf.getChannelData(0).set(n);
          const src = c.createBufferSource();
          src.buffer = buf;
          const f = c.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 3000;
          f.Q.value = 0.7;
          const g = c.createGain();
          g.gain.value = 0.6;
          src.connect(f).connect(g).connect(o);
          src.start(0);
          clack(c, o, 0.16, "felt", 1.15, 0.5, 11);
        },
      };
    case "riichi": {
      const stick = (c: Ctx, o: AudioNode, at: number, gain: number, seed: number) => {
        modes(c, o, at, [
          [1240, 0.03, gain],
          [2950, 0.018, 0.5 * gain],
          [4700, 0.01, 0.25 * gain],
        ]);
        burst(c, o, at, 3000, 8000, 0.003, gain, seed);
      };
      return {
        length: 0.3,
        peak: 0.8,
        draw: (c, o) => {
          stick(c, o, 0, 0.9, 3);
          stick(c, o, 0.07, 0.5, 4);
        },
      };
    }
    case "call":
      return {
        length: 0.3,
        peak: 0.8,
        draw: (c, o) => {
          clack(c, o, 0, surface, 0.95, 0.8, 5);
          clack(c, o, 0.045, surface, 1.02, 0.7, 6);
          clack(c, o, 0.085, surface, 0.98, 0.9, 7);
        },
      };
    case "win":
      return {
        length: 1.6,
        peak: 0.7,
        draw: (c, o) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(c, o, i * 0.09, f, 1.2, 0.8)),
      };
    case "roundEnd":
      return {
        length: 1.9,
        peak: 0.55,
        draw: (c, o) => {
          bell(c, o, 0, 392, 1.4, 0.7);
          bell(c, o, 0.18, 293.66, 1.6, 0.7);
        },
      };
    case "dice":
    case "shuffle":
    case "sticks":
      return { length: 0.2, peak: 0.5, draw: (c, o) => clack(c, o, 0, surface, 1, 0.6, 9) };
    case "tap":
      return {
        length: 0.06,
        peak: 0.35,
        draw: (c, o) =>
          modes(c, o, 0, [
            [1800, 0.008, 1],
            [3100, 0.005, 0.4],
          ]),
      };
  }
}

async function render(name: SfxName, surface: SfxSurface): Promise<AudioBuffer | null> {
  const Offline =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) return null;
  const r = recipe(name, surface);
  const ctx = new Offline(1, Math.ceil(SR * r.length), SR);
  const master = ctx.createGain();
  master.connect(ctx.destination);
  r.draw(ctx, master);
  const buf = await ctx.startRendering();
  // Normalise to the recipe's peak, so the mix stays even between sounds.
  const data = buf.getChannelData(0);
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  if (max > 0) for (let i = 0; i < data.length; i++) data[i] *= r.peak / max;
  return buf;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
/** Recorded variants per sound (one is picked at random each time); felt gets a muffled copy of the tiles. */
function recordings(name: SfxName, surface: SfxSurface): string[] {
  const felt = surface === "felt" ? "-felt" : "";
  switch (name) {
    case "discard":
    case "call":
      return range(4).map((i) => `tile${i}${felt}`);
    case "riichi":
      return range(3).map((i) => `stick${i}`);
    case "dice":
      return range(3).map((i) => `dice${i}`);
    case "sticks":
      return range(4).map((i) => `collect${i}`);
    case "shuffle":
      return ["shuffle"];
    default:
      return [];
  }
}

const sfxUrl = (file: string) => `${new URL("./", window.location.href).href}audio/sfx/${file}.mp3`;

class SfxPlayer {
  volume = 0.7;
  surface: SfxSurface = "wood";
  private ctx: AudioContext | null = null;
  private cache = new Map<string, Promise<AudioBuffer | null>>();
  /** Last time each sound started, to thin out bursts (e.g. several discards in one step). */
  private last = new Map<SfxName, number>();
  /** e2e: every sound that was asked to play. */
  log: SfxName[] = [];

  attach(ctx: AudioContext | null) {
    this.ctx = ctx;
  }

  private files = new Map<string, Promise<AudioBuffer | null>>();

  private file(file: string): Promise<AudioBuffer | null> {
    let entry = this.files.get(file);
    if (!entry) {
      const ctx = this.ctx;
      entry = ctx
        ? fetch(sfxUrl(file))
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
            .then((b) => ctx.decodeAudioData(b))
            .catch(() => null)
        : Promise.resolve(null);
      if (ctx) this.files.set(file, entry);
    }
    return entry;
  }

  /** A recording of this sound if there is one (random variant), else the synthesised one. */
  private async pick(name: SfxName): Promise<AudioBuffer | null> {
    const files = recordings(name, this.surface);
    if (files.length) {
      const rec = await this.file(files[Math.floor(Math.random() * files.length)]);
      if (rec) return rec;
    }
    return this.buffer(name, this.surface);
  }

  private buffer(name: SfxName, surface: SfxSurface) {
    const key = `${name}:${surface}`;
    let entry = this.cache.get(key);
    if (!entry) {
      entry = render(name, surface).catch(() => null);
      this.cache.set(key, entry);
    }
    return entry;
  }

  /** Render every sound ahead of the first use (called at the start of a match). */
  preload() {
    const names: SfxName[] = ["discard", "draw", "riichi", "call", "win", "roundEnd", "tap", "dice", "shuffle", "sticks"];
    for (const n of names) {
      void this.buffer(n, this.surface);
      for (const f of recordings(n, this.surface)) void this.file(f);
    }
  }

  async play(name: SfxName, delayMs = 0) {
    this.log.push(name);
    if (this.log.length > 200) this.log.splice(0, 100);
    if (!this.ctx || this.volume <= 0) return;
    const now = performance.now();
    if (now - (this.last.get(name) ?? -1e9) < 40) return;
    this.last.set(name, now);
    // A meld is two tiles slapped down one after the other.
    const hits = name === "call" ? [0, 0.07] : [0];
    for (const [i, at] of hits.entries()) {
      const buf = await this.pick(name);
      if (!buf || !this.ctx) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      // ±4 % pitch on the short table sounds: repeats never sound identical.
      const steady = name === "win" || name === "roundEnd" || name === "shuffle";
      src.playbackRate.value = steady ? 1 : 0.96 + Math.random() * 0.08;
      const gain = this.ctx.createGain();
      gain.gain.value = this.volume * (i ? 0.75 : 1);
      src.connect(gain).connect(this.ctx.destination);
      src.start(this.ctx.currentTime + delayMs / 1000 + at);
    }
  }
}

export const sfx = new SfxPlayer();

declare global {
  interface Window {
    /** e2e: names of the sounds played so far. */
    __rnSfx?: SfxName[];
    /** e2e: render one sound and return its samples (checks the synthesis). */
    __rnRenderSfx?: (name: SfxName, surface: SfxSurface) => Promise<number[]>;
  }
}
if (typeof window !== "undefined") {
  window.__rnSfx = sfx.log;
  window.__rnRenderSfx = async (name, surface) => Array.from((await render(name, surface))?.getChannelData(0) ?? []);
}
