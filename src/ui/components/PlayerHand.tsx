import type { PlayerView, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { sameType } from "../tiles";
import { Tile } from "./Tile";
import styles from "./PlayerHand.module.css";

interface PlayerHandProps {
  player: PlayerView;
  prompt: Prompt | null;
  riichiMode: boolean;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onDiscard: (code: TileCode) => void;
  onRiichi: (code: TileCode) => void;
}

const contains = (list: TileCode[] | undefined, code: TileCode) => Boolean(list?.some((c) => sameType(c, code)));

/**
 * The human's hand. Tap a tile to lift it (and see its waits), tap again to
 * discard. In riichi mode only tiles that keep tenpai can be picked.
 */
export function PlayerHand({ player, prompt, riichiMode, selected, onSelect, onDiscard, onRiichi }: PlayerHandProps) {
  const { t, settings } = useApp();
  const tiles = player.hand ?? [];
  const drawn = player.drawn ?? null;
  const all = drawn ? [...tiles, drawn] : tiles;
  const canDiscard = Boolean(prompt?.actions.includes("discard"));

  const allowed = (code: TileCode) =>
    riichiMode ? contains(prompt?.riichiTiles, code) : canDiscard && contains(prompt?.discardable, code);

  const tap = (index: number) => {
    const code = all[index];
    if (!allowed(code)) return;
    if (riichiMode) {
      onRiichi(code);
      return;
    }
    if (selected === index) onDiscard(code);
    else onSelect(index);
  };

  const selectedCode = selected !== null ? all[selected] : null;
  const hint = selectedCode && settings.showWaitHints ? prompt?.hints?.[selectedCode] ?? findHint(prompt, selectedCode) : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.hintRow} aria-live="polite">
        {riichiMode ? (
          <span className={styles.hintText}>{t("chooseRiichiTile")}</span>
        ) : hint ? (
          <>
            <span className={styles.hintText}>{hint.furiten ? t("furiten") : t("waits")}</span>
            {hint.waits.map((w) => (
              <span key={w.tile} className={styles.wait}>
                <Tile code={w.tile} size="mini" />
                <small>×{w.remaining}</small>
              </span>
            ))}
          </>
        ) : null}
      </div>
      <div className={styles.row}>
        <div className={styles.tiles}>
          {all.map((code, i) => {
            const isDrawn = drawn !== null && i === all.length - 1;
            const ok = allowed(code);
            const showsWait = !riichiMode && settings.showWaitHints && Boolean(prompt?.hints && findHint(prompt, code));
            return (
              <Tile
                key={`${i}-${code}`}
                code={code}
                size="hand"
                selected={selected === i}
                dimmed={(riichiMode || canDiscard) && !ok}
                highlight={riichiMode ? ok : showsWait}
                onClick={canDiscard || riichiMode ? () => tap(i) : undefined}
                style={isDrawn ? { marginLeft: "calc(var(--hand-tile) * 0.4)" } : undefined}
              />
            );
          })}
        </div>
        {player.melds.length > 0 && (
          <div className={styles.melds}>
            {player.melds.map((m, i) => (
              <span key={i} className={styles.meld}>
                {m.tiles.map((code, j) => (
                  <Tile key={j} code={code} size="meld" back={m.type === "closed_kan" && (j === 0 || j === 3)} />
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function findHint(prompt: Prompt | null | undefined, code: TileCode) {
  if (!prompt?.hints) return null;
  const key = Object.keys(prompt.hints).find((k) => sameType(k, code));
  return key ? prompt.hints[key] : null;
}
