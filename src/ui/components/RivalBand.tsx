import type { CallKind, PlayerView, TileCode } from "../../engine/protocol";
import type { CharacterDef, Emotion } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Portrait } from "./Portrait";
import { Tile } from "./Tile";
import { Tenbo } from "./Tenbo";
import styles from "./Band.module.css";

interface RivalBandProps {
  character: CharacterDef;
  player: PlayerView;
  stage: number;
  emotion?: Emotion;
  callout?: CallKind | null;
  speech?: string | null;
  active: boolean;
  dealer: boolean;
  /** Last discard being claimed from this rival (highlighted with a marker). */
  claimed?: TileCode | null;
}

/**
 * One rival: wind, score and name with her portrait on the left; her river
 * (6 per row) on the right, closed hand and calls underneath.
 */
export function RivalBand({ character, player, stage, emotion, callout, speech, active, dealer, claimed }: RivalBandProps) {
  const { t, charName, settings } = useApp();
  const pips = character.stages - 1;
  const lastIndex = player.discards.length - 1;
  const backStyle = { ["--tw" as string]: "var(--band-back, 14px)" };
  return (
    <section
      className={styles.band}
      data-active={active || undefined}
      style={{ ["--c" as string]: character.color }}
      aria-label={charName(character)}
    >
      <div className={styles.left}>
        <span className={styles.wind} data-dealer={dealer || undefined}>
          {t(`wind_${player.wind}` as StringKey)}
        </span>
        <span className={styles.score}>{player.score.toLocaleString()}</span>
        <span className={styles.name}>{charName(character).split(" ")[0]}</span>
        {settings.rewardScenes && (
          <span className={styles.pips} aria-label={t("stageOf", { n: stage, total: pips })}>
            {Array.from({ length: pips }, (_, i) => (
              <i key={i} data-on={i < stage || undefined} />
            ))}
          </span>
        )}
        <div className={styles.portrait}>
          <Portrait character={character} emotion={emotion} size={88} className={styles.face} />
          {callout && (
            <span key={callout} className={styles.callout}>
              {t(`act_${callout}` as StringKey)}!
            </span>
          )}
          {speech && (
            <div key={speech} className={styles.bubble} role="status">
              {speech}
            </div>
          )}
        </div>
      </div>

      <div className={styles.river} data-rows={Math.ceil(player.discards.length / 6)}>
        {/* Riichi: a 1 000 stick laid in front of the river, as on a real table. */}
        {player.riichi && (
          <div className={styles.riichiLine}>
            <Tenbo kind="1000" width="calc(var(--river-tile) * 2)" />
          </div>
        )}
        {player.discards.map((code, i) => (
          <Tile
            key={`${i}-${code}`}
            code={code}
            size="river"
            sideways={player.riichiIndex === i}
            highlight={i === lastIndex && claimed === code}
            marked={i === lastIndex && claimed === code}
          />
        ))}
      </div>

      <div className={styles.lower}>
        <div className={styles.backs} aria-label={t("handCount", { n: player.handCount })}>
          {Array.from({ length: player.handCount }, (_, i) => (
            <Tile key={i} back size="river" style={backStyle} />
          ))}
        </div>
        {player.melds.length > 0 && (
          <div className={styles.melds}>
            {player.melds.map((m, i) => (
              <span key={i} className={styles.meld}>
                {m.tiles.map((code, j) => (
                  <Tile
                    key={j}
                    code={code}
                    size="river"
                    back={m.type === "closed_kan" && (j === 0 || j === 3)}
                    style={backStyle}
                  />
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
