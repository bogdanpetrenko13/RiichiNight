import { useApp } from "../../app/AppContext";
import { LANGS, type StringKey } from "../../i18n/strings";
import type { GameRules } from "../../engine/protocol";
import type { RewardRules } from "../../game/rewards";
import { THEME_MODES, TILESETS, type AiSpeed, type Settings } from "../../game/storage";
import { useState } from "react";
import { checkExtrasCode } from "../../game/extras";
import { TileRow } from "../components/TileRow";
import { AppBar, Group, Row, Segmented, Switch } from "../components/Primitives";
import styles from "./SettingsScreen.module.css";

const SPEEDS: AiSpeed[] = ["fast", "normal", "slow"];
const REWARD_RULES: (keyof RewardRules)[] = ["tsumoAdvancesAll", "bigHandBonus", "regressOnLoss", "firstPlaceBonus"];
const GAME_TOGGLES: (keyof Omit<GameRules, "gameLength">)[] = ["redFives", "openTanyao", "tobi", "agariYame", "kiriageMangan"];


type BoolKey = { [K in keyof Settings]-?: Settings[K] extends boolean ? K : never }[keyof Settings];

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
          <Row label={t("theme")}>
            <Segmented
              value={settings.theme}
              options={THEME_MODES.map((m) => ({ value: m, label: t(`theme_${m}` as StringKey) }))}
              onChange={(theme) => updateSettings({ theme })}
            />
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

        {settings.extrasUnlocked ? (
          <Group title={t("scenesGroup")}>
            <Row label={t("rewardScenes")}>
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
            {settings.rewardScenes &&
              REWARD_RULES.map((key) => (
                <Row key={key} label={t(`rule_${key}` as StringKey)}>
                  <Switch
                    label={t(`rule_${key}` as StringKey)}
                    checked={settings.rewardRules[key]}
                    onChange={(v) => updateSettings({ rewardRules: { ...settings.rewardRules, [key]: v } })}
                  />
                </Row>
              ))}
            {settings.rewardScenes && (
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
            )}
            <Row label={t("extrasLock")}>
              <button
                className="btn btn-ghost"
                style={{ color: "var(--danger)" }}
                onClick={() => {
                  if (window.confirm(t("extrasLockConfirm")))
                    updateSettings({ extrasUnlocked: false, rewardScenes: false, adultConfirmed: null });
                }}
              >
                {t("extrasLockAction")}
              </button>
            </Row>
          </Group>
        ) : (
          <Group title={t("extrasGroup")}>
            <ExtrasCode onUnlock={() => updateSettings({ extrasUnlocked: true, adultConfirmed: null })} />
          </Group>
        )}
      </div>
    </div>
  );
}

/** Code field that unlocks the hidden extra content. */
function ExtrasCode({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useApp();
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);
  const submit = async () => {
    if (await checkExtrasCode(code)) {
      setCode("");
      onUnlock();
    } else setWrong(true);
  };
  return (
    <div className={styles.code}>
      <form
        className={styles.codeRow}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className={styles.codeInput}
          type="password"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setWrong(false);
          }}
          placeholder={t("extrasCode")}
          aria-label={t("extrasCode")}
          aria-invalid={wrong || undefined}
        />
        <button className="btn btn-primary" type="submit" disabled={!code.trim()}>
          OK
        </button>
      </form>
      <p className={wrong ? styles.codeError : styles.codeHint}>{wrong ? t("extrasWrong") : t("extrasHint")}</p>
    </div>
  );
}
