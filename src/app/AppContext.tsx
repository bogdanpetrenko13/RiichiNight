import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STRINGS, YAKU_RU, type Lang, type StringKey } from "../i18n/strings";
import {
  defaultSettings,
  dropRetiredData,
  loadAchievements,
  addMatch,
  loadRecords,
  loadRivals,
  loadSettings,
  loadStats,
  saveAchievements,
  saveRecords,
  saveRivals,
  saveSettings,
  saveStats,
  type AchievementLog,
  type Records,
  type Settings,
} from "../game/storage";
import { emptyStats, newlyEarned, type Stats } from "../game/stats";
import { music, voice } from "../game/audio";
import { sfx } from "../game/sfx";
import { setMotionSpeed } from "../ui/motion";
import type { CharacterDef } from "../game/characters";

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

interface AppState {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  stats: Stats;
  /** Persists new stats and awards any achievements they complete. */
  commitStats: (s: Stats) => void;
  resetStats: () => void;
  achievements: AchievementLog;
  /** Rivals unlocked through the progression ladder. */
  rivals: string[];
  /** Adds rivals and queues a "new rival" toast for each. */
  unlockRivals: (ids: string[]) => void;
  /** Your record against each heroine (profile on the rival screen). */
  records: Records;
  /** Adds a finished match: places (1-4) of the cast in seat order, and yours. */
  recordMatch: (cast: string[], places: number[], you: number) => void;
  /** Achievement ids (or "rival:<id>") waiting to be shown as toasts. */
  toasts: string[];
  dismissToast: () => void;
  t: Translate;
  lang: Lang;
  yakuName: (key: string, en: string) => string;
  charName: (c: CharacterDef) => string;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [achievements, setAchievements] = useState<AchievementLog>({});
  const [toasts, setToasts] = useState<string[]>([]);
  const [rivals, setRivals] = useState<string[]>([]);
  const rivalsRef = useRef<string[]>([]);
  const [records, setRecords] = useState<Records>({});
  const recordsRef = useRef<Records>({});
  const achievementsRef = useRef<AchievementLog>({});

  useEffect(() => {
    void dropRetiredData();
    void Promise.all([loadSettings(), loadStats(), loadAchievements(), loadRivals(), loadRecords()]).then(([s, st, a, r, rec]) => {
      recordsRef.current = rec;
      setRecords(rec);
      rivalsRef.current = r;
      setRivals(r);
      setSettings(s);
      setStats(st);
      setAchievements(a);
      achievementsRef.current = a;
      setReady(true);
    });
  }, []);

  useEffect(() => {
    voice.volume = settings.voiceVolume;
    sfx.volume = settings.sfxVolume;
    sfx.surface = settings.tableStyle === "felt" ? "felt" : "wood";
    setMotionSpeed(settings.aiDelay);
    music.setVolume(settings.musicVolume);
    const root = document.documentElement;
    root.lang = settings.lang;
    root.dataset.tileset = settings.tileset;
  }, [settings.voiceVolume, settings.sfxVolume, settings.tableStyle, settings.musicVolume, settings.lang, settings.tileset, settings.aiDelay]);

  // Audio may only start after a user gesture (Android / Chrome). The first
  // tap anywhere unlocks it; every button press then gives a soft click
  // (tiles have their own sounds).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      voice.unlock();
      const el = e.target instanceof Element ? e.target.closest("button") : null;
      if (el && !el.closest("[data-k]") && !el.disabled) void sfx.play("tap");
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);

  // Light/dark theme; "system" follows the OS setting and its changes.
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && Boolean(media?.matches));
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    if (settings.theme !== "system" || !media) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const award = useCallback((s: Stats) => {
    const earned = newlyEarned(s, achievementsRef.current);
    if (!earned.length) return;
    const now = Date.now();
    const next = { ...achievementsRef.current };
    for (const id of earned) next[id] = now;
    achievementsRef.current = next;
    setAchievements(next);
    void saveAchievements(next);
    setToasts((q) => [...q, ...earned]);
  }, []);

  const commitStats = useCallback(
    (s: Stats) => {
      setStats(s);
      void saveStats(s);
      award(s);
    },
    [award],
  );

  const resetStats = useCallback(() => {
    const s = emptyStats();
    setStats(s);
    void saveStats(s);
  }, []);

  const dismissToast = useCallback(() => setToasts((q) => q.slice(1)), []);

  const unlockRivals = useCallback((ids: string[]) => {
    const fresh = ids.filter((id) => !rivalsRef.current.includes(id));
    if (!fresh.length) return;
    const next = [...rivalsRef.current, ...fresh];
    rivalsRef.current = next;
    setRivals(next);
    void saveRivals(next);
    setToasts((q) => [...q, ...fresh.map((id) => `rival:${id}`)]);
  }, []);

  const recordMatch = useCallback((cast: string[], places: number[], you: number) => {
    const next = addMatch(recordsRef.current, cast, places, you);
    recordsRef.current = next;
    setRecords(next);
    void saveRecords(next);
  }, []);

  const value = useMemo<AppState>(() => {
    const lang = settings.lang;
    const table = STRINGS[lang];
    const t: Translate = (key, vars) => {
      let s = table[key] ?? STRINGS.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    return {
      ready,
      settings,
      updateSettings,
      stats,
      commitStats,
      resetStats,
      achievements,
      rivals,
      unlockRivals,
      records,
      recordMatch,
      toasts,
      dismissToast,
      t,
      lang,
      yakuName: (key, en) => (lang === "ru" ? YAKU_RU[key] ?? en : en),
      charName: (c) => c.name[lang],
    };
  }, [ready, settings, updateSettings, stats, commitStats, resetStats, achievements, rivals, unlockRivals, records, recordMatch, toasts, dismissToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
