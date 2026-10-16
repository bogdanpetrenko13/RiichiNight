import { useEffect, useState, type CSSProperties } from "react";

export interface Layout {
  orientation: "portrait" | "landscape";
  vars: CSSProperties;
  /** Width of the labels/portrait part of a portrait band. */
  left: number;
}

/** Tile height / width (Tile.module.css uses the same ratio). */
export const TILE_RATIO = 1.42;

/**
 * Width of a 14-tile hand in tile widths: 14 touching tiles plus the gap
 * before the drawn tile. PlayerHand recomputes this with melds.
 */
export const HAND_UNITS_BASE = 14 + 0.3;

const GAP = 6;
/** Portrait: height of the table centre strip (TableCenter) incl. its margins. */
const CENTER_H = 46;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const px = (v: number) => `${v.toFixed(1)}px`;


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
    return {
      orientation: "landscape",
      vars: { ...handVars(hand, avail, cap), ["--band-portrait" as string]: "46px" },
      left: 0,
    };
  }

  const avail = w - 4;
  const cap = 60;
  const hand = clamp(avail / HAND_UNITS_BASE, 22, cap);
  const left = clamp(Math.round(w * 0.25), 92, 128);
  return {
    orientation: "portrait",
    vars: { ...handVars(hand, avail, cap), ["--band-left" as string]: `${left}px` },
    left,
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

/**
 * River, closed-hand and portrait sizes from the real size of the bands area
 * (measured by the table), so rivers always fit their band.
 *   portrait: 4 stacked bands + the centre strip, field right of a fixed left part
 *   landscape: 4 columns
 * Rivals' rivers hold 9 tiles per row in portrait (6 in landscape columns),
 * the player's 6 per row; plus one sideways riichi tile and the riichi stick
 * line. More rows than planned shrink via CSS.
 */
export function bandVars(orientation: Layout["orientation"], areaW: number, areaH: number, left: number): CSSProperties {
  if (areaW <= 0 || areaH <= 0) return {};
  // One river row: tile + 3D edge + row gap; the riichi stick line ≈ half a tile.
  const rowH = TILE_RATIO + 0.16;
  const rows = 3 * rowH + 0.38;
  if (orientation === "landscape") {
    const colW = (areaW - 12 - 3 * GAP) / 4;
    const colH = areaH - 4;
    const header = 54;
    // 13 backs (1 px gaps) + 6 px row gap + 0.35 gap + drawn tile must fit the
    // column's content box (8 px padding each side + 1 px borders).
    const back = clamp((colW - 18 - 18) / 14.35, 8, 16);
    const byH = (colH - header - back * TILE_RATIO - 28) / rows;
    // The player's column has the large dora row (0.85 river) + counters
    // (~16 px) at the bottom instead of a closed hand: same river size for all.
    const byHMe = (colH - header - 16 - 28) / (rows + 0.85 * TILE_RATIO);
    const river = clamp(Math.min((colW - 18) / 6.6, byH, byHMe), 14, 40);
    return { ["--band-river" as string]: px(river), ["--band-back" as string]: px(back) };
  }
  // Four bands and the table centre strip (TableCenter, CENTER_H) between them.
  const bandH = (areaH - 4 * GAP - CENTER_H) / 4;
  // Band: 10 px padding on every side + 8 px between columns + 2 px border.
  const field = areaW - 12 - 2 - left - 28;
  // The player band also holds the waits + buttons column on the right.
  const side = clamp(Math.round(areaW * 0.26), 96, 124);
  const meField = field - side - 8;
  // Rivals: 9 river tiles per row and 13 closed tiles below share one width W
  // and one left edge (W = 9 river + 8 gaps = 13 backs + 12 gaps); the drawn
  // tile sits right of W after a small gap.
  const wMax = (field - 2 + (12 * 1.35) / 13) / (1 + 1.35 / 13);
  let river = (wMax - 8) / 9;
  let back = (9 * river + 8 - 12) / 13;
  // Sized for two rows of 9 (18 discards, the usual case) + the riichi stick;
  // a third row shrinks the river (data-over in RivalBand / Band.module.css).
  const byH = (bandH - 20 - back * TILE_RATIO - 10) / (2 * rowH + 0.38);
  river = clamp(Math.min(river, byH), 14, 40);
  back = (9 * river + 8 - 12) / 13;
  // Player: 6 per row next to the waits/buttons column; up to 4 rows.
  const meRiver = clamp(Math.min((meField - 4) / 6.6, (bandH - 16) / (4 * rowH + 0.38)), 14, 40);
  // Portrait under wind / score / name (~68 px of labels): never covers them.
  // On short screens it shrinks below 48 px rather than overlap the labels.
  const portrait = clamp(Math.min(left - 14, bandH - 16 - 72), 34, 110);
  return {
    ["--band-side" as string]: `${side}px`,
    ["--band-river" as string]: px(river),
    ["--me-river" as string]: px(meRiver),
    ["--band-back" as string]: px(back),
    ["--band-portrait" as string]: px(portrait),
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
