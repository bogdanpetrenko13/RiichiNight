import { useApp } from "../../app/AppContext";
import styles from "../components/Overlay.module.css";

/** First-launch question: enables reward scenes only after an explicit 18+ answer. */
export function AgeGate() {
  const { t, updateSettings } = useApp();
  return (
    <div className={styles.backdrop}>
      <div className={`panel ${styles.card}`}>
        <h2 className={styles.title}>{t("ageGateTitle")}</h2>
        <p>{t("ageGateBody")}</p>
        <p className="muted">{t("ageGateNote")}</p>
        <div className={styles.buttons}>
          <button className="btn btn-ghost" onClick={() => updateSettings({ adultConfirmed: false, rewardScenes: false })}>
            {t("ageGateSkip")}
          </button>
          <button className="btn btn-primary" onClick={() => updateSettings({ adultConfirmed: true, rewardScenes: true })}>
            {t("ageGateAdult")}
          </button>
        </div>
      </div>
    </div>
  );
}
