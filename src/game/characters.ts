import type { Level } from "../engine/protocol";
import type { Lang } from "../i18n/strings";
import { SPEECH, type HeroineSpeech, type SpeechKind } from "./speech";

/**
 * Character roster.
 *
 * Every heroine is an adult (18+). `validateRoster` refuses any entry whose
 * age is missing or under 18. Keep her written profile adult as well (job,
 * life, tone);
 * art must also read clearly as an adult.
 *
 * Art is loaded by convention from public/characters/<id>/ and falls back to
 * a generated placeholder card when a file is missing:
 *   portrait.webp                 table portrait (square, ~512px)
 *   emotions/<emotion>.webp       neutral | happy | troubled
 * Voice lines: public/voice/<id>/<riichi|pon|chi|kan|ron|tsumo>.mp3
 * Speech-bubble lines, profile text and bonds: src/game/speech/<id>.ts
 */

/**
 * Three table expressions:
 *   neutral   default, while nothing special happens
 *   happy     she wins a hand or declares riichi
 *   troubled  she deals in, someone tsumos, or the player declares riichi
 */
export type Emotion = "neutral" | "happy" | "troubled";
export const EMOTIONS: Emotion[] = ["neutral", "happy", "troubled"];

export interface CharacterDef {
  id: string;
  name: Record<Lang, string>;
  title: Record<Lang, string>;
  /** Must be 18 or over. */
  age: number;
  bio: Record<Lang, string>;
  /** Place on the difficulty ladder, 1 (easiest) to 12 (the boss). */
  step: number;
  level: Level;
  /** How she plays (public/py/ai.py STYLES), matching her bio. */
  style: string;
  /** Theme colours for cards, callouts and placeholders. */
  color: string;
  accent: string;
  /** Lines, chattiness, profile and bonds: src/game/speech/<id>.ts. */
  chatty: number;
  story: Record<Lang, string>;
  playstyle: Record<Lang, string>;
  lines: Record<Lang, Record<SpeechKind, string[]>>;
  bonds: HeroineSpeech["bonds"];
  /**
   * Locked until the player finishes 1st in a match where every heroine in
   * `with` sat at the table; omitted = available from the start. The ladder
   * opens one step at a time: steps 1–4 are open, each next step needs a 1st
   * place with the heroine of the step before it.
   */
  unlock?: { kind: "firstPlaceWith"; with: string[] };
}

export type { SpeechKind } from "./speech";

/** Who she is and how she plays; her words come from src/game/speech. */
export const ROSTER: Omit<CharacterDef, keyof HeroineSpeech>[] = [
  {
    id: "hikari",
    name: { en: "Hikari Amane", ru: "Хикари Амане" },
    title: { en: "Café barista", ru: "Бариста из кафе" },
    age: 23,
    bio: {
      en: "Works the morning shift and plays mahjong every evening. Fast, cheerful, a little reckless.",
      ru: "Работает в утреннюю смену, а вечерами играет в маджонг. Быстрая, весёлая, немного безрассудная.",
    },
    step: 2,
    level: "heur:0.33",
    style: "reckless",
    color: "#f2a65a",
    accent: "#ffe3c4",
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
    step: 4,
    level: "heur:0.2",
    style: "precise",
    color: "#5b8def",
    accent: "#dbe6ff",
  },
  {
    id: "mai",
    unlock: { kind: "firstPlaceWith", with: ["rin"] },
    name: { en: "Mai Tachibana", ru: "Май Татибана" },
    title: { en: "Mahjong parlor owner", ru: "Хозяйка маджонг-салона" },
    age: 31,
    bio: {
      en: "Runs the parlor and has seen every trick. Folds at the right moment and strikes hard.",
      ru: "Держит салон и видела все уловки. Вовремя сбрасывается и бьёт наверняка.",
    },
    step: 5,
    level: "heur:0.165",
    style: "sharp",
    color: "#c2456b",
    accent: "#ffd6e2",
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
    step: 3,
    level: "heur:0.3",
    style: "showy",
    color: "#8e6cd8",
    accent: "#ece2ff",
  },
  {
    id: "reiko",
    unlock: { kind: "firstPlaceWith", with: ["mai"] },
    name: { en: "Reiko Shirase", ru: "Рэйко Сирасэ" },
    title: { en: "Project manager", ru: "Руководитель проектов" },
    age: 33,
    bio: {
      en: "Runs a team of thirty and plays mahjong after work to unwind. Patient, strategic, ruthless at the right moment.",
      ru: "Руководит командой из тридцати человек, а после работы отдыхает за маджонгом. Терпеливая, расчётливая, беспощадная в нужный момент.",
    },
    step: 6,
    level: "heur:0.1",
    style: "patient",
    color: "#6d5dfc",
    accent: "#e3e0ff",
  },
  {
    id: "nanami",
    name: { en: "Nanami Aoki", ru: "Нанами Аоки" },
    title: { en: "Freelance illustrator", ru: "Иллюстратор-фрилансер" },
    age: 25,
    bio: {
      en: "Draws book covers by day and collects pretty hands by night. Loves honitsu and hates folding.",
      ru: "Днём рисует обложки книг, ночью собирает красивые руки. Обожает хоницу и терпеть не может сбрасываться.",
    },
    step: 1,
    level: "heur:0.25",
    style: "flush",
    color: "#2fb5a0",
    accent: "#d6f5ef",
  },
  {
    id: "kaede",
    unlock: { kind: "firstPlaceWith", with: ["reiko"] },
    name: { en: "Kaede Morikawa", ru: "Каэдэ Морикава" },
    title: { en: "Motorcycle courier", ru: "Мотокурьер" },
    age: 26,
    bio: {
      en: "Delivers across the city all day and plays the way she rides: fast, bold and always looking for the shortest route to a win.",
      ru: "Весь день развозит заказы по городу и играет так же, как ездит: быстро, смело и всегда ищет кратчайший путь к победе.",
    },
    step: 7,
    level: "mortal:0.9",
    style: "reckless",
    color: "#d9692e",
    accent: "#ffe0cc",
  },
  {
    id: "sora",
    unlock: { kind: "firstPlaceWith", with: ["kaede"] },
    name: { en: "Sora Takanashi", ru: "Сора Таканаси" },
    title: { en: "Flight attendant", ru: "Бортпроводница" },
    age: 28,
    bio: {
      en: "Plays between long-haul flights in hotels all over the world. Calm, polite and impossible to rattle, she keeps every hand in balance.",
      ru: "Играет между дальними рейсами в отелях по всему миру. Спокойная, вежливая, её невозможно вывести из себя: каждую руку держит в равновесии.",
    },
    step: 8,
    level: "mortal:0.75",
    style: "balanced",
    color: "#3fa9d9",
    accent: "#d8f0fb",
  },
  {
    id: "akane",
    unlock: { kind: "firstPlaceWith", with: ["sora"] },
    name: { en: "Akane Hino", ru: "Аканэ Хино" },
    title: { en: "Head chef", ru: "Шеф-повар" },
    age: 29,
    bio: {
      en: "Runs a small izakaya kitchen and treats every hand like a signature dish: expensive ingredients, big flavour, no half measures.",
      ru: "Заведует кухней маленькой идзакаи и готовит каждую руку как фирменное блюдо: дорогие ингредиенты, яркий вкус, никаких полумер.",
    },
    step: 9,
    level: "mortal:0.48",
    style: "showy",
    color: "#c8323a",
    accent: "#ffd9db",
  },
  {
    id: "midori",
    unlock: { kind: "firstPlaceWith", with: ["akane"] },
    name: { en: "Midori Fujisaki", ru: "Мидори Фудзисаки" },
    title: { en: "Librarian", ru: "Библиотекарь" },
    age: 30,
    bio: {
      en: "Has read every book on mahjong in her library, twice. Quiet and meticulous, she rarely calls and never deals in carelessly.",
      ru: "Прочитала все книги о маджонге в своей библиотеке, и не по разу. Тихая и дотошная: открывается редко и никогда не сбрасывает опасное по невнимательности.",
    },
    step: 10,
    level: "mortal:0.42",
    style: "precise",
    color: "#8cbf3f",
    accent: "#ecf7d6",
  },
  {
    id: "yuki",
    unlock: { kind: "firstPlaceWith", with: ["midori"] },
    name: { en: "Yuki Shiraishi", ru: "Юки Сираиси" },
    title: { en: "Surgeon", ru: "Хирург" },
    age: 32,
    bio: {
      en: "Spends her days in the operating room and her rare free evenings at the table. Cold, exact and patient: she waits for the one clean cut.",
      ru: "Дни проводит в операционной, а редкие свободные вечера за столом. Холодная, точная и терпеливая: ждёт одного чистого разреза.",
    },
    step: 11,
    level: "mortal:0.18",
    style: "patient",
    color: "#7f93ad",
    accent: "#e8eef6",
  },
  {
    id: "tsukiko",
    unlock: { kind: "firstPlaceWith", with: ["yuki"] },
    name: { en: "Tsukiko Kurogane", ru: "Цукико Курогане" },
    title: { en: "Mahjong legend", ru: "Легенда маджонга" },
    age: 36,
    bio: {
      en: "Called the Queen of the Table in every parlor in the city. Nobody has seen her lose two matches in a row. Beat her, and you've beaten them all.",
      ru: "В каждом салоне города её зовут Королевой стола. Никто не видел, чтобы она проиграла две партии подряд. Победишь её — значит, победил всех.",
    },
    step: 12,
    level: "mortal",
    style: "sharp",
    color: "#c9a227",
    accent: "#fff1c2",
  },
];

export function validateRoster(roster: CharacterDef[]): CharacterDef[] {
  return roster.filter((c) => {
    const ok = Number.isFinite(c.age) && c.age >= 18;
    if (!ok) console.error(`[roster] character "${c.id}" rejected: must be 18+`);
    return ok;
  });
}

/** The roster in ladder order, each heroine with her lines (speech/<id>.ts). */
export const CHARACTERS = validateRoster(
  ROSTER.map((c) => {
    const speech = SPEECH[c.id];
    if (!speech) throw new Error(`[roster] no speech file for "${c.id}"`);
    return { ...c, ...speech };
  }),
).sort((a, b) => a.step - b.step);

export function isUnlocked(c: CharacterDef, rivals: readonly string[]): boolean {
  return !c.unlock || rivals.includes(c.id);
}

/** Rivals newly unlocked by a 1st place with this cast at the table. */
export function rivalsUnlockedBy(cast: readonly string[], rivals: readonly string[]): string[] {
  return CHARACTERS.filter(
    (c) => c.unlock && !rivals.includes(c.id) && c.unlock.with.every((id) => cast.includes(id)),
  ).map((c) => c.id);
}

export function pickLine(c: CharacterDef, lang: Lang, kind: SpeechKind): string {
  const pool = c.lines[lang][kind];
  return pool[Math.floor(Math.random() * pool.length)] ?? "";
}

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

const base = () => new URL("./", window.location.href).href;

export const assetPaths = {
  portrait: (id: string) => `${base()}characters/${id}/portrait.webp`,
  emotion: (id: string, emotion: Emotion) => `${base()}characters/${id}/emotions/${emotion}.webp`,
  voice: (id: string, kind: string) => `${base()}voice/${id}/${kind}.mp3`,
};
