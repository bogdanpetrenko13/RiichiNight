import type { GameView } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import type { StageChange } from "../../game/rewards";
import { useApp } from "../../app/AppContext";
import { RewardChips } from "./RewardChips";
import styles from "./Overlay.module.css";

interface GameOverProps {
  view: GameView;
  cast: CharacterDef[];
  changes: StageChange[];
  onWatch: () => void;
  onAgain: () => void;
  onTitle: () => void;
}

export function GameOver({ view, cast, changes, onWatch, onAgain, onTitle }: GameOverProps) {
  const { t, charName, settings } = useApp();
  const scores = view.players.map((p) => p.score);
  const order = [0, 1, 2, 3].sort((a, b) => scores[b] - scores[a] || a - b);
  const nameOf = (seat: number) => (seat === 0 ? t("you") : charName(cast[seat - 1]));
  const canWatch = settings.rewardScenes && changes.some((c) => c.to > c.from);

  return (
    <div className={styles.backdrop}>
      <div className={`panel ${styles.card}`}>
        <h2 className={styles.title}>{t("gameOver")}</h2>
        <ol className={styles.placements}>
          {order.map((seat, i) => (
            <li key={seat} data-you={seat === 0 || undefined}>
              <span className={styles.place}>{t("placement", { n: i + 1 })}</span>
              <span>{nameOf(seat)}</span>
              <b>{scores[seat].toLocaleString()}</b>
            </li>
          ))}
        </ol>
        {settings.rewardScenes && <RewardChips changes={changes} />}
        <div className={styles.buttons}>
          {canWatch && (
            <button className="btn btn-primary" onClick={onWatch}>
              {t("watchScene")}
            </button>
          )}
          <button className="btn" onClick={onAgain}>
            {t("playAgain")}
          </button>
          <button className="btn btn-ghost" onClick={onTitle}>
            {t("toTitle")}
          </button>
        </div>
      </div>
    </div>
  );
}
