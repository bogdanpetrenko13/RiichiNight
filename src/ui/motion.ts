// Motion system: one place for durations, easing and the "tile flight"
// hand-off between the hand and the river.

/** Durations (ms) before the speed factor. */
export const DUR = { fast: 120, base: 200, slow: 320 } as const;
/** Standard easing: quick start, soft landing. */
export const EASE = "cubic-bezier(0.2, 0, 0, 1)";
/** Deceleration for things that arrive (ease-out cubic). The earlier
 *  (0.05, 0.7, 0.1, 1) covered half of a rival's discard flight in the first
 *  frame, which read as a jump; this one moves at most ~1/4 per frame. */
export const EASE_IN = "cubic-bezier(0.33, 1, 0.68, 1)";

let speed = 1;
/** Opponent speed slider also scales animations (0.6–1.3). */
export function setMotionSpeed(aiDelayMs: number) {
  speed = Math.max(0.6, Math.min(1.3, aiDelayMs / 700));
}

/** When a discard lands in the river (ms after it starts), for its clack. */
export function landingMs(): number {
  return reduced() ? 0 : Math.round((DUR.slow - 60) * speed);
}

const reduced = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export function animate(el: Element, frames: Keyframe[], ms: number, easing = EASE): Animation | null {
  if (reduced() || typeof (el as HTMLElement).animate !== "function") return null;
  return (el as HTMLElement).animate(frames, { duration: ms * speed, easing, fill: "backwards" });
}

/** The element's own CSS transform (a sideways riichi tile's turn), to keep
 *  at the end of every keyframe: an animated transform replaces it. */
export function ownTransform(el: Element): string {
  const t = getComputedStyle(el).transform;
  return t && t !== "none" ? ` ${t}` : "";
}

/** The discard the player is claiming (Pon / Chi / Kan): where it lies in
 *  the rival's river, so it can fly from there into the new meld. */
let claim: { rect: DOMRect; at: number } | null = null;

export function rememberClaim(el: Element | null) {
  claim = el ? { rect: el.getBoundingClientRect(), at: Date.now() } : null;
}

/** The claimed tile's river rect if a claim was just made (used once). */
export function takeClaim(): DOMRect | null {
  const c = claim;
  claim = null;
  return c && Date.now() - c.at < 4000 ? c.rect : null;
}

/**
 * `el` (already in its new place) moves there from `from` (a viewport rect):
 * position and size, keeping its own transform (a sideways tile stays
 * turned).
 */
export function flyFrom(el: HTMLElement, from: DOMRect, ms: number, delay = 0): Animation | null {
  if (reduced() || typeof el.animate !== "function") return null;
  const to = el.getBoundingClientRect();
  if (!to.width || !from.width) return null;
  const own = ownTransform(el);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = Math.max(from.width / to.width, from.height / to.height);
  return el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})${own}` },
      { transform: `translate(0, 0) scale(1)${own}` },
    ],
    { duration: ms * speed, delay: delay * speed, easing: EASE_IN, fill: "backwards" },
  );
}

/** Where the player's last discard started (viewport rect), for its flight into the river. */
let flight: { rect: DOMRect; at: number } | null = null;

export function rememberDiscard(el: Element | null) {
  flight = el ? { rect: el.getBoundingClientRect(), at: Date.now() } : null;
}

/** Plays the flight onto the new river tile if a discard was just made. */
export function landDiscard(el: Element | null) {
  if (!el || !flight || Date.now() - flight.at > 4000) return;
  const from = flight.rect;
  flight = null;
  const to = el.getBoundingClientRect();
  if (!to.width) return;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  // Unrotated width: a sideways riichi tile's rect is turned.
  const s = from.width / ((el as HTMLElement).offsetWidth || to.width);
  const own = ownTransform(el);
  animate(
    el,
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})${own}`, opacity: 1 },
      { transform: `translate(0, 0) scale(1)${own}`, opacity: 1 },
    ],
    DUR.slow - 40,
    EASE,
  );
}

/** Finds the hand tile element for a code (registered by PlayerHand). */
let handLocator: ((code: string) => Element | null) | null = null;
export function setHandLocator(fn: ((code: string) => Element | null) | null) {
  handLocator = fn;
}
/** Call right before discarding `code` from the hand. */
export function rememberHandDiscard(code: string) {
  rememberDiscard(handLocator?.(code) ?? null);
}
