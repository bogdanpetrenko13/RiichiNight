import type { CSSProperties } from "react";
import type { Meld, TileCode } from "../../engine/protocol";
import { sameType } from "../tiles";
import { Tile } from "./Tile";
import styles from "./MeldTiles.module.css";

interface Slot {
  code: TileCode;
  back?: boolean;
  /** The claimed tile: laid sideways. */
  side?: boolean;
  /** A kan added to a pon: the fourth tile, on top of the sideways one. */
  top?: TileCode;
}

/**
 * How a meld lies on a real table: the claimed tile is turned sideways on
 * the side of the player it came from (left: the player before you,
 * second: the one across, right: the one after you; chi always from the
 * left); a kan added to a pon puts its fourth tile on the sideways one; a
 * closed kan shows its two end tiles face down.
 */
export function meldSlots(m: Meld, owner: number): Slot[] {
  if (m.type === "closed_kan") return m.tiles.map((code, j) => ({ code, back: j === 0 || j === 3 }));
  if (m.from === null || m.from === undefined || !m.called) return m.tiles.map((code) => ({ code }));
  const rest = [...m.tiles];
  let at = rest.indexOf(m.called);
  if (at < 0) at = rest.findIndex((c) => sameType(c, m.called as TileCode));
  if (at >= 0) rest.splice(at, 1);
  const top = m.added && rest.length > 2 ? rest.pop() : undefined;
  const rel = (m.from - owner + 4) % 4; // 3: left, 2: across, 1: right
  const pos = rel === 3 ? 0 : rel === 2 ? 1 : rest.length;
  const slots: Slot[] = rest.map((code) => ({ code }));
  slots.splice(pos, 0, { code: m.called, side: true, top });
  return slots;
}

/** One meld's tiles laid out as on a real table (see meldSlots). */
export function MeldTiles({ meld, owner, size, tileStyle, className, ...rest }: {
  meld: Meld;
  /** Seat that made the meld (to know from which side the tile came). */
  owner: number;
  size: "meld" | "river" | "mini";
  tileStyle?: CSSProperties;
  className?: string;
  ["data-fresh"]?: boolean;
}) {
  return (
    <span className={`${styles.meld} ${className ?? ""}`} data-meld={meld.type} {...rest}>
      {meldSlots(meld, owner).map((s, j) =>
        s.top ? (
          <span key={j} className={styles.stack} data-added>
            <Tile code={s.code} size={size} sideways style={tileStyle} />
            <Tile code={s.top} size={size} sideways style={{ ...tileStyle, ...TOP }} />
          </span>
        ) : (
          <Tile key={j} code={s.code} size={size} back={s.back} sideways={s.side} style={tileStyle} />
        ),
      )}
    </span>
  );
}

/** The added kan's fourth tile sits one tile width above the sideways one. */
const TOP: CSSProperties = { position: "absolute", left: 0, bottom: "var(--tw)" };
