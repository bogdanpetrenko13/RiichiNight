import { useEffect, useRef, useState } from "react";
import { parseExample } from "../../learn/yaku";
import { Tile } from "./Tile";

/**
 * Renders "123m 55p" as tiles with small gaps between groups. With `fit`, the
 * tiles shrink so the whole example stays on one line (up to `size`).
 */
export function TileRow({ text, size = 26, fit = false }: { text: string; size?: number; fit?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const items = parseExample(text);
  const tiles = items.filter((c) => c !== null).length;
  const groups = items.length - tiles;

  useEffect(() => {
    if (!fit || !ref.current) return;
    const el = ref.current;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Each tile takes its width + 1px gap; each group break takes 0.35 tile.
  const tw = fit && width > 0 ? Math.min(size, (width - tiles) / (tiles + groups * 0.35)) : size;
  return (
    <div
      ref={ref}
      style={{ display: "flex", flexWrap: fit ? "nowrap" : "wrap", alignItems: "flex-end", gap: 1, rowGap: 10, width: fit ? "100%" : undefined }}
    >
      {items.map((code, i) =>
        code === null ? (
          <span key={`g${i}`} style={{ width: tw * 0.35, flex: "none" }} />
        ) : (
          <Tile key={i} code={code} size="mini" style={{ ["--tw" as string]: `${tw.toFixed(1)}px` }} />
        ),
      )}
    </div>
  );
}
