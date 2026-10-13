// Lifetime statistics and achievements. Pure functions over engine events;
// the controller feeds them and storage.ts persists the results.
import type { EngineEvent, RoundResult } from "../engine/protocol";

export interface Stats {
  matches: number;
  /** Finishes by place: [1st, 2nd, 3rd, 4th]. */
  placements: [number, number, number, number];
  hands: number;
  handsWon: number;
  tsumoWins: number;
  ronWins: number;
  dealIns: number;
  riichi: number;
  bestHand: number;
  yakuman: number;
  scoreSum: number;
  scoreHigh: number | null;
  scoreLow: number | null;
  /** Matches finished without dealing in once. */
  cleanMatches: number;
  yaku: Record<string, number>;
}

export function emptyStats(): Stats {
  return {
    matches: 0,
    placements: [0, 0, 0, 0],
    hands: 0,
    handsWon: 0,
    tsumoWins: 0,
    ronWins: 0,
    dealIns: 0,
    riichi: 0,
    bestHand: 0,
    yakuman: 0,
    scoreSum: 0,
    scoreHigh: null,
    scoreLow: null,
    cleanMatches: 0,
    yaku: {},
  };
}

const HUMAN = 0;

/**
 * Applies one step's events. `result` is the round result shown with that
 * step (used for points and yaku), `matchDealIns` the human's deal-ins so far
 * in the current match.
 */
export function applyEvents(
  prev: Stats,
  events: EngineEvent[],
  result: RoundResult | null,
  matchDealIns: number,
): { stats: Stats; matchDealIns: number } {
  const s: Stats = { ...prev, placements: [...prev.placements], yaku: { ...prev.yaku } };
  let dealIns = matchDealIns;
  for (const ev of events) {
    switch (ev.t) {
      case "call":
        if (ev.seat === HUMAN && ev.kind === "riichi") s.riichi++;
        break;
      case "draw_game":
        s.hands++;
        break;
      case "win": {
        s.hands++;
        if (ev.winners.includes(HUMAN)) {
          s.handsWon++;
          if (ev.tsumo) s.tsumoWins++;
          else s.ronWins++;
          const mine = result?.type === "win" ? result.winners.find((w) => w.seat === HUMAN) : undefined;
          if (mine) {
            s.bestHand = Math.max(s.bestHand, mine.points);
            if (mine.yakuman) s.yakuman++;
            for (const y of mine.yaku) s.yaku[y.key] = (s.yaku[y.key] ?? 0) + 1;
          }
        } else if (!ev.tsumo && ev.from === HUMAN) {
          s.dealIns++;
          dealIns++;
        }
        break;
      }
      case "game_end": {
        s.matches++;
        const place = ev.placement.indexOf(HUMAN);
        if (place >= 0 && place < 4) s.placements[place]++;
        const score = ev.scores[HUMAN];
        s.scoreSum += score;
        s.scoreHigh = s.scoreHigh === null ? score : Math.max(s.scoreHigh, score);
        s.scoreLow = s.scoreLow === null ? score : Math.min(s.scoreLow, score);
        if (dealIns === 0) s.cleanMatches++;
        dealIns = 0;
        break;
      }
      default:
        break;
    }
  }
  return { stats: s, matchDealIns: dealIns };
}

// ---- achievements -----------------------------------------------------------

export interface AchievementDef {
  id: string;
  icon: string;
  check: (s: Stats, extra: { clears: number }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_win", icon: "🀄", check: (s) => s.handsWon >= 1 },
  { id: "first_match", icon: "🏆", check: (s) => s.placements[0] >= 1 },
  { id: "ten_matches", icon: "👑", check: (s) => s.placements[0] >= 10 },
  { id: "riichi_50", icon: "🔥", check: (s) => s.riichi >= 50 },
  { id: "mangan", icon: "💥", check: (s) => s.bestHand >= 8000 },
  { id: "haneman", icon: "⚡", check: (s) => s.bestHand >= 12000 },
  { id: "yakuman", icon: "🌸", check: (s) => s.yakuman >= 1 },
  { id: "clean_match", icon: "🛡️", check: (s) => s.cleanMatches >= 1 },
  { id: "hands_100", icon: "📜", check: (s) => s.hands >= 100 },
  { id: "clear_heroine", icon: "💖", check: (_s, x) => x.clears >= 1 },
];

/** Ids that are earned now but not yet in the log. */
export function newlyEarned(stats: Stats, clears: number, log: Record<string, number>): string[] {
  return ACHIEVEMENTS.filter((a) => !log[a.id] && a.check(stats, { clears })).map((a) => a.id);
}
