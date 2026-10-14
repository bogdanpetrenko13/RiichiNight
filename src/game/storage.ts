// Persistence through @capacitor/preferences (SharedPreferences on Android,
// localStorage on the web). Everything is JSON; the engine snapshot is an
// opaque base64 string produced by bridge.save().
import { Preferences } from "@capacitor/preferences";
import { DEFAULT_GAME_RULES, type GameRules, type Level } from "../engine/protocol";
import type { Lang } from "../i18n/strings";
import type { TileHints } from "../ui/tiles";
import { DEFAULT_RULES, type RewardRules, type SessionStages, type Unlocks } from "./rewards";
import { emptyStats, type Stats } from "./stats";

export const AI_DELAY_MIN = 200;
export const AI_DELAY_MAX = 1500;
export const AI_DELAY_DEFAULT = 700;
/** Old three-step setting, mapped to the slider on load. */
const OLD_SPEED: Record<string, number> = { fast: 250, normal: AI_DELAY_DEFAULT, slow: 1100 };
export type Tileset = "modern" | "classic" | "ivory" | "dark" | "flat";
/** Same choice as in Riichi Trainer: follow the system, or force light/dark. */
export type ThemeMode = "system" | "light" | "dark";

export const TILESETS: Tileset[] = ["modern", "classic", "ivory", "dark", "flat"];
export const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

export type TableStyle = "quiet" | "felt";
export const TABLE_STYLES: TableStyle[] = ["quiet", "felt"];
/** Tile set that suits each table style (applied when the style changes). */
export const STYLE_TILESET: Record<TableStyle, Tileset> = { quiet: "modern", felt: "classic" };

/** Bumped when the look changes so old theme choices are replaced once. */
const STYLE_VERSION = 3;

export interface Settings {
  lang: Lang;
  voiceVolume: number;
  sfxVolume: number;
  musicVolume: number;
  /** Pause before each opponent action, ms (slider in Settings). */
  aiDelay: number;
  showWaitHints: boolean;
  autoDiscardRiichi: boolean;
  dealAnimation: boolean;
  speechBubbles: boolean;
  tileset: Tileset;
  /** Table look: flat cards ("quiet") or one green felt ("felt"). */
  tableStyle: TableStyle;
  /** Corner index on tiles: none, man + winds, or all. */
  tileHints: TileHints;
  /** Result screen: "How it's scored" section expanded. */
  scoreDetails?: boolean;
  theme: ThemeMode;
  styleVersion?: number;
  gameRules: GameRules;
  /** null until the age gate has been answered. */
  /** Extra content unlocked with the code from Settings (see extras.ts). */
  extrasUnlocked: boolean;
  /** Ids of lessons the player finished. */
  lessonsDone: string[];
  /** Set once the pre-code reward progress of older builds has been cleared. */
  progressGate?: boolean;
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
  rivals: "rivals.v1",
};

export function defaultSettings(): Settings {
  const ru = typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ru");
  return {
    lang: ru ? "ru" : "en",
    voiceVolume: 0.9,
    sfxVolume: 0.7,
    musicVolume: 0.4,
    aiDelay: AI_DELAY_DEFAULT,
    showWaitHints: true,
    autoDiscardRiichi: true,
    dealAnimation: true,
    speechBubbles: true,
    tileset: "modern",
    tableStyle: "quiet",
    tileHints: "man",
    theme: "system",
    styleVersion: STYLE_VERSION,
    gameRules: { ...DEFAULT_GAME_RULES },
    extrasUnlocked: false,
    lessonsDone: [],
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
  // Settings from an older design: switch to the current default look once.
  const look =
    stored?.styleVersion === STYLE_VERSION && THEME_MODES.includes(stored.theme as ThemeMode)
      ? {}
      : { tileset: base.tileset, theme: base.theme, styleVersion: STYLE_VERSION };
  const { table: _oldTable, aiSpeed: oldSpeed, ...rest } = (stored ?? {}) as Partial<Settings> & {
    table?: unknown;
    aiSpeed?: string;
  };
  if (rest.aiDelay === undefined && oldSpeed) rest.aiDelay = OLD_SPEED[oldSpeed] ?? AI_DELAY_DEFAULT;
  // Until the code is entered nothing about reward scenes is active or shown.
  const extras =
    rest.extrasUnlocked === true ? {} : { extrasUnlocked: false, adultConfirmed: null, rewardScenes: false };
  return {
    ...base,
    ...rest,
    ...look,
    ...extras,
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

/** Ids of rivals unlocked through the progression ladder. */
export async function loadRivals(): Promise<string[]> {
  const v = await getJson<string[]>(KEYS.rivals);
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

export const saveRivals = (r: string[]) => setJson(KEYS.rivals, r);

export async function loadGame(): Promise<SavedGame | null> {
  const g = await getJson<SavedGame>(KEYS.game);
  return g && g.version === 1 && typeof g.blob === "string" ? g : null;
}

export const saveGame = (g: SavedGame) => setJson(KEYS.game, g);

export async function clearGame(): Promise<void> {
  await Preferences.remove({ key: KEYS.game });
}
