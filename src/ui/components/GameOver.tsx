import type { GameView } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import type { Finale } from "../../game/useGameController";
import { Portrait } from "./Portrait";
import { useApp } from "../../app/AppContext";
import styles from "./Overlay.module.css";

interface GameOverProps {
  view: GameView;
  cast: CharacterDef[];
  onAgain: () => void;
  onTitle: () => void;
  /** The winner's (or, when you win, the strongest heroine's) last word. */
  finale?: Finale | null;
}

export function GameOver({ view, cast, onAgain, onTitle, finale = null }: GameOverProps) {
  const { t, charName } = useApp();
  const scores = view.players.map((p) => p.score);
  // Ties: the seat closer to the first East ranks higher (as in the engine).
  const first = view.round.startDealer ?? 0;
  const fromFirst = (s: number) => (s - first + 4) % 4;
  const order = [0, 1, 2, 3].sort((a, b) => scores[b] - scores[a] || fromFirst(a) - fromFirst(b));
  const nameOf = (seat: number) => (seat === 0 ? t("you") : charName(cast[seat - 1]));

  return (
    <div className={styles.backdrop}>
      <div className={`panel ${styles.card}`}>
        <h2 className={styles.title}>{t("gameOver")}</h2>
        {finale && cast[finale.seat - 1] && (
          <figure className={styles.finale} style={{ ["--c" as string]: cast[finale.seat - 1].color }}>
            <Portrait
              character={cast[finale.seat - 1]}
              emotion={order[0] === finale.seat ? "happy" : "neutral"}
              size={56}
              round
            />
            <blockquote>
              <p>{finale.text}</p>
              <figcaption>{charName(cast[finale.seat - 1])}</figcaption>
            </blockquote>
          </figure>
        )}
        <ol className={styles.placements}>
          {order.map((seat, i) => (
            <li key={seat} data-you={seat === 0 || undefined}>
              <span className={styles.place}>{t("placement", { n: i + 1 })}</span>
              <span>{nameOf(seat)}</span>
              <b>{scores[seat].toLocaleString()}</b>
            </li>
          ))}
        </ol>
        <div className={styles.buttons}>
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
