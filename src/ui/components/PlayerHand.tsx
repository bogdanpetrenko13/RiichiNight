import type { PlayerView, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { sameType } from "../tiles";
import { HAND_UNITS_BASE } from "../useLayout";
import { DUR, EASE_IN, animate, setHandLocator } from "../motion";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from "react";
import { Tile } from "./Tile";
import { MeldTiles } from "./MeldTiles";
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
  const openMelds = player.melds.filter((m) => m.type !== "closed_kan" && m.from !== null).length;
  // The drawn tile's slot is always reserved (an empty placeholder between
  // turns), so tile size and centring do not change when a tile is drawn or
  // discarded: only the tiles that really move animate.
  const reserveSlot = !drawn && all.length % 3 === 1;
  const units = Math.max(
    HAND_UNITS_BASE,
    all.length +
      (drawn || reserveSlot ? 0.3 : 0) +
      (reserveSlot ? 1 : 0) +
      // (A claimed tile lies sideways: 0.42 of a tile wider.)
      (player.melds.length
        ? 0.3 + meldTiles * (MELD_SCALE + 0.02) + openMelds * 0.42 * MELD_SCALE + (player.melds.length - 1) * 0.3
        : 0) +
      0.2,
  );
  const rowStyle = { ["--hand-tile" as string]: `min(var(--hand-max), calc((100cqw - 4px) / ${units.toFixed(2)}))` };

  // FLIP: tiles that moved glide from their old place; new tiles slide in.
  const rowRef = useRef<HTMLDivElement>(null);
  const prev = useRef<Map<string, { x: number; y: number }>>(new Map());
  const prevDeal = useRef(dealId);
  const prevWidth = useRef(0);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const next = new Map<string, { x: number; y: number }>();
    const nodes = Array.from(row.querySelectorAll<HTMLElement>("[data-k]"));
    // A swiped tile left the hand; an element React reused for another copy
    // of it must not keep the swipe's offset.
    // (A flung tile keeps it until the hand changes: re-renders while the
    // discard is on its way must not snap it back.)
    const sig = keys.join(",");
    if (flung.current && flung.current.sig !== sig) flung.current = null;
    for (const n of nodes) {
      if (n.style.transform && drag.current?.el !== n && flung.current?.el !== n) {
        n.style.transition = "";
        n.style.transform = "";
      }
    }
    for (const n of nodes) next.set(n.dataset.k!, { x: n.offsetLeft, y: n.offsetTop });
    // A new deal (dealId changed):
    // the deal animation shows it, so no slide-ins here. This effect runs
    // before the table switches `dealing` on, and its slide-ins used to show
    // the whole hand for a moment before the deal started.
    const newDeal = dealId !== prevDeal.current;
    prevDeal.current = dealId;
    // The row changed width (the phone turned, the window resized): every
    // tile moved because of that, not because of play; no slides.
    const width = row.clientWidth;
    const resized = Math.abs(width - prevWidth.current) > 2;
    prevWidth.current = width;
    if (!dealing && !newDeal && !resized && prev.current.size) {
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

  // Swipe up to discard (besides tap + tap): the tile follows the finger;
  // let go above the threshold and it is discarded from where it is (the
  // flight to the river starts there), below it the tile slides back.
  const drag = useRef<{ index: number; key: string; el: HTMLElement; x: number; y: number; on: boolean } | null>(null);
  const swiped = useRef<string | null>(null);
  const flung = useRef<{ el: HTMLElement; sig: string } | null>(null);
  const swallowClick = useRef(false);
  const canSwipe = (code: TileCode) => !chiMode && (canDiscard || riichiMode) && allowed(code);
  const onPointerDown = (e: ReactPointerEvent) => {
    swallowClick.current = false;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = (e.target as Element).closest?.("[data-k]") as HTMLElement | null;
    if (!el) return;
    const index = keys.indexOf(el.dataset.k ?? "");
    if (index < 0 || !canSwipe(all[index])) return;
    drag.current = { index, key: keys[index], el, x: e.clientX, y: e.clientY, on: false };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const up = d.y - e.clientY;
    if (!d.on) {
      // A swipe starts upwards; sideways or down it is not one.
      if (Math.abs(dx) > 12 && Math.abs(dx) > up) {
        drag.current = null;
        return;
      }
      if (up < 8) return;
      d.on = true;
      try {
        d.el.setPointerCapture(e.pointerId);
      } catch {
        /* not capturable (synthetic events) */
      }
    }
    d.el.style.transition = "none";
    d.el.style.transform = `translate(${dx}px, ${-Math.max(0, up)}px)`;
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    swallowClick.current = true;
    const up = d.y - e.clientY;
    const threshold = Math.max(40, d.el.offsetHeight * 0.6);
    const code = all[d.index];
    if (up >= threshold && canSwipe(code)) {
      swiped.current = d.key;
      const fling = { el: d.el, sig: keys.join(",") };
      flung.current = fling;
      (riichiMode ? onRiichi : onDiscard)(code);
      // If the discard did not go through (the table was busy), the tile
      // slides back instead of hanging in the air.
      window.setTimeout(() => {
        if (flung.current !== fling) return;
        flung.current = null;
        d.el.style.transition = `transform ${DUR.base}ms ease-out`;
        d.el.style.transform = "";
      }, 1500);
      return;
    }
    d.el.style.transition = `transform ${DUR.base}ms ease-out`;
    d.el.style.transform = "";
    window.setTimeout(() => (d.el.style.transition = ""), DUR.base + 20);
  };
  const onPointerCancel = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.on) {
      d.el.style.transition = "";
      d.el.style.transform = "";
    }
  };
  const onClickCapture = (e: ReactMouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  // Lets the table find a tile's element when it is discarded (flight to the river).
  useEffect(() => {
    setHandLocator((code) => {
      const row = rowRef.current;
      if (!row) return null;
      // A swiped tile: the flight starts where the finger let it go.
      const flung = swiped.current ? row.querySelector(`[data-k="${CSS.escape(swiped.current)}"]`) : null;
      swiped.current = null;
      if (flung && flung.getAttribute("data-k")?.startsWith(code)) return flung;
      const sel = selected !== null ? row.querySelector(`[data-k="${CSS.escape(keys[selected] ?? "")}"]`) : null;
      if (sel && sel.getAttribute("data-k")?.startsWith(code)) return sel;
      return row.querySelector(`[data-k^="${CSS.escape(code)}#"]`);
    });
    return () => setHandLocator(null);
  });

  return (
    <div className={styles.wrap}>
      <div className={styles.row} style={rowStyle} ref={rowRef}>
        <div
          className={styles.tiles}
          data-dealing={dealing || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCapture}
        >
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
                safe={settings.safeTiles && contains(player.safe, code)}
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
              <MeldTiles
                key={i}
                meld={m}
                owner={player.seat}
                size="meld"
                className={styles.meld}
                data-fresh={(freshMeld && i === player.melds.length - 1) || undefined}
                tileStyle={{ ["--tw" as string]: `calc(var(--hand-tile) * ${MELD_SCALE})` }}
              />
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
