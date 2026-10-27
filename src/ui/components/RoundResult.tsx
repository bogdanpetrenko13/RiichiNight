import type { GameView, TileCode, WinnerInfo, WinResult } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import { Portrait } from "./Portrait";
import { ScoreCalc } from "./ScoreCalc";
import { handValue } from "../handValue";
import styles from "./Overlay.module.css";

interface RoundResultProps {
  view: GameView;
  cast: CharacterDef[];
  busy: boolean;
  onNext: () => void;
}

export function RoundResult({ view, cast, busy, onNext }: RoundResultProps) {
  const { t, charName, yakuName } = useApp();
  const result = view.result;
  if (!result) return null;
  const nameOf = (seat: number) => (seat === 0 ? t("you") : cast[seat - 1] ? charName(cast[seat - 1]) : `#${seat}`);

  // Close-up: a heroine who won smiles; the one who dealt in to you frowns.
  let featured: { seat: number; emotion: "happy" | "troubled" } | null = null;
  if (result.type === "win") {
    const rivalWinner = result.winners.find((w) => w.seat > 0);
    if (rivalWinner) featured = { seat: rivalWinner.seat, emotion: "happy" };
    else if (!result.tsumo && result.from !== null && result.from > 0) featured = { seat: result.from, emotion: "troubled" };
  }
  const featuredChar = featured ? cast[featured.seat - 1] : undefined;

  return (
    <div className={styles.backdrop} data-hand={view.round.index}>
      <div className={`panel ${styles.card}`}>
        {featured && featuredChar && (
          <div className={styles.closeup} style={{ ["--c" as string]: featuredChar.color }}>
            <Portrait character={featuredChar} emotion={featured.emotion} size={96} round />
          </div>
        )}
        {result.type === "win" ? (
          <WinBody result={result} doraIndicators={view.dora} nameOf={nameOf} yakuName={yakuName} />
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

        {/* Scores: each heroine's face shows how the hand went for her. */}
        <ul className={styles.list}>
          {result.deltas.map((d, seat) => (
            <li key={seat}>
              <span className={styles.who}>
                {seat > 0 && cast[seat - 1] ? (
                  <Portrait
                    character={cast[seat - 1]}
                    emotion={d > 0 ? "happy" : d < 0 ? "troubled" : "neutral"}
                    size={36}
                    round
                    className={styles.face}
                  />
                ) : (
                  <span className={styles.youFace}>{t("you")}</span>
                )}
                {nameOf(seat)}
              </span>
              <span className={styles.scoreCell}>
                {result.scores[seat].toLocaleString()}
                {d !== 0 && (
                  <b className={d > 0 ? styles.good : styles.bad}>
                    {d > 0 ? "+" : ""}
                    {d.toLocaleString()}
                  </b>
                )}
              </span>
              {d !== 0 && result.riichiPaid?.includes(seat) && <small className={styles.deltaNote}>{t("riichiPaidNote")}</small>}
            </li>
          ))}
        </ul>

        <div className={styles.buttons}>
          <button className="btn btn-primary" onClick={onNext} disabled={busy}>
            {view.gameOver ? t("continueBtn") : t("nextRound")}
          </button>
        </div>
      </div>
    </div>
  );
}

function WinBody({
  result,
  doraIndicators,
  nameOf,
  yakuName,
}: {
  result: WinResult;
  /** Dora indicators of the hand (shown next to the ura indicators). */
  doraIndicators: TileCode[];
  nameOf: (seat: number) => string;
  yakuName: (key: string, en: string) => string;
}) {
  const { t } = useApp();
  return (
    <>
      {result.winners.map((w) => {
        const yakuHan = w.yaku.reduce((sum, y) => sum + y.han, 0);
        const dora = w.yakuman ? 0 : Math.max(0, w.han - yakuHan);
        // Dora split into dora / red fives / ura when the engine reports it.
        const doraRows: [StringKey, number][] = w.calc
          ? [
              ["doraHan", w.calc.dora],
              ["akaHan", w.calc.aka],
              ["uraHan", w.calc.ura],
            ]
          : [["doraHan", dora]];
        const payer = !result.tsumo && result.from !== null ? (result.from === 0 ? "you" : nameOf(result.from)) : null;
        return (
          <section key={w.seat} className={styles.winner}>
            <h2 className={styles.title}>
              {nameOf(w.seat)} · {result.tsumo ? t("tsumoWin") : t("ronWin")}
            </h2>
            {!result.tsumo && result.from !== null && (
              <div className={styles.sub}>
                {result.from === 0 ? t("dealtInByYou") : t("dealtInBy", { name: nameOf(result.from) })}
              </div>
            )}
            <div
              className={styles.hand}
              data-win-hand
              style={{
                // Tile slots on the line: hand + winning tile + calls, plus the gaps.
                ["--n" as string]:
                  w.hand.length + (w.winTile ? 1.25 : 0) + w.melds.reduce((n, m) => n + m.tiles.length + 0.25, 0),
              }}
            >
              {w.hand.map((c, i) => (
                <Tile key={i} code={c} size="meld" />
              ))}
              {w.winTile && (
                <span className={styles.winTile} title={t(result.tsumo ? "tsumoWin" : "ronWin")}>
                  <Tile code={w.winTile} size="meld" highlight />
                </span>
              )}
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
              {!w.yakuman &&
                doraRows
                  .filter(([, v]) => v > 0)
                  .map(([key, v]) => (
                    <li key={key}>
                      <span>{t(key)}</span>
                      <span>{t("han", { n: v })}</span>
                    </li>
                  ))}
              {!w.yakuman && doraIndicators.length > 0 && (
                <li>
                  <span>{t("doraIndicator")}</span>
                  <span className={styles.calcTiles}>
                    {doraIndicators.map((c, i) => (
                      <Tile key={i} code={c} size="meld" />
                    ))}
                  </span>
                </li>
              )}
              {!w.yakuman && w.calc?.uraIndicators && w.calc.uraIndicators.length > 0 && (
                <li>
                  <span>{t("uraIndicator")}</span>
                  <span className={styles.calcTiles}>
                    {w.calc.uraIndicators.map((c, i) => (
                      <Tile key={i} code={c} size="meld" />
                    ))}
                  </span>
                </li>
              )}
            </ul>
            <div className={styles.total}>
              {w.yakuman ? t("yakuman") : `${t("han", { n: w.han })} · ${t("fu", { n: w.fu })}`}
              <b>{t("points", { n: handValue(w).toLocaleString() })}</b>
            </div>
            <GainExtras winner={w} />
            <ScoreCalc winner={w} payer={payer} />
          </section>
        );
      })}
    </>
  );
}

/** "+ honba 300 · riichi sticks 2 000 = 10 000" under the headline. */
function GainExtras({ winner }: { winner: WinnerInfo }) {
  const { t } = useApp();
  const honba = winner.calc?.honba ?? 0;
  const sticks = winner.calc?.sticks ?? 0;
  if (!honba && !sticks) return null;
  const total = handValue(winner) + honba + sticks;
  const f = (x: number) => x.toLocaleString();
  const key = honba && sticks ? "gainExtras" : honba ? "gainHonba" : "gainSticks";
  return <p className={styles.gainExtras}>{t(key, { honba: f(honba), sticks: f(sticks), total: f(total) })}</p>;
}
