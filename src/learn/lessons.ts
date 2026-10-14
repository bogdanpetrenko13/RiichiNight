import type { Lang } from "../i18n/strings";

type T = Record<Lang, string>;

/**
 * Lesson content. Text may mark key terms as **term** (shown highlighted).
 * `tiles` uses the yaku-example notation ("123m 55p"; spaces split groups).
 */
export type LessonBlock =
  | { kind: "text"; text: T }
  /** Tile example on a felt card with an optional tag and caption. */
  | { kind: "example"; tiles: string; tag?: T; caption?: T }
  /** Highlighted advice. */
  | { kind: "tip"; text: T }
  /** Important rule (warning style). */
  | { kind: "rule"; text: T };

export interface QuizOption {
  tiles?: string;
  text?: T;
}

export interface Quiz {
  question: T;
  tiles?: string;
  options: QuizOption[];
  answer: number;
  explain: T;
}

export interface Lesson {
  id: string;
  title: T;
  summary: T;
  blocks: LessonBlock[];
  quiz?: Quiz;
}

export const LESSONS: Lesson[] = [
  {
    id: "tiles",
    title: { en: "Tiles and the goal", ru: "Тайлы и цель игры" },
    summary: { en: "Suits, honours and what a winning hand looks like", ru: "Масти, козыри и как выглядит выигрышная рука" },
    blocks: [
      {
        kind: "text",
        text: {
          en: "There are three **suits** numbered 1 to 9: characters (man), circles (pin) and bamboo (sou).",
          ru: "Есть три **масти** с номерами от 1 до 9: знаки (ман), круги (пин) и бамбук (соу).",
        },
      },
      { kind: "example", tiles: "123456789m", tag: { en: "Man", ru: "Ман" } },
      { kind: "example", tiles: "123456789p", tag: { en: "Pin", ru: "Пин" } },
      { kind: "example", tiles: "123456789s", tag: { en: "Sou", ru: "Соу" } },
      {
        kind: "text",
        text: {
          en: "Plus **honours**: four winds (East, South, West, North) and three dragons (White, Green, Red). Every tile exists four times, 136 in total.",
          ru: "Плюс **козыри**: четыре ветра (Восток, Юг, Запад, Север) и три дракона (Белый, Зелёный, Красный). Каждого тайла по четыре, всего 136.",
        },
      },
      {
        kind: "example",
        tiles: "1234z 567z",
        tag: { en: "Honours", ru: "Козыри" },
        caption: { en: "Winds, then dragons", ru: "Ветра, затем драконы" },
      },
      {
        kind: "text",
        text: {
          en: "You hold 13 tiles. A **winning hand** is 14 tiles: four **sets** and a **pair**. A set is a sequence of one suit or three identical tiles.",
          ru: "У вас 13 тайлов. **Выигрышная рука** — 14 тайлов: четыре **сета** и **пара**. Сет — последовательность одной масти или три одинаковых тайла.",
        },
      },
      {
        kind: "example",
        tiles: "234m 678p 555s 777z 99p",
        tag: { en: "Complete", ru: "Готовая рука" },
        caption: { en: "Two sequences, two triplets and a pair", ru: "Две последовательности, две тройки и пара" },
      },
      {
        kind: "rule",
        text: {
          en: "Honours never form sequences, and sequences never wrap around: 8-9-1 is not a set.",
          ru: "Козыри не образуют последовательностей, и последовательности не замыкаются: 8-9-1 — не сет.",
        },
      },
    ],
    quiz: {
      question: { en: "Which of these is a complete set?", ru: "Что из этого — готовый сет?" },
      options: [{ tiles: "891m" }, { tiles: "777z" }, { tiles: "123z" }],
      answer: 1,
      explain: {
        en: "Three identical tiles form a set. 8-9-1 does not wrap around, and honours never form sequences.",
        ru: "Три одинаковых тайла — это сет. 8-9-1 не замыкается, а козыри не образуют последовательностей.",
      },
    },
  },
  {
    id: "turns",
    title: { en: "Turns and calls", ru: "Ходы и вызовы" },
    summary: { en: "Drawing, discarding, Pon, Chi and Kan", ru: "Ход, сброс, Пон, Чи и Кан" },
    blocks: [
      {
        kind: "text",
        text: {
          en: "On your turn you **draw** a tile and **discard** one. Tap a tile to lift it (a marker appears above it), tap again or press Discard to throw it.",
          ru: "В свой ход вы **берёте** тайл из стены и **сбрасываете** один. Нажмите на тайл, чтобы поднять его (над ним появится указатель), и ещё раз или кнопкой «Сбросить», чтобы сбросить.",
        },
      },
      {
        kind: "text",
        text: {
          en: "**Pon**: take anyone's discard to complete three identical tiles. **Chi**: take the discard of the player on your left to complete a sequence. **Kan**: four identical tiles, after which you draw a replacement.",
          ru: "**Пон**: забрать чужой сброс, чтобы собрать три одинаковых тайла. **Чи**: забрать сброс игрока слева, чтобы собрать последовательность. **Кан**: четыре одинаковых тайла, после него вы добираете тайл.",
        },
      },
      {
        kind: "example",
        tiles: "55p 5p",
        tag: { en: "Pon", ru: "Пон" },
        caption: { en: "Two 5p in hand + a discarded 5p", ru: "Два 5p в руке + сброшенный 5p" },
      },
      {
        kind: "rule",
        text: {
          en: "A call opens your hand. An open hand loses riichi and several yaku, so call with a plan.",
          ru: "Вызов открывает руку. Открытая рука теряет риичи и часть яку, поэтому вызывайте с планом.",
        },
      },
      {
        kind: "text",
        text: {
          en: "Win with the tile you draw (**Tsumo**, everyone pays) or with someone's discard (**Ron**, the discarder pays).",
          ru: "Выиграть можно вытянутым тайлом (**Цумо**, платят все) или чужим сбросом (**Рон**, платит сбросивший).",
        },
      },
    ],
    quiz: {
      question: {
        en: "The player on your left discards 5p. You hold 4p and 6p. What can you call?",
        ru: "Игрок слева сбросил 5p. У вас есть 4p и 6p. Что можно объявить?",
      },
      tiles: "46p 5p",
      options: [{ text: { en: "Chi", ru: "Чи" } }, { text: { en: "Pon", ru: "Пон" } }, { text: { en: "Kan", ru: "Кан" } }],
      answer: 0,
      explain: {
        en: "4-5-6 is a sequence, and sequences can be called only from the player on your left: that is Chi.",
        ru: "4-5-6 — последовательность, а её можно забрать только у игрока слева: это Чи.",
      },
    },
  },
  {
    id: "yaku",
    title: { en: "Yaku and riichi", ru: "Яку и риичи" },
    summary: { en: "Why a complete hand is not enough", ru: "Почему одной полной руки мало" },
    blocks: [
      {
        kind: "text",
        text: {
          en: "A complete shape is not enough: the hand also needs at least one **yaku**, a scoring pattern. Without a yaku you cannot win.",
          ru: "Одной полной руки мало: нужна хотя бы одна **яку** — выигрышная комбинация. Без яку выиграть нельзя.",
        },
      },
      {
        kind: "text",
        text: {
          en: "The easiest yaku is **riichi**: keep your hand closed, reach **tenpai** (one tile from winning) and declare it.",
          ru: "Самая простая яку — **риичи**: держите руку закрытой, дойдите до **темпая** (не хватает одного тайла) и объявите его.",
        },
      },
      {
        kind: "example",
        tiles: "123m 456p 789s 55p 23s",
        tag: { en: "Tenpai", ru: "Темпай" },
        caption: { en: "Waits on 1s or 4s: you can declare riichi", ru: "Ждёт 1s или 4s — можно объявлять риичи" },
      },
      {
        kind: "text",
        text: {
          en: "Two more easy ones: **all simples** (tanyao, only 2–8, works even open) and a **triplet of dragons** or of your wind.",
          ru: "Ещё две простые: **таняо** (только 2–8, работает и в открытой руке) и **тройка драконов** или своего ветра.",
        },
      },
      {
        kind: "example",
        tiles: "234m 567p 345s 678s 22p",
        tag: { en: "Tanyao", ru: "Таняо" },
        caption: { en: "No 1, 9 or honours", ru: "Нет единиц, девяток и козырей" },
      },
      {
        kind: "tip",
        text: {
          en: "Dora adds han but is not a yaku: without a yaku, dora will not let you win. The dora is the tile after the indicator in your band.",
          ru: "Дора добавляет ханы, но яку не является: без яку дора не поможет выиграть. Дора — тайл, следующий за индикатором в вашей полосе.",
        },
      },
    ],
    quiz: {
      question: {
        en: "This closed hand waits on 2p. Which yaku does it already have?",
        ru: "Эта закрытая рука ждёт 2p. Какая яку у неё уже есть?",
      },
      tiles: "234m 567p 345s 678s 2p",
      options: [
        { text: { en: "Tanyao", ru: "Таняо" } },
        { text: { en: "Yakuhai", ru: "Якухай" } },
        { text: { en: "None", ru: "Никакой" } },
      ],
      answer: 0,
      explain: {
        en: "Every tile is 2–8, so the hand is all simples (tanyao) whatever it wins on.",
        ru: "Все тайлы от 2 до 8, значит это таняо при любом выигрыше.",
      },
    },
  },
  {
    id: "furiten",
    title: { en: "Tenpai, waits and furiten", ru: "Темпай, ожидания и фуритен" },
    summary: { en: "Good waits and the one rule that blocks Ron", ru: "Хорошие ожидания и правило, которое запрещает Рон" },
    blocks: [
      {
        kind: "text",
        text: {
          en: "When you lift a tile, the game shows which tiles you would **wait** on after discarding it and how many are still unseen.",
          ru: "Когда вы поднимаете тайл, игра показывает, каких тайлов вы будете **ждать** после сброса и сколько их ещё не видно.",
        },
      },
      {
        kind: "text",
        text: {
          en: "Prefer **two-sided waits**: 4-5 waits on 3 or 6, eight tiles in total. A middle wait like 4-6 has only four.",
          ru: "Выбирайте **двусторонние ожидания**: 4-5 ждёт 3 или 6, всего восемь тайлов. Ожидание в середину, как 4-6, — только четыре.",
        },
      },
      {
        kind: "example",
        tiles: "45s 46s",
        tag: { en: "8 vs 4 tiles", ru: "8 против 4" },
        caption: { en: "Left: waits on 3s/6s. Right: only 5s", ru: "Слева ждёт 3s/6s, справа — только 5s" },
      },
      {
        kind: "rule",
        text: {
          en: "**Furiten**: if you ever discarded one of your winning tiles, you cannot win by Ron. Tsumo is still allowed. A red badge above your hand warns you.",
          ru: "**Фуритен**: если вы когда-либо сбросили один из своих выигрышных тайлов, выиграть Роном нельзя. Цумо по-прежнему можно. Красная плашка над рукой предупредит.",
        },
      },
    ],
    quiz: {
      question: { en: "Which tile does this hand wait on?", ru: "Какой тайл ждёт эта рука?" },
      tiles: "234m 567p 345s 77z 45m",
      options: [{ tiles: "1m" }, { tiles: "6m" }, { tiles: "9m" }],
      answer: 1,
      explain: {
        en: "4-5m is a two-sided wait: it completes with 3m or 6m.",
        ru: "4-5m — двустороннее ожидание: оно закрывается 3m или 6m.",
      },
    },
  },
  {
    id: "defense",
    title: { en: "Scoring and defence", ru: "Очки и защита" },
    summary: { en: "Han, mangan and how to fold safely", ru: "Ханы, манган и как безопасно защищаться" },
    blocks: [
      {
        kind: "text",
        text: {
          en: "Score grows with **han** (yaku + dora) and **fu** (hand details). From 5 han you get a fixed **mangan**: 8,000, or 12,000 for the dealer.",
          ru: "Очки растут с **ханами** (яку + дора) и **фу** (детали руки). С 5 ханов — фиксированный **манган**: 8 000, дилеру 12 000.",
        },
      },
      {
        kind: "text",
        text: {
          en: "When a rival declares riichi and your hand is far from ready, fold. The safest tiles are the ones she already discarded herself (**genbutsu**).",
          ru: "Если соперница объявила риичи, а ваша рука далека от готовности, защищайтесь. Самые безопасные тайлы — те, что она уже сбросила сама (**генбуцу**).",
        },
      },
      {
        kind: "text",
        text: {
          en: "Next safest: **suji** (if she discarded 4, then 1 and 7 of that suit are safer) and honours that are already visible two or three times.",
          ru: "Затем **суджи** (если она сбросила 4, то 1 и 7 той же масти безопаснее) и козыри, которые уже видны два-три раза.",
        },
      },
      {
        kind: "example",
        tiles: "4m 17m",
        tag: { en: "Suji", ru: "Суджи" },
        caption: { en: "4m discarded → 1m and 7m are safer", ru: "Сброшен 4m → 1m и 7m безопаснее" },
      },
      {
        kind: "tip",
        text: {
          en: "Push when your hand is good and close to winning; fold when it is slow and cheap.",
          ru: "Атакуйте, когда рука хорошая и близка к выигрышу; защищайтесь, когда она медленная и дешёвая.",
        },
      },
    ],
    quiz: {
      question: {
        en: "A rival declared riichi. Earlier she discarded 4m. Which tile is safest against her?",
        ru: "Соперница объявила риичи. Раньше она сбросила 4m. Какой тайл против неё безопаснее всего?",
      },
      options: [{ tiles: "4m" }, { tiles: "1m" }, { tiles: "5m" }],
      answer: 0,
      explain: {
        en: "Her own discard (genbutsu) can never deal into her. Suji like 1m is only safer, not safe.",
        ru: "Её собственный сброс (генбуцу) не может принести ей выигрыш. Суджи, как 1m, лишь безопаснее, но не безопасен.",
      },
    },
  },
];
