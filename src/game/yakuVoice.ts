import type { YakuEntry } from "../engine/protocol";

/** The player's voice pack (public/voice/player/). */
export const PLAYER_VOICE = "player";

/** Yaku the player's voice can name (public/voice/player/yaku_<clip>.mp3); value tiles map to "yakuhai". */
const YAKU_VOICE: Record<string, string> = {
  tanyao: "tanyao",
  pinfu: "pinfu",
  chiitoitsu: "chiitoitsu",
  ittsu: "ittsu",
  double_riichi: "double_riichi",
};

/**
 * Clips said on your win: for each yaku row (by index) the clip naming it,
 * at most three and each clip once (several value tiles say "yakuhai" once).
 */
export function yakuClips(yaku: YakuEntry[]): { index: number; clip: string }[] {
  const out: { index: number; clip: string }[] = [];
  const said = new Set<string>();
  yaku.forEach((y, index) => {
    const clip = YAKU_VOICE[y.key] ?? (/^(haku|hatsu|chun|round_wind_|seat_wind_)/.test(y.key) ? "yakuhai" : null);
    if (clip && !said.has(clip) && said.size < 3) {
      said.add(clip);
      out.push({ index, clip });
    }
  });
  return out;
}
