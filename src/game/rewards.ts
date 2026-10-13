// Reward progression in the spirit of Super Real Mahjong: every hand you win
// against a heroine moves her to her next reward stage; reaching the last
// stage "clears" her. Unlocked stages stay in the gallery across sessions.
//
// Adapted to 4-player riichi:
//   ron        -> the heroine who dealt in advances
//   tsumo      -> all heroines advance (they all paid) when tsumoAdvancesAll
//   mangan+    -> one extra stage when bigHandBonus
//   heroine rons you -> she steps back one stage when regressOnLoss
//   finish 1st -> every heroine not yet cleared advances when firstPlaceBonus
// Pure functions only; persistence lives in storage.ts.

import type { RoundResult } from "../engine/protocol";
import type { CharacterDef } from "./characters";

export interface RewardRules {
  tsumoAdvancesAll: boolean;
  bigHandBonus: boolean;
  regressOnLoss: boolean;
  firstPlaceBonus: boolean;
}

export const DEFAULT_RULES: RewardRules = {
  tsumoAdvancesAll: true,
  bigHandBonus: true,
  regressOnLoss: false,
  firstPlaceBonus: true,
};

/** Current stage of each opponent seat (1..3) in this game. */
export type SessionStages = Record<number, number>;

/** Best stage ever reached per character id, plus clear count. */
export type Unlocks = Record<string, { unlocked: number; clears: number }>;

export interface StageChange {
  seat: number;
  charId: string;
  from: number;
  to: number;
  /** True when this change reached the final stage for the first time this game. */
  cleared: boolean;
}

const HUMAN = 0;
const MANGAN = 8000;

/** cast[seat - 1] is the heroine sitting at that seat. */
export type Cast = CharacterDef[];

export function freshSession(cast: Cast): SessionStages {
  const s: SessionStages = {};
  cast.forEach((_, i) => (s[i + 1] = 0));
  return s;
}

function move(stages: SessionStages, cast: Cast, seat: number, delta: number, out: StageChange[]) {
  const def = cast[seat - 1];
  if (!def || delta === 0) return;
  const last = def.stages - 1;
  const from = stages[seat] ?? 0;
  const to = Math.max(0, Math.min(last, from + delta));
  if (to === from) return;
  stages[seat] = to;
  out.push({ seat, charId: def.id, from, to, cleared: to === last && from < last });
}

export function applyRound(
  session: SessionStages,
  result: RoundResult,
  cast: Cast,
  rules: RewardRules = DEFAULT_RULES,
): { session: SessionStages; changes: StageChange[] } {
  const stages = { ...session };
  const changes: StageChange[] = [];
  if (result.type !== "win") return { session: stages, changes };

  const humanWin = result.winners.find((w) => w.seat === HUMAN);
  if (humanWin) {
    const step = 1 + (rules.bigHandBonus && (humanWin.points >= MANGAN || humanWin.yakuman) ? 1 : 0);
    if (result.tsumo) {
      if (rules.tsumoAdvancesAll) for (let seat = 1; seat <= cast.length; seat++) move(stages, cast, seat, step, changes);
    } else if (result.from !== null && result.from !== HUMAN) {
      move(stages, cast, result.from, step, changes);
    }
  } else if (rules.regressOnLoss && !result.tsumo && result.from === HUMAN) {
    for (const w of result.winners) if (w.seat !== HUMAN) move(stages, cast, w.seat, -1, changes);
  }
  return { session: stages, changes };
}

export function applyGameEnd(
  session: SessionStages,
  placement: number[],
  cast: Cast,
  rules: RewardRules = DEFAULT_RULES,
): { session: SessionStages; changes: StageChange[] } {
  const stages = { ...session };
  const changes: StageChange[] = [];
  if (rules.firstPlaceBonus && placement[0] === HUMAN) {
    for (let seat = 1; seat <= cast.length; seat++) move(stages, cast, seat, 1, changes);
  }
  return { session: stages, changes };
}

export function mergeUnlocks(unlocks: Unlocks, changes: StageChange[]): Unlocks {
  const next: Unlocks = { ...unlocks };
  for (const c of changes) {
    const prev = next[c.charId] ?? { unlocked: 0, clears: 0 };
    next[c.charId] = {
      unlocked: Math.max(prev.unlocked, c.to),
      clears: prev.clears + (c.cleared ? 1 : 0),
    };
  }
  return next;
}
