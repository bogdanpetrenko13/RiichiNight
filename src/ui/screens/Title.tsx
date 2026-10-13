import { useEffect } from "react";
import { useApp } from "../../app/AppContext";
import { music } from "../../game/audio";
import type { SavedGame } from "../../game/storage";
import { CHARACTERS } from "../../game/characters";
import { Portrait } from "../components/Portrait";
import { Icon, type IconName } from "../icons";
import type { StringKey } from "../../i18n/strings";
import styles from "./Home.module.css";

interface TitleProps {
  saved: SavedGame | null;
  onNew: () => void;
  onContinue: () => void;
  onGallery: () => void;
  onSettings: () => void;
  onLearn: () => void;
  onStats: () => void;
}

export function Title({ saved, onNew, onContinue, onGallery, onSettings, onLearn, onStats }: TitleProps) {
  const { t, settings, lang, stats } = useApp();
  useEffect(() => music.play("title"), []);

  const tiles: { icon: IconName; label: StringKey; onClick: () => void; hidden?: boolean }[] = [
    { icon: "book", label: "learn", onClick: onLearn },
    { icon: "chart", label: "stats", onClick: onStats },
    { icon: "gallery", label: "gallery", onClick: onGallery, hidden: !settings.rewardScenes },
    { icon: "settings", label: "settings", onClick: onSettings },
  ];

  return (
    <div className={`screen ${styles.home}`}>
      <section className={styles.hero}>
        <div className={styles.cast}>
          {CHARACTERS.slice(0, 4).map((c, i) => (
            <div key={c.id} className={styles.castItem} style={{ ["--i" as string]: i }}>
              <Portrait character={c} size={84} round />
            </div>
          ))}
        </div>
        <h1 className={styles.logo}>
          <span>Riichi Mahjong</span>
          {t("appTitle")}
        </h1>
        <p className={styles.tagline}>{t("subtitle")}</p>
      </section>

      <section className={styles.actions}>
        {saved ? (
          <>
            <button className="btn btn-primary btn-lg" onClick={onContinue}>
              <Icon name="resume" />
              <span className={styles.cta}>
                {t("continue")}
                <small>
                  {new Date(saved.savedAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </small>
              </span>
            </button>
            <button className="btn btn-lg" onClick={onNew}>
              <Icon name="play" />
              {t("newGame")}
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={onNew}>
            <Icon name="play" />
            {t("newGame")}
          </button>
        )}

        <div className={styles.grid}>
          {tiles
            .filter((x) => !x.hidden)
            .map((x) => (
              <button key={x.label} className={styles.tile} onClick={x.onClick}>
                <Icon name={x.icon} size={24} />
                <span>{t(x.label)}</span>
              </button>
            ))}
        </div>

        {stats.matches > 0 && (
          <p className={styles.summary}>
            {t("statsMatches")}: <b>{stats.matches}</b> · 1st: <b>{stats.placements[0]}</b>
          </p>
        )}
      </section>
    </div>
  );
}
