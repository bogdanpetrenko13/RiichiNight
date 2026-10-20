/**
 * Fixed sizes of the table layout, in CSS pixels: the single source for both
 * the size calculations in useLayout.ts and the CSS, which reads them as the
 * custom properties set by `metricVars()` on the table root (never repeat
 * these numbers in a stylesheet).
 */
export const METRICS = {
  /** Portrait table centre strip (TableCenter): height and vertical margin. */
  centerStripH: 40,
  centerStripMargin: 3,
  /** Landscape: the action buttons column right of the hand. Two rows of
   *  buttons fit its height; ActionBar puts 3–4 buttons in a 2×2 grid. */
  actionsW: 150,
  actionsH: 90,
  /** Landscape: height of a column's header (portrait + wind, score, name). */
  landscapeHeader: 54,
} as const;

/** Space the centre strip takes between the bands (height + both margins). */
export const CENTER_STRIP_TOTAL = METRICS.centerStripH + 2 * METRICS.centerStripMargin;

export function metricVars(): Record<string, string> {
  return {
    "--center-strip-h": `${METRICS.centerStripH}px`,
    "--center-strip-margin": `${METRICS.centerStripMargin}px`,
    "--actions-w": `${METRICS.actionsW}px`,
    "--actions-h": `${METRICS.actionsH}px`,
  };
}
