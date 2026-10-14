import type { Cutaway } from "../../game/useGameController";
import type { CharacterDef } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Portrait } from "./Portrait";
import styles from "./CallCutaway.module.css";

const ROMAJI = { ron: "RON", tsumo: "TSUMO", riichi: "RIICHI" } as const;

/** Slanted banner that sweeps across the table on Ron / Tsumo / Riichi. */
export function CallCutaway({ cutaway, cast }: { cutaway: Cutaway; cast: CharacterDef[] }) {
  const { t } = useApp();
  const character = cutaway.seat > 0 ? cast[cutaway.seat - 1] : undefined;
  const color = character?.color ?? "var(--sakura)";
  return (
    <div className={styles.layer} aria-live="assertive">
      <div className={styles.band} data-kind={cutaway.kind} style={{ ["--c" as string]: color }}>
        <div className={styles.inner}>
          {character && (
            <Portrait
              character={character}
              emotion="happy"
              size={92}
              className={styles.portrait}
            />
          )}
          <div className={styles.text}>
            <span className={styles.romaji}>{ROMAJI[cutaway.kind]}</span>
            <span className={styles.word}>{t(`act_${cutaway.kind}` as StringKey)}!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
