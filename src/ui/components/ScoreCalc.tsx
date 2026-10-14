import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WinCalc, WinnerInfo } from "../../engine/protocol";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import { Tile } from "./Tile";
import styles from "./Overlay.module.css";

const n = (v: number) => v.toLocaleString();

/**
 * "How it's scored": a link under the total that opens a popup with the fu
 * parts and rounding, base points or the limit name, and who pays what
 * (honba and riichi sticks apart). The result panel itself stays short, so
 * "Next hand" is visible without scrolling.
 *
 * payer: the discarder's name on ron (null on tsumo), "you" for the player.
 */
export function ScoreCalc({ winner, payer }: { winner: WinnerInfo; payer: string | null }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const calc = winner.calc;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!calc) return null;
  return (
    <>
      <button type="button" className={styles.calcToggle} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {t("calcToggle")}
        <span aria-hidden>›</span>
      </button>
      {open &&
        createPortal(
          <div className={styles.calcLayer} onClick={() => setOpen(false)}>
            <div
              className={`panel ${styles.calcDialog}`}
              role="dialog"
              aria-modal="true"
              aria-label={t("calcToggle")}
              onClick={(e) => e.stopPropagation()}
            >
              <header className={styles.calcDialogHead}>
                <h2>{t("calcToggle")}</h2>
                <button type="button" className={styles.calcClose} aria-label={t("close")} onClick={() => setOpen(false)}>
                  ×
                </button>
              </header>
              <div className={styles.calcScroll}>
                <CalcBody winner={winner} calc={calc} payer={payer} />
              </div>
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                {t("calcGotIt")}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function CalcBody({ winner, calc, payer }: { winner: WinnerInfo; calc: WinCalc; payer: string | null }) {
  const { t } = useApp();
  const honbaCount = Math.round(calc.honba / 300);
  const honbaEach = honbaCount * 100;
  const pay = calc.payments;

  return (
    <div className={styles.calcBody}>
      {!winner.yakuman && calc.fuParts && (
        <>
          <h3 className={styles.calcHead}>{t("calcFu")}</h3>
          <ul className={styles.yaku}>
            {calc.fuParts.map((p, i) => (
              <li key={i}>
                <span className={styles.calcPart}>
                  {t(`fu_${p.key}` as StringKey)}
                  {p.tile && <Tile code={p.tile} size="meld" />}
                </span>
                <span>{i === 0 ? p.fu : `+${p.fu}`}</span>
              </li>
            ))}
          </ul>
          <div className={styles.calcSum}>
            {calc.fuRaw !== null && calc.fuRaw !== winner.fu
              ? t("fuRounded", { raw: calc.fuRaw, n: winner.fu })
              : t("fuTotal", { n: winner.fu })}
          </div>
        </>
      )}

      <h3 className={styles.calcHead}>{t("calcPoints")}</h3>
      <ul className={styles.yaku}>
        {calc.limit ? (
          <li>
            <span>
              {t(`limit_${calc.limit}` as StringKey)}
              {calc.yakumanCount > 1 ? ` ×${calc.yakumanCount}` : ""}
            </span>
            <span>{calc.limit === "yakuman" ? "" : t("han", { n: winner.han })}</span>
          </li>
        ) : (
          calc.base !== null && (
            <li>
              <span>
                {t("calcBase", { fu: winner.fu })}
                <sup>
                  {winner.han}+2
                </sup>
              </span>
              <span>
                {n(calc.base)} <small>{t("calcBaseHint")}</small>
              </span>
            </li>
          )
        )}

        {"ron" in pay ? (
          <li>
            <span>
              {payer === "you" ? t("calcPaidByYou") : payer ? t("calcPaidBy", { name: payer }) : t("ronWin")}
              {calc.base !== null && <small className={styles.calcNote}>{t("calcRonMul", { k: calc.dealer ? 6 : 4 })}</small>}
            </span>
            <span>{n(pay.ron - calc.honba)}</span>
          </li>
        ) : calc.dealer ? (
          <li>
            <span>{t("calcTsumoEach")}</span>
            <span>{n(pay.nonDealer - honbaEach)}</span>
          </li>
        ) : (
          <>
            <li>
              <span>{t("calcTsumoDealer")}</span>
              <span>{n(pay.dealer - honbaEach)}</span>
            </li>
            <li>
              <span>{t("calcTsumoOthers")}</span>
              <span>{n(pay.nonDealer - honbaEach)}</span>
            </li>
          </>
        )}

        {calc.honba > 0 && (
          <li>
            <span>{t("calcHonba", { k: honbaCount })}</span>
            <span>+{n(calc.honba)}</span>
          </li>
        )}
        {calc.sticks > 0 && (
          <li>
            <span>{t("calcSticks")}</span>
            <span>+{n(calc.sticks)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
