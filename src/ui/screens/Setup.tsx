import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { CHARACTERS, getCharacter, isUnlocked, type CharacterDef } from "../../game/characters";
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

/** Pick three rivals (the wind each one gets is shown only at the table). */
export function Setup({ initial, onBack, onStart }: SetupProps) {
  const { t, lang, charName, settings, rivals, updateSettings } = useApp();
  const available = CHARACTERS.filter((c) => isUnlocked(c, rivals));
  const unlockHint = (c: CharacterDef) => {
    const names = (c.unlock?.with ?? []).map((id) => {
      const other = getCharacter(id);
      return other ? other.name[lang].split(" ")[0] : id;
    });
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t("and")} ${names[names.length - 1]}` : names[0] ?? "";
    return t("unlockWith", { names: list });
  };
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
            const open = isUnlocked(c, rivals);
            const seat = cast.indexOf(c.id);
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
                  <p className={styles.bio}>{open ? c.bio[lang] : unlockHint(c)}</p>
                </div>
                <span className={styles.badge}>
                  {seat >= 0 ? <Icon name="check" size={18} /> : null}
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
