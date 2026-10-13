import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { assetPaths, type CharacterDef } from "../../game/characters";
import styles from "./RewardScene.module.css";

interface RewardSceneProps {
  character: CharacterDef;
  stage: number;
  onDone: () => void;
}

/**
 * Full-screen reward scene for one heroine at one stage. The picture comes
 * from public/characters/<id>/reward/stage<N>.webp; until that file exists a
 * neutral placeholder card is shown with the expected path.
 */
export function RewardScene({ character, stage, onDone }: RewardSceneProps) {
  const { t, lang, charName } = useApp();
  const [missing, setMissing] = useState(false);
  const src = assetPaths.reward(character.id, stage);
  const line = character.stageLines[lang][stage - 1] ?? "";
  const total = character.stages - 1;

  return (
    <div className={styles.scene} style={{ ["--c" as string]: character.color, ["--a" as string]: character.accent }}>
      <div className={styles.art}>
        {missing ? (
          <div className={styles.placeholder}>
            <div className={styles.phStage}>{t("stageOf", { n: stage, total })}</div>
            <div className={styles.phName}>{charName(character)}</div>
            <div className={styles.phNote}>{t("placeholderArt")}</div>
            <code className={styles.phPath}>
              {t("placeholderPath", { path: `public/characters/${character.id}/reward/stage${stage}.webp` })}
            </code>
          </div>
        ) : (
          <img key={src} src={src} alt="" draggable={false} onError={() => setMissing(true)} />
        )}
      </div>
      <div className={styles.caption}>
        <div className={styles.who}>
          {charName(character)} <span>{t("stageOf", { n: stage, total })}</span>
        </div>
        {line && <p className={styles.line}>“{line}”</p>}
        <button className="btn btn-primary" onClick={onDone}>
          {t("continueBtn")}
        </button>
      </div>
    </div>
  );
}
