import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { TileCode } from "../../engine/protocol";
import { fxMs } from "../tableFx";
import { Tile } from "./Tile";

/** Tiles shown of the dead wall: up to four kans add indicators to the first. */
const DEAD_WALL = 5;

/**
 * The dead wall as five tiles: dora indicators face up, the rest face down.
 * After a kan the next tile turns over (Settings -> Table animations) with a
 * short glint, so a new dora is not missed. Used by the portrait table
 * centre and the landscape player column.
 */
export function DeadWall({ dora, round, tileStyle, className, label }: {
  dora: TileCode[];
  /** Round index: a new hand starts with one indicator again (no flip). */
  round: number;
  tileStyle: CSSProperties;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef({ round, count: dora.length });
  useLayoutEffect(() => {
    const before = seen.current;
    seen.current = { round, count: dora.length };
    if (before.round !== round || dora.length <= before.count) return;
    const ms = fxMs(620);
    if (!ms) return;
    const tiles = ref.current?.children;
    for (let i = before.count; i < dora.length; i++) {
      const el = tiles?.[i] as HTMLElement | undefined;
      // A turn on the vertical axis: the back narrows to an edge, the face
      // opens from it, then a glint runs over it.
      el?.animate?.(
        [
          { transform: "perspective(200px) rotateY(90deg)", filter: "brightness(1)" },
          { transform: "perspective(200px) rotateY(0deg)", filter: "brightness(1.6)", offset: 0.55 },
          { transform: "none", filter: "brightness(1)" },
        ],
        { duration: ms, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      );
    }
  }, [dora.length, round]);
  return (
    <div ref={ref} className={className} aria-label={label} data-dead-wall>
      {dora.map((d, i) => (
        <Tile key={`d${i}`} code={d} size="river" style={tileStyle} />
      ))}
      {Array.from({ length: Math.max(0, DEAD_WALL - dora.length) }, (_, i) => (
        <Tile key={`b${i}`} back size="river" style={tileStyle} />
      ))}
    </div>
  );
}
