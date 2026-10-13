import { useEffect } from "react";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { ACHIEVEMENTS } from "../../game/stats";
import styles from "./AchievementToast.module.css";

/** Shows queued achievement unlocks one at a time. */
export function AchievementToast() {
  const { toasts, dismissToast, t } = useApp();
  const id = toasts[0];
  useEffect(() => {
    if (!id) return;
    const timer = window.setTimeout(dismissToast, 3600);
    return () => window.clearTimeout(timer);
  }, [id, dismissToast]);
  if (!id) return null;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  return (
    <button key={id} className={styles.toast} onClick={dismissToast} role="status">
      <span className={styles.icon}>{def?.icon ?? "★"}</span>
      <span className={styles.text}>
        <small>{t("achievementUnlocked")}</small>
        <b>{t(`ach_${id}_name` as StringKey)}</b>
      </span>
    </button>
  );
}
