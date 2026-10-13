import { useEffect } from "react";
import { useApp } from "../../app/AppContext";
import { music } from "../../game/audio";
import type { SavedGame } from "../../game/storage";
import { CHARACTERS } from "../../game/characters";
import { Portrait } from "../components/Portrait";
import styles from "./Menus.module.css";

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
  const { t, settings, lang } = useApp();
  useEffect(() => music.play("title"), []);
  return (
    <div className={`screen ${styles.title}`}>
      <div className={styles.hero}>
        <div className={styles.portraits}>
          {CHARACTERS.slice(0, 4).map((c, i) => (
            <Portrait key={c.id} character={c} size={76} className={styles[`p${i}`]} />
          ))}
        </div>
        <h1 className={styles.logo}>
          <span className={styles.logoJa}>麻雀</span>
          {t("appTitle")}
        </h1>
        <p className="muted">{t("subtitle")}</p>
      </div>
      <nav className={styles.menu}>
        {saved && (
          <button className="btn btn-primary" onClick={onContinue}>
            {t("continue")}
            <small className={styles.savedAt}>
              {new Date(saved.savedAt).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </small>
          </button>
        )}
        <button className={`btn ${saved ? "" : "btn-primary"}`} onClick={onNew}>
          {t("newGame")}
        </button>
        {settings.rewardScenes && (
          <button className="btn" onClick={onGallery}>
            {t("gallery")}
          </button>
        )}
        <div className={styles.menuRow}>
          <button className="btn" onClick={onLearn}>
            {t("learn")}
          </button>
          <button className="btn" onClick={onStats}>
            {t("stats")}
          </button>
        </div>
        <button className="btn btn-ghost" onClick={onSettings}>
          {t("settings")}
        </button>
      </nav>
    </div>
  );
}
