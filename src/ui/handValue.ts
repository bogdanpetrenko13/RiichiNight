import type { WinnerInfo } from "../engine/protocol";

/** The hand's own value: what the payers pay without honba and riichi
 *  sticks (old saves have no handPoints: derived from the total). */
export function handValue(w: WinnerInfo): number {
  if (w.handPoints !== undefined) return w.handPoints;
  return w.points - (w.calc?.honba ?? 0) - (w.calc?.sticks ?? 0);
}
