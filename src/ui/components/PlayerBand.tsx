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
 * The player's band: wind and score, the waits / furiten chip, then the dead
 * wall with the dora indicators and the table counters (riichi sticks, honba,
 * tiles left in the wall); the player's river on the right, the same size and
 * 9 per row like the rivals' rivers in portrait. The hand and the action
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
  /** Waits / furiten chip (under the score in portrait, below the river in landscape). */
  waits?: ReactNode;
  /** Discards per row: 9 in portrait (like the rivals), 6 in landscape. */
  riverCols?: number;
}) {
  const { t } = useApp();
  const me = view.players[0];
  // Dora indicators face up, the rest of the dead-wall row as backs (5 total).
  const hidden = Math.max(0, 5 - view.dora.length);
  const small = { ["--tw" as string]: "calc(var(--band-back, 14px) * 0.95)" };
  // The newest discard flies in from the hand.
  const riverRef = useRef<HTMLDivElement>(null);
  const count = me.discards.length;
  const lastCount = useRef(count);
  useLayoutEffect(() => {
    if (count > lastCount.current) landDiscard(riverRef.current?.lastElementChild ?? null);
    lastCount.current = count;
  }, [count]);
  return (
    <section className={`${styles.band} ${styles.me}`} data-active={active || undefined}>
      <div className={styles.left}>
        <span className={styles.wind} data-dealer={view.round.dealer === 0 || undefined}>
          {t(`wind_${me.wind}` as StringKey)}
        </span>
        <span className={styles.score}>{me.score.toLocaleString()}</span>
        {riverCols === 9 && waits && <div className={styles.waitsSlot}>{waits}</div>}
        <div className={styles.table}>
          <div className={styles.dora} aria-label={t("dora")}>
            {view.dora.map((d, i) => (
              <Tile key={i} code={d} size="river" style={small} />
            ))}
            {Array.from({ length: hidden }, (_, i) => (
              <Tile key={`b${i}`} back size="river" style={small} />
            ))}
          </div>
          <div className={styles.counters}>
            <span title={t("riichiSticks")}>
              <Tenbo kind="1000" width={24} />×{view.round.riichiSticks}
            </span>
            <span title={t("honba", { n: view.round.honba })}>
              <Tenbo kind="100" width={24} />×{view.round.honba}
            </span>
            <span title={t("wall", { n: view.wall ?? 0 })}>
              <i className={styles.wall} />×{view.wall ?? 0}
            </span>
          </div>
        </div>
      </div>
      <div
        className={styles.river}
        data-rows={Math.ceil(me.discards.length / riverCols)}
        // Same shrink rule as the rivals: a third row of 9 makes the tiles smaller.
        data-over={riverCols === 9 ? Math.max(0, Math.ceil(me.discards.length / 9) - 2) || undefined : undefined}
        data-flight
        ref={riverRef}
        style={{ ["--river-cols" as string]: riverCols }}
      >
        {me.riichi && (
          <div className={styles.riichiLine}>
            <Tenbo kind="1000" width="calc(var(--river-tile) * 2)" />
          </div>
        )}
        {me.discards.map((code, i) => (
          <Tile key={`${i}-${code}`} code={code} size="river" sideways={me.riichiIndex === i} />
        ))}
      </div>
      {riverCols !== 9 && waits && <div className={styles.side}>{waits}</div>}
    </section>
  );
}
