import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { LESSONS, type Lesson, type LessonBlock, type Quiz } from "../../learn/lessons";
import { YAKU_GROUPS } from "../../learn/yaku";
import { TileRow } from "../components/TileRow";
import { AppBar, Segmented } from "../components/Primitives";
import { Icon } from "../icons";
import styles from "./Learn.module.css";

type Tab = "lessons" | "yaku";

/** "**term**" → highlighted term. */
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") ? (
      <b key={i} className={styles.term}>
        {part.slice(2, -2)}
      </b>
    ) : (
      part
    ),
  );
}

export function Learn({ onBack }: { onBack: () => void }) {
  const { t, settings, updateSettings } = useApp();
  const [tab, setTab] = useState<Tab>("lessons");
  const [lesson, setLesson] = useState<number | null>(null);
  const done = settings.lessonsDone ?? [];

  const finish = (id: string) => {
    if (!done.includes(id)) updateSettings({ lessonsDone: [...done, id] });
  };

  if (lesson !== null) {
    const l = LESSONS[lesson];
    return (
      <LessonView
        key={l.id}
        lesson={l}
        index={lesson}
        onBack={() => setLesson(null)}
        onPrev={lesson > 0 ? () => setLesson(lesson - 1) : null}
        onNext={() => {
          finish(l.id);
          setLesson(lesson < LESSONS.length - 1 ? lesson + 1 : null);
        }}
      />
    );
  }

  return (
    <div className="screen">
      <AppBar title={t("learn")} onBack={onBack} />
      <div className="screen-body">
        <div className={styles.tabs}>
          <Segmented
            value={tab}
            options={[
              { value: "lessons", label: t("lessons") },
              { value: "yaku", label: t("yakuRef") },
            ]}
            onChange={setTab}
          />
        </div>

        {tab === "lessons" ? (
          <>
            <p className={styles.progressNote}>{t("lessonsProgress", { n: done.length, total: LESSONS.length })}</p>
            <ol className={styles.lessonList}>
              {LESSONS.map((l, i) => (
                <li key={l.id}>
                  <button className={styles.lessonCard} onClick={() => setLesson(i)} data-done={done.includes(l.id) || undefined}>
                    <span className={styles.num}>{done.includes(l.id) ? <Icon name="check" size={16} /> : i + 1}</span>
                    <span className={styles.lessonText}>
                      <b>{l.title[settings.lang]}</b>
                      <small>{l.summary[settings.lang]}</small>
                    </span>
                    <span className={styles.chevron}>›</span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <YakuReference />
        )}
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  index,
  onBack,
  onPrev,
  onNext,
}: {
  lesson: Lesson;
  index: number;
  onBack: () => void;
  onPrev: (() => void) | null;
  onNext: () => void;
}) {
  const { t, lang } = useApp();
  const top = useRef<HTMLDivElement>(null);
  // Braces: newer WebViews (Chrome 15x) return a Promise from scrollIntoView,
  // and an effect must return nothing or a cleanup function.
  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
  }, [index]);
  const last = index === LESSONS.length - 1;
  return (
    <div className={`screen ${styles.lessonScreen}`}>
      <AppBar title={t("learn")} onBack={onBack} right={<span className={styles.counter}>{`${index + 1} / ${LESSONS.length}`}</span>} />
      <div className={styles.progress} aria-hidden>
        <i style={{ width: `${((index + 1) / LESSONS.length) * 100}%` }} />
      </div>
      <div className={`screen-body ${styles.article}`} ref={top}>
        <div className={styles.kicker}>{t("lessonOf", { n: index + 1, total: LESSONS.length })}</div>
        <h2 className={styles.title}>{lesson.title[lang]}</h2>
        {lesson.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
        {lesson.quiz && <QuizCard quiz={lesson.quiz} />}
      </div>
      <nav className={styles.nav}>
        {onPrev ? (
          <button className="btn" onClick={onPrev}>
            ← {t("lessonN", { n: index })}
          </button>
        ) : (
          <span />
        )}
        <button className="btn btn-primary" onClick={onNext}>
          {last ? t("lessonDone") : `${t("lessonN", { n: index + 2 })} →`}
        </button>
      </nav>
    </div>
  );
}

function Block({ block }: { block: LessonBlock }) {
  const { lang } = useApp();
  switch (block.kind) {
    case "text":
      return <p className={styles.text}>{rich(block.text[lang])}</p>;
    case "tip":
      return (
        <aside className={styles.tip}>
          <span aria-hidden>💡</span>
          <span>{rich(block.text[lang])}</span>
        </aside>
      );
    case "rule":
      return (
        <aside className={styles.rule}>
          <span aria-hidden>!</span>
          <span>{rich(block.text[lang])}</span>
        </aside>
      );
    case "example":
      return (
        <figure className={styles.example}>
          <TileRow text={block.tiles} size={34} fit />
          {(block.tag || block.caption) && (
            <figcaption>
              {block.tag && <span className={styles.tag}>{block.tag[lang]}</span>}
              {block.caption?.[lang]}
            </figcaption>
          )}
        </figure>
      );
  }
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  const { t, lang } = useApp();
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === quiz.answer;
  return (
    <section className={styles.quiz}>
      <div className={styles.kicker}>{t("quizTitle")}</div>
      <p className={styles.question}>{quiz.question[lang]}</p>
      {quiz.tiles && (
        <div className={styles.example}>
          <TileRow text={quiz.tiles} size={30} fit />
        </div>
      )}
      <div className={styles.options}>
        {quiz.options.map((o, i) => (
          <button
            key={i}
            className={styles.option}
            data-state={picked === null ? undefined : i === quiz.answer ? "right" : i === picked ? "wrong" : undefined}
            disabled={picked !== null && right}
            onClick={() => setPicked(i)}
          >
            {o.tiles ? <TileRow text={o.tiles} size={30} /> : o.text?.[lang]}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className={right ? styles.answerRight : styles.answerWrong} role="status">
          <b>{right ? t("quizRight") : t("quizWrong")}</b> {right ? quiz.explain[lang] : t("quizRetry")}
        </p>
      )}
    </section>
  );
}

function YakuReference() {
  const { t, lang } = useApp();
  return (
    <div className={styles.yaku}>
      <p className={styles.progressNote}>{t("yakuIntro")}</p>
      {YAKU_GROUPS.map((g) => (
        <section key={g.id}>
          <h2 className={styles.groupTitle}>{t(`group_${g.id}` as StringKey)}</h2>
          <div className={styles.yakuList}>
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
                {y.example && (
                  <div className={styles.example}>
                    <TileRow text={y.example} size={30} fit />
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
