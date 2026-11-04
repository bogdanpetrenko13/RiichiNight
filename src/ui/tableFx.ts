// Table effects (Settings -> Table animations): new dora turning over, the
// riichi stick going down and being collected, points changing hands before
// the result card, the round splash. One factor scales them all: full = 1,
// short = about half, off (or the system's "reduce motion") = 0.

import type { TableFx } from "../game/storage";

let level: TableFx = "full";

export function setTableFx(value: TableFx) {
  level = value;
}

const reduced = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** 1 (full), 0.55 (short) or 0 (off / reduced motion). */
export function fxScale(): number {
  if (level === "off" || reduced()) return 0;
  return level === "short" ? 0.55 : 1;
}

/** A duration scaled by the effects level (0 when they are off). */
export const fxMs = (ms: number) => Math.round(ms * fxScale());

/**
 * Copies of `sources` fly to the centre of `target` and vanish there (riichi
 * sticks going to the winner). The copies live on <body> above the table,
 * so the bands below are not touched.
 */
export function flyCopies(sources: Element[], target: Element | null, ms: number, stagger = 90): void {
  if (!target || ms <= 0 || typeof document === "undefined") return;
  const to = target.getBoundingClientRect();
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  sources.forEach((src, i) => {
    const from = src.getBoundingClientRect();
    if (!from.width) return;
    const copy = src.cloneNode(true) as HTMLElement;
    copy.removeAttribute("data-riichi-stick");
    Object.assign(copy.style, {
      position: "fixed",
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      margin: "0",
      pointerEvents: "none",
      zIndex: "var(--z-callout)",
      visibility: "visible",
    });
    document.body.appendChild(copy);
    const dx = tx - (from.left + from.width / 2);
    const dy = ty - (from.top + from.height / 2);
    const anim = copy.animate?.(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 18}px) scale(0.9)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.45)`, opacity: 0 },
      ],
      { duration: ms, delay: i * stagger, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "both" },
    );
    if (anim) anim.onfinish = () => copy.remove();
    else copy.remove();
  });
}
