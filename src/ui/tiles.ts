import type { TileCode } from "../engine/protocol";

export type Suit = "m" | "p" | "s" | "z";

export interface ParsedTile {
  suit: Suit;
  rank: number;
  red: boolean;
}

export function parseTile(code: TileCode): ParsedTile {
  const red = code.startsWith("r");
  const body = red ? code.slice(1) : code;
  return { rank: Number(body[0]), suit: body[1] as Suit, red };
}

/** Same tile type, ignoring red fives. */
export const sameType = (a: TileCode, b: TileCode) => a.replace(/^r/, "") === b.replace(/^r/, "");

export const HONOR_GLYPHS = ["", "東", "南", "西", "北", "", "發", "中"];
export const SUIT_GLYPHS: Record<Exclude<Suit, "z">, string> = { m: "萬", p: "筒", s: "索" };

const ORDER: Record<Suit, number> = { m: 0, p: 1, s: 2, z: 3 };
export function tileSortKey(code: TileCode): number {
  const t = parseTile(code);
  return ORDER[t.suit] * 20 + t.rank * 2 + (t.red ? 0 : 1);
}

/** Dora tile indicated by an indicator. */
export function doraFromIndicator(code: TileCode): TileCode {
  const { suit, rank } = parseTile(code);
  if (suit !== "z") return `${rank === 9 ? 1 : rank + 1}${suit}`;
  if (rank <= 4) return `${rank === 4 ? 1 : rank + 1}z`;
  return `${rank === 7 ? 5 : rank + 1}z`;
}

const HONOR_FILES = ["", "Ton", "Nan", "Shaa", "Pei", "Haku", "Hatsu", "Chun"];
const SUIT_FILES: Record<Exclude<Suit, "z">, string> = { m: "Man", p: "Pin", s: "Sou" };
const BASE = typeof window !== "undefined" ? new URL("./", window.location.href).href : "./";

/** Face image from the CC0 FluffyStuff set (public/tiles/<variant>/<name>.svg). */
export function faceFile(t: ParsedTile, variant: "regular" | "black"): string {
  const name = t.suit === "z" ? HONOR_FILES[t.rank] : `${SUIT_FILES[t.suit]}${t.rank}${t.red ? "-Dora" : ""}`;
  return `${BASE}tiles/${variant}/${name}.svg`;
}

export type TileHints = "none" | "man" | "all";

const WIND_INDEX: Record<string, string[]> = {
  en: ["", "E", "S", "W", "N"],
  ru: ["", "В", "Ю", "З", "С"],
};

/**
 * Corner index (setting "Hints on tiles"): "man" labels the character suit
 * and the winds (the tiles drawn with kanji), "all" labels every suit tile
 * too. Dragons never get one.
 */
export function cornerIndex(t: ParsedTile, mode: TileHints, lang: string): string {
  if (mode === "none") return "";
  if (t.suit === "z") return (WIND_INDEX[lang] ?? WIND_INDEX.en)[t.rank] ?? "";
  if (mode === "man" && t.suit !== "m") return "";
  return String(t.rank);
}
