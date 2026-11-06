import type { Lang } from "../../i18n/strings";

/**
 * Situations a heroine reacts to at the table (speech bubble; the match
 * results card for the last three).
 */
export type SpeechKind =
  /** Match start: first match against her / 1-5 matches before / 6 or more. */
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
  /** She declares riichi; you declare riichi; she calls Pon / Chi / Kan. */
  | "riichi"
  | "playerRiichi"
  | "call"
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
  "call",
  "lastPlace",
  "matchWin",
  "matchLose",
  "defeated",
];

/** Lines about another heroine at the same table. */
export interface BondLines {
  /** Match start with her at the table. */
  greet: string[];
  /** She deals into that heroine. */
  lostTo: string[];
}

/**
 * Placeholders a line may use (the line is picked only when the situation
 * has the value): {points} her win in points, {yaku} its best yaku,
 * {name} the other heroine (the one she dealt into, or who dealt into her).
 */
export const PLACEHOLDERS = ["points", "yaku", "name"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];
export type LineContext = Partial<Record<Placeholder, string>>;

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
