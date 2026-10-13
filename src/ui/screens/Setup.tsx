import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { CHARACTERS } from "../../game/characters";
import type { StringKey } from "../../i18n/strings";
import { Portrait } from "../components/Portrait";
import styles from "./Menus.module.css";

interface SetupProps {
  initial: string[];
  onBack: () => void;
  onStart: (cast: string[]) => void;
}

const SEAT_LABEL = ["", "→", "↑", "←"];

/** Pick three rivals; order of picking fills seats right, top, left. */
export function Setup({ initial, onBack, onStart }: SetupProps) {
  const { t, lang, charName, unlocks, settings } = useApp();
  const [cast, setCast] = useState<string[]>(initial.filter((id) => CHARACTERS.some((c) => c.id === id)).slice(0, 3));

  const toggle = (id: string) =>
    setCast((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1>{t("chooseRivals")}</h1>
      </header>
      <p className="muted">{t("rivalsHint")}</p>
      <div className={styles.roster}>
        {CHARACTERS.map((c) => {
          const seatIndex = cast.indexOf(c.id);
          const progress = unlocks[c.id]?.unlocked ?? 0;
          return (
            <button
              key={c.id}
              className={styles.card}
              data-picked={seatIndex >= 0 || undefined}
              onClick={() => toggle(c.id)}
              style={{ ["--c" as string]: c.color }}
            >
              <Portrait character={c} size={84} />
              <div className={styles.cardBody}>
                <div className={styles.cardName}>
                  {charName(c)}
                  {seatIndex >= 0 && <span className={styles.seat}>{SEAT_LABEL[seatIndex + 1]}</span>}
                </div>
                <div className={styles.cardMeta}>
                  {c.title[lang]} · {t("age")} {c.age} · {t(`level_${c.level}` as StringKey)}
                </div>
                <p className={styles.cardBio}>{c.bio[lang]}</p>
                {settings.rewardScenes && (
                  <div className={styles.cardProgress}>{t("stageOf", { n: progress, total: c.stages - 1 })}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className={styles.footer}>
        <button className="btn btn-primary" disabled={cast.length !== 3} onClick={() => onStart(cast)}>
          {t("start")}
        </button>
      </div>
    </div>
  );
}
