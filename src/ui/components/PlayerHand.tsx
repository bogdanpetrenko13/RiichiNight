import type { PlayerView, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { sameType } from "../tiles";
import { HAND_UNITS_BASE } from "../useLayout";
import { DUR, EASE_IN, animate, setHandLocator } from "../motion";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Tile } from "./Tile";
import styles from "./PlayerHand.module.css";

interface PlayerHandProps {
  /** Outline the newest meld (just called, until the next player's discard). */
  freshMeld?: boolean;
  player: PlayerView;
  prompt: Prompt | null;
  riichiMode: boolean;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onDiscard: (code: TileCode) => void;
  onRiichi: (code: TileCode) => void;
  /** True for a moment after a new deal: tiles fly in. */
  dealing?: boolean;
  /** Changes with every new deal (seed:round): no slide-ins for a new hand. */
  dealId?: string;
  /** Chi with several options: pick the tiles in the hand. */
  chiMode?: { first: number | null } | null;
  onChiTile?: (index: number) => void;
}

const contains = (list: TileCode[] | undefined, code: TileCode) => Boolean(list?.some((c) => sameType(c, code)));

/**
 * The human's hand. Tap a tile to lift it (and see its waits), tap again to
 * discard. In riichi mode only tiles that keep tenpai can be picked, and the
 * declaration works the same way: lift, check the waits, tap again (or the
 * Riichi button) to declare.
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
  dealId,
  chiMode,
  onChiTile,
  freshMeld = false,
}: PlayerHandProps) {
  const { settings } = useApp();
  const tiles = player.hand ?? [];
  const drawn = player.drawn ?? null;
  const all = drawn ? [...tiles, drawn] : tiles;
  const canDiscard = Boolean(prompt?.actions.includes("discard"));

  const allowed = (code: TileCode) =>
    riichiMode ? contains(prompt?.riichiTiles, code) : canDiscard && contains(prompt?.discardable, code);

  // Tiles that take part in the pending choice: riichi discards, chi partners,
  // or the tiles a Pon/Kan would use. Shown raised with a ring, others dimmed.
  const chiOptions = prompt?.chiOptions ?? [];
  const firstCode = chiMode && chiMode.first !== null ? all[chiMode.first] : null;
  const claimTile = prompt?.claim?.tile ?? null;
  const callsPon = Boolean(prompt?.actions.some((a) => a === "pon" || a === "kan"));
  const callsChi = Boolean(prompt?.actions.includes("chi"));
  const eligible = (code: TileCode, index: number): boolean | null => {
    if (riichiMode) return allowed(code);
    if (chiMode) {
      if (!firstCode) return chiOptions.some((o) => contains(o, code));
      if (chiMode.first === index) return true;
      // Second pick: the partner tile of an option that contains the first.
      const partners = chiOptions.filter((o) => contains(o, firstCode)).map((o) => o.find((c) => !sameType(c, firstCode)));
      return partners.some((p) => p !== undefined && sameType(p, code));
    }
    if (claimTile && !canDiscard && (callsPon || callsChi)) {
      return (callsPon && sameType(code, claimTile)) || (callsChi && chiOptions.some((o) => contains(o, code)));
    }
    return null;
  };

  const tap = (index: number) => {
    const code = all[index];
    if (chiMode) {
      if (eligible(code, index)) onChiTile?.(index);
      return;
    }
    if (!allowed(code)) return;
    if (selected === index) (riichiMode ? onRiichi : onDiscard)(code);
    else onSelect(index);
  };

  // Stable identity per physical tile: code + occurrence, so a discard only
  // removes one tile and the others slide instead of being re-created.
  const seen: Record<string, number> = {};
  const keys = all.map((code) => {
    const n = seen[code] ?? 0;
    seen[code] = n + 1;
    return `${code}#${n}`;
  });

  // Size tiles so concealed tiles + melds always fit one row (real counts).
  const meldTiles = player.melds.reduce((n, m) => n + m.tiles.length, 0);
  // The drawn tile's slot is always reserved (an empty placeholder between
  // turns), so tile size and centring do not change when a tile is drawn or
  // discarded: only the tiles that really move animate.
  const reserveSlot = !drawn && all.length % 3 === 1;
  const units = Math.max(
    HAND_UNITS_BASE,
    all.length +
      (drawn || reserveSlot ? 0.3 : 0) +
      (reserveSlot ? 1 : 0) +
      (player.melds.length ? 0.3 + meldTiles * (MELD_SCALE + 0.02) + (player.melds.length - 1) * 0.3 : 0) +
      0.2,
  );
  const rowStyle = { ["--hand-tile" as string]: `min(var(--hand-max), calc((100cqw - 4px) / ${units.toFixed(2)}))` };

  // FLIP: tiles that moved glide from their old place; new tiles slide in.
  const rowRef = useRef<HTMLDivElement>(null);
  const prev = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevDeal = useRef(dealId);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const next = new Map<string, { x: number; y: number }>();
    const nodes = Array.from(row.querySelectorAll<HTMLElement>("[data-k]"));
    for (const n of nodes) next.set(n.dataset.k!, { x: n.offsetLeft, y: n.offsetTop });
    // A new deal (dealId changed):
    // the deal animation shows it, so no slide-ins here. This effect runs
    // before the table switches `dealing` on, and its slide-ins used to show
    // the whole hand for a moment before the deal started.
    const newDeal = dealId !== prevDeal.current;
    prevDeal.current = dealId;
    if (!dealing && !newDeal && prev.current.size) {
      for (const n of nodes) {
        const old = prev.current.get(n.dataset.k!);
        const now = next.get(n.dataset.k!)!;
        if (old) {
          const dx = old.x - now.x;
          if (Math.abs(dx) > 1) animate(n, [{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], DUR.base);
        } else {
          animate(
            n,
            [
              { transform: "translate(35%, -25%)", opacity: 0 },
              { transform: "translate(0, 0)", opacity: 1 },
            ],
            DUR.base + 60,
            EASE_IN,
          );
        }
      }
    }
    prev.current = next;
  });

  // Lets the table find a tile's element when it is discarded (flight to the river).
  useEffect(() => {
    setHandLocator((code) => {
      const row = rowRef.current;
      if (!row) return null;
      const sel = selected !== null ? row.querySelector(`[data-k="${CSS.escape(keys[selected] ?? "")}"]`) : null;
      if (sel && sel.getAttribute("data-k")?.startsWith(code)) return sel;
      return row.querySelector(`[data-k^="${CSS.escape(code)}#"]`);
    });
    return () => setHandLocator(null);
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.row} style={rowStyle} ref={rowRef}>
        <div className={styles.tiles} data-dealing={dealing || undefined}>
          {all.map((code, i) => {
            const isDrawn = drawn !== null && i === all.length - 1;
            const pick = eligible(code, i);
            const showsWait = !chiMode && settings.showWaitHints && Boolean(prompt?.hints && findHint(prompt, code));
            return (
              <Tile
                key={keys[i]}
                dataKey={keys[i]}
                code={code}
                size="hand"
                selected={chiMode ? chiMode.first === i : selected === i}
                dimmed={pick === false || (pick === null && canDiscard && !allowed(code))}
                eligible={pick === true}
                hint={pick === null && showsWait}
                onClick={canDiscard || riichiMode || chiMode ? () => tap(i) : undefined}
                button
                style={{
                  ...(isDrawn ? { marginLeft: "calc(var(--hand-tile) * 0.3)" } : null),
                  // The drawn tile may arrive mid-deal: it flies in at once.
                  ...(dealing ? { animationDelay: isDrawn ? "0ms" : `${i * 40}ms` } : null),
                }}
              />
            );
          })}
          {reserveSlot && !dealing && <span className={styles.slot} aria-hidden />}
        </div>
        {player.melds.length > 0 && (
          <div className={styles.melds}>
            {player.melds.map((m, i) => (
              <span key={i} className={styles.meld} data-fresh={(freshMeld && i === player.melds.length - 1) || undefined}>
                {m.tiles.map((code, j) => (
                  <Tile
                    key={j}
                    code={code}
                    size="meld"
                    back={m.type === "closed_kan" && (j === 0 || j === 3)}
                    style={{ ["--tw" as string]: `calc(var(--hand-tile) * ${MELD_SCALE})` }}
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

/** Meld tiles relative to hand tiles (matches --meld-tile in Tile.module.css). */
const MELD_SCALE = 0.72;

function findHint(prompt: Prompt | null | undefined, code: TileCode) {
  if (!prompt?.hints) return null;
  const key = Object.keys(prompt.hints).find((k) => sameType(k, code));
  return key ? prompt.hints[key] : null;
}
