import type { ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import type { GameView } from "../../engine/protocol";
import { landDiscard } from "../motion";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import { Tenbo } from "./Tenbo";
import styles from "./Band.module.css";

/**
 * The player's band: wind and score, the waits / furiten chip; the player's
 * river on the right, the same size and 9 per row like the rivals' rivers in
 * portrait. Landscape adds the dead wall with the dora indicators and the
 * table counters at the bottom of the column (portrait: TableCenter.tsx). The hand and the action
 * buttons sit below the band (Table.tsx).
 */
export function PlayerBand({
  view,
  active,
  waits,
  riverCols = 6,
}: {
  view: GameView;
  active: boolean;
  /** Waits / furiten chip: under the score (portrait), top right of the column (landscape). */
  waits?: ReactNode;
  /** Discards per row: 9 in portrait (like the rivals), 6 in landscape. */
  riverCols?: number;
}) {
  const { t } = useApp();
  const me = view.players[0];
  // Dora indicators face up, the rest of the dead-wall row as backs (5 total).
  const hidden = Math.max(0, 5 - view.dora.length);
  // Landscape: the dora indicators are shown large, near the rivers' size.
  const doraBig = { ["--tw" as string]: "calc(var(--band-river, 24px) * 0.85)" };
  // The newest discard flies in from the hand.
  const riverRef = useRef<HTMLDivElement>(null);
  const count = me.discards.length;
  const lastCount = useRef(count);
  useLayoutEffect(() => {
    if (count > lastCount.current) landDiscard(riverRef.current?.lastElementChild ?? null);
    lastCount.current = count;
  }, [count]);
  const deadWall = (
    <div className={styles.table}>
      <div className={styles.dora} aria-label={t("dora")}>
        {view.dora.map((d, i) => (
          <Tile key={i} code={d} size="river" style={doraBig} />
        ))}
        {Array.from({ length: hidden }, (_, i) => (
          <Tile key={`b${i}`} back size="river" style={doraBig} />
        ))}
      </div>
      <div className={styles.counters}>
        <span title={t("riichiSticks")}>
          <Tenbo kind="1000" width={18} />×{view.round.riichiSticks}
        </span>
        <span title={t("honba", { n: view.round.honba })}>
          <Tenbo kind="100" width={18} />×{view.round.honba}
        </span>
        <span title={t("wall", { n: view.wall ?? 0 })}>
          <i className={styles.wall} />×{view.wall ?? 0}
        </span>
      </div>
    </div>
  );
  return (
    <section className={`${styles.band} ${styles.me}`} data-active={active || undefined}>
      <div className={styles.left}>
        <span className={styles.wind} data-dealer={view.round.dealer === 0 || undefined}>
          {t(`wind_${me.wind}` as StringKey)}
        </span>
        <span className={styles.score}>{me.score.toLocaleString()}</span>
        {/* Landscape: a name line like the rivals', so every column's header
            is the same height and all rivers start on one line. */}
        {riverCols !== 9 && <span className={styles.name}>{t("you")}</span>}
        {riverCols === 9 && waits && <div className={styles.waitsSlot}>{waits}</div>}
        {riverCols !== 9 && waits && <div className={styles.waitsHead}>{waits}</div>}
      </div>
      <div
        className={styles.river}
        data-rows={Math.ceil(me.discards.length / riverCols)}
        // Same shrink rule as the rivals (portrait: a third row of 9; landscape: a fourth of 6).
        data-over={Math.max(0, Math.ceil(me.discards.length / riverCols) - (riverCols === 9 ? 2 : 3)) || undefined}
        data-flight
        ref={riverRef}
        style={{ ["--river-cols" as string]: riverCols }}
      >
        {/* The stick's line is always there (hidden until riichi), so the river
            does not jump down when she declares. */}
        <div className={styles.riichiLine} data-empty={!me.riichi || undefined} aria-hidden={!me.riichi || undefined}>
          <Tenbo kind="1000" width="calc(var(--river-tile) * 2)" />
        </div>
        {me.discards.map((code, i) => (
          <Tile key={`${i}-${code}`} code={code} size="river" sideways={me.riichiIndex === i} />
        ))}
      </div>
      {/* Landscape: dora + counters where the rivals have their closed hand. */}
      {riverCols !== 9 && <div className={styles.meLower}>{deadWall}</div>}
    </section>
  );
}
