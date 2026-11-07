import { useEffect, useState } from "react";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { VIBRATION_WAYS, buzz, vibrationInfo, type VibrationInfo, type VibrationWay } from "../../game/haptics";
import { Row } from "./Primitives";
import styles from "./VibrationCheck.module.css";

/**
 * Settings -> Vibration check: one button per way of vibrating (phones let
 * different ones through). A tap buzzes that way and makes it the game's;
 * a line shows what the phone says about its motor and sound mode.
 */
export function VibrationCheck() {
  const { settings, updateSettings, t } = useApp();
  const [info, setInfo] = useState<VibrationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void vibrationInfo().then((i) => {
      if (live) setInfo(i);
    });
    return () => {
      live = false;
    };
  }, []);

  const tryWay = async (w: VibrationWay) => {
    updateSettings({ vibrationWay: w });
    setError(await buzz(150, w));
  };

  const ringer = info ? (`ringer_${info.ringerMode}` as StringKey) : null;
  return (
    <Row label={t("vibrationCheck")} hint={t("vibrationCheckHint")} stacked>
      <div className={styles.ways} data-vibration-check>
        {VIBRATION_WAYS.map((w) => (
          <button
            key={w}
            type="button"
            className={styles.way}
            aria-pressed={settings.vibrationWay === w}
            data-way={w}
            onClick={() => void tryWay(w)}
          >
            {t(`vibrationWay_${w}` as StringKey)}
          </button>
        ))}
      </div>
      {info && (
        <p className={styles.info}>
          {t("vibrationInfo", {
            motor: t(info.hasVibrator ? "vibrationYes" : "vibrationNo"),
            ringer: ringer && info.ringerMode >= 0 && info.ringerMode <= 2 ? t(ringer) : t("ringer_unknown"),
            touch: t(info.touchFeedback === 1 ? "vibrationOn" : info.touchFeedback === 0 ? "vibrationOff" : "ringer_unknown"),
          })}
          <br />
          {info.device} · Android API {info.sdk}
        </p>
      )}
      {error && <p className={styles.error}>{t("vibrationRefused", { error })}</p>}
    </Row>
  );
}
