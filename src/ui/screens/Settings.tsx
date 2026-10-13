import { useApp } from "../../app/AppContext";
import { LANGS, type StringKey } from "../../i18n/strings";
import type { GameRules } from "../../engine/protocol";
import type { RewardRules } from "../../game/rewards";
import { TABLE_THEMES, TILESETS, type AiSpeed, type Settings, type TableTheme } from "../../game/storage";
import { TileRow } from "../components/TileRow";
import { AppBar, Group, Row, Segmented, Switch } from "../components/Primitives";
import styles from "./SettingsScreen.module.css";

const SPEEDS: AiSpeed[] = ["fast", "normal", "slow"];
const REWARD_RULES: (keyof RewardRules)[] = ["tsumoAdvancesAll", "bigHandBonus", "regressOnLoss", "firstPlaceBonus"];
const GAME_TOGGLES: (keyof Omit<GameRules, "gameLength">)[] = ["redFives", "openTanyao", "tobi", "agariYame", "kiriageMangan"];

/** Swatch gradients for the table themes (mirror the glows in tokens.css). */
const SWATCH: Record<TableTheme, string> = {
  aurora: "linear-gradient(135deg, #2a2450, #8b5cf6 60%, #ff5c9e)",
  ocean: "linear-gradient(135deg, #15284a, #38bdf8 60%, #6366f1)",
  mint: "linear-gradient(135deg, #133630, #2dd4bf 60%, #84cc16)",
  sunset: "linear-gradient(135deg, #3a1724, #fb7185 60%, #fb923c)",
  mono: "linear-gradient(135deg, #19191e, #4a4a55 60%, #9a9aa6)",
};

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t, settings, updateSettings, setUnlocks } = useApp();

  const toggle = (key: BoolKey, label: StringKey) => (
    <Row label={t(label)}>
      <Switch label={t(label)} checked={settings[key]} onChange={(v) => updateSettings({ [key]: v })} />
    </Row>
  );
  const setRules = (patch: Partial<GameRules>) => updateSettings({ gameRules: { ...settings.gameRules, ...patch } });

  const slider = (key: "voiceVolume" | "musicVolume", label: StringKey) => (
    <Row label={t(label)}>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={settings[key]}
        onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
        aria-label={t(label)}
      />
    </Row>
  );

  return (
    <div className="screen">
      <AppBar title={t("settings")} onBack={onBack} />
      <div className="screen-body">
        <Group>
          <Row label={t("language")}>
            <Segmented
              value={settings.lang}
              options={LANGS.map((l) => ({ value: l, label: l === "ru" ? "Русский" : "English" }))}
              onChange={(lang) => updateSettings({ lang })}
            />
          </Row>
        </Group>

        <Group title={t("appearance")}>
          <Row label={t("tileset")} stacked>
            <Segmented
              value={settings.tileset}
              options={TILESETS.map((ts) => ({ value: ts, label: t(`tileset_${ts}` as StringKey) }))}
              onChange={(tileset) => updateSettings({ tileset })}
            />
            <div className={styles.preview}>
              <TileRow text="123m 5p 9s 1567z" size={30} />
            </div>
          </Row>
          <Row label={t("tableTheme")} stacked>
            <div className={styles.swatches}>
              {TABLE_THEMES.map((th) => (
                <button
                  key={th}
                  className={styles.swatch}
                  data-on={settings.table === th || undefined}
                  style={{ background: SWATCH[th] }}
                  onClick={() => updateSettings({ table: th })}
                >
                  {t(`table_${th}` as StringKey)}
                </button>
              ))}
            </div>
          </Row>
        </Group>

        <Group title={t("gameplay")}>
          <Row label={t("aiSpeed")}>
            <Segmented
              value={settings.aiSpeed}
              options={SPEEDS.map((s) => ({ value: s, label: t(`speed_${s}` as StringKey) }))}
              onChange={(aiSpeed) => updateSettings({ aiSpeed })}
            />
          </Row>
          {toggle("showWaitHints", "waitHints")}
          {toggle("autoDiscardRiichi", "autoDiscardRiichi")}
          {toggle("dealAnimation", "dealAnimation")}
          {toggle("speechBubbles", "speechBubbles")}
          {slider("voiceVolume", "voiceVolume")}
          {slider("musicVolume", "musicVolume")}
        </Group>

        <Group title={t("gameRules")}>
          <Row label={t("gameLength")} hint={t("rulesNote")}>
            <Segmented
              value={settings.gameRules.gameLength}
              options={[
                { value: "east", label: t("length_east") },
                { value: "hanchan", label: t("length_hanchan") },
              ]}
              onChange={(gameLength) => setRules({ gameLength })}
            />
          </Row>
          {GAME_TOGGLES.map((key) => (
            <Row key={key} label={t(`rule_${key}` as StringKey)}>
              <Switch
                label={t(`rule_${key}` as StringKey)}
                checked={settings.gameRules[key]}
                onChange={(v) => setRules({ [key]: v })}
              />
            </Row>
          ))}
        </Group>

        <Group title={t("rewardScenes")}>
          <Row label={t("rewardScenes")} hint="18+">
            <Switch
              label={t("rewardScenes")}
              checked={settings.rewardScenes}
              onChange={(on) => {
                // Turning scenes on always needs an explicit 18+ answer.
                if (on && !settings.adultConfirmed && !window.confirm(`${t("ageGateBody")}\n\n${t("ageGateAdult")}?`)) {
                  return;
                }
                updateSettings({ rewardScenes: on, adultConfirmed: on ? true : settings.adultConfirmed });
              }}
            />
          </Row>
          {settings.rewardScenes && (
            <>
              {REWARD_RULES.map((key) => (
                <Row key={key} label={t(`rule_${key}` as StringKey)}>
                  <Switch
                    label={t(`rule_${key}` as StringKey)}
                    checked={settings.rewardRules[key]}
                    onChange={(v) => updateSettings({ rewardRules: { ...settings.rewardRules, [key]: v } })}
                  />
                </Row>
              ))}
              <Row label={t("resetProgress")}>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    if (window.confirm(t("resetConfirm"))) setUnlocks({});
                  }}
                >
                  ↺
                </button>
              </Row>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}
