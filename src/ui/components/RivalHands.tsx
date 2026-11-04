import type { EndHand } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import { Tile } from "./Tile";
import { Portrait } from "./Portrait";
import styles from "./Overlay.module.css";

/**
 * "Rivals' hands" on the result card: each heroine's tiles as the hand
 * ended, her calls, and what she was waiting on (or that she was not
 * tenpai). Sent by the engine only after the hand is over.
 */
export function RivalHands({ hands, cast }: { hands: EndHand[]; cast: CharacterDef[] }) {
  const { t, charName } = useApp();
  return (
    <div className={styles.rivalHands} data-rival-hands>
      {hands.map((h) => {
        const c = cast[h.seat - 1];
        const slots = h.hand.length + h.melds.reduce((n, m) => n + m.tiles.length + 0.25, 0);
        return (
          <section key={h.seat} className={styles.rivalHand} data-seat={h.seat}>
            <header>
              {c && <Portrait character={c} emotion="neutral" size={32} round className={styles.face} />}
              <b>{c ? charName(c) : `#${h.seat}`}</b>
              {h.riichi && <span className={styles.riichiTag}>{t("act_riichi")}</span>}
            </header>
            <div className={styles.hand} style={{ ["--n" as string]: slots }}>
              {h.hand.map((code, i) => (
                <Tile key={i} code={code} size="meld" />
              ))}
              {h.melds.map((m, i) => (
                <span key={`m${i}`} className={styles.meldGroup}>
                  {m.tiles.map((code, j) => (
                    <Tile key={j} code={code} size="meld" />
                  ))}
                </span>
              ))}
            </div>
            <p className={styles.rivalWaits} data-waits={h.waits.join(" ") || undefined}>
              {h.waits.length ? (
                <>
                  {t("rivalWaited")}
                  <span className={styles.calcTiles}>
                    {h.waits.map((code) => (
                      <Tile key={code} code={code} size="mini" />
                    ))}
                  </span>
                </>
              ) : (
                <span className={styles.mutedText}>{t("rivalNoten")}</span>
              )}
            </p>
          </section>
        );
      })}
    </div>
  );
}
