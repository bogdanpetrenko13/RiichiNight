// Vibration (Settings -> Vibration): a light tap when you discard, a firmer
// one on a call (yours or a rival's), a "success" pattern on your win.
// @capacitor/haptics: the phone's vibration motor on Android, the
// Vibration API in a browser.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

/** Tests read what fired from window.__rnHaptics when they create it. */
type HapticKind = "discard" | "call" | "win";

function fire(kind: HapticKind, run: () => Promise<void>) {
  if (!enabled) return;
  const log = (window as unknown as { __rnHaptics?: HapticKind[] }).__rnHaptics;
  if (Array.isArray(log)) log.push(kind);
  try {
    void run().catch(() => undefined);
  } catch {
    /* no vibration on this device */
  }
}

export const haptics = {
  discard: () => fire("discard", () => Haptics.impact({ style: ImpactStyle.Light })),
  call: () => fire("call", () => Haptics.impact({ style: ImpactStyle.Medium })),
  win: () => fire("win", () => Haptics.notification({ type: NotificationType.Success })),
};
