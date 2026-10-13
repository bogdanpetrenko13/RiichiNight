import { parseExample } from "../../learn/yaku";
import { Tile } from "./Tile";

/** Renders "123m 55p" as tiles with small gaps between groups. */
export function TileRow({ text, size = 26 }: { text: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 2, rowGap: 10 }}>
      {parseExample(text).map((code, i) =>
        code === null ? (
          <span key={`g${i}`} style={{ width: size * 0.35 }} />
        ) : (
          <Tile key={i} code={code} size="mini" style={{ ["--tw" as string]: `${size}px` }} />
        ),
      )}
    </div>
  );
}
