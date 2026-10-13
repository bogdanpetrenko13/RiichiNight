import { useState } from "react";
import { assetPaths, type CharacterDef, type Emotion } from "../../game/characters";
import styles from "./Portrait.module.css";

// Remembers which art files are missing so we don't refetch them every render.
const missing = new Set<string>();

interface PortraitProps {
  character: CharacterDef;
  emotion?: Emotion;
  size?: number;
  className?: string;
  /** Circular frame (rival bands). */
  round?: boolean;
}

/** Character portrait: emotion art → base portrait → generated placeholder. */
export function Portrait({ character, emotion = "neutral", size = 72, className, round }: PortraitProps) {
  const candidates = [assetPaths.emotion(character.id, emotion), assetPaths.portrait(character.id)].filter(
    (src) => !missing.has(src),
  );
  const [, rerender] = useState(0);
  const src = candidates[0];

  return (
    <div
      className={[styles.frame, className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, ["--c" as string]: character.color, ["--a" as string]: character.accent }}
      data-emotion={emotion}
      data-round={round || undefined}
    >
      {src ? (
        <img
          src={src}
          alt={character.name.en}
          draggable={false}
          onError={() => {
            missing.add(src);
            rerender((n) => n + 1);
          }}
        />
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
