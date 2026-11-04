import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { GameView, TileCode, WinnerInfo, WinResult } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import { Portrait } from "./Portrait";
import { ScoreCalc } from "./ScoreCalc";
import { handValue } from "../handValue";
import { RivalHands } from "./RivalHands";
import { fxScale } from "../tableFx";
import { voice } from "../../game/audio";
import { PLAYER_VOICE, yakuClips } from "../../game/yakuVoice";

/**
 * A win is laid out step by step (Settings -> Table animations): the hand's
 * tiles go down one by one, the winning tile last with a pop, then each
 * yaku row (your voice names the yaku it knows as its row appears), the ura
 * indicators turn over, and the points count up; the rest of the card
 * follows. A tap on the card shows everything at once. Times in ms before
 * the effects factor.
 */
const STEP = { tile: 45, start: 120, winGap: 120, afterWin: 380, row: 380, count: 700 };

/** Dora rows of a winner: dora / red fives / ura when the engine splits them. */
function doraRowsOf(w: WinnerInfo): [StringKey, number][] {
  const yakuHan = w.yaku.reduce((sum, y) => sum + y.han, 0);
  const dora = w.yakuman ? 0 : Math.max(0, w.han - yakuHan);
  const rows: [StringKey, number][] = w.calc
    ? [
        ["doraHan", w.calc.dora],
        ["akaHan", w.calc.aka],
        ["uraHan", w.calc.ura],
      ]
    : [["doraHan", dora]];
  return rows.filter(([, v]) => v > 0);
}

function winTimeline(w: WinnerInfo, doraShown: boolean) {
  const tiles = w.hand.length + w.melds.reduce((n, m) => n + m.tiles.length, 0);
  const win = STEP.start + tiles * STEP.tile + STEP.winGap;
  const rows0 = win + STEP.afterWin;
  const ura = Boolean(w.calc?.uraIndicators && w.calc.uraIndicators.length > 0);
  const rows = w.yaku.length + (w.yakuman ? 0 : doraRowsOf(w).length + (doraShown ? 1 : 0) + (ura ? 1 : 0));
  const total = rows0 + rows * STEP.row;
  return { win, rows0, total, end: total + STEP.count };
}

const delay = (ms: number, k: number): CSSProperties => ({ ["--d" as string]: `${Math.round(ms * k)}ms` });

/** A number that counts up from 0 after `delayMs` (or shows its value). */
function CountUp({ value, delayMs, ms, run }: { value: number; delayMs: number; ms: number; run: boolean }) {
  const [shown, setShown] = useState(run ? 0 : value);
  useEffect(() => {
    if (!run) {
      setShown(value);
      return;
    }
    setShown(0);
    let raf = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / ms);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, delayMs, ms, run]);
  // Not running (skipped, or animations off): the final value in this very
  // render, not after the effect (a frame of the half-counted number).
  return <>{(run ? shown : value).toLocaleString()}</>;
}
import styles from "./Overlay.module.css";

interface RoundResultProps {
  view: GameView;
  cast: CharacterDef[];
  busy: boolean;
  onNext: () => void;
}

export function RoundResult({ view, cast, busy, onNext }: RoundResultProps) {
  const { t, charName, yakuName } = useApp();
  const [showHands, setShowHands] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const result = view.result;
  const k = fxScale();
  const reveal = k > 0 && !skipped && result?.type === "win";
  const doraShown = view.dora.length > 0;
  const end = result?.type === "win" ? Math.max(...result.winners.map((w) => winTimeline(w, doraShown).end)) : 0;
  // Your own win: the voice names each yaku as its row appears.
  const mine = result?.type === "win" ? result.winners.find((w) => w.seat === 0) : undefined;
  useEffect(() => {
    if (!reveal || !mine) return;
    const tl = winTimeline(mine, doraShown);
    const timers = yakuClips(mine.yaku).map(({ index, clip }) =>
      window.setTimeout(() => void voice.play(PLAYER_VOICE, `yaku_${clip}`), (tl.rows0 + index * STEP.row) * k),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, mine]);
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
      <div
        className={`panel ${styles.card}`}
        data-reveal={reveal || undefined}
        data-revealing-until={reveal ? Math.round(end * k) : undefined}
        onClick={() => setSkipped(true)}
      >
        {featured && featuredChar && (
          <div className={styles.closeup} style={{ ["--c" as string]: featuredChar.color }}>
            <Portrait character={featuredChar} emotion={featured.emotion} size={96} round />
          </div>
        )}
        {result.type === "win" ? (
          <WinBody result={result} doraIndicators={view.dora} nameOf={nameOf} yakuName={yakuName} reveal={reveal} k={k} />
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
        <ul className={styles.list} data-rv style={delay(end, k)}>
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

        {result.hands && result.hands.length > 0 && (
          <div data-rv style={delay(end, k)}>
            <button className={styles.toggle} onClick={() => setShowHands((v) => !v)} aria-expanded={showHands} data-hands-toggle>
              {t("rivalHands")} {showHands ? "▾" : "›"}
            </button>
            {showHands && <RivalHands hands={result.hands} cast={cast} />}
          </div>
        )}

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
  reveal,
  k,
}: {
  reveal: boolean;
  k: number;
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
        // Dora split into dora / red fives / ura when the engine reports it.
        const doraRows = doraRowsOf(w);
        const payer = !result.tsumo && result.from !== null ? (result.from === 0 ? "you" : nameOf(result.from)) : null;
        const tl = winTimeline(w, doraIndicators.length > 0);
        let tileN = 0;
        const tileDelay = () => delay(STEP.start + STEP.tile * tileN++, k);
        let rowN = 0;
        const rowDelay = () => delay(tl.rows0 + STEP.row * rowN++, k);
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
                <Tile key={i} code={c} size="meld" style={tileDelay()} />
              ))}
              {w.winTile && (
                <span className={styles.winTile} title={t(result.tsumo ? "tsumoWin" : "ronWin")} data-rv="win" style={delay(tl.win, k)}>
                  <Tile code={w.winTile} size="meld" highlight />
                </span>
              )}
              {w.melds.map((m, i) => (
                <span key={`m${i}`} className={styles.meldGroup}>
                  {m.tiles.map((c, j) => (
                    <Tile key={j} code={c} size="meld" style={tileDelay()} />
                  ))}
                </span>
              ))}
            </div>
            <ul className={styles.yaku}>
              {w.yaku.map((y) => (
                <li key={y.key} data-rv style={rowDelay()}>
                  <span>{yakuName(y.key, y.en)}</span>
                  <span>{w.yakuman ? t("yakuman") : t("han", { n: y.han })}</span>
                </li>
              ))}
              {!w.yakuman &&
                doraRows.map(([key, v]) => (
                    <li key={key} data-rv style={rowDelay()}>
                      <span>{t(key)}</span>
                      <span>{t("han", { n: v })}</span>
                    </li>
                  ))}
              {!w.yakuman && doraIndicators.length > 0 && (
                <li data-rv style={rowDelay()}>
                  <span>{t("doraIndicator")}</span>
                  <span className={styles.calcTiles}>
                    {doraIndicators.map((c, i) => (
                      <Tile key={i} code={c} size="meld" />
                    ))}
                  </span>
                </li>
              )}
              {!w.yakuman && w.calc?.uraIndicators && w.calc.uraIndicators.length > 0 && (
                <li data-rv data-ura style={rowDelay()}>
                  <span>{t("uraIndicator")}</span>
                  <span className={styles.calcTiles}>
                    {w.calc.uraIndicators.map((c, i) => (
                      <Tile key={i} code={c} size="meld" />
                    ))}
                  </span>
                </li>
              )}
            </ul>
            <div className={styles.total} data-rv style={delay(tl.total, k)}>
              {w.yakuman ? t("yakuman") : `${t("han", { n: w.han })} · ${t("fu", { n: w.fu })}`}
              <b data-points={handValue(w)}>
                {t("points", { n: "\u0000" })
                  .split("\u0000")
                  .flatMap((part, i) =>
                    i === 0 ? [part] : [<CountUp key="n" value={handValue(w)} delayMs={tl.total * k} ms={STEP.count * k} run={reveal} />, part],
                  )}
              </b>
            </div>
            <div data-rv style={delay(tl.end, k)}>
              <GainExtras winner={w} />
              <ScoreCalc winner={w} payer={payer} />
            </div>
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
