import type { Lang } from "../../i18n/strings";

/**
 * Situations a heroine reacts to at the table (speech bubble; the match
 * results card for the last three).
 */
export type SpeechKind =
  /** Match start: first match against her / 1-11 matches before / 12 or more. */
  | "greet"
  | "greetAgain"
  | "greetFriend"
  /** She wins a hand / a big one (mangan or more). */
  | "pleased"
  | "bigWin"
  /** She wins off your discard; her second (or later) hand in a row;
   *  a hand she wins while last in the match. */
  | "ronYou"
  | "streak"
  | "comeback"
  /** She deals into you / a big hand; someone else draws their own win. */
  | "lossRon"
  | "lossBig"
  | "lossTsumo"
  /** Exhaustive draw; you take a long time over a move. */
  | "wallGame"
  | "idle"
  /** She declares riichi; you declare riichi; another heroine ({name}) does. */
  | "riichi"
  | "playerRiichi"
  | "rivalRiichi"
  /** She calls Pon / Chi / Kan; someone calls her discard ({name} if a heroine). */
  | "call"
  | "takenFrom"
  /** The wall is nearly gone and nobody has won yet. */
  | "lateWall"
  /** She watches a big hand (mangan or more) won by someone else, not off her
   *  ({name} the winner if a heroine, {points}). */
  | "watchBig"
  /** She is last going into the final hand. */
  | "lastPlace"
  /** End of the match: she wins it / finishes last / you beat everyone. */
  | "matchWin"
  | "matchLose"
  | "defeated";

export const SPEECH_KINDS: SpeechKind[] = [
  "greet",
  "greetAgain",
  "greetFriend",
  "pleased",
  "bigWin",
  "ronYou",
  "streak",
  "comeback",
  "lossRon",
  "lossBig",
  "lossTsumo",
  "wallGame",
  "idle",
  "riichi",
  "playerRiichi",
  "rivalRiichi",
  "call",
  "takenFrom",
  "lateWall",
  "watchBig",
  "lastPlace",
  "matchWin",
  "matchLose",
  "defeated",
];

/** Lines about another heroine at the same table (what she says to her). */
export interface BondLines {
  /** Match start with her at the table. */
  greet: string[];
  /** She deals into that heroine. */
  lostTo: string[];
  /** She wins off that heroine's discard. */
  beat: string[];
  /** That heroine declares riichi. */
  riichi: string[];
}

/**
 * Placeholders a line may use (the line is picked only when the situation
 * has the value): {points} her win in points, {yaku} its best yaku,
 * {name} the other heroine (the one she dealt into, or who dealt into her).
 */
export const PLACEHOLDERS = ["points", "yaku", "name"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];
/** Which call she just made: a "call" line naming one call ("Pon!", "Chi.")
 *  is said only for that call; lines that name none fit any. */
export type CallKind = "pon" | "chi" | "kan";
export type LineContext = Partial<Record<Placeholder, string>> & { call?: CallKind };

/**
 * A piece of her story she tells once, at the start of the match after `at`
 * finished matches against you (then it stays in her profile).
 */
export interface StoryBeat {
  at: number;
  en: string;
  ru: string;
}

export interface HeroineSpeech {
  /** How often she talks: 0.3 (a word now and then) … 1 (chatterbox). */
  chatty: number;
  /** A few sentences about her life (the profile on the rival screen). */
  story: Record<Lang, string>;
  /** How she plays, in plain words (profile). */
  playstyle: Record<Lang, string>;
  /** Her story, told bit by bit as you play her more (ascending `at`). */
  beats: StoryBeat[];
  lines: Record<Lang, Record<SpeechKind, string[]>>;
  /** Other heroines she knows: id -> lines. */
  bonds: Record<string, Record<Lang, BondLines>>;
}
