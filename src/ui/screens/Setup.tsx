import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { CHARACTERS, getCharacter, isUnlocked, type CharacterDef } from "../../game/characters";
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

  // The heroine shown in the card under the grid: the last one tapped.
  const [focus, setFocus] = useState<string>(() => cast[cast.length - 1] ?? CHARACTERS[0].id);
  const focused = getCharacter(focus) ?? CHARACTERS[0];
  const focusedOpen = isUnlocked(focused, rivals);
  const tiers = [
    { label: t("ladderTier1"), list: CHARACTERS.filter((c) => c.step <= 6) },
    { label: t("ladderTier2"), list: CHARACTERS.filter((c) => c.step > 6) },
  ];

  return (
    <div className="screen">
      <AppBar title={t("chooseRivals")} onBack={onBack} right={<IconButton icon="dice" label={t("random")} onClick={randomize} />} />
      <div className="screen-body">
        {tiers.map((tier) => (
          <section key={tier.label} className={styles.tier}>
            <h2 className={styles.tierTitle}>{tier.label}</h2>
            <div className={styles.grid}>
              {tier.list.map((c) => {
                const open = isUnlocked(c, rivals);
                const picked = cast.includes(c.id);
                return (
                  <button
                    key={c.id}
                    className={styles.cell}
                    data-picked={picked || undefined}
                    data-locked={!open || undefined}
                    data-focus={focus === c.id || undefined}
                    aria-pressed={picked}
                    aria-label={open ? charName(c) : t("ladderStep", { n: c.step })}
                    onClick={() => {
                      setFocus(c.id);
                      if (open) toggle(c.id);
                    }}
                    style={{ ["--c" as string]: c.color }}
                  >
                    <span className={styles.face}>
                      <Portrait character={c} size={78} round />
                      {!open && (
                        <span className={styles.lock}>
                          <Icon name="lock" />
                        </span>
                      )}
                      <i className={styles.step}>{c.step}</i>
                    </span>
                    <span className={styles.cellName}>{open ? c.name[lang].split(" ")[0] : "???"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Card of the last tapped heroine: profile, or how to unlock her. */}
        <div className={styles.detail} style={{ ["--c" as string]: focused.color }}>
          <span className={styles.detailFace} data-locked={!focusedOpen || undefined}>
            <Portrait character={focused} size={72} round />
          </span>
          <div className={styles.body}>
            <div className={styles.name}>
              {focused.step} · {focusedOpen ? charName(focused) : "???"}
            </div>
            <Pips step={focused.step} />
            {focusedOpen && (
              <div className={styles.meta}>
                <span>{focused.title[lang]}</span>
                <span>· {focused.age}</span>
              </div>
            )}
            <p className={styles.bio}>{focusedOpen ? focused.story[lang] : unlockHint(focused)}</p>
            {focusedOpen && <Profile c={focused} />}
          </div>
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

/** Her play style, your record against her and the heroines she knows. */
function Profile({ c }: { c: CharacterDef }) {
  const { t, lang, rivals, records } = useApp();
  const rec = records[c.id];
  const friends = Object.keys(c.bonds)
    .map((id) => getCharacter(id))
    .filter((x): x is CharacterDef => Boolean(x));
  return (
    <div className={styles.profile} data-profile>
      <section>
        <h3>{t("profileStyle")}</h3>
        <p>{c.playstyle[lang]}</p>
      </section>
      <section>
        <h3>{t("profileRecord")}</h3>
        {rec && rec.matches > 0 ? (
          <dl className={styles.record}>
            <div>
              <dt>{t("profileMatches")}</dt>
              <dd>{rec.matches}</dd>
            </div>
            <div>
              <dt>{t("profileYouFirst")}</dt>
              <dd>{rec.youFirst}</dd>
            </div>
            <div>
              <dt>{t("profileHerFirst")}</dt>
              <dd>{rec.herFirst}</dd>
            </div>
            <div>
              <dt>{t("profileHerAvg")}</dt>
              <dd>{(rec.herPlaceSum / rec.matches).toFixed(2)}</dd>
            </div>
          </dl>
        ) : (
          <p>{t("profileNever")}</p>
        )}
      </section>
      {friends.length > 0 && (
        <section>
          <h3>{t("profileKnows")}</h3>
          <div className={styles.friends}>
            {friends.map((f) => {
              const open = isUnlocked(f, rivals);
              return (
                <span key={f.id} className={styles.friend} data-locked={!open || undefined} style={{ ["--c" as string]: f.color }}>
                  <Portrait character={f} size={26} round />
                  {open ? f.name[lang].split(" ")[0] : "???"}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/** Difficulty: one bar per ladder step, filled up to hers. */
function Pips({ step }: { step: number }) {
  return (
    <span className={styles.pips} aria-hidden>
      {Array.from({ length: CHARACTERS.length }, (_, i) => (
        <b key={i} data-on={i < step || undefined} />
      ))}
    </span>
  );
}
