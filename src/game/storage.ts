// Persistence through @capacitor/preferences (SharedPreferences on Android,
// localStorage on the web). Everything is JSON; the engine snapshot is an
// opaque base64 string produced by bridge.save().
import { Preferences } from "@capacitor/preferences";
import { DEFAULT_GAME_RULES, type GameRules, type Level } from "../engine/protocol";
import type { Lang } from "../i18n/strings";
import { DEFAULT_RULES, type RewardRules, type SessionStages, type Unlocks } from "./rewards";
import { emptyStats, type Stats } from "./stats";

export type AiSpeed = "fast" | "normal" | "slow";
export type Tileset = "classic" | "ivory" | "dark" | "flat";
export type TableTheme = "jade" | "night" | "wine" | "walnut" | "slate";

export const TILESETS: Tileset[] = ["classic", "ivory", "dark", "flat"];
export const TABLE_THEMES: TableTheme[] = ["jade", "night", "wine", "walnut", "slate"];

export interface Settings {
  lang: Lang;
  voiceVolume: number;
  sfxVolume: number;
  musicVolume: number;
  aiSpeed: AiSpeed;
  showWaitHints: boolean;
  autoDiscardRiichi: boolean;
  dealAnimation: boolean;
  speechBubbles: boolean;
  tileset: Tileset;
  table: TableTheme;
  gameRules: GameRules;
  /** null until the age gate has been answered. */
  adultConfirmed: boolean | null;
  rewardScenes: boolean;
  rewardRules: RewardRules;
}

export interface SavedGame {
  version: 1;
  savedAt: number;
  cast: string[];
  levels: Level[];
  session: SessionStages;
  /** Deal-ins by the human in this match (for the "clean match" achievement). */
  dealIns?: number;
  blob: string;
}

/** Achievement id -> unlock timestamp. */
export type AchievementLog = Record<string, number>;

const KEYS = {
  settings: "settings.v1",
  unlocks: "unlocks.v1",
  game: "game.v1",
  stats: "stats.v1",
  achievements: "achievements.v1",
};

export function defaultSettings(): Settings {
  const ru = typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ru");
  return {
    lang: ru ? "ru" : "en",
    voiceVolume: 0.9,
    sfxVolume: 0.7,
    musicVolume: 0.4,
    aiSpeed: "normal",
    showWaitHints: true,
    autoDiscardRiichi: true,
    dealAnimation: true,
    speechBubbles: true,
    tileset: "classic",
    table: "jade",
    gameRules: { ...DEFAULT_GAME_RULES },
    adultConfirmed: null,
    rewardScenes: false,
    rewardRules: { ...DEFAULT_RULES },
  };
}

async function getJson<T>(key: string): Promise<T | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

async function setJson(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export async function loadSettings(): Promise<Settings> {
  const stored = await getJson<Partial<Settings>>(KEYS.settings);
  const base = defaultSettings();
  return {
    ...base,
    ...stored,
    rewardRules: { ...base.rewardRules, ...(stored?.rewardRules ?? {}) },
    gameRules: { ...base.gameRules, ...(stored?.gameRules ?? {}) },
  };
}

export const saveSettings = (s: Settings) => setJson(KEYS.settings, s);

export async function loadUnlocks(): Promise<Unlocks> {
  return (await getJson<Unlocks>(KEYS.unlocks)) ?? {};
}

export const saveUnlocks = (u: Unlocks) => setJson(KEYS.unlocks, u);

export async function loadStats(): Promise<Stats> {
  return { ...emptyStats(), ...((await getJson<Partial<Stats>>(KEYS.stats)) ?? {}) };
}

export const saveStats = (s: Stats) => setJson(KEYS.stats, s);

export async function loadAchievements(): Promise<AchievementLog> {
  return (await getJson<AchievementLog>(KEYS.achievements)) ?? {};
}

export const saveAchievements = (a: AchievementLog) => setJson(KEYS.achievements, a);

export async function loadGame(): Promise<SavedGame | null> {
  const g = await getJson<SavedGame>(KEYS.game);
  return g && g.version === 1 && typeof g.blob === "string" ? g : null;
}

export const saveGame = (g: SavedGame) => setJson(KEYS.game, g);

export async function clearGame(): Promise<void> {
  await Preferences.remove({ key: KEYS.game });
}
