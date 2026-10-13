import type { GameView } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import styles from "./Board.module.css";

const ROTATION = [0, -90, 180, 90]; // seat 0 bottom, 1 right, 2 top, 3 left
const WIND_GLYPH = { east: "東", south: "南", west: "西", north: "北" } as const;

interface BoardProps {
  view: GameView;
  /** Seat whose last discard is being claimed (gets highlighted). */
  claimFrom?: number | null;
}

/** Square felt board: four rivers around a central round/score box. */
export function Board({ view, claimFrom }: BoardProps) {
  const { t } = useApp();
  const { round } = view;

  return (
    <div className={styles.board}>
      {view.players.map((p) => (
        <div key={p.seat} className={styles.slot} style={{ transform: `rotate(${ROTATION[p.seat]}deg)` }}>
          <div className={styles.river}>
            {p.discards.map((code, i) => {
              const isLast = i === p.discards.length - 1;
              return (
                <Tile
                  key={`${i}-${code}`}
                  code={code}
                  size="river"
                  sideways={p.riichiIndex === i}
                  highlight={isLast && claimFrom === p.seat}
                />
              );
            })}
          </div>
          <div
            className={styles.seatLabel}
            data-current={view.current === p.seat && view.status !== "round_over" ? "" : undefined}
            data-dealer={round.dealer === p.seat ? "" : undefined}
          >
            {p.riichi && <span className={styles.stick} aria-label="riichi" />}
            {/* Counter-rotated so the glyph and score always read upright. */}
            <span className={styles.upright} style={{ transform: `rotate(${-ROTATION[p.seat]}deg)` }}>
              <span className={styles.wind}>{WIND_GLYPH[p.wind]}</span>
              {p.seat === 0 && <span className={styles.score}>{p.score.toLocaleString()}</span>}
            </span>
          </div>
        </div>
      ))}

      <div className={styles.center}>
        <div className={styles.roundName}>
          {t("roundLabel", { wind: t(`wind_${round.wind}` as StringKey), n: round.number })}
        </div>
        <div className={styles.counters}>
          <span>{t("honba", { n: round.honba })}</span>
          <span className={styles.sticks}>
            <span className={styles.stickIcon} />×{round.riichiSticks}
          </span>
        </div>
        <div className={styles.dora}>
          {view.dora.map((d, i) => (
            <Tile key={i} code={d} size="mini" style={{ ["--tw" as string]: "calc(var(--board) * 0.042)" }} />
          ))}
        </div>
        <div className={styles.wall}>{t("wall", { n: view.wall ?? 0 })}</div>
      </div>
    </div>
  );
}
