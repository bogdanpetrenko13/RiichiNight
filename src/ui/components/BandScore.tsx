import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { fxMs } from "../tableFx";
import overlay from "./BandOverlay.module.css";

/** Points changing hands at the end of a hand (Table.tsx). */
export interface ScoreFx {
  /** Changes with every result, so a new one restarts the count. */
  key: string;
  from: number;
  to: number;
  /** ms after the result arrives: the count starts after the Ron/Tsumo banner. */
  delay: number;
  /** ms of counting (0: the new score at once). */
  duration: number;
}

const fmt = (n: number) => n.toLocaleString();

/**
 * A band's score. With `fx` it shows the score before the hand until `delay`,
 * then counts to the new one while the change floats up beside it
 * ("+5 200" / "-1 300"), as on a real table where the points change hands
 * before the result card.
 */
export function BandScore({ seat, score, fx, className, scoreRef }: {
  seat: number;
  score: number;
  fx: ScoreFx | null;
  className: string;
  scoreRef?: RefObject<HTMLSpanElement>;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const [floating, setFloating] = useState<string | null>(null);
  useEffect(() => {
    if (!fx || fx.from === fx.to) {
      setShown(null);
      setFloating(null);
      return;
    }
    setShown(fx.from);
    setFloating(null);
    let raf = 0;
    const timer = window.setTimeout(() => {
      setFloating(fx.key);
      const start = performance.now();
      const tick = (now: number) => {
        const p = fx.duration > 0 ? Math.min(1, (now - start) / fx.duration) : 1;
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(fx.from + (fx.to - fx.from) * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setShown(null);
      };
      raf = requestAnimationFrame(tick);
    }, fx.delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [fx?.key, fx?.from, fx?.to, fx?.delay, fx?.duration]);

  const delta = fx ? fx.to - fx.from : 0;
  return (
    <span ref={scoreRef} className={className} data-score-seat={seat} style={{ position: "relative" }}>
      {fmt(shown ?? score)}
      {fx && floating === fx.key && delta !== 0 && (
        <b
          className={overlay.delta}
          data-delta={delta}
          data-sign={delta > 0 ? "plus" : "minus"}
          style={{ animationDuration: `${Math.max(900, fx.duration + 700)}ms` }}
        >
          {delta > 0 ? "+" : "−"}
          {fmt(Math.abs(delta))}
        </b>
      )}
    </span>
  );
}

/**
 * The riichi stick goes down: when a band's riichi turns on, its stick in
 * front of the river slides there from the score (Settings -> Table
 * animations), in time with the stick sound.
 */
export function useStickDrop(line: RefObject<HTMLElement>, from: RefObject<HTMLElement>, riichi: boolean) {
  const was = useRef(riichi);
  useLayoutEffect(() => {
    const before = was.current;
    was.current = riichi;
    if (before || !riichi) return;
    const ms = fxMs(520);
    const stick = line.current?.firstElementChild as HTMLElement | null;
    const src = from.current;
    if (!ms || !stick || !src || typeof stick.animate !== "function") return;
    const a = stick.getBoundingClientRect();
    const b = src.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    stick.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.6)`, opacity: 0 },
        { transform: `translate(${dx * 0.3}px, ${dy * 0.3}px) scale(1.05)`, opacity: 1, offset: 0.6 },
        { transform: "none", opacity: 1 },
      ],
      { duration: ms, delay: 150, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "backwards" },
    );
  }, [riichi]);
}
