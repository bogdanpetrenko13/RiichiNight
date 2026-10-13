import type { GameView } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import styles from "./PlayerBand.module.css";

/**
 * The player's own band: seat wind and score, table counters and dora on the
 * left, own river on the right (the hand itself sits below this band).
 */
export function PlayerBand({ view, active }: { view: GameView; active: boolean }) {
  const { t } = useApp();
  const me = view.players[0];
  const lastIndex = me.discards.length - 1;
  // Dora indicators shown face up, the rest of the dead-wall row as backs (5 total).
  const hidden = Math.max(0, 5 - view.dora.length);
  return (
    <section className={styles.band} data-active={active || undefined}>
      <div className={styles.side}>
        <span className={styles.wind} data-dealer={view.round.dealer === 0 || undefined}>
          {t(`wind_${me.wind}` as StringKey)}
        </span>
        <span className={styles.score}>{me.score.toLocaleString()}</span>
        <div className={styles.dora} aria-label={t("dora")}>
          {view.dora.map((d, i) => (
            <Tile key={i} code={d} size="river" />
          ))}
          {Array.from({ length: hidden }, (_, i) => (
            <Tile key={`b${i}`} back size="river" />
          ))}
        </div>
        <div className={styles.counters}>
          <span title={t("honba", { n: view.round.honba })}>
            <i className={styles.honba} />×{view.round.honba}
          </span>
          <span>
            <i className={styles.stick} />×{view.round.riichiSticks}
          </span>
          <span>
            <i className={styles.wall} />×{view.wall ?? 0}
          </span>
        </div>
        {me.riichi && <span className={styles.riichi}>{t("act_riichi")}!</span>}
      </div>
      <div className={styles.river}>
        {me.discards.map((code, i) => (
          <Tile key={`${i}-${code}`} code={code} size="river" sideways={me.riichiIndex === i} highlight={false} />
        ))}
        {lastIndex < 0 && <span className={styles.empty} />}
      </div>
    </section>
  );
}
