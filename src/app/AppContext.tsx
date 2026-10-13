import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { STRINGS, YAKU_RU, type Lang, type StringKey } from "../i18n/strings";
import { defaultSettings, loadSettings, loadUnlocks, saveSettings, saveUnlocks, type Settings } from "../game/storage";
import type { Unlocks } from "../game/rewards";
import { voice } from "../game/audio";
import type { CharacterDef } from "../game/characters";

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

interface AppState {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  unlocks: Unlocks;
  setUnlocks: (u: Unlocks) => void;
  t: Translate;
  lang: Lang;
  yakuName: (key: string, en: string) => string;
  charName: (c: CharacterDef) => string;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [unlocks, setUnlocksState] = useState<Unlocks>({});

  useEffect(() => {
    void Promise.all([loadSettings(), loadUnlocks()]).then(([s, u]) => {
      setSettings(s);
      setUnlocksState(u);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    voice.volume = settings.voiceVolume;
    document.documentElement.lang = settings.lang;
  }, [settings.voiceVolume, settings.lang]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const setUnlocks = useCallback((u: Unlocks) => {
    setUnlocksState(u);
    void saveUnlocks(u);
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
      unlocks,
      setUnlocks,
      t,
      lang,
      yakuName: (key, en) => (lang === "ru" ? YAKU_RU[key] ?? en : en),
      charName: (c) => c.name[lang],
    };
  }, [ready, settings, updateSettings, unlocks, setUnlocks]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
