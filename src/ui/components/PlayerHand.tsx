import type { PlayerView, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { sameType } from "../tiles";
import { HAND_UNITS_BASE } from "../useLayout";
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
  /** True for a moment after a new deal: tiles fly in. */
  dealing?: boolean;
  /** Landscape: wait hints float above the rack instead of taking a row. */
  floatingHints?: boolean;
}

const contains = (list: TileCode[] | undefined, code: TileCode) => Boolean(list?.some((c) => sameType(c, code)));

/**
 * The human's hand. Tap a tile to lift it (and see its waits), tap again to
 * discard. In riichi mode only tiles that keep tenpai can be picked.
 */
export function PlayerHand({
  player,
  prompt,
  riichiMode,
  selected,
  onSelect,
  onDiscard,
  onRiichi,
  dealing,
  floatingHints,
}: PlayerHandProps) {
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
  const selectedHint = selectedCode && settings.showWaitHints ? prompt?.hints?.[selectedCode] ?? findHint(prompt, selectedCode) : null;
  // Kemono-style wait info: while tenpai, the current waits stay visible.
  const standingWaits =
    !selectedHint && player.waits && player.waits.length
      ? { waits: player.waits.map((tile) => ({ tile, remaining: -1 })), furiten: Boolean(player.furiten) }
      : null;
  const hint = selectedHint ?? standingWaits;

  // Size tiles so concealed tiles + melds always fit one row. Each meld
  // replaces 3 hand slots with 3–4 smaller tiles and a separator.
  const meldTiles = player.melds.reduce((n, m) => n + m.tiles.length, 0);
  const units =
    HAND_UNITS_BASE - player.melds.length * 3 + meldTiles * (MELD_SCALE + 0.02) + player.melds.length * 0.3;
  const rowStyle = { ["--hand-tile" as string]: `min(var(--hand-max), calc(var(--hand-avail) / ${units.toFixed(2)}))` };

  return (
    <div className={styles.wrap} data-float={floatingHints || undefined}>
      <div className={styles.hintRow} aria-live="polite">
        {player.furiten && !hint && <span className={styles.furiten}>{t("furiten")}</span>}
        {riichiMode ? (
          <span className={styles.hintText}>{t("chooseRiichiTile")}</span>
        ) : hint ? (
          <>
            <span className={hint.furiten ? styles.furiten : styles.hintText}>{hint.furiten ? t("furiten") : t("waits")}</span>
            {hint.waits.map((w) => (
              <span key={w.tile} className={styles.wait}>
                <Tile code={w.tile} size="mini" />
                {w.remaining >= 0 && <small>×{w.remaining}</small>}
              </span>
            ))}
          </>
        ) : null}
      </div>
      <div className={styles.row} style={rowStyle}>
        <div className={styles.tiles} data-dealing={dealing || undefined}>
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
                style={{
                  ...(isDrawn ? { marginLeft: "calc(var(--hand-tile) * 0.3)" } : null),
                  ...(dealing ? { animationDelay: `${i * 40}ms` } : null),
                }}
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

/** Meld tiles relative to hand tiles (matches --meld-tile in Tile.module.css). */
const MELD_SCALE = 0.72;

function findHint(prompt: Prompt | null | undefined, code: TileCode) {
  if (!prompt?.hints) return null;
  const key = Object.keys(prompt.hints).find((k) => sameType(k, code));
  return key ? prompt.hints[key] : null;
}
