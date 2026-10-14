import { useEffect, useState, type CSSProperties } from "react";

export interface Layout {
  orientation: "portrait" | "landscape";
  vars: CSSProperties;
}

/** Tile height / width (Tile.module.css uses the same ratio). */
export const TILE_RATIO = 1.42;

/**
 * Width of a 14-tile hand in tile widths: 14 touching tiles plus the gap
 * before the drawn tile. PlayerHand recomputes this with melds.
 */
export const HAND_UNITS_BASE = 14 + 0.3;

const TOP_BAR = 44;
const GAP = 6;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const px = (v: number) => `${v.toFixed(1)}px`;

/** Vertical space of the hand: raised selected tile + tile + 3D edge + padding. */
const handArea = (hand: number) => hand * 0.34 + hand * TILE_RATIO + hand * 0.1 + 8;

/**
 * Kemono Mahjong-style layout.
 *
 * Portrait: four full-width bands (three rivals, then the player), the hand
 * across the whole width under them, and the action buttons in a row at the
 * bottom right. Landscape: the same four bands as columns side by side, the
 * hand below with the buttons to its right.
 *
 * Each band has a fixed left part (labels + portrait) and a field with the
 * river (6 tiles per row, 3 rows) and the closed hand underneath. River and
 * back sizes come from the band's own width and height.
 */
function compute(): Layout {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (w > h * 1.05) {
    const actionsW = 150;
    const avail = w - 24 - actionsW;
    const cap = clamp(h * 0.13, 30, 60);
    const hand = Math.min(cap, avail / HAND_UNITS_BASE);
    const colH = h - TOP_BAR - handArea(cap) - 14;
    const colW = (w - 12 - 3 * GAP) / 4;
    const header = 54;
    const back = clamp((colW - 20) / 14.5, 9, 16);
    const riverByH = (colH - header - back * TILE_RATIO - 26) / (3 * (TILE_RATIO + 0.06));
    const river = clamp(Math.min((colW - 18) / 6.25, riverByH), 16, 40);
    return {
      orientation: "landscape",
      vars: {
        ...handVars(hand, avail, cap),
        ["--band-h" as string]: px(colH),
        ["--band-river" as string]: px(river),
        ["--band-back" as string]: px(back),
        ["--band-portrait" as string]: "46px",
      },
    };
  }

  const actionsRow = 60;
  const avail = w - 4;
  const cap = 60;
  const hand = clamp(avail / HAND_UNITS_BASE, 22, cap);
  const bandsH = h - TOP_BAR - handArea(hand) - actionsRow - GAP;
  const bandH = (bandsH - 3 * GAP) / 4;
  const left = clamp(Math.round(w * 0.25), 92, 128);
  const field = w - 12 - 2 - left - 14;
  // 14 backs (drawn tile included) must fit the field.
  const back = clamp((field - 6) / 14.8, 12, 24);
  const riverByH = (bandH - back * TILE_RATIO - 26) / (3 * (TILE_RATIO + 0.06));
  const river = clamp(Math.min((field - 8) / 6.25, riverByH), 16, 40);
  // Portrait sits under wind/score/name in the left part.
  const portrait = clamp(Math.min(left - 14, bandH - 72), 56, 110);
  return {
    orientation: "portrait",
    vars: {
      ...handVars(hand, avail, cap),
      ["--band-h" as string]: px(bandH),
      ["--band-left" as string]: `${left}px`,
      ["--band-river" as string]: px(river),
      ["--band-back" as string]: px(back),
      ["--band-portrait" as string]: px(portrait),
    },
  };
}

function handVars(hand: number, avail: number, cap: number): CSSProperties {
  return {
    ["--hand-tile" as string]: px(hand),
    ["--meld-tile" as string]: px(hand * 0.72),
    ["--hand-avail" as string]: `${avail.toFixed(0)}px`,
    ["--hand-max" as string]: px(cap),
  };
}

/** Tile and band sizes for the current viewport; recomputed on resize/rotation. */
export function useLayout(): Layout {
  const [layout, setLayout] = useState(compute);
  useEffect(() => {
    const onResize = () => setLayout(compute());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  return layout;
}
