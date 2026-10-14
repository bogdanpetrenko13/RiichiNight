/**
 * Point stick (tenbo), drawn as SVG: 10 000, 5 000, 1 000 and 100 points.
 * A riichi declaration is shown as a 1 000 stick in front of the river.
 */
export type TenboKind = "10000" | "5000" | "1000" | "100";

const RED = "#d81e1e";
const BLACK = "#151515";

export function Tenbo({ kind, width = 64, className }: { kind: TenboKind; width?: number | string; className?: string }) {
  const w = 96;
  const h = 12;
  const cx = w / 2;
  const cy = h / 2;
  const dots: JSX.Element[] = [];
  const dot = (x: number, y: number, r: number, fill: string) =>
    dots.push(<circle key={dots.length} cx={x} cy={y} r={r} fill={fill} />);

  if (kind === "10000") {
    dot(w * 0.2, cy, 3.4, BLACK);
    dot(w * 0.8, cy, 3.4, BLACK);
    dot(cx, cy, 2.9, RED);
    for (const [dx, dy] of [[-0.07, -0.26], [0.07, -0.26], [-0.07, 0.26], [0.07, 0.26]]) dot(cx + w * dx, cy + h * dy, 1.3, RED);
    dot(cx - w * 0.13, cy, 1.2, RED);
    dot(cx + w * 0.13, cy, 1.2, RED);
  } else if (kind === "5000") {
    dot(cx, cy, 2.7, RED);
    for (const [dx, dy] of [[-0.07, -0.28], [0.07, -0.28], [-0.07, 0.28], [0.07, 0.28]]) dot(cx + w * dx, cy + h * dy, 1.3, RED);
  } else if (kind === "1000") {
    dot(cx, cy, 2.9, RED);
  } else {
    for (let i = 0; i < 4; i++) for (const j of [-1, 1]) dot(cx + (i - 1.5) * w * 0.055, cy + j * h * 0.2, 1.2, BLACK);
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      // Width goes through CSS: the SVG width attribute does not accept calc().
      style={{ width, aspectRatio: `${w} / ${h}`, height: "auto", display: "block", flex: "none" }}
      role="img"
      aria-label={`${kind}`}
    >
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} rx="3.6" fill="#fbfaf6" stroke="#9a927f" />
      {dots}
    </svg>
  );
}
