import type { Level } from "../engine/protocol";
import type { Lang } from "../i18n/strings";

/**
 * Character roster.
 *
 * Every heroine is an adult (18+). `validateRoster` refuses any entry whose
 * age is missing or under 18, so a typo can never put a minor into the
 * reward system. Keep her written profile adult as well (job, life, tone);
 * art must also read clearly as an adult.
 *
 * Art is loaded by convention from public/characters/<id>/ and falls back to
 * a generated placeholder card when a file is missing:
 *   portrait.webp                 table portrait (square, ~512px)
 *   emotions/<emotion>.webp       neutral | happy | confident | surprised | troubled
 *   reward/stage<N>.webp          reward scene for stage N (1..stages-1)
 * Voice lines: public/voice/<id>/<riichi|pon|chi|kan|ron|tsumo>.mp3
 */

export type Emotion = "neutral" | "happy" | "confident" | "surprised" | "troubled";
export const EMOTIONS: Emotion[] = ["neutral", "happy", "confident", "surprised", "troubled"];

export interface CharacterDef {
  id: string;
  name: Record<Lang, string>;
  title: Record<Lang, string>;
  /** Must be 18 or over. */
  age: number;
  bio: Record<Lang, string>;
  level: Level;
  /** Theme colours for cards, callouts and placeholders. */
  color: string;
  accent: string;
  /** Number of reward stages including the starting one (stage 0). */
  stages: number;
  /** Lines shown on the reward scene for stages 1..stages-1. */
  stageLines: Record<Lang, string[]>;
}

export const ROSTER: CharacterDef[] = [
  {
    id: "hikari",
    name: { en: "Hikari Amane", ru: "Хикари Амане" },
    title: { en: "Café barista", ru: "Бариста из кафе" },
    age: 23,
    bio: {
      en: "Works the morning shift and plays mahjong every evening. Fast, cheerful, a little reckless.",
      ru: "Работает в утреннюю смену, а вечерами играет в маджонг. Быстрая, весёлая, немного безрассудная.",
    },
    level: "easy",
    color: "#f2a65a",
    accent: "#ffe3c4",
    stages: 5,
    stageLines: {
      en: ["Lucky draw, huh?", "Okay, okay, you're good!", "Next hand is mine!", "...I'm all out of excuses."],
      ru: ["Повезло с тайлом, да?", "Ладно, ладно, ты хорош!", "Следующая раздача моя!", "...Оправдания закончились."],
    },
  },
  {
    id: "rin",
    name: { en: "Rin Kurosawa", ru: "Рин Куросава" },
    title: { en: "Accountant", ru: "Бухгалтер" },
    age: 27,
    bio: {
      en: "Counts every tile left in the wall. Calm, precise and very hard to read.",
      ru: "Считает каждый тайл в стене. Спокойная, точная, по её лицу ничего не понять.",
    },
    level: "normal",
    color: "#5b8def",
    accent: "#dbe6ff",
    stages: 5,
    stageLines: {
      en: ["A statistical outlier.", "I underestimated you.", "Interesting. Again.", "Fine. You earned it."],
      ru: ["Статистический выброс.", "Я тебя недооценила.", "Интересно. Ещё раз.", "Ладно. Ты заслужил."],
    },
  },
  {
    id: "mai",
    name: { en: "Mai Tachibana", ru: "Май Татибана" },
    title: { en: "Mahjong parlor owner", ru: "Хозяйка маджонг-салона" },
    age: 31,
    bio: {
      en: "Runs the parlor and has seen every trick. Folds at the right moment and strikes hard.",
      ru: "Держит салон и видела все уловки. Вовремя сбрасывается и бьёт наверняка.",
    },
    level: "hard",
    color: "#c2456b",
    accent: "#ffd6e2",
    stages: 5,
    stageLines: {
      en: ["Not bad, newcomer.", "You read me well.", "Now I'm serious.", "Take a bow. You beat the house."],
      ru: ["Неплохо, новичок.", "Ты хорошо меня читаешь.", "Теперь я серьёзно.", "Поклонись. Ты обыграл хозяйку."],
    },
  },
  {
    id: "yuzu",
    name: { en: "Yuzu Hoshino", ru: "Юдзу Хосино" },
    title: { en: "Streamer", ru: "Стримерша" },
    age: 24,
    bio: {
      en: "Streams her games every night. Loves flashy hands and never backs down from a riichi.",
      ru: "Каждый вечер стримит свои партии. Обожает эффектные руки и никогда не сдаётся под риичи.",
    },
    level: "normal",
    color: "#8e6cd8",
    accent: "#ece2ff",
    stages: 5,
    stageLines: {
      en: ["Chat, did you see that?!", "Okay that was clean.", "Rematch! Right now!", "GG... you win this one."],
      ru: ["Чат, вы это видели?!", "Ладно, это было чисто.", "Реванш! Прямо сейчас!", "GG... эту ты выиграл."],
    },
  },
];

export function validateRoster(roster: CharacterDef[]): CharacterDef[] {
  return roster.filter((c) => {
    const ok = Number.isFinite(c.age) && c.age >= 18 && c.stages >= 2;
    if (!ok) console.error(`[roster] character "${c.id}" rejected: must be 18+ with at least 2 stages`);
    return ok;
  });
}

export const CHARACTERS = validateRoster(ROSTER);

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

const base = () => new URL("./", window.location.href).href;

export const assetPaths = {
  portrait: (id: string) => `${base()}characters/${id}/portrait.webp`,
  emotion: (id: string, emotion: Emotion) => `${base()}characters/${id}/emotions/${emotion}.webp`,
  reward: (id: string, stage: number) => `${base()}characters/${id}/reward/stage${stage}.webp`,
  voice: (id: string, kind: string) => `${base()}voice/${id}/${kind}.mp3`,
};
