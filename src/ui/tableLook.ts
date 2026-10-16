import type { Settings } from "../game/storage";

/**
 * Attributes that pick the table look in src/styles/tokens.css; set next to
 * data-style on the table (and on the settings preview).
 */
export function lookAttrs(s: Pick<Settings, "tableStyle" | "feltColor" | "turnRing" | "turnRingStyle">) {
  return {
    "data-felt": s.tableStyle === "felt" ? s.feltColor : undefined,
    "data-ring": s.turnRing === "auto" ? undefined : s.turnRing,
    "data-glow": s.turnRingStyle === "glow" || undefined,
  };
}
