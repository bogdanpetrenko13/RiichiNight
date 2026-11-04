import type { GameView } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import styles from "./RoundSplash.module.css";

/**
 * A short splash as each hand starts (Settings -> Table animations): the
 * round ("East 2"), honba and sticks left on the table, and who deals. On
 * the first hand of a match it names the first East (seats are drawn).
 */
export function RoundSplash({ view, cast, ms }: { view: GameView; cast: CharacterDef[]; ms: number }) {
  const { t, charName } = useApp();
  const r = view.round;
  const first = r.index === 1;
  const dealer = r.dealer;
  const name = dealer === 0 ? null : cast[dealer - 1] ? charName(cast[dealer - 1]).split(" ")[0] : null;
  const who = first
    ? name
      ? t("splashFirstEast", { name })
      : t("splashYouFirst")
    : name
      ? t("splashDealer", { name })
      : t("splashYouDeal");
  const extras = [r.honba ? t("honba", { n: r.honba }) : null, r.riichiSticks ? t("splashSticks", { n: r.riichiSticks }) : null].filter(Boolean);
  return (
    <div className={styles.splash} style={{ animationDuration: `${ms}ms` }} role="status" data-round-splash>
      <b className={styles.round}>{t("roundLabel", { wind: t(`wind_${r.wind}` as StringKey), n: r.number })}</b>
      {extras.length > 0 && <span className={styles.extras}>{extras.join(" · ")}</span>}
      <span className={styles.dealer} data-you={dealer === 0 || undefined}>
        {who}
      </span>
    </div>
  );
}
