import type { CallKind, PlayerView } from "../../engine/protocol";
import type { CharacterDef, Emotion } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Portrait } from "./Portrait";
import { Tile } from "./Tile";
import styles from "./OpponentPanel.module.css";

interface OpponentPanelProps {
  character: CharacterDef;
  player: PlayerView;
  stage: number;
  emotion?: Emotion;
  callout?: CallKind | null;
  active: boolean;
  compact?: boolean;
  /** Current speech-bubble line, if any. */
  speech?: string | null;
}

export function OpponentPanel({ character, player, stage, emotion, callout, active, compact, speech }: OpponentPanelProps) {
  const { charName, t, settings } = useApp();
  const pips = character.stages - 1;
  return (
    <div className={styles.panel} data-active={active || undefined} data-compact={compact || undefined}>
      {speech && (
        <div key={speech} className={styles.bubble} role="status">
          {speech}
        </div>
      )}
      <div className={styles.portraitWrap}>
        <Portrait character={character} emotion={emotion} size={compact ? 52 : 68} />
        {player.riichi && <span className={styles.riichi}>立直</span>}
        {callout && (
          <span key={callout} className={styles.callout} style={{ ["--c" as string]: character.color }}>
            {t(`act_${callout}` as StringKey)}!
          </span>
        )}
      </div>
      <div className={styles.info}>
        <div className={styles.name}>{charName(character)}</div>
        <div className={styles.score}>{player.score.toLocaleString()}</div>
        {settings.rewardScenes && (
          <div className={styles.pips} aria-label={t("stageOf", { n: stage, total: pips })}>
            {Array.from({ length: pips }, (_, i) => (
              <span key={i} className={styles.pip} data-on={i < stage || undefined} />
            ))}
          </div>
        )}
        {player.melds.length > 0 && (
          <div className={styles.melds}>
            {player.melds.map((m, i) => (
              <span key={i} className={styles.meld}>
                {m.tiles.map((code, j) => (
                  <Tile
                    key={j}
                    code={code}
                    size="mini"
                    back={m.type === "closed_kan" && (j === 0 || j === 3)}
                    style={{ ["--tw" as string]: "15px" }}
                  />
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
