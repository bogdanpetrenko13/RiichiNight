import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { CHARACTERS, isUnlocked } from "../../game/characters";
import type { StringKey } from "../../i18n/strings";
import { Portrait } from "../components/Portrait";
import { AppBar, IconButton, Segmented } from "../components/Primitives";
import { Icon } from "../icons";
import styles from "./Setup.module.css";

interface SetupProps {
  initial: string[];
  onBack: () => void;
  onStart: (cast: string[]) => void;
}

const SEAT_KEY: StringKey[] = ["wind_south", "wind_west", "wind_north"];

/** Pick three rivals; picking order fills the seats after the player. */
export function Setup({ initial, onBack, onStart }: SetupProps) {
  const { t, lang, charName, unlocks, settings, stats, updateSettings } = useApp();
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
      <AppBar title={t("chooseRivals")} onBack={onBack} right={<IconButton icon="dice" label={t("random")} onClick={randomize} />} />
      <div className="screen-body">
        <div className={styles.list}>
          {CHARACTERS.map((c) => {
            const open = isUnlocked(c, firstPlaces);
            const seat = cast.indexOf(c.id);
            const progress = unlocks[c.id]?.unlocked ?? 0;
            return (
              <button
                key={c.id}
                className={styles.card}
                data-picked={seat >= 0 || undefined}
                data-locked={!open || undefined}
                disabled={!open}
                onClick={() => toggle(c.id)}
                style={{ ["--c" as string]: c.color }}
              >
                <div className={styles.portrait}>
                  <Portrait character={c} size={76} round />
                  {!open && (
                    <span className={styles.lock}>
                      <Icon name="lock" />
                    </span>
                  )}
                </div>
                <div className={styles.body}>
                  <div className={styles.name}>{charName(c)}</div>
                  <div className={styles.meta}>
                    <span className={styles.chip} data-level={c.level}>
                      {t(`level_${c.level}` as StringKey)}
                    </span>
                    <span>{c.title[lang]}</span>
                    <span>· {c.age}</span>
                  </div>
                  <p className={styles.bio}>{open ? c.bio[lang] : t("unlockFirstPlaces")}</p>
                  {open && settings.rewardScenes && (
                    <div className={styles.progress}>
                      <i style={{ width: `${(progress / (c.stages - 1)) * 100}%` }} />
                    </div>
                  )}
                </div>
                <span className={styles.badge}>
                  {seat >= 0 ? (
                    <>
                      <Icon name="check" size={16} />
                      {t(SEAT_KEY[seat])}
                    </>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className={styles.footer}>
        <Segmented
          value={settings.gameRules.gameLength}
          options={[
            { value: "east", label: t("length_east") },
            { value: "hanchan", label: t("length_hanchan") },
          ]}
          onChange={(v) => updateSettings({ gameRules: { ...settings.gameRules, gameLength: v } })}
        />
        <button className="btn btn-primary btn-lg" disabled={cast.length !== 3} onClick={() => onStart(cast)}>
          <Icon name="play" />
          {t("start")}
        </button>
      </footer>
    </div>
  );
}
