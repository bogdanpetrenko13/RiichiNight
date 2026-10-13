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
  const tiles = hand * 1.36 + hand * 0.16;
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
    // Hand must fit 14 tiles + drawn gap + melds, and stay modest on short screens.
    const hand = Math.max(26, Math.min(52, (w - 48) / 18, h / 10));
    // Rivals sit beside the board; buttons and hints float above the rack.
    const board = Math.max(200, Math.min(h - pad - controlsHeight(hand, true), w * 0.46));
    return { orientation: "landscape", vars: vars(hand, board, 13.5) };
  }
  const hand = Math.max(22, Math.min(50, (w - 20) / 15.2));
  const rivals = 164; // three compact rival cards
  const board = Math.max(200, Math.min(w - 12, h - pad - rivals - controlsHeight(hand)));
  return { orientation: "portrait", vars: vars(hand, board, 14) };
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
