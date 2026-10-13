// Voice lines through Web Audio: decoded buffers play without the delay an
// <audio> element has, which matters for "Ron!". Missing files are fine:
// the on-screen callout still shows and the game stays silent.
import { assetPaths } from "./characters";
import type { CallKind } from "../engine/protocol";

class VoicePlayer {
  private ctx: AudioContext | null = null;
  private cache = new Map<string, Promise<AudioBuffer | null>>();
  volume = 0.9;

  /** Must be called from a user gesture once (Android/Chrome autoplay rules). */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private load(url: string): Promise<AudioBuffer | null> {
    let entry = this.cache.get(url);
    if (!entry) {
      entry = (async () => {
        if (!this.ctx) return null;
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          return await this.ctx.decodeAudioData(await res.arrayBuffer());
        } catch {
          return null;
        }
      })();
      this.cache.set(url, entry);
    }
    return entry;
  }

  /** Preload a heroine's lines so the first callout is instant. */
  preload(voiceId: string) {
    if (!this.ctx) return;
    for (const kind of ["riichi", "pon", "chi", "kan", "ron", "tsumo"] as const) {
      void this.load(assetPaths.voice(voiceId, kind));
    }
  }

  async play(voiceId: string, kind: CallKind) {
    if (!this.ctx || this.volume <= 0) return;
    const buffer = await this.load(assetPaths.voice(voiceId, kind));
    if (!buffer) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = this.volume;
    source.buffer = buffer;
    source.connect(gain).connect(this.ctx.destination);
    source.start();
  }
}

export const voice = new VoicePlayer();

/**
 * Background music by file convention: public/audio/music/<track>.mp3
 * (e.g. "title", "table"). Missing files simply stay silent.
 */
class MusicPlayer {
  private el: HTMLAudioElement | null = null;
  private track: string | null = null;
  private volume = 0.4;
  private missing = new Set<string>();

  setVolume(v: number) {
    this.volume = v;
    if (this.el) this.el.volume = v;
    if (v <= 0) this.el?.pause();
    else if (this.el?.paused && this.track) void this.el.play().catch(() => undefined);
  }

  play(track: string) {
    if (track === this.track || this.missing.has(track)) return;
    this.track = track;
    this.el?.pause();
    const el = new Audio(`${new URL("./", window.location.href).href}audio/music/${track}.mp3`);
    el.loop = true;
    el.volume = this.volume;
    el.onerror = () => {
      this.missing.add(track);
      if (this.el === el) this.el = null;
    };
    this.el = el;
    if (this.volume > 0) void el.play().catch(() => undefined); // autoplay may wait for a tap
  }

  /** Retry playback after a user gesture (autoplay policies). */
  resume() {
    if (this.el && this.el.paused && this.volume > 0) void this.el.play().catch(() => undefined);
  }
}

export const music = new MusicPlayer();
