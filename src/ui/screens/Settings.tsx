import { useApp } from "../../app/AppContext";
import { LANGS, type StringKey } from "../../i18n/strings";
import type { GameRules } from "../../engine/protocol";
import { AI_DELAY_MAX, AI_DELAY_MIN, STYLE_TILESET, TABLE_STYLES, THEME_MODES, TILESETS, type Settings } from "../../game/storage";
import { TileRow } from "../components/TileRow";
import { AppBar, Group, Row, Segmented, Switch } from "../components/Primitives";
import styles from "./SettingsScreen.module.css";

/** The app is AGPL: whoever gets it can get the source (see NOTICE.md). */
const SOURCE_URL = "https://github.com/bogdanpetrenko13/RiichiNight";
const GAME_TOGGLES: (keyof Omit<GameRules, "gameLength">)[] = ["redFives", "openTanyao", "tobi", "agariYame", "kiriageMangan"];


type BoolKey = { [K in keyof Settings]-?: Settings[K] extends boolean ? K : never }[keyof Settings];

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t, settings, updateSettings } = useApp();

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
          <Row label={t("tableStyle")} hint={t(`tableStyle_${settings.tableStyle}_hint` as StringKey)} stacked>
            <Segmented
              value={settings.tableStyle}
              options={TABLE_STYLES.map((st) => ({ value: st, label: t(`tableStyle_${st}` as StringKey) }))}
              onChange={(tableStyle) => updateSettings({ tableStyle, tileset: STYLE_TILESET[tableStyle] })}
            />
          </Row>
          <Row label={t("tileset")} stacked>
            <Segmented
              value={settings.tileset}
              options={TILESETS.map((ts) => ({ value: ts, label: t(`tileset_${ts}` as StringKey) }))}
              onChange={(tileset) => updateSettings({ tileset })}
            />
            <div className={styles.preview}>
              <TileRow text="19m 5p 9s 1234z 567z" size={30} hints />
            </div>
          </Row>
          <Row label={t("tileHints")} stacked>
            <Segmented
              value={settings.tileHints}
              options={(["none", "man", "all"] as const).map((m) => ({ value: m, label: t(`tileHints_${m}` as StringKey) }))}
              onChange={(tileHints) => updateSettings({ tileHints })}
            />
          </Row>
          <Row label={t("theme")}>
            <Segmented
              value={settings.theme}
              options={THEME_MODES.map((m) => ({ value: m, label: t(`theme_${m}` as StringKey) }))}
              onChange={(theme) => updateSettings({ theme })}
            />
          </Row>
        </Group>

        <Group title={t("gameplay")}>
          <Row label={t("aiSpeed")} hint={t("aiDelayValue", { s: (settings.aiDelay / 1000).toFixed(1) })} stacked>
            <div className={styles.speed}>
              <input
                className={styles.slider}
                type="range"
                // Right = faster: the slider runs over the inverted delay.
                min={AI_DELAY_MIN}
                max={AI_DELAY_MAX}
                step={50}
                value={AI_DELAY_MAX + AI_DELAY_MIN - settings.aiDelay}
                onChange={(e) => updateSettings({ aiDelay: AI_DELAY_MAX + AI_DELAY_MIN - Number(e.target.value) })}
                aria-label={t("aiSpeed")}
              />
              <div className={styles.speedEnds}>
                <span>{t("speed_slow")}</span>
                <span>{t("speed_fast")}</span>
              </div>
            </div>
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

        <Group title={t("about")}>
          <Row label={t("version")}>
            <span className="muted">{__APP_VERSION__}</span>
          </Row>
          <Row label={t("sourceCode")} hint={t("sourceCodeHint")} stacked>
            <a className={`btn ${styles.link}`} href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
              {t("sourceCodeOpen")}
            </a>
          </Row>
        </Group>
      </div>
    </div>
  );
}
