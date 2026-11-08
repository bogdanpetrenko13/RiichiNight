// Vibration (Settings -> Vibration): a short buzz when you discard, a firmer
// one on a call (yours or a rival's), a double buzz on your win.
//
// On Android the game's own plugin (resources/android/java/VibrationPlugin)
// buzzes the motor. Phones differ in which vibrations they let through
// (on a Poco with HyperOS neither @capacitor/haptics' impact nor its
// one-shot could be felt), so the buzz can be tagged several ways
// (VIBRATION_WAYS, Settings -> "Vibration check"). In a browser, or without
// the plugin, navigator.vibrate.
import { Capacitor, registerPlugin } from "@capacitor/core";

// Media first: the default. On the owner's Poco (HyperOS) media, notification,
// alarm and the view's feedback were felt, touch / plain / legacy were not;
// media follows the phone's media vibration and, unlike alarm, not through
// Do Not Disturb.
export const VIBRATION_WAYS = ["media", "notification", "alarm", "view", "touch", "plain", "legacy"] as const;
export type VibrationWay = (typeof VIBRATION_WAYS)[number];

export interface VibrationInfo {
  sdk: number;
  device: string;
  hasVibrator: boolean;
  amplitudeControl: boolean;
  /** AudioManager ringer mode: 0 silent, 1 vibrate, 2 normal. */
  ringerMode: number;
  /** Settings.System.HAPTIC_FEEDBACK_ENABLED: 1 on, 0 off, -1 unknown. */
  touchFeedback: number;
}

interface VibrationPlugin {
  vibrate(o: { duration: number; way: VibrationWay }): Promise<void>;
  info(): Promise<VibrationInfo>;
}

const native = registerPlugin<VibrationPlugin>("RNVibration");
const onDevice = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("RNVibration");

/**
 * Whether this phone can vibrate for the game at all: the APK always can; a
 * browser only with navigator.vibrate (Safari on iPhone has none, so the
 * web version there hides the vibration settings).
 */
export function vibrationSupported(): boolean {
  return onDevice() || typeof navigator.vibrate === "function";
}

let enabled = true;
let way: VibrationWay = "media";

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function setVibrationWay(w: VibrationWay) {
  way = VIBRATION_WAYS.includes(w) ? w : "media";
}

/** Tests read what fired from window.__rnHaptics when they create it. */
type HapticKind = "discard" | "call" | "win" | "test";

/** Buzz lengths in ms; a pattern is buzz, pause, buzz, ... */
const PATTERN: Record<HapticKind, number[]> = {
  discard: [30],
  call: [55],
  win: [70, 90, 110],
  test: [150],
};

/** One buzz; resolves with an error message if the phone refused it. */
export async function buzz(ms: number, w: VibrationWay = way): Promise<string | null> {
  try {
    if (onDevice()) await native.vibrate({ duration: ms, way: w });
    else if (!navigator.vibrate?.(ms)) return "navigator.vibrate";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function vibrationInfo(): Promise<VibrationInfo | null> {
  if (!onDevice()) return null;
  try {
    return await native.info();
  } catch {
    return null;
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
