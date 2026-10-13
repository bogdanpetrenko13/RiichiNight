// Classic tile faces drawn as SVG in a 60×80 box: circles for pin, bamboo
// sticks for sou, Chinese numerals over 萬 for man, kanji for honours.
// Colours come from CSS variables so every tile set can recolour them.
import type { ReactNode } from "react";
import type { ParsedTile } from "./tiles";

const BLUE = "var(--suit-pin)";
const GREEN = "var(--suit-sou)";
const RED = "var(--suit-man)";
const INK = "var(--honor-ink)";

const MAN_NUMERALS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const WINDS = ["", "東", "南", "西", "北"];

type C = "b" | "g" | "r";
const COLOR: Record<C, string> = { b: BLUE, g: GREEN, r: RED };

// ---- pin (circles) ---------------------------------------------------------

function coin(key: string | number, cx: number, cy: number, r: number, color: string) {
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={color} strokeWidth={r * 0.26} />
      <circle cx={cx} cy={cy} r={r * 0.42} fill={color} />
      <circle cx={cx} cy={cy} r={r * 0.16} fill="var(--bone-50)" />
    </g>
  );
}

const PIN: Record<number, [number, number, C][]> = {
  2: [
    [30, 22, "g"],
    [30, 58, "b"],
  ],
  3: [
    [15, 17, "b"],
    [30, 40, "r"],
    [45, 63, "g"],
  ],
  4: [
    [17, 22, "b"],
    [43, 22, "g"],
    [17, 58, "g"],
    [43, 58, "b"],
  ],
  5: [
    [16, 17, "b"],
    [44, 17, "g"],
    [30, 40, "r"],
    [16, 63, "g"],
    [44, 63, "b"],
  ],
  6: [
    [18, 14, "g"],
    [42, 14, "g"],
    [18, 44, "r"],
    [42, 44, "r"],
    [18, 66, "r"],
    [42, 66, "r"],
  ],
  7: [
    [13, 11, "g"],
    [30, 19, "g"],
    [47, 27, "g"],
    [18, 48, "r"],
    [42, 48, "r"],
    [18, 68, "r"],
    [42, 68, "r"],
  ],
  8: [
    [18, 11, "b"],
    [42, 11, "b"],
    [18, 30, "b"],
    [42, 30, "b"],
    [18, 50, "b"],
    [42, 50, "b"],
    [18, 69, "b"],
    [42, 69, "b"],
  ],
  9: [
    [13, 14, "b"],
    [30, 14, "b"],
    [47, 14, "b"],
    [13, 40, "r"],
    [30, 40, "r"],
    [47, 40, "r"],
    [13, 66, "g"],
    [30, 66, "g"],
    [47, 66, "g"],
  ],
};
const PIN_R: Record<number, number> = { 2: 14, 3: 11, 4: 12, 5: 10.5, 6: 10, 7: 8.5, 8: 9, 9: 8.5 };

function pinFace(rank: number, red: boolean): ReactNode {
  if (rank === 1) {
    return (
      <g>
        <circle cx={30} cy={40} r={24} fill="none" stroke={GREEN} strokeWidth={3} />
        <circle cx={30} cy={40} r={19} fill="none" stroke={BLUE} strokeWidth={5} strokeDasharray="4 3" />
        <circle cx={30} cy={40} r={12} fill={RED} />
        <circle cx={30} cy={40} r={7} fill="none" stroke="var(--bone-50)" strokeWidth={2} />
        <circle cx={30} cy={40} r={2.5} fill="var(--bone-50)" />
      </g>
    );
  }
  return <g>{PIN[rank].map(([x, y, c], i) => coin(i, x, y, PIN_R[rank], red ? RED : COLOR[c]))}</g>;
}

// ---- sou (bamboo) ----------------------------------------------------------

function stick(key: string | number, cx: number, cy: number, len: number, color: string, angle = 0) {
  const w = 7.6;
  return (
    <g key={key} transform={`translate(${cx} ${cy}) rotate(${angle})`}>
      <rect x={-w / 2} y={-len / 2} width={w} height={len} rx={w / 2} fill={color} />
      <rect x={-w / 2 + 1.6} y={-len / 2 + 2} width={1.4} height={len - 4} rx={0.7} fill="rgba(255,255,255,0.35)" />
      <rect x={-w / 2 - 0.6} y={-1} width={w + 1.2} height={2} rx={1} fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth={0.6} />
      <rect x={-w / 2 - 0.6} y={-len / 2 + 0.4} width={w + 1.2} height={1.8} rx={0.9} fill="rgba(0,0,0,0.25)" />
      <rect x={-w / 2 - 0.6} y={len / 2 - 2.2} width={w + 1.2} height={1.8} rx={0.9} fill="rgba(0,0,0,0.25)" />
    </g>
  );
}

const SOU: Record<number, [number, number, C, number?][]> = {
  2: [
    [30, 21, "g"],
    [30, 59, "g"],
  ],
  3: [
    [30, 21, "g"],
    [18, 59, "g"],
    [42, 59, "g"],
  ],
  4: [
    [18, 21, "g"],
    [42, 21, "g"],
    [18, 59, "g"],
    [42, 59, "g"],
  ],
  5: [
    [13, 21, "g"],
    [47, 21, "g"],
    [30, 40, "r"],
    [13, 59, "g"],
    [47, 59, "g"],
  ],
  6: [
    [13, 21, "g"],
    [30, 21, "g"],
    [47, 21, "g"],
    [13, 59, "g"],
    [30, 59, "g"],
    [47, 59, "g"],
  ],
  7: [
    [30, 12, "r"],
    [13, 40, "g"],
    [30, 40, "g"],
    [47, 40, "g"],
    [13, 66, "g"],
    [30, 66, "g"],
    [47, 66, "g"],
  ],
  8: [
    [12, 21, "g", 18],
    [24, 21, "g", -18],
    [36, 21, "g", 18],
    [48, 21, "g", -18],
    [12, 59, "g", -18],
    [24, 59, "g", 18],
    [36, 59, "g", -18],
    [48, 59, "g", 18],
  ],
  9: [
    [13, 13, "g"],
    [30, 13, "r"],
    [47, 13, "g"],
    [13, 40, "g"],
    [30, 40, "r"],
    [47, 40, "g"],
    [13, 67, "g"],
    [30, 67, "r"],
    [47, 67, "g"],
  ],
};
const SOU_LEN: Record<number, number> = { 2: 32, 3: 32, 4: 32, 5: 30, 6: 32, 7: 22, 8: 32, 9: 23 };

/** 1-sou: a small stylised bird, as on traditional sets. */
function bird(): ReactNode {
  return (
    <g>
      <path d="M20 62 C10 70 8 76 14 76 C20 74 24 68 26 62 Z" fill={BLUE} />
      <path d="M26 64 C22 74 26 78 30 76 C32 72 32 68 30 63 Z" fill={RED} />
      <ellipse cx={30} cy={46} rx={13} ry={17} fill={GREEN} />
      <path d="M22 44 C26 52 34 54 40 48" fill="none" stroke="var(--bone-50)" strokeWidth={2} />
      <circle cx={34} cy={24} r={9} fill={GREEN} />
      <circle cx={36.5} cy={22} r={2.3} fill="var(--bone-50)" />
      <circle cx={36.8} cy={22.2} r={1.1} fill={INK} />
      <path d="M42 24 L50 22 L42 28 Z" fill={RED} />
      <path d="M30 16 C28 10 32 8 34 12 C36 8 40 10 37 16 Z" fill={RED} />
    </g>
  );
}

function souFace(rank: number, red: boolean): ReactNode {
  if (rank === 1) return bird();
  return (
    <g>{SOU[rank].map(([x, y, c, angle], i) => stick(i, x, y, SOU_LEN[rank], red ? RED : COLOR[c], angle ?? 0))}</g>
  );
}

// ---- man and honours -------------------------------------------------------

const textProps = {
  textAnchor: "middle" as const,
  fontFamily: "var(--font-tile)",
  fontWeight: 700,
};

function manFace(rank: number, red: boolean): ReactNode {
  return (
    <g>
      <text x={30} y={34} fontSize={28} fill={red ? RED : INK} {...textProps}>
        {MAN_NUMERALS[rank]}
      </text>
      <text x={30} y={73} fontSize={32} fill={RED} {...textProps}>
        萬
      </text>
    </g>
  );
}

function honorFace(rank: number): ReactNode {
  if (rank === 5) {
    return (
      <g fill="none" stroke={BLUE}>
        <rect x={13} y={14} width={34} height={52} rx={3} strokeWidth={3.5} />
        <rect x={18} y={19} width={24} height={42} rx={1.5} strokeWidth={1.2} />
      </g>
    );
  }
  const glyph = rank <= 4 ? WINDS[rank] : rank === 6 ? "發" : "中";
  const fill = rank === 6 ? GREEN : rank === 7 ? RED : INK;
  return (
    <text x={30} y={57} fontSize={46} fill={fill} {...textProps}>
      {glyph}
    </text>
  );
}

export function tileFace(t: ParsedTile): ReactNode {
  switch (t.suit) {
    case "p":
      return pinFace(t.rank, t.red);
    case "s":
      return souFace(t.rank, t.red);
    case "m":
      return manFace(t.rank, t.red);
    default:
      return honorFace(t.rank);
  }
}
