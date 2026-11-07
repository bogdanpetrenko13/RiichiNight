// Vibration (Settings -> Vibration): a short buzz when you discard, a firmer
// one on a call (yours or a rival's), a double buzz on your win.
//
// @capacitor/haptics drives the phone's motor on Android. Its impact() and
// notification() play amplitude-shaped waveforms (a light impact is ~20 ms
// at a fifth of full strength), which some phones (Xiaomi / Poco on
// HyperOS among them) scale down to nothing. vibrate({ duration }) is a
// one-shot at the phone's own default strength, so every buzz here is one
// of those, a little longer for the firmer kinds. If the plugin fails, the
// WebView's navigator.vibrate is tried.
import { Haptics } from "@capacitor/haptics";

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

/** Tests read what fired from window.__rnHaptics when they create it. */
type HapticKind = "discard" | "call" | "win" | "test";

/** Buzz lengths in ms; a pattern is buzz, pause, buzz, ... */
const PATTERN: Record<HapticKind, number[]> = {
  discard: [28],
  call: [55],
  win: [70, 90, 110],
  test: [120],
};

async function buzz(ms: number): Promise<void> {
  try {
    await Haptics.vibrate({ duration: ms });
  } catch {
    // No plugin (a browser) or it refused: the WebView's own vibration.
    navigator.vibrate?.(ms);
  }
}

function play(pattern: number[]) {
  let at = 0;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) {
      if (at === 0) void buzz(ms);
      else window.setTimeout(() => void buzz(ms), at);
    }
    at += ms;
  });
}

function fire(kind: HapticKind, force = false) {
  if (!enabled && !force) return;
  const log = (window as unknown as { __rnHaptics?: HapticKind[] }).__rnHaptics;
  if (Array.isArray(log)) log.push(kind);
  play(PATTERN[kind]);
}

export const haptics = {
  discard: () => fire("discard"),
  call: () => fire("call"),
  win: () => fire("win"),
  /** One clear buzz when vibration is switched on, to feel that it works. */
  test: () => fire("test", true),
};
