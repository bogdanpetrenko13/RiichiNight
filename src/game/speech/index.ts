// Every heroine's voice at the table: lines per situation (ru + en), how
// chatty she is, her profile text and her bonds with other heroines. One
// file per heroine; characters.ts merges them into the roster.
import type { HeroineSpeech } from "./types";
import { akane } from "./akane";
import { hikari } from "./hikari";
import { kaede } from "./kaede";
import { mai } from "./mai";
import { midori } from "./midori";
import { nanami } from "./nanami";
import { reiko } from "./reiko";
import { rin } from "./rin";
import { sora } from "./sora";
import { tsukiko } from "./tsukiko";
import { yuki } from "./yuki";
import { yuzu } from "./yuzu";

export type { BondLines, HeroineSpeech, SpeechKind } from "./types";
export { SPEECH_KINDS } from "./types";

export const SPEECH: Record<string, HeroineSpeech> = {
  akane,
  hikari,
  kaede,
  mai,
  midori,
  nanami,
  reiko,
  rin,
  sora,
  tsukiko,
  yuki,
  yuzu,
};
