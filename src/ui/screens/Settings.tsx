import { useApp } from "../../app/AppContext";
import { LANGS, type StringKey } from "../../i18n/strings";
import type { RewardRules } from "../../game/rewards";
import type { AiSpeed } from "../../game/storage";
import styles from "./Menus.module.css";

const SPEEDS: AiSpeed[] = ["fast", "normal", "slow"];
const RULES: (keyof RewardRules)[] = ["tsumoAdvancesAll", "bigHandBonus", "regressOnLoss", "firstPlaceBonus"];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t, settings, updateSettings, setUnlocks } = useApp();

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1>{t("settings")}</h1>
      </header>

      <div className={styles.form}>
        <div className={styles.field}>
          <span>{t("language")}</span>
          <div className={styles.segmented}>
            {LANGS.map((l) => (
              <button key={l} data-on={settings.lang === l || undefined} onClick={() => updateSettings({ lang: l })}>
                {l === "ru" ? "Русский" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span>{t("aiSpeed")}</span>
          <div className={styles.segmented}>
            {SPEEDS.map((s) => (
              <button key={s} data-on={settings.aiSpeed === s || undefined} onClick={() => updateSettings({ aiSpeed: s })}>
                {t(`speed_${s}` as StringKey)}
              </button>
            ))}
          </div>
        </div>

        <label className={styles.field}>
          <span>{t("voiceVolume")}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.voiceVolume}
            onChange={(e) => updateSettings({ voiceVolume: Number(e.target.value) })}
          />
        </label>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.showWaitHints}
            onChange={(e) => updateSettings({ showWaitHints: e.target.checked })}
          />
          <span>{t("waitHints")}</span>
        </label>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={settings.rewardScenes}
            onChange={(e) => {
              const on = e.target.checked;
              // Turning scenes on always needs an explicit 18+ answer.
              if (on && !settings.adultConfirmed && !window.confirm(`${t("ageGateBody")}\n\n${t("ageGateAdult")}?`)) {
                return;
              }
              updateSettings({ rewardScenes: on, adultConfirmed: on ? true : settings.adultConfirmed });
            }}
          />
          <span>
            {t("rewardScenes")} <small className="muted">18+</small>
          </span>
        </label>

        {settings.rewardScenes && (
          <fieldset className={styles.fieldset}>
            <legend>{t("rewardRules")}</legend>
            {RULES.map((key) => (
              <label key={key} className={styles.check}>
                <input
                  type="checkbox"
                  checked={settings.rewardRules[key]}
                  onChange={(e) => updateSettings({ rewardRules: { ...settings.rewardRules, [key]: e.target.checked } })}
                />
                <span>{t(`rule_${key}` as StringKey)}</span>
              </label>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (window.confirm(t("resetConfirm"))) setUnlocks({});
              }}
            >
              {t("resetProgress")}
            </button>
          </fieldset>
        )}
      </div>
    </div>
  );
}
