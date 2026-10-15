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
  /** Part of the pending choice (riichi, chi, pon, kan): raised with a ring. */
  eligible?: boolean;
  /** Discarding it keeps tenpai: small bar under the tile. */
  hint?: boolean;
  onClick?: () => void;
  /** Always render as a button (inactive without onClick). The hand uses it so
   *  tiles are not re-created when they become tappable (that restarted the
   *  deal animation). */
  button?: boolean;
  label?: string;
  style?: CSSProperties;
  /** Stable identity for animations (data-k attribute). */
  dataKey?: string;
}

export function Tile({ code, back, size = "hand", selected, dimmed, highlight, sideways, marked, eligible, hint, onClick, label, style, dataKey, button }: TileProps) {
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
    eligible && styles.eligible,
    hint && styles.hint,
    onClick && styles.clickable,
    back && styles.back,
  ]
    .filter(Boolean)
    .join(" ");

  if (back || !code) {
    return <span className={classes} style={style} aria-hidden="true" data-k={dataKey} />;
  }

  const t = parseTile(code);
  const index = cornerIndex(t, settings.tileHints, settings.lang);
  const face = (
    <>
      <img className={styles.art} src={faceFile(t, variant)} alt="" draggable={false} decoding="async" />
      {index && (
        <span className={styles.idx} data-suit={t.suit}>
          {index}
        </span>
      )}
    </>
  );

  const Tag = onClick || button ? "button" : "span";
  return (
    <Tag
      className={index ? `${classes} ${styles.withIdx}` : classes}
      data-suit={t.suit}
      data-k={dataKey}
      data-red={t.red || undefined}
      onClick={onClick}
      aria-label={label ?? code}
      style={style}
      type={Tag === "button" ? "button" : undefined}
      aria-disabled={Tag === "button" && !onClick ? true : undefined}
      tabIndex={Tag === "button" && !onClick ? -1 : undefined}
    >
      {face}
    </Tag>
  );
}
