import { useEffect, useState, type CSSProperties } from "react";

export interface Layout {
  orientation: "portrait" | "landscape";
  vars: CSSProperties;
}

/**
 * Height taken below the board: status line, action bar, wait-hint row, the
 * hand (tile height + 3D edge) and the lift of a selected tile, plus gaps.
 */
function controlsHeight(hand: number, floating = false): number {
  const status = floating ? 0 : 18;
  const actions = floating ? 0 : 56;
  const hint = floating ? 0 : 34;
  const tiles = hand * 1.4 + hand * 0.12;
  const lift = hand * 0.36;
  const gaps = 20;
  return status + actions + hint + tiles + lift + gaps;
}

function compute(): Layout {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pad = 12;
  const landscape = w > h * 1.05;
  if (landscape) {
    // Large hand: limited by height here; melds shrink it only when needed.
    const avail = w - 32;
    const cap = Math.max(28, Math.min(60, h / 8.4));
    const hand = Math.min(cap, avail / HAND_UNITS_BASE);
    // Rivals sit beside the board; buttons and hints float above the rack.
    const topBar = 52;
    const board = Math.max(200, Math.min(h - pad - topBar - controlsHeight(hand, true), w * 0.46));
    return { orientation: "landscape", vars: { ...vars(hand, board, 13.5), ...handVars(avail, cap) } };
  }
  // Portrait uses rival bands (Kemono-style rows) instead of a square board.
  // The hand takes the full screen width: 14 tiles + drawn-tile gap.
  const avail = w - 4;
  const cap = 60;
  const hand = Math.max(22, Math.min(cap, avail / HAND_UNITS_BASE));
  const side = Math.max(78, Math.round(w * 0.21));
  const portrait = Math.max(78, Math.round(w * 0.235));
  // Bands are inset cards (6px margins each side).
  const field = w - side - portrait - 26;
  const bandTile = Math.max(14, Math.min(36, field / 8.6));
  return {
    orientation: "portrait",
    vars: {
      ...vars(hand, 300, 14),
      ...handVars(avail, cap),
      ["--band-side" as string]: `${side}px`,
      ["--band-portrait" as string]: `${portrait}px`,
      ["--band-tile" as string]: `${bandTile.toFixed(1)}px`,
      // Closed hand backs: 13 tiles + melds must fit the field width.
      ["--band-back" as string]: `${Math.min(bandTile * 0.8, field / 14.8).toFixed(1)}px`,
    },
  };
}

/**
 * Width of a 14-tile hand in tile widths: 14 touching tiles plus the gap
 * before the drawn tile. PlayerHand recomputes this with melds.
 */
export const HAND_UNITS_BASE = 14 + 0.3;

function handVars(avail: number, cap: number): CSSProperties {
  return {
    ["--hand-avail" as string]: `${avail.toFixed(0)}px`,
    ["--hand-max" as string]: `${cap.toFixed(1)}px`,
  };
}

function vars(hand: number, board: number, riverDiv: number): CSSProperties {
  return {
    ["--hand-tile" as string]: `${hand.toFixed(1)}px`,
    ["--meld-tile" as string]: `${(hand * 0.72).toFixed(1)}px`,
    ["--board" as string]: `${board.toFixed(0)}px`,
    ["--river-tile" as string]: `${(board / riverDiv).toFixed(1)}px`,
  };
}

/** Tile and board sizes for the current viewport; recomputed on resize/rotation. */
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
