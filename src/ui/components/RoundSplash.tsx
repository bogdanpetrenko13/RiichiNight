import { useEffect, useMemo, useState } from "react";
import type { GameView } from "../../engine/protocol";
import type { CharacterDef } from "../../game/characters";
import { useApp } from "../../app/AppContext";
import type { StringKey } from "../../i18n/strings";
import styles from "./RoundSplash.module.css";

/** Pip positions (row, column in a 3 x 3 grid) for each face. */
const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

function Die({ value }: { value: number }) {
  return (
    <span className={styles.die} data-die={value}>
      {PIPS[value].map(([r, c], i) => (
        <i key={i} style={{ gridArea: `${r} / ${c}` }} data-red={value === 1 || undefined} />
      ))}
    </span>
  );
}

/**
 * Two dice for the first East: they tumble with changing faces, then land
 * on a pair whose sum, counted around the table from the player, points at
 * the first East (as at a real table). Only the dice are shown, no sum.
 */
function DiceRoll({ dealer, rollMs }: { dealer: number; rollMs: number }) {
  const final = useMemo(() => {
    const pairs: [number, number][] = [];
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if ((a + b - 1) % 4 === dealer) pairs.push([a, b]);
    return pairs[Math.floor(Math.random() * pairs.length)];
  }, [dealer]);
  const [faces, setFaces] = useState<[number, number]>(() => (rollMs > 0 ? [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)] : final));
  useEffect(() => {
    if (rollMs <= 0) return;
    const roll = window.setInterval(() => setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]), 80);
    const land = window.setTimeout(() => {
      window.clearInterval(roll);
      setFaces(final);
    }, rollMs);
    return () => {
      window.clearInterval(roll);
      window.clearTimeout(land);
    };
  }, [final, rollMs]);
  return (
    <div className={styles.dice} style={{ ["--roll" as string]: `${rollMs}ms` }} data-dice={final.join("+")}>
      <Die value={faces[0]} />
      <Die value={faces[1]} />
    </div>
  );
}

/**
 * A short splash as each hand starts (Settings -> Table animations): the
 * round ("East 2"), honba and sticks left on the table, and who deals. On
 * the first hand of a match it names the first East (seats are drawn).
 */
export function RoundSplash({ view, cast, ms, rollMs = 0 }: { view: GameView; cast: CharacterDef[]; ms: number; rollMs?: number }) {
  const { t, charName } = useApp();
  const r = view.round;
  const first = r.index === 1;
  const dealer = r.dealer;
  const name = dealer === 0 ? null : cast[dealer - 1] ? charName(cast[dealer - 1]).split(" ")[0] : null;
  const who = first
    ? name
      ? t("splashFirstEast", { name })
      : t("splashYouFirst")
    : name
      ? t("splashDealer", { name })
      : t("splashYouDeal");
  const extras = [r.honba ? t("honba", { n: r.honba }) : null, r.riichiSticks ? t("splashSticks", { n: r.riichiSticks }) : null].filter(Boolean);
  return (
    <div className={styles.splash} style={{ animationDuration: `${ms}ms` }} role="status" data-round-splash>
      {first && <DiceRoll dealer={dealer} rollMs={rollMs} />}
      <b className={styles.round}>{t("roundLabel", { wind: t(`wind_${r.wind}` as StringKey), n: r.number })}</b>
      {extras.length > 0 && <span className={styles.extras}>{extras.join(" · ")}</span>}
      <span className={styles.dealer} data-you={dealer === 0 || undefined}>
        {who}
      </span>
    </div>
  );
}
