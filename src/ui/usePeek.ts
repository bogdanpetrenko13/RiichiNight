import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import type { GameView, TileCode } from "../engine/protocol";

/** How long a finger rests on a tile before its copies light up. */
export const PEEK_MS = 420;
/** A finger that moves this far is scrolling or swiping, not holding. */
const MOVE_PX = 10;

/** Tile kind without the red-five mark ("r5p" -> "5p"). */
export const tileKind = (code: TileCode) => code.replace(/^r/, "");

/**
 * Copies of a tile kind the player can see: the own hand (and drawn tile),
 * every river, every meld (a closed kan shows its kind on all four) and the
 * dora indicators. Called tiles sit in a meld, not in the river, so nothing
 * is counted twice.
 */
export function visibleCopies(view: GameView, kind: string): number {
  let n = 0;
  const count = (codes: (TileCode | null | undefined)[] | undefined) => {
    for (const c of codes ?? []) if (c && tileKind(c) === kind) n += 1;
  };
  for (const p of view.players) {
    count(p.discards);
    for (const m of p.melds) count(m.tiles);
  }
  const me = view.players[0];
  count(me.hand);
  count([me.drawn]);
  count(view.dora);
  return n;
}

/**
 * Long press on any face-up tile of the table (hand, rivers, melds, dora):
 * while the finger rests, `kind` is that tile's kind and the table lights up
 * its copies. Lifting the finger ends it, and the tap that would follow is
 * swallowed (a held hand tile is not selected or discarded).
 */
export function usePeek() {
  const [kind, setKind] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  const onPointerDown = (e: ReactPointerEvent) => {
    const el = (e.target as Element).closest?.("[data-kind]");
    fired.current = false;
    clear();
    if (!el || (e.pointerType === "mouse" && e.button !== 0)) return;
    const k = el.getAttribute("data-kind");
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fired.current = true;
      setKind(k);
    }, PEEK_MS);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const s = start.current;
    if (s && timer.current !== null && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_PX) clear();
  };
  const end = () => {
    clear();
    setKind(null);
  };
  const onClickCapture = (e: ReactMouseEvent) => {
    if (!fired.current) return;
    fired.current = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const onContextMenu = (e: ReactMouseEvent) => {
    if ((e.target as Element).closest?.("[data-kind]")) e.preventDefault();
  };

  return {
    kind,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture,
      onContextMenu,
    },
  };
}
