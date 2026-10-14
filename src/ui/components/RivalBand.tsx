import { useLayoutEffect, useRef } from "react";
import type { CallKind, PlayerView, TileCode } from "../../engine/protocol";
import { DUR, EASE_IN, animate } from "../motion";
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
  /** River tiles per row: 9 in portrait rows, 6 in landscape columns. */
  riverCols?: number;
}

/**
 * One rival: wind, score and name with her portrait on the left; her river
 * (6 per row) on the right, closed hand and calls underneath.
 */
export function RivalBand({ character, player, stage, emotion, callout, speech, active, dealer, claimed, riverCols = 6 }: RivalBandProps) {
  const { t, charName, settings } = useApp();
  const pips = character.stages - 1;
  const lastIndex = player.discards.length - 1;
  const backStyle = { ["--tw" as string]: "var(--band-back, 14px)" };

  // Her turn, animated in steps: the drawn tile slides in next to her hand
  // (kept apart by a small gap), lifts while she "thinks", then flies to its
  // place in the river and turns face up.
  const hasDrawn = player.handCount % 3 === 2;
  const backsRef = useRef<HTMLDivElement>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  const lastBack = useRef<DOMRect | null>(null);
  const seen = useRef({ discards: player.discards.length, drawn: hasDrawn });
  useLayoutEffect(() => {
    const before = seen.current;
    const drawnEl = backsRef.current?.querySelector("[data-drawn]") ?? null;
    if (hasDrawn && !before.drawn && drawnEl) {
      animate(
        drawnEl,
        [
          { transform: "translateX(80%)", opacity: 0 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        DUR.base + 40,
        EASE_IN,
      );
    }
    if (player.discards.length > before.discards && lastBack.current) {
      const tile = riverRef.current?.lastElementChild;
      if (tile) {
        const to = tile.getBoundingClientRect();
        const from = lastBack.current;
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        const s = from.width / Math.max(1, to.width);
        animate(
          tile,
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(-8deg)`, filter: "brightness(0.55)" },
            { transform: `translate(${dx * 0.4}px, ${dy * 0.55 - 10}px) scale(${(s + 1.15) / 2}) rotate(-4deg)`, filter: "brightness(0.9)", offset: 0.55 },
            { transform: "translate(0, 0) scale(1) rotate(0)", filter: "none" },
          ],
          DUR.slow,
          EASE_IN,
        );
      }
    }
    // Remember where the tile she will discard sits now (drawn tile, else the last back).
    const anchor = drawnEl ?? backsRef.current?.lastElementChild ?? null;
    lastBack.current = anchor ? anchor.getBoundingClientRect() : null;
    seen.current = { discards: player.discards.length, drawn: hasDrawn };
  });
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

      <div
        className={styles.river}
        data-rows={Math.ceil(player.discards.length / riverCols)}
        data-rival
        ref={riverRef}
        style={{ ["--river-cols" as string]: riverCols }}
      >
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
        <div className={styles.backs} aria-label={t("handCount", { n: player.handCount })} ref={backsRef}>
          {Array.from({ length: hasDrawn ? player.handCount - 1 : player.handCount }, (_, i) => (
            <Tile key={i} back size="river" style={backStyle} />
          ))}
          {hasDrawn && (
            <span className={styles.drawn} data-drawn data-thinking={active || undefined}>
              <Tile back size="river" style={backStyle} />
            </span>
          )}
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
