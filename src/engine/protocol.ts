// Types shared by the UI and the engine worker. They mirror the JSON produced
// by public/py/bridge.py — keep both sides in sync.

/** Tile code: "1m".."9m", "1p".., "1s".., "1z".."7z"; red fives are "r5m" etc. */
export type TileCode = string;

export type Wind = "east" | "south" | "west" | "north";
export type Level = "easy" | "normal" | "hard";

export type ActionName =
  | "discard"
  | "riichi"
  | "tsumo"
  | "ron"
  | "pon"
  | "chi"
  | "kan"
  | "ankan"
  | "pass"
  | "kyuushu";

export type CallKind = "riichi" | "tsumo" | "ron" | "pon" | "chi" | "kan";

/** Rule options (mirrors public/py/rules.py). Apply to new games only. */
export interface GameRules {
  gameLength: "east" | "hanchan";
  tobi: boolean;
  agariYame: boolean;
  kiriageMangan: boolean;
  openTanyao: boolean;
  redFives: boolean;
}

export const DEFAULT_GAME_RULES: GameRules = {
  gameLength: "hanchan",
  tobi: true,
  agariYame: true,
  kiriageMangan: false,
  openTanyao: true,
  redFives: true,
};

export interface Meld {
  type: "chi_meld" | "pon_meld" | "open_kan" | "closed_kan";
  tiles: TileCode[];
  called: TileCode | null;
  from: number | null;
}

export interface PlayerView {
  seat: number;
  wind: Wind;
  score: number;
  riichi: boolean;
  riichiIndex: number | null;
  discards: TileCode[];
  melds: Meld[];
  handCount: number;
  /** Only for the human seat, or a winner when the round is over. */
  hand?: TileCode[];
  drawn?: TileCode | null;
  /** Human seat only: tenpai but furiten (cannot ron). */
  furiten?: boolean;
  /** Human seat only: tiles that complete the hand right now (13-tile hand). */
  waits?: TileCode[];
}

export interface WaitHint {
  waits: { tile: TileCode; remaining: number }[];
  furiten: boolean;
}

export interface Prompt {
  actions: ActionName[];
  discardable?: TileCode[];
  hints?: Record<TileCode, WaitHint>;
  riichiTiles?: TileCode[];
  chiOptions?: TileCode[][];
  claim?: { tile: TileCode; from: number };
}

export interface YakuEntry {
  key: string;
  ja: string;
  en: string;
  han: number;
}

export interface WinnerInfo {
  seat: number;
  han: number;
  fu: number;
  points: number;
  yakuman: boolean;
  yaku: YakuEntry[];
  hand: TileCode[];
  /** Winning tile (drawn on tsumo, the discard on ron), shown apart. */
  winTile?: TileCode | null;
  melds: Meld[];
}

export interface WinResult {
  type: "win";
  tsumo: boolean;
  from: number | null;
  winners: WinnerInfo[];
  winnerSeats: number[];
  deltas: number[];
  scores: number[];
  dora: TileCode[];
}

export interface DrawResult {
  type: "draw";
  kind: string;
  tenpai: number[];
  nagashi: number[];
  chombo: number | null;
  winnerSeats: number[];
  deltas: number[];
  scores: number[];
}

export type RoundResult = WinResult | DrawResult;

export type GameStatus = "human" | "ai" | "round_over" | "game_over";

export interface GameView {
  status: GameStatus;
  seed: number;
  levels: Level[];
  rules: GameRules;
  round: {
    wind: Wind;
    number: number;
    honba: number;
    riichiSticks: number;
    dealer: number;
    index: number;
  };
  wall: number | null;
  dora: TileCode[];
  current: number;
  players: PlayerView[];
  prompt: Prompt | null;
  result: RoundResult | null;
  gameOver: boolean;
}

export type EngineEvent =
  | { t: "round_start"; wind: Wind; number: number; honba: number; dealer: number }
  | { t: "call"; seat: number; kind: CallKind }
  | { t: "discard"; seat: number; tile: TileCode; riichi: boolean; tsumogiri?: boolean }
  | { t: "meld"; seat: number; kind: "pon" | "chi" | "kan"; tile: TileCode; from: number | null }
  | { t: "win"; winners: number[]; from: number | null; tsumo: boolean }
  | { t: "draw_game"; kind: string }
  | { t: "game_end"; scores: number[]; placement: number[] };

export interface StepResult {
  events: EngineEvent[];
  view: GameView;
}

export interface HumanCommand {
  action: ActionName;
  tile?: TileCode;
  option?: number;
}

export interface NewGameConfig {
  seed?: number;
  levels: Level[];
  rules?: GameRules;
}

// ---- worker messages -------------------------------------------------------

export type WorkerRequest =
  | { id: number; op: "init"; baseUrl: string }
  | { id: number; op: "newGame"; config: NewGameConfig }
  | { id: number; op: "act"; command: HumanCommand }
  | { id: number; op: "aiStep" }
  | { id: number; op: "nextRound" }
  | { id: number; op: "save" }
  | { id: number; op: "load"; blob: string };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string }
  | { id: -1; progress: BootStage };

export type BootStage = "runtime" | "engine" | "ready";
