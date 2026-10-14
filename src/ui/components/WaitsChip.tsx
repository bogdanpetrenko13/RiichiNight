import type { PlayerView, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import { sameType } from "../tiles";
import { Tile } from "./Tile";
import styles from "./WaitsChip.module.css";

interface WaitsChipProps {
  player: PlayerView;
  prompt: Prompt | null;
  /** Tile lifted in the hand: shows what discarding it would wait on. */
  selectedCode: TileCode | null;
  riichiMode: boolean;
}

function findHint(prompt: Prompt | null | undefined, code: TileCode) {
  if (!prompt?.hints) return null;
  const key = Object.keys(prompt.hints).find((k) => sameType(k, code));
  return key ? prompt.hints[key] : null;
}

/**
 * Waits / furiten indicator (top right of the player's band). Shows the waits
 * after discarding the lifted tile, otherwise the current waits while tenpai.
 */
export function WaitsChip({ player, prompt, selectedCode, riichiMode }: WaitsChipProps) {
  const { t, settings } = useApp();
  if (riichiMode) return <div className={styles.chip}>{t("chooseRiichiTile")}</div>;
  const selectedHint = selectedCode && settings.showWaitHints ? findHint(prompt, selectedCode) : null;
  const standing =
    !selectedHint && player.waits?.length
      ? { waits: player.waits.map((tile) => ({ tile, remaining: -1 })), furiten: Boolean(player.furiten) }
      : null;
  const hint = selectedHint ?? standing;
  if (!hint) {
    return player.furiten ? <div className={styles.chip} data-furiten>{t("furiten")}</div> : null;
  }
  return (
    <div className={styles.chip} data-furiten={hint.furiten || undefined} aria-live="polite">
      <span className={styles.label}>{hint.furiten ? t("furiten") : t("waits")}</span>
      <span className={styles.list}>
        {hint.waits.map((w) => (
          <span key={w.tile} className={styles.wait}>
            <Tile code={w.tile} size="mini" style={{ ["--tw" as string]: "18px" }} />
            {w.remaining >= 0 && <small>×{w.remaining}</small>}
          </span>
        ))}
      </span>
    </div>
  );
}
