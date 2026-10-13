import type { Lang } from "../i18n/strings";

/** A lesson is a list of short blocks; `tiles` uses the same notation as yaku examples. */
export interface LessonBlock {
  text: Record<Lang, string>;
  tiles?: string;
}

export interface Lesson {
  id: string;
  title: Record<Lang, string>;
  blocks: LessonBlock[];
}

export const LESSONS: Lesson[] = [
  {
    id: "tiles",
    title: { en: "Tiles and the goal", ru: "Тайлы и цель игры" },
    blocks: [
      {
        text: {
          en: "There are three suits numbered 1 to 9: characters (man), circles (pin) and bamboo (sou).",
          ru: "Есть три масти с номерами от 1 до 9: знаки (ман), круги (пин) и бамбук (соу).",
        },
        tiles: "123456789m 123456789p 123456789s",
      },
      {
        text: {
          en: "Plus honour tiles: four winds (East, South, West, North) and three dragons (White, Green, Red). Every tile exists four times: 136 tiles in total.",
          ru: "Плюс козыри: четыре ветра (Восток, Юг, Запад, Север) и три дракона (Белый, Зелёный, Красный). Каждого тайла по четыре: всего 136.",
        },
        tiles: "1234z 567z",
      },
      {
        text: {
          en: "You hold 13 tiles. A winning hand is 14 tiles: four sets and a pair. A set is either a sequence of one suit or three identical tiles.",
          ru: "У вас 13 тайлов. Выигрышная рука — 14 тайлов: четыре сета и пара. Сет — это последовательность одной масти или три одинаковых тайла.",
        },
        tiles: "234m 678p 555s 777z 99p",
      },
      {
        text: {
          en: "Honours never form sequences, and sequences never wrap around: 8-9-1 is not a set.",
          ru: "Козыри не образуют последовательностей, и последовательности не замыкаются: 8-9-1 — не сет.",
        },
      },
    ],
  },
  {
    id: "turns",
    title: { en: "Turns and calls", ru: "Ходы и вызовы" },
    blocks: [
      {
        text: {
          en: "On your turn you draw a tile and discard one. Tap a tile once to lift it, tap again to discard.",
          ru: "В свой ход вы берёте тайл из стены и сбрасываете один. Нажмите на тайл один раз, чтобы поднять, второй раз — чтобы сбросить.",
        },
      },
      {
        text: {
          en: "Pon: take anyone's discard to complete three identical tiles. Chi: take the discard of the player on your left to complete a sequence. Kan: four identical tiles; you draw a replacement.",
          ru: "Пон: забрать чужой сброс, чтобы собрать три одинаковых тайла. Чи: забрать сброс игрока слева, чтобы собрать последовательность. Кан: четыре одинаковых тайла, после него вы добираете тайл.",
        },
        tiles: "55p 5p",
      },
      {
        text: {
          en: "Calling opens your hand. An open hand loses riichi and several yaku, so call with a plan.",
          ru: "Вызов открывает руку. Открытая рука теряет риичи и часть яку, поэтому вызывайте с планом.",
        },
      },
      {
        text: {
          en: "Win with the tile you draw (Tsumo, everyone pays) or with someone's discard (Ron, the discarder pays).",
          ru: "Выиграть можно вытянутым тайлом (Цумо, платят все) или чужим сбросом (Рон, платит сбросивший).",
        },
      },
    ],
  },
  {
    id: "yaku",
    title: { en: "Yaku and riichi", ru: "Яку и риичи" },
    blocks: [
      {
        text: {
          en: "A complete shape is not enough: the hand also needs at least one yaku, a scoring pattern. Without a yaku you cannot win.",
          ru: "Одной полной руки мало: нужна хотя бы одна яку — выигрышная комбинация. Без яку выиграть нельзя.",
        },
      },
      {
        text: {
          en: "The easiest yaku is riichi: keep your hand closed, reach tenpai (one tile from winning) and declare it.",
          ru: "Самая простая яку — риичи: держите руку закрытой, доберитесь до темпая (не хватает одного тайла) и объявите его.",
        },
        tiles: "123m 456p 789s 234s 5p",
      },
      {
        text: {
          en: "Two more easy ones: all simples (only 2-8, works even open) and a triplet of dragons or of your wind.",
          ru: "Ещё две простые: таняо (только 2–8, работает и в открытой руке) и тройка драконов или своего ветра.",
        },
        tiles: "234m 567p 345s 678s 22p",
      },
      {
        text: {
          en: "Dora tiles add han but are not yaku. The dora is the tile after the indicator shown in the centre of the table.",
          ru: "Дора добавляет ханы, но яку не является. Дора — тайл, следующий за индикатором в центре стола.",
        },
      },
    ],
  },
  {
    id: "furiten",
    title: { en: "Tenpai, waits and furiten", ru: "Темпай, ожидания и фуритен" },
    blocks: [
      {
        text: {
          en: "When you lift a tile, the game shows which tiles you would wait on after discarding it and how many are still unseen.",
          ru: "Когда вы поднимаете тайл, игра показывает, каких тайлов вы будете ждать после сброса и сколько их ещё не видно.",
        },
      },
      {
        text: {
          en: "Prefer two-sided waits: 4-5 waits on 3 or 6, eight tiles in total. A middle wait like 4-6 has only four.",
          ru: "Выбирайте двусторонние ожидания: 4-5 ждёт 3 или 6, всего восемь тайлов. Ожидание в середину, как 4-6, — только четыре.",
        },
        tiles: "45s 46s",
      },
      {
        text: {
          en: "Furiten: if you ever discarded one of your winning tiles, you cannot win by Ron. You can still win by Tsumo. The red badge above your hand warns you.",
          ru: "Фуритен: если вы когда-либо сбросили один из своих выигрышных тайлов, выиграть Роном нельзя. Цумо по-прежнему можно. Красная плашка над рукой предупредит.",
        },
      },
    ],
  },
  {
    id: "defense",
    title: { en: "Scoring and defence", ru: "Очки и защита" },
    blocks: [
      {
        text: {
          en: "Score grows with han (yaku + dora) and fu (hand details). From 5 han you get a fixed mangan: 8,000, or 12,000 for the dealer.",
          ru: "Очки растут с ханами (яку + дора) и фу (детали руки). С 5 ханов — фиксированный манган: 8 000, дилеру 12 000.",
        },
      },
      {
        text: {
          en: "When a rival declares riichi and your hand is far from ready, fold. The safest tiles are ones she already discarded herself (genbutsu).",
          ru: "Если соперница объявила риичи, а ваша рука далека от готовности, защищайтесь. Самые безопасные тайлы — те, что она уже сбросила сама (генбуцу).",
        },
      },
      {
        text: {
          en: "Next safest: suji (if she discarded 4, then 1 and 7 of that suit are safer) and honours that are already visible two or three times.",
          ru: "Затем суджи (если она сбросила 4, то 1 и 7 той же масти безопаснее) и козыри, которые уже видны два-три раза.",
        },
        tiles: "4m 1m 7m",
      },
      {
        text: {
          en: "Push when your hand is good and close to winning; fold when it is slow and cheap.",
          ru: "Атакуйте, когда рука хорошая и близка к выигрышу; сбрасывайтесь, когда она медленная и дешёвая.",
        },
      },
    ],
  },
];
