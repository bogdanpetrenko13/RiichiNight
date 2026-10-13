import { useState } from "react";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { LESSONS } from "../../learn/lessons";
import { YAKU_GROUPS } from "../../learn/yaku";
import { TileRow } from "../components/TileRow";
import { AppBar } from "../components/Primitives";
import menus from "./Menus.module.css";
import styles from "./Learn.module.css";

type Tab = "lessons" | "yaku";

export function Learn({ onBack }: { onBack: () => void }) {
  const { t, lang } = useApp();
  const [tab, setTab] = useState<Tab>("lessons");
  const [lesson, setLesson] = useState<number | null>(null);

  const back = () => (lesson !== null ? setLesson(null) : onBack());

  return (
    <div className="screen">
      <AppBar title={lesson !== null ? LESSONS[lesson].title[lang] : t("learn")} onBack={back} />
      <div className="screen-body">

      {lesson === null && (
        <div className={menus.segmented} style={{ marginBottom: 16 }}>
          {(["lessons", "yaku"] as Tab[]).map((x) => (
            <button key={x} data-on={tab === x || undefined} onClick={() => setTab(x)}>
              {t(x === "lessons" ? "lessons" : "yakuRef")}
            </button>
          ))}
        </div>
      )}

      {lesson !== null ? (
        <article className={styles.lesson}>
          {LESSONS[lesson].blocks.map((b, i) => (
            <section key={i} className={styles.block}>
              <p>{b.text[lang]}</p>
              {b.tiles && <TileRow text={b.tiles} size={30} />}
            </section>
          ))}
          <div className={styles.nav}>
            {lesson > 0 && (
              <button className="btn btn-ghost" onClick={() => setLesson(lesson - 1)}>
                ← {t("lessonN", { n: lesson })}
              </button>
            )}
            {lesson < LESSONS.length - 1 && (
              <button className="btn btn-primary" onClick={() => setLesson(lesson + 1)}>
                {t("lessonN", { n: lesson + 2 })} →
              </button>
            )}
          </div>
        </article>
      ) : tab === "lessons" ? (
        <ol className={styles.lessonList}>
          {LESSONS.map((l, i) => (
            <li key={l.id}>
              <button onClick={() => setLesson(i)}>
                <span className={styles.num}>{i + 1}</span>
                <span>{l.title[lang]}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.yaku}>
          {YAKU_GROUPS.map((g) => (
            <section key={g.id}>
              <h2 className={styles.groupTitle}>{t(`group_${g.id}` as StringKey)}</h2>
              {g.items.map((y) => (
                <details key={y.id} className={styles.yakuItem}>
                  <summary>
                    <span className={styles.yakuName}>
                      {y.name[lang]} <small>{y.ja}</small>
                    </span>
                    <span className={styles.han}>
                      {y.yakuman
                        ? t("yakuman")
                        : y.open === null
                          ? `${y.closed} · ${t("closedOnly")}`
                          : y.open === y.closed
                            ? `${y.closed}`
                            : `${y.closed} ${t("closedHan")} / ${y.open} ${t("openHan")}`}
                    </span>
                  </summary>
                  <p>{y.desc[lang]}</p>
                  {y.example && <TileRow text={y.example} />}
                </details>
              ))}
            </section>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
