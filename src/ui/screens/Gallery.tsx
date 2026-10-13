import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { CHARACTERS, type CharacterDef } from "../../game/characters";
import { Portrait } from "../components/Portrait";
import { RewardScene } from "../components/RewardScene";
import styles from "./Menus.module.css";

export function Gallery({ onBack }: { onBack: () => void }) {
  const { t, charName, unlocks, settings } = useApp();
  const [viewing, setViewing] = useState<{ character: CharacterDef; stage: number } | null>(null);

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1>{t("gallery")}</h1>
      </header>
      {!settings.rewardScenes ? (
        <p className="muted">{t("galleryDisabled")}</p>
      ) : (
        <>
          <p className="muted">{t("galleryEmpty")}</p>
          <div className={styles.gallery}>
            {CHARACTERS.map((c) => {
              const u = unlocks[c.id] ?? { unlocked: 0, clears: 0 };
              return (
                <section key={c.id} className={styles.galleryRow} style={{ ["--c" as string]: c.color }}>
                  <div className={styles.galleryHead}>
                    <Portrait character={c} size={48} />
                    <div>
                      <b>{charName(c)}</b>
                      {u.clears > 0 && <div className={styles.cardMeta}>{t("clears", { n: u.clears })}</div>}
                    </div>
                  </div>
                  <div className={styles.stages}>
                    {Array.from({ length: c.stages - 1 }, (_, i) => i + 1).map((stage) => {
                      const open = stage <= u.unlocked;
                      return (
                        <button
                          key={stage}
                          className={styles.stageTile}
                          disabled={!open}
                          onClick={() => setViewing({ character: c, stage })}
                        >
                          {open ? stage : "🔒"}
                          <small>{open ? t("stageOf", { n: stage, total: c.stages - 1 }) : t("locked")}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
      {viewing && <RewardScene character={viewing.character} stage={viewing.stage} onDone={() => setViewing(null)} />}
    </div>
  );
}
