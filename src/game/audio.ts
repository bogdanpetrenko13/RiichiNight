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
