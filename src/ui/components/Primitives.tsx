// Shared building blocks of the redesigned UI: app bar, switch, segmented
// control, settings row and bottom sheet.
import { useEffect, type ReactNode } from "react";
import { Icon } from "../icons";
import styles from "./Primitives.module.css";

export function AppBar({
  title,
  onBack,
  right,
}: {
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className={styles.appBar}>
      {onBack ? (
        <button className={styles.iconBtn} onClick={onBack} aria-label="back">
          <Icon name="back" />
        </button>
      ) : (
        <span className={styles.iconSpacer} />
      )}
      <h1 className={styles.title}>{title}</h1>
      {right ?? <span className={styles.iconSpacer} />}
    </header>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={styles.iconBtn} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} />
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.switch}
      data-on={checked || undefined}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.segmented} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          data-on={o.value === value || undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One line of a settings group: label (+ hint) on the left, control on the right. */
export function Row({ label, hint, children, stacked }: { label: ReactNode; hint?: ReactNode; children: ReactNode; stacked?: boolean }) {
  return (
    <div className={styles.row} data-stacked={stacked || undefined}>
      <div className={styles.rowText}>
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}

export function Group({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.group}>
      {title && <h2 className={styles.groupTitle}>{title}</h2>}
      <div className={styles.groupBody}>{children}</div>
    </section>
  );
}

/** Modal bottom sheet; tapping the scrim closes it. */
export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className={styles.grabber} />
        {title && <h2 className={styles.sheetTitle}>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
