import type { ActionName, Prompt } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import styles from "./ActionBar.module.css";

interface ActionBarProps {
  prompt: Prompt | null;
  riichiMode: boolean;
  chiPicker: boolean;
  busy: boolean;
  onAction: (action: ActionName, option?: number) => void;
  onRiichiMode: (on: boolean) => void;
  onChiPicker: (on: boolean) => void;
}

// Display order: wins first, then riichi, calls, abort, skip.
const ORDER: ActionName[] = ["tsumo", "ron", "riichi", "pon", "chi", "kan", "ankan", "kyuushu", "pass"];

export function ActionBar({ prompt, riichiMode, chiPicker, busy, onAction, onRiichiMode, onChiPicker }: ActionBarProps) {
  const { t } = useApp();
  if (!prompt) return <div className={styles.bar} />;

  if (riichiMode) {
    return (
      <div className={styles.bar}>
        <button className="btn btn-ghost" onClick={() => onRiichiMode(false)}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  if (chiPicker && prompt.chiOptions) {
    return (
      <div className={styles.bar}>
        <span className={styles.label}>{t("chooseChi")}</span>
        {prompt.chiOptions.map((seq, i) => (
          <button key={i} className={`${styles.chi} btn`} onClick={() => onAction("chi", i)} disabled={busy}>
            {seq.map((c) => (
              <Tile key={c} code={c} size="mini" />
            ))}
            {prompt.claim && <Tile code={prompt.claim.tile} size="mini" highlight />}
          </button>
        ))}
        <button className="btn btn-ghost" onClick={() => onChiPicker(false)}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  const buttons = ORDER.filter((a) => prompt.actions.includes(a));
  return (
    <div className={styles.bar}>
      {buttons.map((action) => {
        const cls =
          action === "tsumo" || action === "ron"
            ? "btn btn-gold"
            : action === "riichi"
              ? "btn btn-primary"
              : action === "pass"
                ? "btn btn-ghost"
                : "btn";
        const onClick = () => {
          if (action === "riichi") onRiichiMode(true);
          else if (action === "chi" && (prompt.chiOptions?.length ?? 0) > 1) onChiPicker(true);
          else onAction(action, action === "chi" ? 0 : undefined);
        };
        return (
          <button key={action} className={`${cls} ${styles.action}`} data-action={action} onClick={onClick} disabled={busy}>
            {t(`act_${action}` as StringKey)}
          </button>
        );
      })}
    </div>
  );
}
