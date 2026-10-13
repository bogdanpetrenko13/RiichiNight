import type { ActionName, Prompt, TileCode } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import styles from "./ActionBar.module.css";

interface ActionBarProps {
  prompt: Prompt | null;
  riichiMode: boolean;
  chiPicker: boolean;
  busy: boolean;
  /** Tile lifted in the hand: offers an explicit Discard button. */
  selectedTile: TileCode | null;
  onDiscardSelected: () => void;
  onAction: (action: ActionName, option?: number) => void;
  onRiichiMode: (on: boolean) => void;
  onChiPicker: (on: boolean) => void;
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
}: ActionBarProps) {
  const { t } = useApp();
  if (!prompt) return <div className={styles.bar} />;

  if (riichiMode) {
    return (
      <div className={styles.bar}>
        <span className={styles.label}>{t("chooseRiichiTile")}</span>
        <button className={`btn ${styles.action}`} onClick={() => onRiichiMode(false)}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  if (chiPicker && prompt.chiOptions) {
    return (
      <div className={styles.bar}>
        {prompt.chiOptions.map((seq, i) => (
          <button key={i} className={`btn ${styles.chi}`} onClick={() => onAction("chi", i)} disabled={busy}>
            {seq.map((c) => (
              <Tile key={c} code={c} size="mini" style={{ ["--tw" as string]: "24px" }} />
            ))}
            {prompt.claim && <Tile code={prompt.claim.tile} size="mini" highlight style={{ ["--tw" as string]: "24px" }} />}
          </button>
        ))}
        <button className={`btn btn-ghost ${styles.action}`} onClick={() => onChiPicker(false)}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  const buttons = ORDER.filter((a) => prompt.actions.includes(a));
  const canDiscard = prompt.actions.includes("discard");
  return (
    <div className={styles.bar}>
      {buttons.map((action) => {
        const kind =
          action === "tsumo" || action === "ron" ? "win" : action === "riichi" ? "riichi" : action === "pass" ? "pass" : "call";
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
        <button className={styles.action} data-kind="discard" onClick={onDiscardSelected} disabled={busy}>
          {t("act_discard")}
          <Tile code={selectedTile} size="mini" style={{ ["--tw" as string]: "20px" }} />
        </button>
      )}
    </div>
  );
}
