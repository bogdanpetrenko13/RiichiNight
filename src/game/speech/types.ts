import type { Lang } from "../../i18n/strings";

/**
 * Situations a heroine reacts to at the table (speech bubble; the match
 * results card for the last three).
 */
export type SpeechKind =
  /** Match start: first match against her / she has played you before. */
  | "greet"
  | "greetAgain"
  /** She wins a hand / a big one (mangan or more). */
  | "pleased"
  | "bigWin"
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
  "pleased",
  "bigWin",
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

export interface HeroineSpeech {
  /** How often she talks: 0.3 (a word now and then) … 1 (chatterbox). */
  chatty: number;
  /** A few sentences about her life (the profile on the rival screen). */
  story: Record<Lang, string>;
  /** How she plays, in plain words (profile). */
  playstyle: Record<Lang, string>;
  lines: Record<Lang, Record<SpeechKind, string[]>>;
  /** Other heroines she knows: id -> lines. */
  bonds: Record<string, Record<Lang, BondLines>>;
}
