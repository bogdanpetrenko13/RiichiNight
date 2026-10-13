import { useApp } from "../../app/AppContext";
import { LANGS, type StringKey } from "../../i18n/strings";
import type { GameRules } from "../../engine/protocol";
import type { RewardRules } from "../../game/rewards";
import { TABLE_THEMES, TILESETS, type AiSpeed, type Settings, type TableTheme } from "../../game/storage";
import { TileRow } from "../components/TileRow";
import styles from "./Menus.module.css";

const SPEEDS: AiSpeed[] = ["fast", "normal", "slow"];
const REWARD_RULES: (keyof RewardRules)[] = ["tsumoAdvancesAll", "bigHandBonus", "regressOnLoss", "firstPlaceBonus"];
const GAME_TOGGLES: (keyof Omit<GameRules, "gameLength">)[] = ["tobi", "agariYame", "kiriageMangan", "openTanyao"];

/** Swatch colours for the table themes (mirrors --felt-600 in tokens.css). */
const FELT: Record<TableTheme, string> = {
  jade: "#1d3d35",
  night: "#1a2a52",
  wine: "#4a1a2a",
  walnut: "#3f2a18",
  slate: "#2b3036",
};

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t, settings, updateSettings, setUnlocks } = useApp();

  const check = (key: BoolKey, label: StringKey) => (
    <label className={styles.check}>
      <input type="checkbox" checked={settings[key]} onChange={(e) => updateSettings({ [key]: e.target.checked })} />
      <span>{t(label)}</span>
    </label>
  );

  const setRules = (patch: Partial<GameRules>) => updateSettings({ gameRules: { ...settings.gameRules, ...patch } });

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

        {/* ---- appearance ---- */}
        <h2 className={styles.section}>{t("appearance")}</h2>
        <div className={styles.field}>
          <span>{t("tileset")}</span>
          <div className={styles.segmented}>
            {TILESETS.map((ts) => (
              <button key={ts} data-on={settings.tileset === ts || undefined} onClick={() => updateSettings({ tileset: ts })}>
                {t(`tileset_${ts}` as StringKey)}
              </button>
            ))}
          </div>
          <TileRow text="123m 5p 9s 1567z" size={30} />
        </div>
        <div className={styles.field}>
          <span>{t("tableTheme")}</span>
          <div className={styles.swatches}>
            {TABLE_THEMES.map((th) => (
              <button
                key={th}
                className={styles.swatch}
                data-on={settings.table === th || undefined}
                style={{ background: FELT[th] }}
                onClick={() => updateSettings({ table: th })}
              >
                {t(`table_${th}` as StringKey)}
              </button>
            ))}
          </div>
        </div>

        {/* ---- gameplay ---- */}
        <h2 className={styles.section}>{t("gameplay")}</h2>
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
        {check("showWaitHints", "waitHints")}
        {check("autoDiscardRiichi", "autoDiscardRiichi")}
        {check("dealAnimation", "dealAnimation")}
        {check("speechBubbles", "speechBubbles")}

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
        <label className={styles.field}>
          <span>{t("musicVolume")}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.musicVolume}
            onChange={(e) => updateSettings({ musicVolume: Number(e.target.value) })}
          />
        </label>

        {/* ---- rules ---- */}
        <h2 className={styles.section}>{t("gameRules")}</h2>
        <p className={styles.note}>{t("rulesNote")}</p>
        <div className={styles.field}>
          <span>{t("gameLength")}</span>
          <div className={styles.segmented}>
            {(["east", "hanchan"] as const).map((len) => (
              <button
                key={len}
                data-on={settings.gameRules.gameLength === len || undefined}
                onClick={() => setRules({ gameLength: len })}
              >
                {t(`length_${len}`)}
              </button>
            ))}
          </div>
        </div>
        {GAME_TOGGLES.map((key) => (
          <label key={key} className={styles.check}>
            <input
              type="checkbox"
              checked={settings.gameRules[key]}
              onChange={(e) => setRules({ [key]: e.target.checked })}
            />
            <span>{t(`rule_${key}` as StringKey)}</span>
          </label>
        ))}

        {/* ---- rewards ---- */}
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
            {REWARD_RULES.map((key) => (
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
