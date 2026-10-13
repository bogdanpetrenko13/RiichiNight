import { useEffect, useState, type CSSProperties } from "react";

export interface Layout {
  orientation: "portrait" | "landscape";
  vars: CSSProperties;
}

function compute(): Layout {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const landscape = w > h * 1.05;
  if (landscape) {
    const hand = Math.max(26, Math.min(54, (w - 48) / 18));
    const board = Math.max(220, Math.min(h - hand * 1.36 - 96, w * 0.5));
    return {
      orientation: "landscape",
      vars: vars(hand, board),
    };
  }
  const hand = Math.max(22, Math.min(50, (w - 20) / 15.2));
  const reserved = 104 /* rivals strip */ + hand * 1.36 + 128 /* actions + gaps */;
  const board = Math.max(220, Math.min(w - 12, h - reserved));
  return { orientation: "portrait", vars: vars(hand, board) };
}

function vars(hand: number, board: number): CSSProperties {
  return {
    ["--hand-tile" as string]: `${hand.toFixed(1)}px`,
    ["--meld-tile" as string]: `${(hand * 0.72).toFixed(1)}px`,
    ["--board" as string]: `${board.toFixed(0)}px`,
    ["--river-tile" as string]: `${(board / 16.5).toFixed(1)}px`,
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
