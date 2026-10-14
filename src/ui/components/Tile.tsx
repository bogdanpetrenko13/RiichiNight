import type { CSSProperties } from "react";
import type { TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { faceFile, cornerIndex, parseTile } from "../tiles";
import styles from "./Tile.module.css";

interface TileProps {
  code?: TileCode | null;
  /** Face-down tile. */
  back?: boolean;
  size?: "hand" | "river" | "meld" | "mini";
  selected?: boolean;
  dimmed?: boolean;
  highlight?: boolean;
  /** Riichi declaration tile, laid sideways. */
  sideways?: boolean;
  /** Small pointer above the tile (claimable discard). */
  marked?: boolean;
  onClick?: () => void;
  label?: string;
  style?: CSSProperties;
}

export function Tile({ code, back, size = "hand", selected, dimmed, highlight, sideways, marked, onClick, label, style }: TileProps) {
  const { settings } = useApp();
  const variant = settings.tileset === "dark" ? "black" : "regular";
  const classes = [
    styles.tile,
    styles[size],
    selected && styles.selected,
    dimmed && styles.dimmed,
    highlight && styles.highlight,
    sideways && styles.sideways,
    marked && styles.marked,
    onClick && styles.clickable,
    back && styles.back,
  ]
    .filter(Boolean)
    .join(" ");

  if (back || !code) {
    return <span className={classes} style={style} aria-hidden="true" />;
  }

  const t = parseTile(code);
  const index = cornerIndex(t);
  const face = (
    <>
      <img className={styles.art} src={faceFile(t, variant)} alt="" draggable={false} decoding="async" />
      {index && (
        <span className={styles.idx} data-red={t.red || undefined}>
          {index}
        </span>
      )}
    </>
  );

  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      className={classes}
      data-suit={t.suit}
      data-red={t.red || undefined}
      onClick={onClick}
      aria-label={label ?? code}
      style={style}
      type={onClick ? "button" : undefined}
    >
      {face}
    </Tag>
  );
}
