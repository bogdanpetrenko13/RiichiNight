import type { GameView } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { DeadWall } from "./DeadWall";
import { Tenbo } from "./Tenbo";
import styles from "./TableInfo.module.css";

/**
 * Portrait: the middle of the table between the rivals and the player — the
 * dead wall on the left as five tiles, as on a real table (dora indicators
 * face up, the rest face down; a kan turns the next one over), tiles left in
 * the wall, honba and riichi sticks on the right. Landscape shows the same
 * five tiles in the player's column.
 */
const DORA_TILE = { ["--tw" as string]: "18px" };

export function TableCenter({ view }: { view: GameView }) {
  const { t } = useApp();
  return (
    <div className={styles.center} data-table-center>
      <DeadWall dora={view.dora} round={view.round.index} tileStyle={DORA_TILE} className={styles.centerDora} label={t("dora")} />
      <TableCounters view={view} />
    </div>
  );
}

/**
 * Tiles left in the wall, honba sticks, riichi sticks — the same look and
 * order in the portrait table centre and the landscape player column
 * (`compact`: a little smaller to fit the column).
 */
export function TableCounters({ view, compact = false }: { view: GameView; compact?: boolean }) {
  const { t } = useApp();
  return (
    <div className={styles.counters} data-compact={compact || undefined}>
      <span title={t("wall", { n: view.wall ?? 0 })}>
        <i className={styles.wall} />
        {view.wall ?? 0}
      </span>
      <span title={t("honba", { n: view.round.honba })}>
        <Tenbo kind="100" width="var(--cnt-stick)" />
        {view.round.honba}
      </span>
      <span title={t("riichiSticks")} data-sticks-counter>
        <Tenbo kind="1000" width="var(--cnt-stick)" />
        {view.round.riichiSticks}
      </span>
    </div>
  );
}
