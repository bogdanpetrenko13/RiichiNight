import type { ActionName, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import styles from "./ActionBar.module.css";

interface ActionBarProps {
  prompt: Prompt | null;
  riichiMode: boolean;
  chiPicker: boolean;
  busy: boolean;
  /** Tile lifted in the hand: offers an explicit Discard (or, in riichi mode, Riichi) button. */
  selectedTile: TileCode | null;
  onDiscardSelected: () => void;
  onAction: (action: ActionName, option?: number) => void;
  onRiichiMode: (on: boolean) => void;
  onChiPicker: (on: boolean) => void;
  /** One horizontal row (portrait, under the hand) instead of a column. */
  row?: boolean;
}

// Wins first, then riichi, calls, abort, skip.
const ORDER: ActionName[] = ["tsumo", "ron", "riichi", "pon", "chi", "kan", "ankan", "kyuushu", "pass"];

export function ActionBar({
  prompt,
  riichiMode,
  chiPicker,
  busy,
  selectedTile,
  onDiscardSelected,
  onAction,
  onRiichiMode,
  onChiPicker,
  row = false,
}: ActionBarProps) {
  const { t } = useApp();
  if (!prompt) return null;

  // Riichi: pick the tile (it lifts and its waits show), then confirm.
  if (riichiMode) {
    return (
      <div className={styles.bar} data-count={2} data-row={row || undefined}>
        {selectedTile ? (
          <button className={styles.action} data-kind="primary" onClick={onDiscardSelected} disabled={busy}>
            {t("act_riichi")}
          </button>
        ) : (
          <span className={styles.label}>{t("chooseRiichiTile")}</span>
        )}
        <button className={styles.action} data-kind="pass" onClick={() => onRiichiMode(false)}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  // Several Chi options: the tiles are picked in the hand (highlighted there).
  if (chiPicker && prompt.chiOptions) {
    return (
      <div className={styles.bar} data-row={row || undefined}>
        <span className={styles.label}>{t("chooseChiTiles")}</span>
        <button className={styles.action} data-kind="pass" onClick={() => onChiPicker(false)}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  const buttons = ORDER.filter((a) => prompt.actions.includes(a));
  const canDiscard = prompt.actions.includes("discard");
  const count = buttons.length + (canDiscard && selectedTile ? 1 : 0);
  // One filled button: a win, else riichi, else Discard; the rest are plain.
  const lead = buttons.find((a) => a === "tsumo" || a === "ron") ?? (buttons.includes("riichi") ? "riichi" : null);
  if (!count) return null;
  return (
    <div className={styles.bar} data-count={count} data-row={row || undefined}>
      {buttons.map((action) => {
        const kind =
          action === "tsumo" || action === "ron" ? "win" : action === "riichi" ? (lead === "riichi" ? "primary" : "pass") : action === "pass" ? "pass" : "call";
        const onClick = () => {
          if (action === "riichi") onRiichiMode(true);
          else if (action === "chi" && (prompt.chiOptions?.length ?? 0) > 1) onChiPicker(true);
          else onAction(action, action === "chi" ? 0 : undefined);
        };
        return (
          <button key={action} className={styles.action} data-kind={kind} onClick={onClick} disabled={busy}>
            {t(`act_${action}` as StringKey)}
          </button>
        );
      })}
      {canDiscard && selectedTile && (
        <button className={styles.action} data-kind={lead ? "pass" : "primary"} onClick={onDiscardSelected} disabled={busy}>
          {t("act_discard")}
        </button>
      )}
    </div>
  );
}
