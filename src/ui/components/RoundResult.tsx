import type { GameView, WinResult } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import type { StageChange } from "../../game/rewards";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import { RewardChips } from "./RewardChips";
import styles from "./Overlay.module.css";

interface RoundResultProps {
  view: GameView;
  cast: CharacterDef[];
  changes: StageChange[];
  busy: boolean;
  onNext: () => void;
  onWatch: () => void;
}

export function RoundResult({ view, cast, changes, busy, onNext, onWatch }: RoundResultProps) {
  const { t, charName, yakuName, settings } = useApp();
  const result = view.result;
  if (!result) return null;
  const nameOf = (seat: number) => (seat === 0 ? t("you") : cast[seat - 1] ? charName(cast[seat - 1]) : `#${seat}`);
  const canWatch = settings.rewardScenes && changes.some((c) => c.to > c.from);

  return (
    <div className={styles.backdrop}>
      <div className={`panel ${styles.card}`}>
        {result.type === "win" ? (
          <WinBody result={result} nameOf={nameOf} yakuName={yakuName} />
        ) : (
          <>
            <h2 className={styles.title}>{t(`drawKind_${result.kind}` as StringKey) || t("draw")}</h2>
            {result.kind === "exhaustive_draw" && (
              <ul className={styles.list}>
                {view.players.map((p) => (
                  <li key={p.seat}>
                    <span>{nameOf(p.seat)}</span>
                    <span className={result.tenpai.includes(p.seat) ? styles.good : styles.mutedText}>
                      {result.tenpai.includes(p.seat) ? t("tenpai") : t("noten")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <ul className={styles.list}>
          {result.deltas.map((d, seat) => (
            <li key={seat}>
              <span>{nameOf(seat)}</span>
              <span className={styles.scoreCell}>
                {result.scores[seat].toLocaleString()}
                {d !== 0 && (
                  <b className={d > 0 ? styles.good : styles.bad}>
                    {d > 0 ? "+" : ""}
                    {d.toLocaleString()}
                  </b>
                )}
              </span>
            </li>
          ))}
        </ul>

        {settings.rewardScenes && <RewardChips changes={changes} />}

        <div className={styles.buttons}>
          {canWatch && (
            <button className="btn btn-primary" onClick={onWatch}>
              {t("watchScene")}
            </button>
          )}
          <button className="btn" onClick={onNext} disabled={busy}>
            {view.gameOver ? t("continueBtn") : t("nextRound")}
          </button>
        </div>
      </div>
    </div>
  );
}

function WinBody({
  result,
  nameOf,
  yakuName,
}: {
  result: WinResult;
  nameOf: (seat: number) => string;
  yakuName: (key: string, en: string) => string;
}) {
  const { t } = useApp();
  return (
    <>
      {result.winners.map((w) => {
        const yakuHan = w.yaku.reduce((sum, y) => sum + y.han, 0);
        const dora = w.yakuman ? 0 : Math.max(0, w.han - yakuHan);
        return (
          <section key={w.seat} className={styles.winner}>
            <h2 className={styles.title}>
              {nameOf(w.seat)} · {result.tsumo ? t("tsumoWin") : t("ronWin")}
            </h2>
            {!result.tsumo && result.from !== null && (
              <div className={styles.sub}>{t("dealtInBy", { name: nameOf(result.from) })}</div>
            )}
            <div className={styles.hand}>
              {w.hand.map((c, i) => (
                <Tile key={i} code={c} size="meld" />
              ))}
              {w.melds.map((m, i) => (
                <span key={`m${i}`} className={styles.meldGroup}>
                  {m.tiles.map((c, j) => (
                    <Tile key={j} code={c} size="meld" />
                  ))}
                </span>
              ))}
            </div>
            <ul className={styles.yaku}>
              {w.yaku.map((y) => (
                <li key={y.key}>
                  <span>{yakuName(y.key, y.en)}</span>
                  <span>{w.yakuman ? t("yakuman") : t("han", { n: y.han })}</span>
                </li>
              ))}
              {dora > 0 && (
                <li>
                  <span>{t("doraHan")}</span>
                  <span>{t("han", { n: dora })}</span>
                </li>
              )}
            </ul>
            <div className={styles.total}>
              {w.yakuman ? t("yakuman") : `${t("han", { n: w.han })} · ${t("fu", { n: w.fu })}`}
              <b>{t("points", { n: w.points.toLocaleString() })}</b>
            </div>
          </section>
        );
      })}
    </>
  );
}
