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
