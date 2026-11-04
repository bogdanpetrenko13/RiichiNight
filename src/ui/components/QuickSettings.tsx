import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { AI_DELAY_MAX, AI_DELAY_MIN, type Settings } from "../../game/storage";
import { Row, Segmented, Switch } from "./Primitives";
import styles from "./QuickSettings.module.css";

/** Rivals' speed: right = faster (the slider runs over the inverted delay). */
export function SpeedSlider() {
  const { t, settings, updateSettings } = useApp();
  return (
    <div className={styles.speed}>
      <input
        className={styles.slider}
        type="range"
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
  );
}

type BoolKey = "showWaitHints" | "markTsumogiri" | "safeTiles";
type VolumeKey = "musicVolume" | "sfxVolume" | "voiceVolume";

/**
 * The settings worth changing mid-match, in the table menu (the game waits
 * while it is open): rivals' speed, volumes, table hints, rivals' talk.
 */
export function QuickSettings() {
  const { t, settings, updateSettings } = useApp();
  const toggle = (key: BoolKey, label: StringKey) => (
    <Row label={t(label)}>
      <Switch label={t(label)} checked={settings[key]} onChange={(v) => updateSettings({ [key]: v } as Partial<Settings>)} />
    </Row>
  );
  const volume = (key: VolumeKey, label: StringKey) => (
    <Row label={t(label)}>
      <input
        className={styles.volume}
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={settings[key]}
        onChange={(e) => updateSettings({ [key]: Number(e.target.value) } as Partial<Settings>)}
        aria-label={t(label)}
      />
    </Row>
  );
  return (
    <div className={styles.quick} data-quick-settings>
      <Row label={t("aiSpeed")} hint={t("aiDelayValue", { s: (settings.aiDelay / 1000).toFixed(1) })} stacked>
        <SpeedSlider />
      </Row>
      {volume("musicVolume", "quickMusic")}
      {volume("sfxVolume", "quickSfx")}
      {volume("voiceVolume", "quickVoice")}
      {toggle("showWaitHints", "waitHints")}
      {toggle("markTsumogiri", "markTsumogiri")}
      {toggle("safeTiles", "safeTiles")}
      <Row label={t("speechFreq")} stacked>
        <Segmented
          value={settings.speechFreq}
          options={(["often", "normal", "rare", "off"] as const).map((v) => ({ value: v, label: t(`speech_${v}` as StringKey) }))}
          onChange={(speechFreq) => updateSettings({ speechFreq })}
        />
      </Row>
    </div>
  );
}
