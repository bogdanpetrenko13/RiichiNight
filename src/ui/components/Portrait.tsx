import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EMOTIONS, assetPaths, type CharacterDef, type Emotion } from "../../game/characters";
import styles from "./Portrait.module.css";

// Remembers which art files are missing so we don't refetch them every render.
const missing = new Set<string>();
// Emotion art already asked for: decoded ahead, so a change never shows an empty frame.
const preloaded = new Set<string>();

function preload(id: string) {
  for (const e of EMOTIONS) {
    const src = assetPaths.emotion(id, e);
    if (preloaded.has(src) || typeof Image === "undefined") continue;
    preloaded.add(src);
    const img = new Image();
    img.onerror = () => missing.add(src);
    img.src = src;
  }
}

const reducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

interface PortraitProps {
  character: CharacterDef;
  emotion?: Emotion;
  size?: number;
  className?: string;
  /** Circular frame (rival bands). */
  round?: boolean;
  /** At the table: a change of face is acted out (a hop and a flash of her
   *  colour for joy, a flinch for trouble). */
  react?: boolean;
}

/** Character portrait: emotion art → base portrait → generated placeholder.
 *  A new face fades in over the old one. */
export function Portrait({ character, emotion = "neutral", size = 72, className, round, react }: PortraitProps) {
  const candidates = [assetPaths.emotion(character.id, emotion), assetPaths.portrait(character.id)].filter(
    (src) => !missing.has(src),
  );
  const [, rerender] = useState(0);
  const src = candidates[0];

  // Faces on screen, oldest first; the newest fades in, then the others go.
  const [layers, setLayers] = useState<{ src: string; key: number }[]>(() => (src ? [{ src, key: 0 }] : []));
  const nextKey = useRef(1);
  const top = layers[layers.length - 1];
  if (src && top?.src !== src) {
    setLayers((prev) => [...prev.slice(-1), { src, key: nextKey.current++ }]);
  }
  if (!src && layers.length) setLayers([]);

  useEffect(() => {
    preload(character.id);
  }, [character.id]);

  // The reaction plays when the emotion changes, not on the first render.
  const frame = useRef<HTMLDivElement>(null);
  const shown = useRef(emotion);
  useLayoutEffect(() => {
    if (shown.current === emotion) return;
    shown.current = emotion;
    const el = frame.current;
    if (!react || !el || reducedMotion() || typeof el.animate !== "function") return;
    if (emotion === "happy") {
      el.animate(
        [
          { transform: "translateY(0) scale(1.05)" },
          { transform: "translateY(-10px) scale(1.05)", offset: 0.35 },
          { transform: "translateY(0) scale(1.05)", offset: 0.7 },
          { transform: "translateY(-3px) scale(1.05)", offset: 0.85 },
          { transform: "translateY(0) scale(1.05)" },
        ],
        { duration: 560, easing: "ease-out" },
      );
      const ring = getComputedStyle(el).boxShadow;
      el.animate(
        [
          { boxShadow: ring },
          { boxShadow: `0 0 0 3px ${character.color}, 0 0 22px 6px ${character.color}`, offset: 0.3 },
          { boxShadow: ring },
        ],
        { duration: 900, easing: "ease-out" },
      );
    } else if (emotion === "troubled") {
      el.animate(
        [0, -6, 6, -4, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 420, easing: "ease-out" },
      );
    }
  }, [emotion, react, character.color]);

  return (
    <div
      ref={frame}
      className={[styles.frame, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, ["--c" as string]: character.color, ["--a" as string]: character.accent }}
      data-emotion={emotion}
      data-round={round || undefined}
      data-react={react || undefined}
    >
      {layers.length ? (
        layers.map((layer, i) => (
          <img
            key={layer.key}
            src={layer.src}
            alt={i === layers.length - 1 ? character.name.en : ""}
            draggable={false}
            className={layer.key > 0 && i === layers.length - 1 ? styles.enter : undefined}
            data-face={i === layers.length - 1 || undefined}
            onAnimationEnd={() => setLayers((prev) => prev.filter((l) => l.key >= layer.key))}
            onError={() => {
              missing.add(layer.src);
              rerender((n) => n + 1);
            }}
          />
        ))
      ) : (
        <Placeholder character={character} />
      )}
    </div>
  );
}

function Placeholder({ character }: { character: CharacterDef }) {
  const initial = character.name.en.charAt(0);
  return (
    <svg viewBox="0 0 100 100" className={styles.placeholder} role="img" aria-label={character.name.en}>
      <defs>
        <linearGradient id={`g-${character.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={character.accent} />
          <stop offset="1" stopColor={character.color} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#g-${character.id})`} />
      <circle cx="50" cy="40" r="20" fill="rgba(255,255,255,0.35)" />
      <path d="M18 100 C22 70 78 70 82 100 Z" fill="rgba(255,255,255,0.35)" />
      <text x="50" y="47" textAnchor="middle" fontSize="22" fontWeight="700" fill="rgba(0,0,0,0.55)">
        {initial}
      </text>
    </svg>
  );
}
