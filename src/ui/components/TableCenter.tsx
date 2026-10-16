import type { GameView } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { Tile } from "./Tile";
import { Tenbo } from "./Tenbo";
import styles from "./Band.module.css";

/**
 * Portrait: the middle of the table between the rivals and the player — the
 * dora indicators on the left, tiles left in the wall, honba and riichi
 * sticks on the right. (Landscape keeps them in the player's column.)
 */
const DORA_TILE = { ["--tw" as string]: "24px" };

export function TableCenter({ view }: { view: GameView }) {
  const { t } = useApp();
  return (
    <div className={styles.center} data-table-center>
      <div className={styles.centerDora} aria-label={t("dora")}>
        <span className={styles.centerLabel}>{t("dora")}</span>
        {view.dora.map((d, i) => (
          <Tile key={i} code={d} size="river" style={DORA_TILE} />
        ))}
      </div>
      <div className={styles.centerCounters}>
        <span title={t("wall", { n: view.wall ?? 0 })}>
          <i className={styles.wall} />
          {view.wall ?? 0}
        </span>
        <span title={t("honba", { n: view.round.honba })}>
          <Tenbo kind="100" width={24} />
          {view.round.honba}
        </span>
        <span title={t("riichiSticks")}>
          <Tenbo kind="1000" width={24} />
          {view.round.riichiSticks}
        </span>
      </div>
    </div>
  );
}
