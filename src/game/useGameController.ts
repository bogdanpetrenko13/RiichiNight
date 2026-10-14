import { useCallback, useEffect, useRef, useState } from "react";
import { getEngine } from "../engine/EngineClient";
import type { CallKind, GameView, HumanCommand, StepResult } from "../engine/protocol";
import { useApp } from "../app/AppContext";
import { music, voice } from "./audio";
import { getCharacter, pickLine, rivalsUnlockedBy, type CharacterDef, type Emotion, type SpeechKind } from "./characters";
import { applyGameEnd, applyRound, freshSession, mergeUnlocks, type SessionStages, type StageChange } from "./rewards";
import { applyEvents } from "./stats";
import { clearGame, saveGame, type SavedGame } from "./storage";

export interface Callout {
  id: number;
  seat: number;
  kind: CallKind;
}

export interface Speech {
  id: number;
  text: string;
}

/** Big slanted banner for Ron / Tsumo / Riichi. */
export interface Cutaway {
  id: number;
  seat: number;
  kind: "ron" | "tsumo" | "riichi";
}

const CALL_PAUSE = 650;
/** Ron / Tsumo / Riichi banner: 0.3 s in, 1.5 s readable, 0.4 s out. */
export const CUTAWAY_MS = 2200;
const SPEECH_MS = 3200;
const PLAYER_VOICE = "player";
const MANGAN = 8000;

export interface GameController {
  view: GameView | null;
  cast: CharacterDef[];
  session: SessionStages;
  emotions: Record<number, Emotion>;
  tsumogiri: Record<number, boolean>;
  callouts: Callout[];
  speech: Record<number, Speech>;
  cutaway: Cutaway | null;
  /** Reward changes caused by the last finished hand (shown in the result panel). */
  roundChanges: StageChange[];
  /** Changes from the final placement bonus. */
  endChanges: StageChange[];
  busy: boolean;
  error: string | null;
  start: (castIds: string[]) => Promise<void>;
  resume: (saved: SavedGame) => Promise<void>;
  act: (command: HumanCommand) => Promise<void>;
  nextRound: () => Promise<void>;
  /** A heroine comments on the human taking long (called by the table). */
  sayIdle: () => void;
  /** Tap on the banner: hide it and continue without waiting. */
  skipCutaway: () => void;
}

export function useGameController(): GameController {
  const { settings, unlocks, setUnlocks, stats, commitStats, lang, rivals, unlockRivals } = useApp();
  const rivalsRef = useRef(rivals);
  rivalsRef.current = rivals;
  const engine = getEngine();

  const [view, setView] = useState<GameView | null>(null);
  const [cast, setCast] = useState<CharacterDef[]>([]);
  const [session, setSession] = useState<SessionStages>({});
  const [emotions, setEmotions] = useState<Record<number, Emotion>>({});
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [speech, setSpeech] = useState<Record<number, Speech>>({});
  /** Per seat: was the last discard the tile just drawn (tsumogiri)? */
  const [tsumogiri, setTsumogiri] = useState<Record<number, boolean>>({});
  const [cutaway, setCutaway] = useState<Cutaway | null>(null);
  /** Re-schedules the next opponent step (after skipping a banner). */
  const [nudge, setNudge] = useState(0);
  const [roundChanges, setRoundChanges] = useState<StageChange[]>([]);
  const [endChanges, setEndChanges] = useState<StageChange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs keep async handlers consistent without stale closures.
  const castRef = useRef<CharacterDef[]>([]);
  const sessionRef = useRef<SessionStages>({});
  const unlocksRef = useRef(unlocks);
  const statsRef = useRef(stats);
  const settingsRef = useRef(settings);
  const langRef = useRef(lang);
  const matchDealIns = useRef(0);
  const busyRef = useRef(false);
  const nextId = useRef(1);
  const pauseRef = useRef(0);
  unlocksRef.current = unlocks;
  statsRef.current = stats;
  settingsRef.current = settings;
  langRef.current = lang;

  const voiceIdFor = (seat: number) => (seat === 0 ? PLAYER_VOICE : castRef.current[seat - 1]?.id);
  const setEmotion = (seat: number, e: Emotion) => setEmotions((prev) => ({ ...prev, [seat]: e }));

  const say = useCallback((seat: number, kind: SpeechKind) => {
    const c = castRef.current[seat - 1];
    if (!c || !settingsRef.current.speechBubbles) return;
    const id = nextId.current++;
    setSpeech((prev) => ({ ...prev, [seat]: { id, text: pickLine(c, langRef.current, kind) } }));
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

  const randomRival = () => 1 + Math.floor(Math.random() * Math.max(1, castRef.current.length));

  const handleStep = useCallback(
    async (step: StepResult): Promise<void> => {
      let pause = 0;
      const result = step.view.result;
      for (const ev of step.events) {
        switch (ev.t) {
          case "discard":
            setTsumogiri((prev) => ({ ...prev, [ev.seat]: Boolean(ev.tsumogiri) }));
            break;
          case "round_start":
            setEmotions({});
            setRoundChanges([]);
            break;
          case "call": {
            pause = Math.max(pause, CALL_PAUSE);
            const id = nextId.current++;
            // Ron / Tsumo / Riichi get the big banner instead of the small callout.
            if (ev.kind !== "ron" && ev.kind !== "tsumo" && ev.kind !== "riichi") {
              setCallouts((prev) => [...prev, { id, seat: ev.seat, kind: ev.kind }]);
              window.setTimeout(() => setCallouts((prev) => prev.filter((c) => c.id !== id)), 1400);
            }
            if (ev.kind === "ron" || ev.kind === "tsumo" || ev.kind === "riichi") {
              pause = CUTAWAY_MS;
              setCutaway({ id, seat: ev.seat, kind: ev.kind });
              window.setTimeout(() => setCutaway((c) => (c?.id === id ? null : c)), CUTAWAY_MS);
            }
            const vid = voiceIdFor(ev.seat);
            if (vid) void voice.play(vid, ev.kind);
            if (ev.seat === 0) {
              // Your riichi worries everyone else.
              if (ev.kind === "riichi") for (let s = 1; s <= 3; s++) setEmotion(s, "troubled");
            } else if (ev.kind === "riichi") {
              setEmotion(ev.seat, "happy");
              if (Math.random() < 0.6) say(ev.seat, "riichi");
            }
            break;
          }
          case "win": {
            const humanWin = ev.winners.includes(0);
            if (humanWin) {
              const points = result?.type === "win" ? result.winners.find((w) => w.seat === 0)?.points ?? 0 : 0;
              if (ev.tsumo) {
                for (let s = 1; s <= 3; s++) setEmotion(s, "troubled");
                say(randomRival(), "lossTsumo");
              } else if (ev.from !== null && ev.from > 0) {
                setEmotion(ev.from, "troubled");
                say(ev.from, points >= MANGAN ? "lossBig" : "lossRon");
              }
            } else if (!ev.tsumo && ev.from !== null && ev.from > 0) {
              setEmotion(ev.from, "troubled");
              say(ev.from, "lossRon");
            }
            for (const w of ev.winners)
              if (w > 0) {
                setEmotion(w, "happy");
                say(w, "pleased");
              }
            // Reward stages only count once the extras code has been entered.
            if (result && settingsRef.current.extrasUnlocked) {
              const { session: next, changes } = applyRound(
                sessionRef.current,
                result,
                castRef.current,
                settingsRef.current.rewardRules,
              );
              sessionRef.current = next;
              setSession(next);
              setRoundChanges(changes);
              if (changes.length) setUnlocks(mergeUnlocks(unlocksRef.current, changes));
            }
            break;
          }
          case "draw_game":
            if (ev.kind === "exhaustive_draw") say(randomRival(), "wallGame");
            break;
          case "game_end": {
            // Progression: a 1st place opens the next, harder rivals.
            if (ev.placement[0] === 0)
              unlockRivals(rivalsUnlockedBy(castRef.current.map((c) => c.id), rivalsRef.current));
            if (!settingsRef.current.extrasUnlocked) break;
            const { session: next, changes } = applyGameEnd(
              sessionRef.current,
              ev.placement,
              castRef.current,
              settingsRef.current.rewardRules,
            );
            sessionRef.current = next;
            setSession(next);
            setEndChanges(changes);
            if (changes.length) setUnlocks(mergeUnlocks(unlocksRef.current, changes));
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
          session: sessionRef.current,
          dealIns: matchDealIns.current,
          blob,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setUnlocks, commitStats, say, unlockRivals],
  );

  const run = useCallback(
    async (fn: () => Promise<StepResult>): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      try {
        await handleStep(await fn());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [handleStep],
  );

  // Opponents move one action at a time so discards are readable.
  useEffect(() => {
    if (!view || view.status !== "ai" || busy) return;
    const delay = settings.aiDelay + pauseRef.current;
    const timer = window.setTimeout(() => {
      void run(() => engine.aiStep());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [view, busy, settings.aiDelay, run, engine, nudge]);

  const begin = (chars: CharacterDef[], stages: SessionStages, dealIns: number) => {
    castRef.current = chars;
    sessionRef.current = stages;
    matchDealIns.current = dealIns;
    setCast(chars);
    setSession(stages);
    setRoundChanges([]);
    setEndChanges([]);
    setEmotions({});
    setSpeech({});
    setCutaway(null);
    voice.unlock();
    voice.preload(PLAYER_VOICE);
    chars.forEach((c) => voice.preload(c.id));
    music.play("table");
  };

  const start = useCallback(
    async (castIds: string[]) => {
      const chars = castIds.map((id) => getCharacter(id)).filter((c): c is CharacterDef => Boolean(c));
      begin(chars, freshSession(chars), 0);
      await run(() =>
        engine.newGame({ levels: chars.map((c) => c.level), styles: chars.map((c) => c.style), rules: settingsRef.current.gameRules, ...testParams() }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, engine],
  );

  const resume = useCallback(
    async (saved: SavedGame) => {
      const chars = saved.cast.map((id) => getCharacter(id)).filter((c): c is CharacterDef => Boolean(c));
      begin(chars, saved.session ?? freshSession(chars), saved.dealIns ?? 0);
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

  const sayIdle = useCallback(() => say(randomRival(), "idle"), [say]);

  const skipCutaway = useCallback(() => {
    setCutaway(null);
    pauseRef.current = 0;
    setNudge((n) => n + 1);
  }, []);

  return {
    view,
    cast,
    session,
    emotions,
    tsumogiri,
    callouts,
    speech,
    cutaway,
    roundChanges,
    endChanges,
    busy,
    error,
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
