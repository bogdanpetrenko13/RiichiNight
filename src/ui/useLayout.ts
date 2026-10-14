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
 *   portrait: 4 stacked bands, field right of a fixed left part
 *   landscape: 4 columns
 * Each river holds 3 rows (6 tiles + one sideways riichi tile) plus the riichi
 * stick line; more rows shrink via CSS.
 */
export function bandVars(orientation: Layout["orientation"], areaW: number, areaH: number, left: number): CSSProperties {
  if (areaW <= 0 || areaH <= 0) return {};
  // One river row: tile + 3D edge + row gap; the riichi stick line ≈ half a tile.
  const rowH = TILE_RATIO + 0.16;
  const rows = 3 * rowH + 0.55;
  if (orientation === "landscape") {
    const colW = (areaW - 12 - 3 * GAP) / 4;
    const colH = areaH - 4;
    const header = 54;
    const back = clamp((colW - 20) / 14.5, 9, 16);
    const byH = (colH - header - back * TILE_RATIO - 28) / rows;
    const river = clamp(Math.min((colW - 18) / 6.6, byH), 14, 40);
    return { ["--band-river" as string]: px(river), ["--band-back" as string]: px(back) };
  }
  const bandH = (areaH - 3 * GAP) / 4;
  const field = areaW - 12 - 2 - left - 26;
  const back = clamp((field - 6) / 14.8, 12, 24);
  const byH = (bandH - back * TILE_RATIO - 28) / rows;
  const river = clamp(Math.min((field - 6) / 6.6, byH), 14, 40);
  const portrait = clamp(Math.min(left - 14, bandH - 72), 56, 110);
  return {
    ["--band-river" as string]: px(river),
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
