import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { ACHIEVEMENTS } from "../../game/stats";
import styles from "./StatsScreen.module.css";

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");
const num = (n: number | null) => (n === null ? "—" : n.toLocaleString());

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const { t, stats: s, achievements, resetStats, yakuName } = useApp();
  const avgPlace =
    s.matches > 0 ? (s.placements.reduce((sum, n, i) => sum + n * (i + 1), 0) / s.matches).toFixed(2) : "—";
  const topYaku = Object.entries(s.yaku)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxPlace = Math.max(1, ...s.placements);

  const rows: [StringKey, string][] = [
    ["statsMatches", num(s.matches)],
    ["statsAvgPlace", avgPlace],
    ["statsHands", num(s.hands)],
    ["statsWinRate", pct(s.handsWon, s.hands)],
    ["statsDealInRate", pct(s.dealIns, s.hands)],
    ["statsTsumoRon", `${s.tsumoWins} / ${s.ronWins}`],
    ["statsRiichi", num(s.riichi)],
    ["statsBestHand", s.bestHand ? s.bestHand.toLocaleString() : "—"],
    ["statsAvgScore", s.matches ? Math.round(s.scoreSum / s.matches).toLocaleString() : "—"],
    ["statsHighLow", `${num(s.scoreHigh)} / ${num(s.scoreLow)}`],
  ];

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1>{t("stats")}</h1>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          {s.hands === 0 && <p className="muted">{t("statsNoData")}</p>}
          <dl className={styles.list}>
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{t(k)}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.card}>
          <h2>{t("statsPlacements")}</h2>
          <div className={styles.bars}>
            {s.placements.map((n, i) => (
              <div key={i} className={styles.bar}>
                <span>{i + 1}</span>
                <div className={styles.track}>
                  <div style={{ width: `${(n / maxPlace) * 100}%` }} data-place={i + 1} />
                </div>
                <b>{n}</b>
              </div>
            ))}
          </div>
          {topYaku.length > 0 && (
            <>
              <h2>{t("statsTopYaku")}</h2>
              <ol className={styles.yaku}>
                {topYaku.map(([key, n]) => (
                  <li key={key}>
                    <span>{yakuName(key, key.replace(/_/g, " "))}</span>
                    <b>{n}</b>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        <section className={styles.card}>
          <h2>{t("achievements")}</h2>
          <ul className={styles.achievements}>
            {ACHIEVEMENTS.map((a) => {
              const at = achievements[a.id];
              return (
                <li key={a.id} data-done={at ? "" : undefined}>
                  <span className={styles.icon}>{at ? a.icon : "🔒"}</span>
                  <span>
                    <b>{t(`ach_${a.id}_name` as StringKey)}</b>
                    <small>{t(`ach_${a.id}_desc` as StringKey)}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className={styles.footer}>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (window.confirm(t("resetStatsConfirm"))) resetStats();
          }}
        >
          {t("resetStats")}
        </button>
      </div>
    </div>
  );
}
