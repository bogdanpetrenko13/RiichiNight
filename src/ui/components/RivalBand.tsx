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
  /** Her last discard was the tile she had just drawn. */
  tsumogiri?: boolean;
}

/**
 * One rival: wind, score and name with her portrait on the left; her river
 * (6 per row) on the right, closed hand and calls underneath.
 */
export function RivalBand({ character, player, stage, emotion, callout, speech, active, dealer, claimed, riverCols = 6, tsumogiri = false }: RivalBandProps) {
  const { t, charName, settings } = useApp();
  const pips = character.stages - 1;
  const lastIndex = player.discards.length - 1;
  const backStyle = { ["--tw" as string]: "var(--band-back, 14px)" };

  // Her turn: the drawn tile slides in next to her hand (kept apart by a gap).
  // On discard the tile flies to its river spot and turns face up — from the
  // drawn tile if she threw it (tsumogiri), otherwise from inside her hand,
  // after which the drawn tile slides into the hand to close the gap.
  const hasDrawn = player.handCount % 3 === 2;
  const backsRef = useRef<HTMLDivElement>(null);
  const riverRef = useRef<HTMLDivElement>(null);
  const rects = useRef<{ hand: DOMRect[]; drawn: DOMRect | null }>({ hand: [], drawn: null });
  const seen = useRef({ discards: player.discards.length, drawn: hasDrawn });
  useLayoutEffect(() => {
    const before = seen.current;
    const prev = rects.current;
    const backs = backsRef.current;
    const handEls = backs ? Array.from(backs.querySelectorAll<HTMLElement>("[data-back]")) : [];
    const drawnEl = backs?.querySelector<HTMLElement>("[data-drawn]") ?? null;

    if (hasDrawn && !before.drawn && drawnEl) {
      animate(drawnEl, [{ transform: "translateX(80%)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], DUR.base + 40, EASE_IN);
    }
    if (player.discards.length > before.discards) {
      const fromHand = !tsumogiri && prev.hand.length > 0;
      const from = fromHand ? prev.hand[(player.discards.length * 7) % prev.hand.length] : prev.drawn ?? prev.hand[prev.hand.length - 1];
      const tile = riverRef.current?.lastElementChild;
      if (tile && from) {
        const to = tile.getBoundingClientRect();
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
      // The drawn tile joins the hand.
      const joined = handEls[handEls.length - 1];
      if (fromHand && prev.drawn && joined) {
        const dx = prev.drawn.left - joined.getBoundingClientRect().left;
        if (Math.abs(dx) > 1) animate(joined, [{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], DUR.base + 80);
      }
    }
    rects.current = {
      hand: handEls.map((el) => el.getBoundingClientRect()),
      drawn: drawnEl ? drawnEl.getBoundingClientRect() : null,
    };
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
        // Rows beyond the planned ones (2 rows of 9, or 3 of 6) shrink the river.
        data-over={Math.max(0, Math.ceil(player.discards.length / riverCols) - (riverCols === 9 ? 2 : 3)) || undefined}
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

      {/* Calls on the left, then the closed hand, then her drawn tile. */}
      <div className={styles.lower}>
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
        <div className={styles.backs} aria-label={t("handCount", { n: player.handCount })} ref={backsRef}>
          {Array.from({ length: hasDrawn ? player.handCount - 1 : player.handCount }, (_, i) => (
            <span key={i} className={styles.back} data-back>
              <Tile back size="river" style={backStyle} />
            </span>
          ))}
          {hasDrawn && (
            <span className={styles.drawn} data-drawn>
              <Tile back size="river" style={backStyle} />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
