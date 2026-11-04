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
  /** River tile thrown right after drawing it: shaded. */
  tsumogiri?: boolean;
  /** Hand tile safe against every rival in riichi: a small shield. */
  safe?: boolean;
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

export function Tile({ code, back, size = "hand", selected, dimmed, highlight, sideways, marked, eligible, hint, tsumogiri, safe, onClick, label, style, dataKey, button }: TileProps) {
  const { settings, t: tr } = useApp();
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
      {safe && (
        <span className={styles.safe} data-safe title={tr("safeTileLabel")}>
          <svg viewBox="0 0 12 14" aria-hidden="true">
            <path d="M6 0.6 11 2.4v4.2c0 3.2-2.1 5.6-5 6.8C3.1 12.2 1 9.8 1 6.6V2.4z" />
            <path d="M3.4 7.1 5.3 9l3.4-3.8" fill="none" />
          </svg>
        </span>
      )}
    </>
  );

  const Tag = onClick || button ? "button" : "span";
  return (
    <Tag
      className={classes}
      data-suit={t.suit}
      data-k={dataKey}
      data-red={t.red || undefined}
      data-kind={`${t.rank}${t.suit}`}
      data-tsumogiri={tsumogiri || undefined}
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
