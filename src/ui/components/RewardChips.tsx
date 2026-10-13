import { useApp } from "../../app/AppContext";
import { getCharacter } from "../../game/characters";
import type { StageChange } from "../../game/rewards";
import styles from "./Overlay.module.css";

export function RewardChips({ changes }: { changes: StageChange[] }) {
  const { t, charName } = useApp();
  if (!changes.length) return null;
  return (
    <div className={styles.chips}>
      {changes.map((c) => {
        const def = getCharacter(c.charId);
        if (!def) return null;
        const name = charName(def);
        const text = c.cleared
          ? t("rewardCleared", { name })
          : c.to > c.from
            ? t("rewardUnlocked", { name, n: c.to })
            : t("rewardBack", { name });
        return (
          <span
            key={`${c.charId}-${c.to}`}
            className={styles.chip}
            data-kind={c.cleared ? "clear" : c.to > c.from ? "up" : "down"}
            style={{ ["--c" as string]: def.color }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}
