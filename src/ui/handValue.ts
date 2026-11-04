import type { WinnerInfo } from "../engine/protocol";

/** The hand's own value: what the payers pay without honba and riichi
 *  sticks (old saves have no handPoints: derived from the total). */
export function handValue(w: WinnerInfo): number {
  if (w.handPoints !== undefined) return w.handPoints;
  return w.points - (w.calc?.honba ?? 0) - (w.calc?.sticks ?? 0);
}

export type HandRank = "mangan" | "haneman" | "baiman" | "sanbaiman" | "kazoe" | "yakuman" | "double_yakuman" | "triple_yakuman" | "multi_yakuman";

/**
 * The hand's limit name, if it reached one: mangan (5 han, or a base of
 * 2 000 at 3-4 han, or 4/30 and 3/60 with kiriage mangan), haneman (6-7),
 * baiman (8-10), sanbaiman (11-12), counted yakuman (13+), yakuman (and
 * double yakuman and more).
 */
export function handRank(w: WinnerInfo, kiriage = false): HandRank | null {
  if (w.yakuman) {
    const n = yakumanCount(w);
    return n >= 4 ? "multi_yakuman" : n === 3 ? "triple_yakuman" : n === 2 ? "double_yakuman" : "yakuman";
  }
  const h = w.han;
  if (h >= 13) return "kazoe";
  if (h >= 11) return "sanbaiman";
  if (h >= 8) return "baiman";
  if (h >= 6) return "haneman";
  if (h >= 5) return "mangan";
  if (w.fu * 2 ** (h + 2) >= 2000) return "mangan";
  if (kiriage && ((h === 4 && w.fu === 30) || (h === 3 && w.fu === 60))) return "mangan";
  return null;
}

/** How many yakuman the hand is worth (1 for a plain one or old saves). */
export function yakumanCount(w: WinnerInfo): number {
  return Math.max(1, w.calc?.yakumanCount ?? 1);
}
