import { useEffect } from "react";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { ACHIEVEMENTS } from "../../game/stats";
import { getCharacter } from "../../game/characters";
import { Portrait } from "./Portrait";
import styles from "./AchievementToast.module.css";

/** Shows queued achievement unlocks one at a time. */
export function AchievementToast() {
  const { toasts, dismissToast, t, charName } = useApp();
  const id = toasts[0];
  useEffect(() => {
    if (!id) return;
    const timer = window.setTimeout(dismissToast, 3600);
    return () => window.clearTimeout(timer);
  }, [id, dismissToast]);
  if (!id) return null;
  if (id.startsWith("rival:")) {
    const c = getCharacter(id.slice(6));
    if (!c) return null;
    return (
      <button key={id} className={styles.toast} onClick={dismissToast} role="status">
        <Portrait character={c} emotion="happy" size={40} round />
        <span className={styles.text}>
          <small>{t("newRival")}</small>
          <b>{charName(c)}</b>
        </span>
      </button>
    );
  }
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
