import { useCallback, useEffect, useRef, useState } from "react";
import { getEngine } from "../engine/EngineClient";
import type { CallKind, GameView, HumanCommand, StepResult } from "../engine/protocol";
import { useApp } from "../app/AppContext";
import { voice } from "./audio";
import { getCharacter, type CharacterDef, type Emotion } from "./characters";
import { applyGameEnd, applyRound, freshSession, mergeUnlocks, type SessionStages, type StageChange } from "./rewards";
import { clearGame, saveGame, type SavedGame } from "./storage";

export interface Callout {
  id: number;
  seat: number;
  kind: CallKind;
}

const STEP_DELAY = { fast: 160, normal: 420, slow: 750 } as const;
const CALL_PAUSE = 650;
const PLAYER_VOICE = "player";

export interface GameController {
  view: GameView | null;
  cast: CharacterDef[];
  session: SessionStages;
  emotions: Record<number, Emotion>;
  callouts: Callout[];
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
}

export function useGameController(): GameController {
  const { settings, unlocks, setUnlocks } = useApp();
  const engine = getEngine();

  const [view, setView] = useState<GameView | null>(null);
  const [cast, setCast] = useState<CharacterDef[]>([]);
  const [session, setSession] = useState<SessionStages>({});
  const [emotions, setEmotions] = useState<Record<number, Emotion>>({});
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [roundChanges, setRoundChanges] = useState<StageChange[]>([]);
  const [endChanges, setEndChanges] = useState<StageChange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs keep async handlers consistent without stale closures.
  const castRef = useRef<CharacterDef[]>([]);
  const sessionRef = useRef<SessionStages>({});
  const unlocksRef = useRef(unlocks);
  const busyRef = useRef(false);
  const calloutId = useRef(1);
  const lastCallRef = useRef(false);
  unlocksRef.current = unlocks;

  const voiceIdFor = (seat: number) => (seat === 0 ? PLAYER_VOICE : castRef.current[seat - 1]?.id);

  const setEmotion = (seat: number, e: Emotion) => setEmotions((prev) => ({ ...prev, [seat]: e }));

  const handleStep = useCallback(
    async (step: StepResult): Promise<void> => {
      let hadCall = false;
      for (const ev of step.events) {
        switch (ev.t) {
          case "round_start":
            setEmotions({});
            setRoundChanges([]);
            break;
          case "call": {
            hadCall = true;
            const id = calloutId.current++;
            setCallouts((prev) => [...prev, { id, seat: ev.seat, kind: ev.kind }]);
            window.setTimeout(() => setCallouts((prev) => prev.filter((c) => c.id !== id)), 1400);
            const vid = voiceIdFor(ev.seat);
            if (vid) void voice.play(vid, ev.kind);
            if (ev.seat === 0) {
              if (ev.kind === "riichi") for (let s = 1; s <= 3; s++) setEmotion(s, "surprised");
            } else if (ev.kind === "riichi") setEmotion(ev.seat, "confident");
            break;
          }
          case "win": {
            if (ev.winners.includes(0)) {
              if (ev.tsumo) for (let s = 1; s <= 3; s++) setEmotion(s, "troubled");
              else if (ev.from !== null && ev.from > 0) setEmotion(ev.from, "troubled");
            }
            for (const w of ev.winners) if (w > 0) setEmotion(w, "happy");
            const result = step.view.result;
            if (result) {
              const { session: next, changes } = applyRound(
                sessionRef.current,
                result,
                castRef.current,
                settings.rewardRules,
              );
              sessionRef.current = next;
              setSession(next);
              setRoundChanges(changes);
              if (changes.length) setUnlocks(mergeUnlocks(unlocksRef.current, changes));
            }
            break;
          }
          case "game_end": {
            const { session: next, changes } = applyGameEnd(
              sessionRef.current,
              ev.placement,
              castRef.current,
              settings.rewardRules,
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
      lastCallRef.current = hadCall;
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
          blob,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.rewardRules, setUnlocks],
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
    const delay = STEP_DELAY[settings.aiSpeed] + (lastCallRef.current ? CALL_PAUSE : 0);
    const timer = window.setTimeout(() => {
      void run(() => engine.aiStep());
    }, delay);
    return () => window.clearTimeout(timer);
  }, [view, busy, settings.aiSpeed, run, engine]);

  const begin = (chars: CharacterDef[], stages: SessionStages) => {
    castRef.current = chars;
    sessionRef.current = stages;
    setCast(chars);
    setSession(stages);
    setRoundChanges([]);
    setEndChanges([]);
    setEmotions({});
    voice.unlock();
    voice.preload(PLAYER_VOICE);
    chars.forEach((c) => voice.preload(c.id));
  };

  const start = useCallback(
    async (castIds: string[]) => {
      const chars = castIds.map((id) => getCharacter(id)).filter((c): c is CharacterDef => Boolean(c));
      begin(chars, freshSession(chars));
      await run(() => engine.newGame({ levels: chars.map((c) => c.level) }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, engine],
  );

  const resume = useCallback(
    async (saved: SavedGame) => {
      const chars = saved.cast.map((id) => getCharacter(id)).filter((c): c is CharacterDef => Boolean(c));
      begin(chars, saved.session ?? freshSession(chars));
      await run(() => engine.load(saved.blob));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, engine],
  );

  const act = useCallback(
    async (command: HumanCommand) => {
      voice.unlock();
      await run(() => engine.act(command));
    },
    [run, engine],
  );

  const nextRound = useCallback(async () => {
    await run(() => engine.nextRound());
  }, [run, engine]);

  return {
    view,
    cast,
    session,
    emotions,
    callouts,
    roundChanges,
    endChanges,
    busy,
    error,
    start,
    resume,
    act,
    nextRound,
  };
}
