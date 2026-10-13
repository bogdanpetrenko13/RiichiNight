import type { CSSProperties } from "react";
import type { TileCode } from "../../engine/protocol";
import { parseTile } from "../tiles";
import { tileFace } from "../tileFaces";
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
  onClick?: () => void;
  label?: string;
  style?: CSSProperties;
}

export function Tile({ code, back, size = "hand", selected, dimmed, highlight, sideways, onClick, label, style }: TileProps) {
  const classes = [
    styles.tile,
    styles[size],
    selected && styles.selected,
    dimmed && styles.dimmed,
    highlight && styles.highlight,
    sideways && styles.sideways,
    onClick && styles.clickable,
    back && styles.back,
  ]
    .filter(Boolean)
    .join(" ");

  if (back || !code) {
    return <span className={classes} style={style} aria-hidden="true" />;
  }

  const t = parseTile(code);
  const face = (
    <svg className={styles.art} viewBox="0 0 60 80" aria-hidden="true">
      {tileFace(t)}
    </svg>
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
