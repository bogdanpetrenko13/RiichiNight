import { useCallback, useEffect, useRef, useState } from "react";
import { getEngine } from "../engine/EngineClient";
import type { CallKind, GameView, HumanCommand, StepResult } from "../engine/protocol";
import { useApp } from "../app/AppContext";
import { music, voice } from "./audio";
import { sfx } from "./sfx";
import { landingMs } from "../ui/motion";
import { getCharacter, pickLine, rivalsUnlockedBy, type CharacterDef, type Emotion, type SpeechKind } from "./characters";
import { applyEvents } from "./stats";
import { SPEECH_FREQ_FACTOR, clearGame, loadGame, saveGame, type SavedGame } from "./storage";

export interface Callout {
  id: number;
  seat: number;
  kind: CallKind;
  /** Seat the tile was taken from (meld event); null for a closed or added kan. */
  from?: number | null;
}

export interface Speech {
  id: number;
  text: string;
}

/** A heroine's last word on the match results card. */
export interface Finale {
  seat: number;
  text: string;
}

/** Big slanted banner for Ron / Tsumo / Riichi. */
export interface Cutaway {
  id: number;
  seat: number;
  kind: "ron" | "tsumo" | "riichi";
}

const CALL_PAUSE = 650;
/** How long a rival's Chi / Pon / Kan announcement stays in her band. */
const CALLOUT_MS = 1600;
/** Ron / Tsumo / Riichi banner: 0.3 s in, 1.5 s readable, 0.4 s out. */
export const CUTAWAY_MS = 2200;
const SPEECH_MS = 3200;
const PLAYER_VOICE = "player";
/** Yaku the player's voice can name (public/voice/player/yaku_<clip>.mp3); value tiles map to "yakuhai". */
const YAKU_VOICE: Record<string, string> = {
  tanyao: "tanyao",
  pinfu: "pinfu",
  chiitoitsu: "chiitoitsu",
  ittsu: "ittsu",
  double_riichi: "double_riichi",
};
const MANGAN = 8000;

export interface GameController {
  view: GameView | null;
  cast: CharacterDef[];
  emotions: Record<number, Emotion>;
  tsumogiri: Record<number, boolean>;
  callouts: Callout[];
  freshMeld: number | null;
  speech: Record<number, Speech>;
  /** Shown on the game-over card: the winner's (or the top heroine's) word. */
  finale: Finale | null;
  cutaway: Cutaway | null;
  busy: boolean;
  /** Engine failure: the table shows a dialog instead of a traceback. */
  error: GameError | null;
  /** Repeats the action that failed. */
  retry: () => Promise<void>;
  /** Reloads the last saved state of the match; false if there is none or it fails. */
  recover: () => Promise<boolean>;
  start: (castIds: string[]) => Promise<void>;
  resume: (saved: SavedGame) => Promise<void>;
  act: (command: HumanCommand) => Promise<void>;
  nextRound: () => Promise<void>;
  /** A heroine comments on the human taking long (called by the table). */
  sayIdle: () => void;
  /** Tap on the banner: hide it and continue without waiting. */
  skipCutaway: () => void;
}

export interface GameError {
  /** Short, last line of the engine message (e.g. "RuleError: ..."). */
  message: string;
  /** Full message / Python traceback, for the copied report. */
  detail: string;
  at: number;
}

function toGameError(err: unknown): GameError {
  const detail = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
  const raw = err instanceof Error ? err.message : String(err);
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  return { message: lines[lines.length - 1] ?? raw, detail, at: Date.now() };
}

export function useGameController(): GameController {
  const { settings, stats, commitStats, lang, rivals, unlockRivals, records, recordMatch } = useApp();
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const [finale, setFinale] = useState<Finale | null>(null);
  /** The "last place before the final hand" line is said once per match. */
  const lastPlaceSaid = useRef(false);
  const rivalsRef = useRef(rivals);
  rivalsRef.current = rivals;
  const engine = getEngine();

  const [view, setView] = useState<GameView | null>(null);
  const [cast, setCast] = useState<CharacterDef[]>([]);
  const [emotions, setEmotions] = useState<Record<number, Emotion>>({});
  const [callouts, setCallouts] = useState<Callout[]>([]);
  /** Seat whose newest meld is outlined: from her call until the next
   *  player's discard (so a missed call can still be seen). */
  const [freshMeld, setFreshMeld] = useState<number | null>(null);
  const [speech, setSpeech] = useState<Record<number, Speech>>({});
  /** Per seat: was the last discard the tile just drawn (tsumogiri)? */
  const [tsumogiri, setTsumogiri] = useState<Record<number, boolean>>({});
  const [cutaway, setCutaway] = useState<Cutaway | null>(null);
  /** Re-schedules the next opponent step (after skipping a banner). */
  const [nudge, setNudge] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GameError | null>(null);
  /** The last engine call, for "Try again". */
  const lastOp = useRef<(() => Promise<StepResult>) | null>(null);

  // Refs keep async handlers consistent without stale closures.
  const castRef = useRef<CharacterDef[]>([]);
  const statsRef = useRef(stats);
  const settingsRef = useRef(settings);
  const langRef = useRef(lang);
  const matchDealIns = useRef(0);
  const busyRef = useRef(false);
  const nextId = useRef(1);
  const pauseRef = useRef(0);
  statsRef.current = stats;
  settingsRef.current = settings;
  langRef.current = lang;

  const voiceIdFor = (seat: number) => (seat === 0 ? PLAYER_VOICE : castRef.current[seat - 1]?.id);
  const setEmotion = (seat: number, e: Emotion) => setEmotions((prev) => ({ ...prev, [seat]: e }));

  /** Shows a line in a heroine's bubble (a random one of `kind`, or `text`). */
  const say = useCallback((seat: number, kind: SpeechKind, text?: string) => {
    const c = castRef.current[seat - 1];
    if (!c || SPEECH_FREQ_FACTOR[settingsRef.current.speechFreq] <= 0) return;
    const id = nextId.current++;
    setSpeech((prev) => ({ ...prev, [seat]: { id, text: text ?? pickLine(c, langRef.current, kind) } }));
    window.setTimeout(
      () =>
        setSpeech((prev) => {
          if (prev[seat]?.id !== id) return prev;
          const next = { ...prev };
          delete next[seat];
          return next;
        }),
      SPEECH_MS,
    );
  }, []);

  /** Says it with probability base × her chattiness × the speech setting. */
  const maybeSay = useCallback(
    (seat: number, kind: SpeechKind, base: number, text?: string, delayMs = 0) => {
      const c = castRef.current[seat - 1];
      if (!c) return;
      const p = base * c.chatty * SPEECH_FREQ_FACTOR[settingsRef.current.speechFreq];
      if (Math.random() >= p) return;
      if (delayMs) window.setTimeout(() => say(seat, kind, text), delayMs);
      else say(seat, kind, text);
    },
    [say],
  );

  /** A line from `seat` about the heroine at `otherSeat`, if they know each other. */
  const bondLine = (seat: number, otherSeat: number, which: "greet" | "lostTo"): string | null => {
    const c = castRef.current[seat - 1];
    const other = castRef.current[otherSeat - 1];
    const pool = c && other ? c.bonds[other.id]?.[langRef.current]?.[which] : undefined;
    return pool?.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };

  /** Match start: one heroine greets (or greets a friend at the table); maybe a second one too. */
  const greet = () => {
    const n = castRef.current.length;
    if (!n) return;
    const seats = Array.from({ length: n }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    const first = seats[0];
    const friend = seats.slice(1).find((s) => bondLine(first, s, "greet"));
    const factor = SPEECH_FREQ_FACTOR[settingsRef.current.speechFreq];
    const kindFor = (seat: number): SpeechKind =>
      (recordsRef.current[castRef.current[seat - 1].id]?.matches ?? 0) > 0 ? "greetAgain" : "greet";
    if (Math.random() >= Math.min(1, factor)) return;
    if (friend && Math.random() < 0.6) {
      window.setTimeout(() => say(first, "greet", bondLine(first, friend, "greet") ?? undefined), 900);
      const reply = bondLine(friend, first, "greet");
      if (reply) window.setTimeout(() => say(friend, "greet", reply), 2600);
      return;
    }
    window.setTimeout(() => say(first, kindFor(first)), 900);
    const second = seats[1];
    if (second) maybeSay(second, kindFor(second), 0.35, undefined, 2400);
  };

  const randomRival = () => 1 + Math.floor(Math.random() * Math.max(1, castRef.current.length));

  const handleStep = useCallback(
    async (step: StepResult): Promise<void> => {
      let pause = 0;
      const result = step.view.result;
      for (const ev of step.events) {
        switch (ev.t) {
          case "discard":
            void sfx.play("discard", landingMs()); // the clack when the tile lands
            setTsumogiri((prev) => ({ ...prev, [ev.seat]: Boolean(ev.tsumogiri) }));
            setFreshMeld((s) => (s !== null && s !== ev.seat ? null : s));
            break;
          case "round_start": {
            // The wall is built (a shuffle at the first hand of the match), then the dice roll.
            const first = ev.wind === "east" && ev.number === 1 && ev.honba === 0;
            if (first) void sfx.play("shuffle");
            void sfx.play("dice", first ? 1600 : 200);
            setEmotions({});
            setFreshMeld(null);
            // Going into the final hand last: she says something about it once.
            const v = step.view;
            const final = v.rules.gameLength === "east" ? ev.wind === "east" && ev.number === 4 : ev.wind === "south" && ev.number === 4;
            if (final && !lastPlaceSaid.current) {
              const scores = v.players.map((p) => p.score);
              const last = scores.indexOf(Math.min(...scores));
              if (last > 0) {
                lastPlaceSaid.current = true;
                maybeSay(last, "lastPlace", 0.9, undefined, 1200);
              }
            }
            break;
          }
          case "meld":
            setFreshMeld(ev.seat);
            setCallouts((prev) => prev.map((c) => (c.seat === ev.seat && c.from === undefined ? { ...c, from: ev.from } : c)));
            break;
          case "call": {
            pause = Math.max(pause, CALL_PAUSE);
            const id = nextId.current++;
            // Ron / Tsumo / Riichi get the big banner instead of the small callout.
            if (ev.kind !== "ron" && ev.kind !== "tsumo" && ev.kind !== "riichi") {
              setCallouts((prev) => [...prev, { id, seat: ev.seat, kind: ev.kind }]);
              window.setTimeout(() => setCallouts((prev) => prev.filter((c) => c.id !== id)), CALLOUT_MS);
            }
            if (ev.kind === "ron" || ev.kind === "tsumo" || ev.kind === "riichi") {
              pause = CUTAWAY_MS;
              setCutaway({ id, seat: ev.seat, kind: ev.kind });
              window.setTimeout(() => setCutaway((c) => (c?.id === id ? null : c)), CUTAWAY_MS);
            }
            const vid = voiceIdFor(ev.seat);
            if (vid) void voice.play(vid, ev.kind);
            // The riichi stick goes down just after the discard; a meld is slapped down.
            if (ev.kind === "riichi") void sfx.play("riichi", 250);
            else if (ev.kind === "pon" || ev.kind === "chi" || ev.kind === "kan") void sfx.play("call");
            if (ev.seat === 0) {
              // Your riichi worries everyone else; one of them says so.
              if (ev.kind === "riichi") {
                for (let s = 1; s <= 3; s++) setEmotion(s, "troubled");
                maybeSay(randomRival(), "playerRiichi", 0.55, undefined, 900);
              }
            } else if (ev.kind === "riichi") {
              setEmotion(ev.seat, "happy");
              maybeSay(ev.seat, "riichi", 0.7);
            } else if (ev.kind === "pon" || ev.kind === "chi" || ev.kind === "kan") {
              maybeSay(ev.seat, "call", 0.35, undefined, 700);
            }
            break;
          }
          case "win": {
            const humanWin = ev.winners.includes(0);
            void sfx.play(humanWin ? "win" : "roundEnd", 600);
            // The winner sweeps up the riichi sticks on the table.
            if (result?.type === "win" && result.winners.some((w) => (w.calc?.sticks ?? 0) > 0)) void sfx.play("sticks", 1300);
            // Your own win: you name its yaku (the ones the voice pack has).
            if (humanWin && result?.type === "win") {
              const mine = result.winners.find((w) => w.seat === 0);
              const said = new Set<string>();
              for (const y of mine?.yaku ?? []) {
                const clip = YAKU_VOICE[y.key] ?? (/^(haku|hatsu|chun|round_wind_|seat_wind_)/.test(y.key) ? "yakuhai" : null);
                if (clip && !said.has(clip) && said.size < 3) {
                  void voice.play(PLAYER_VOICE, `yaku_${clip}`, CUTAWAY_MS + 200 + said.size * 1000);
                  said.add(clip);
                }
              }
            }
            const pointsOf = (seat: number) =>
              result?.type === "win" ? result.winners.find((w) => w.seat === seat)?.points ?? 0 : 0;
            if (humanWin) {
              if (ev.tsumo) {
                for (let s = 1; s <= 3; s++) setEmotion(s, "troubled");
                maybeSay(randomRival(), "lossTsumo", 0.8);
              } else if (ev.from !== null && ev.from > 0) {
                setEmotion(ev.from, "troubled");
                maybeSay(ev.from, pointsOf(0) >= MANGAN ? "lossBig" : "lossRon", 1);
              }
            } else if (!ev.tsumo && ev.from !== null && ev.from > 0) {
              setEmotion(ev.from, "troubled");
              // Dealt into a heroine she knows: a line about her.
              const friendLine = ev.winners.map((w) => bondLine(ev.from as number, w, "lostTo")).find(Boolean);
              if (friendLine) maybeSay(ev.from, "lossRon", 0.9, friendLine);
              else maybeSay(ev.from, "lossRon", 0.6);
            }
            for (const w of ev.winners)
              if (w > 0) {
                setEmotion(w, "happy");
                // The loser speaks first when there is one; the winner a moment later.
                const later = !ev.tsumo && ev.from !== null && ev.from > 0 ? 1500 : 0;
                maybeSay(w, pointsOf(w) >= MANGAN ? "bigWin" : "pleased", 0.9, undefined, later);
              }
            break;
          }
          case "draw_game":
            void sfx.play("roundEnd", 300);
            if (ev.kind === "exhaustive_draw") maybeSay(randomRival(), "wallGame", 0.6);
            break;
          case "game_end": {
            const castIds = castRef.current.map((c) => c.id);
            // Progression: a 1st place opens the next, harder rivals.
            if (ev.placement[0] === 0) unlockRivals(rivalsUnlockedBy(castIds, rivalsRef.current));
            // Your record against each of them (rival profiles).
            const placeOf = (seat: number) => ev.placement.indexOf(seat) + 1;
            recordMatch(castIds, castIds.map((_, i) => placeOf(i + 1)), placeOf(0));
            // Last word on the results card: the winner, or (if you won) the
            // strongest heroine at the table conceding.
            if (SPEECH_FREQ_FACTOR[settingsRef.current.speechFreq] > 0) {
              const winner = ev.placement[0];
              const strongest = castRef.current.reduce((best, c, i) => (c.step > castRef.current[best].step ? i : best), 0) + 1;
              const seat = winner === 0 ? strongest : winner;
              const kind: SpeechKind = winner === 0 ? "defeated" : "matchWin";
              const c = castRef.current[seat - 1];
              if (c) setFinale({ seat, text: pickLine(c, langRef.current, kind) });
              // The heroine who finished last grumbles in her bubble.
              const last = ev.placement[3];
              if (last > 0 && last !== seat) maybeSay(last, "matchLose", 0.7);
            }
            break;
          }
          default:
            break;
        }
      }

      if (step.events.length) {
        const { stats: nextStats, matchDealIns: d } = applyEvents(
          statsRef.current,
          step.events,
          result,
          matchDealIns.current,
        );
        matchDealIns.current = d;
        statsRef.current = nextStats;
        commitStats(nextStats);
      }

      pauseRef.current = pause;
      setView(step.view);

      const status = step.view.status;
      if (status === "game_over") {
        await clearGame();
      } else if (status === "human" || status === "round_over") {
        const blob = await engine.save();
        await saveGame({
          version: 1,
          savedAt: Date.now(),
          cast: castRef.current.map((c) => c.id),
          levels: step.view.levels,
          dealIns: matchDealIns.current,
          blob,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitStats, say, maybeSay, unlockRivals, recordMatch],
  );

  const run = useCallback(
    async (fn: () => Promise<StepResult>): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      lastOp.current = fn;
      try {
        await handleStep(await fn());
      } catch (err) {
        console.error("[engine]", err);
        setError(toGameError(err));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [handleStep],
  );

  // Opponents move one action at a time so discards are readable.
  useEffect(() => {
    // After an engine error the opponents wait for the player's choice in the
    // error dialog (no endless retries in the background).
    if (!view || view.status !== "ai" || busy || error) return;
    const delay = settings.aiDelay + pauseRef.current;
    const timer = window.setTimeout(() => {
      void run(() => engine.aiStep());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [view, busy, error, settings.aiDelay, run, engine, nudge]);

  const begin = (chars: CharacterDef[], dealIns: number) => {
    castRef.current = chars;
    matchDealIns.current = dealIns;
    setCast(chars);
    setEmotions({});
    setSpeech({});
    setFinale(null);
    lastPlaceSaid.current = false;
    setCutaway(null);
    voice.unlock();
    voice.preload(PLAYER_VOICE);
    sfx.preload();
    chars.forEach((c) => voice.preload(c.id));
    music.play("table");
  };

  const start = useCallback(
    async (castIds: string[]) => {
      const chars = castIds.map((id) => getCharacter(id)).filter((c): c is CharacterDef => Boolean(c));
      begin(chars, 0);
      await run(() =>
        engine.newGame({ levels: chars.map((c) => c.level), styles: chars.map((c) => c.style), rules: settingsRef.current.gameRules, ...testParams() }),
      );
      greet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, engine],
  );

  const resume = useCallback(
    async (saved: SavedGame) => {
      const chars = saved.cast.map((id) => getCharacter(id)).filter((c): c is CharacterDef => Boolean(c));
      begin(chars, saved.dealIns ?? 0);
      await run(() => engine.load(saved.blob));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, engine],
  );

  const act = useCallback(
    async (command: HumanCommand) => {
      voice.unlock();
      music.resume();
      pauseRef.current = 0;
      await run(() => engine.act(command));
    },
    [run, engine],
  );

  const nextRound = useCallback(async () => {
    pauseRef.current = 0;
    await run(() => engine.nextRound());
  }, [run, engine]);

  const retry = useCallback(async () => {
    const op = lastOp.current;
    if (op) await run(op);
    else setError(null);
  }, [run]);

  const recover = useCallback(async () => {
    const saved = await loadGame();
    if (!saved) return false;
    await resume(saved);
    return true;
  }, [resume]);

  const sayIdle = useCallback(() => maybeSay(randomRival(), "idle", 0.8), [maybeSay]);

  const skipCutaway = useCallback(() => {
    setCutaway(null);
    pauseRef.current = 0;
    setNudge((n) => n + 1);
  }, []);

  return {
    view,
    cast,
    emotions,
    tsumogiri,
    callouts,
    freshMeld,
    speech,
    finale,
    cutaway,
    busy,
    error,
    retry,
    recover,
    start,
    resume,
    act,
    nextRound,
    sayIdle,
    skipCutaway,
  };
}

/**
 * `?seed=N` and `?scenario=name` in the page URL (tests and previews only; the
 * Android app never has a query string) make a new game reproducible or start
 * it from a rigged deal (public/py/scenarios.py).
 */
function testParams(): { seed?: number; scenario?: string } {
  if (typeof location === "undefined") return {};
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get("seed"));
  const scenario = q.get("scenario") ?? undefined;
  return { ...(seed > 0 ? { seed } : {}), ...(scenario ? { scenario } : {}) };
}
