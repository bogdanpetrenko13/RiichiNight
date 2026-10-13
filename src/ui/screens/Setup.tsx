import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { CHARACTERS, isUnlocked } from "../../game/characters";
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
  const { t, lang, charName, unlocks, settings, stats } = useApp();
  const firstPlaces = stats.placements[0];
  const available = CHARACTERS.filter((c) => isUnlocked(c, firstPlaces));
  const [cast, setCast] = useState<string[]>(() => {
    const kept = initial.filter((id) => available.some((c) => c.id === id)).slice(0, 3);
    for (const c of available) if (kept.length < 3 && !kept.includes(c.id)) kept.push(c.id);
    return kept;
  });

  const toggle = (id: string) =>
    setCast((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev));

  const randomize = () => {
    const pool = [...available];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setCast(pool.slice(0, 3).map((c) => c.id));
  };

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1>{t("chooseRivals")}</h1>
        <button className="btn" onClick={randomize}>
          🎲 {t("random")}
        </button>
      </header>
      <p className="muted">{t("rivalsHint")}</p>
      <div className={styles.roster}>
        {CHARACTERS.map((c) => {
          const open = isUnlocked(c, firstPlaces);
          const seatIndex = cast.indexOf(c.id);
          const progress = unlocks[c.id]?.unlocked ?? 0;
          return (
            <button
              key={c.id}
              className={styles.card}
              data-picked={seatIndex >= 0 || undefined}
              data-locked={!open || undefined}
              disabled={!open}
              onClick={() => toggle(c.id)}
              style={{ ["--c" as string]: c.color }}
            >
              <div className={styles.cardPortrait}>
                <Portrait character={c} size={84} />
                {!open && <span className={styles.padlock}>🔒</span>}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>
                  {charName(c)}
                  {seatIndex >= 0 && <span className={styles.seat}>{SEAT_LABEL[seatIndex + 1]}</span>}
                </div>
                <div className={styles.cardMeta}>
                  {c.title[lang]} · {t("age")} {c.age} · {t(`level_${c.level}` as StringKey)}
                </div>
                <p className={styles.cardBio}>{open ? c.bio[lang] : t("unlockFirstPlaces")}</p>
                {open && settings.rewardScenes && (
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
