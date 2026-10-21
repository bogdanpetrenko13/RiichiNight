// Persistence through @capacitor/preferences (SharedPreferences on Android,
// localStorage on the web). Everything is JSON; the engine snapshot is an
// opaque base64 string produced by bridge.save().
import { Preferences } from "@capacitor/preferences";
import { DEFAULT_GAME_RULES, type GameRules, type Level } from "../engine/protocol";
import type { Lang } from "../i18n/strings";
import type { TileHints } from "../ui/tiles";
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

/** Felt colour of the "felt" table style (src/styles/tokens.css). */
export type FeltColor = "emerald" | "sapphire" | "burgundy" | "graphite" | "amethyst" | "wood";
export const FELT_COLORS: FeltColor[] = ["emerald", "sapphire", "burgundy", "graphite", "amethyst", "wood"];
/** Colour of the frame around the band whose turn it is; "auto" follows the table style. */
export type TurnRing = "auto" | "gold" | "ivory" | "coral" | "aqua" | "sakura" | "sky" | "lime";
export const TURN_RINGS: TurnRing[] = ["auto", "gold", "ivory", "coral", "aqua", "sakura", "sky", "lime"];
/** Swatch colours for the settings screen (the table reads them from tokens.css). */
export const FELT_SWATCH: Record<FeltColor, string> = {
  emerald: "#1a3d2f",
  sapphire: "#183354",
  burgundy: "#4a1a24",
  graphite: "#25282c",
  amethyst: "#2c1f48",
  wood: "#55391f",
};
export const RING_SWATCH: Record<Exclude<TurnRing, "auto">, string> = {
  gold: "#f2c14e",
  ivory: "#f3efe2",
  coral: "#ff7a59",
  aqua: "#3fd6cf",
  sakura: "#ff7ab6",
  sky: "#6cb6ff",
  lime: "#a5e05a",
};
/** Colour of the dealer's wind badge; same choices as the turn highlight. */
export type DealerChip = TurnRing;
export type TurnRingStyle = "line" | "glow";
export const TURN_RING_STYLES: TurnRingStyle[] = ["line", "glow"];

/** Bumped when the look changes so old theme choices are replaced once. */
const STYLE_VERSION = 3;

export type SpeechFreq = "often" | "normal" | "rare" | "off";
export const SPEECH_FREQS: SpeechFreq[] = ["often", "normal", "rare", "off"];
/** Multiplier on every line's chance (with the heroine's chattiness). */
export const SPEECH_FREQ_FACTOR: Record<SpeechFreq, number> = { often: 1.6, normal: 1, rare: 0.45, off: 0 };

/** Your record against one heroine (her profile on the rival screen). */
export interface HeadToHead {
  matches: number;
  /** Matches you finished 1st / she finished 1st. */
  youFirst: number;
  herFirst: number;
  /** Sum of her places (1-4), for her average place against you. */
  herPlaceSum: number;
}
export type Records = Record<string, HeadToHead>;

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
  /** How often rivals talk at the table (each heroine also has her own chattiness). */
  speechFreq: SpeechFreq;
  tileset: Tileset;
  /** Table look: flat cards ("quiet") or one green felt ("felt"). */
  tableStyle: TableStyle;
  /** Felt colour (felt style only). */
  feltColor: FeltColor;
  /** Turn frame colour and look. */
  turnRing: TurnRing;
  turnRingStyle: TurnRingStyle;
  /** Dealer badge colour. */
  dealerChip: DealerChip;
  /** Corner index on tiles: none, man + winds, or all. */
  tileHints: TileHints;
  /** Result screen: "How it's scored" section expanded. */
  scoreDetails?: boolean;
  theme: ThemeMode;
  styleVersion?: number;
  gameRules: GameRules;
  /** Ids of lessons the player finished. */
  lessonsDone: string[];
}

export interface SavedGame {
  version: 1;
  savedAt: number;
  cast: string[];
  levels: Level[];
  /** Deal-ins by the human in this match (for the "clean match" achievement). */
  dealIns?: number;
  blob: string;
}

/** Achievement id -> unlock timestamp. */
export type AchievementLog = Record<string, number>;

const KEYS = {
  settings: "settings.v1",
  game: "game.v1",
  stats: "stats.v1",
  achievements: "achievements.v1",
  rivals: "rivals.v1",
  records: "records.v1",
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
    speechFreq: "normal",
    tileset: "modern",
    tableStyle: "quiet",
    feltColor: "emerald",
    turnRing: "auto",
    turnRingStyle: "line",
    dealerChip: "auto",
    tileHints: "man",
    theme: "system",
    styleVersion: STYLE_VERSION,
    gameRules: { ...DEFAULT_GAME_RULES },
    lessonsDone: [],
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
  for (const key of ["extrasUnlocked", "adultConfirmed", "rewardScenes", "rewardRules", "progressGate"]) {
    delete (rest as Record<string, unknown>)[key];
  }
  // Unknown values (a build with other choices) fall back to the defaults.
  if (rest.tableStyle !== undefined && !TABLE_STYLES.includes(rest.tableStyle)) delete rest.tableStyle;
  if (rest.feltColor !== undefined && !FELT_COLORS.includes(rest.feltColor)) delete rest.feltColor;
  if (rest.turnRing !== undefined && !TURN_RINGS.includes(rest.turnRing)) delete rest.turnRing;
  if (rest.dealerChip !== undefined && !TURN_RINGS.includes(rest.dealerChip)) delete rest.dealerChip;
  if (rest.turnRingStyle !== undefined && !TURN_RING_STYLES.includes(rest.turnRingStyle)) delete rest.turnRingStyle;
  if (rest.aiDelay === undefined && oldSpeed) rest.aiDelay = OLD_SPEED[oldSpeed] ?? AI_DELAY_DEFAULT;
  // The old on/off switch for rivals' lines becomes "off" / the default.
  const oldBubbles = (rest as { speechBubbles?: boolean }).speechBubbles;
  delete (rest as { speechBubbles?: boolean }).speechBubbles;
  if (rest.speechFreq !== undefined && !SPEECH_FREQS.includes(rest.speechFreq)) delete rest.speechFreq;
  if (rest.speechFreq === undefined && oldBubbles === false) rest.speechFreq = "off";
  return {
    ...base,
    ...rest,
    ...look,
    gameRules: { ...base.gameRules, ...(stored?.gameRules ?? {}) },
  };
}

export const saveSettings = (s: Settings) => setJson(KEYS.settings, s);

/** Removes data of features that no longer exist (the old reward stages). */
export async function dropRetiredData(): Promise<void> {
  try {
    await Preferences.remove({ key: "unlocks.v1" });
  } catch {
    /* nothing stored */
  }
}

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

export async function loadRecords(): Promise<Records> {
  const v = await getJson<Records>(KEYS.records);
  return v && typeof v === "object" ? v : {};
}

export const saveRecords = (r: Records) => setJson(KEYS.records, r);

/** Adds one finished match: `places[i]` is the 1-4 place of cast[i]; `you` yours. */
export function addMatch(records: Records, cast: readonly string[], places: readonly number[], you: number): Records {
  const next: Records = { ...records };
  cast.forEach((id, i) => {
    const r = next[id] ?? { matches: 0, youFirst: 0, herFirst: 0, herPlaceSum: 0 };
    next[id] = {
      matches: r.matches + 1,
      youFirst: r.youFirst + (you === 1 ? 1 : 0),
      herFirst: r.herFirst + (places[i] === 1 ? 1 : 0),
      herPlaceSum: r.herPlaceSum + places[i],
    };
  });
  return next;
}

export async function loadGame(): Promise<SavedGame | null> {
  const g = await getJson<SavedGame>(KEYS.game);
  return g && g.version === 1 && typeof g.blob === "string" ? g : null;
}

export const saveGame = (g: SavedGame) => setJson(KEYS.game, g);

export async function clearGame(): Promise<void> {
  await Preferences.remove({ key: KEYS.game });
}
