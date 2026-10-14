import { useApp } from "../../app/AppContext";
import type { BootStage } from "../../engine/protocol";
import styles from "./Menus.module.css";

interface BootProps {
  stage: BootStage | null;
  error: string | null;
  onRetry: () => void;
}

export function Boot({ stage, error, onRetry }: BootProps) {
  const { t } = useApp();
  const pct = stage === "engine" ? 70 : stage === "ready" ? 100 : 25;
  return (
    <div className={`screen ${styles.boot}`}>
      <div className={styles.logo}>
        <span className={styles.logoBadge}>Riichi Mahjong</span>
        {t("appTitle")}
      </div>
      {error ? (
        <>
          <p>{t("loadingFailed")}</p>
          <code className={styles.error}>{error}</code>
          <button className="btn btn-primary" onClick={onRetry}>
            {t("retry")}
          </button>
        </>
      ) : (
        <>
          <div className={styles.progress}>
            <div style={{ width: `${pct}%` }} />
          </div>
          <p className="muted">
            {stage === "ready" ? t("loadingSeats") : stage === "engine" ? t("loadingEngine") : t("loadingRuntime")}
          </p>
        </>
      )}
    </div>
  );
}
