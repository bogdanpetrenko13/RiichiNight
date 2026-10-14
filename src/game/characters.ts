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
 *   emotions/<emotion>.webp       neutral | happy | troubled
 *   reward/stage<N>.webp          reward scene for stage N (1..stages-1)
 * Voice lines: public/voice/<id>/<riichi|pon|chi|kan|ron|tsumo>.mp3
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
  level: Level;
  /** Theme colours for cards, callouts and placeholders. */
  color: string;
  accent: string;
  /** Number of reward stages including the starting one (stage 0). */
  stages: number;
  /** Lines shown on the reward scene for stages 1..stages-1. */
  stageLines: Record<Lang, string[]>;
  /** Speech-bubble lines at the table, picked at random per event. */
  lines: Record<Lang, Record<SpeechKind, string[]>>;
  /** Locked until the condition is met; omitted = available from the start. */
  unlock?: { kind: "firstPlaces"; count: number };
}

export type SpeechKind = "pleased" | "lossRon" | "lossBig" | "lossTsumo" | "wallGame" | "idle" | "riichi";

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
    lines: {
      en: {
        pleased: ["Yay! Coffee's on you!", "Told you I'm on a roll!"],
        lossRon: ["Oops, that one slipped.", "Aww, I really liked that tile..."],
        lossBig: ["Ouch, ouch, ouch!", "That's like a month of tips!"],
        lossTsumo: ["Hey, no fair drawing it yourself!", "Grr. Lucky hands."],
        wallGame: ["Nobody? Boring!", "Shuffle faster, I'm ready!"],
        idle: ["Hellooo? The tiles won't bite.", "Take your time... but not too much!"],
        riichi: ["Riichi! Let's go, let's go!", "Here comes the good part!"],
      },
      ru: {
        pleased: ["Ура! Кофе за твой счёт!", "Говорила же, мне везёт!"],
        lossRon: ["Ой, этот я зря сбросила.", "Эх, а мне так нравился этот тайл..."],
        lossBig: ["Ай-ай-ай!", "Это же мои чаевые за месяц!"],
        lossTsumo: ["Эй, сам себе вытянул — нечестно!", "Ррр. Везунчик."],
        wallGame: ["Никто? Скукота!", "Мешай быстрее, я готова!"],
        idle: ["Ау? Тайлы не кусаются.", "Не торопись... но и не засыпай!"],
        riichi: ["Риичи! Поехали!", "Сейчас будет самое интересное!"],
      },
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
    lines: {
      en: {
        pleased: ["As calculated.", "The numbers were on my side."],
        lossRon: ["A rounding error. It won't repeat.", "Noted. Adjusting my model."],
        lossBig: ["That is... a significant loss.", "I need to recount."],
        lossTsumo: ["Low probability. Still happened.", "Hm. The wall favoured you."],
        wallGame: ["Expected value: zero. Acceptable.", "Nobody tenpai? Inefficient."],
        idle: ["Thinking is allowed. Within reason.", "The clock is also a resource."],
        riichi: ["Riichi. Your odds just changed.", "I'm ready. Are you?"],
      },
      ru: {
        pleased: ["Всё по расчёту.", "Цифры были на моей стороне."],
        lossRon: ["Погрешность округления. Больше не повторится.", "Учту. Поправлю модель."],
        lossBig: ["Это... ощутимая потеря.", "Нужно пересчитать."],
        lossTsumo: ["Маловероятно. Но случилось.", "Хм. Стена тебе подыграла."],
        wallGame: ["Матожидание ноль. Допустимо.", "Никто не в темпае? Неэффективно."],
        idle: ["Думать можно. В разумных пределах.", "Время — тоже ресурс."],
        riichi: ["Риичи. Твои шансы изменились.", "Я готова. А ты?"],
      },
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
    lines: {
      en: {
        pleased: ["The house always wins, dear.", "Thank you for playing at my table."],
        lossRon: ["Well read. I'll remember that.", "You caught me. How rude."],
        lossBig: ["My, my. That stings.", "Now you have my full attention."],
        lossTsumo: ["Drawn from the wall. Graceful.", "The tiles like you tonight."],
        wallGame: ["A quiet hand. I don't mind.", "Patience is a strategy too."],
        idle: ["No rush. The parlor never closes.", "Shall I pour some tea while you think?"],
        riichi: ["Riichi. Careful now.", "I'm waiting, dear."],
      },
      ru: {
        pleased: ["Заведение всегда в выигрыше, милый.", "Спасибо, что сыграл за моим столом."],
        lossRon: ["Хорошо прочитал. Запомню.", "Поймал меня. Как невежливо."],
        lossBig: ["Ох. Это ощутимо.", "Теперь ты завладел моим вниманием."],
        lossTsumo: ["Сам вытянул. Изящно.", "Тайлы тебя сегодня любят."],
        wallGame: ["Тихая раздача. Я не против.", "Терпение — тоже стратегия."],
        idle: ["Не спеши. Салон никогда не закрывается.", "Налить чаю, пока думаешь?"],
        riichi: ["Риичи. Теперь осторожнее.", "Я жду, милый."],
      },
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
    unlock: { kind: "firstPlaces", count: 1 },
    level: "normal",
    color: "#8e6cd8",
    accent: "#ece2ff",
    stages: 5,
    stageLines: {
      en: ["Chat, did you see that?!", "Okay that was clean.", "Rematch! Right now!", "GG... you win this one."],
      ru: ["Чат, вы это видели?!", "Ладно, это было чисто.", "Реванш! Прямо сейчас!", "GG... эту ты выиграл."],
    },
    lines: {
      en: {
        pleased: ["CHAT! Did you see that?!", "Clip it! Clip it!"],
        lossRon: ["Nooo, chat told me to!", "That was a bait. I took it."],
        lossBig: ["Pretend you didn't see that, chat.", "My viewers will never let me live this down."],
        lossTsumo: ["Self-draw?! Okay, that's content.", "Wow. Just wow."],
        wallGame: ["Draw? Chat, that's a draw.", "Nobody wins, everybody's sad."],
        idle: ["Chat's asking if you fell asleep.", "Dead air! Do something!"],
        riichi: ["Riichi! Smash that like!", "Big hand incoming, chat!"],
      },
      ru: {
        pleased: ["ЧАТ! Вы это видели?!", "Клипайте! Клипайте!"],
        lossRon: ["Нееет, это чат посоветовал!", "Это была приманка. Я клюнула."],
        lossBig: ["Чат, вы этого не видели.", "Мне это зрители век не забудут."],
        lossTsumo: ["Сам вытянул?! Ладно, это контент.", "Вау. Просто вау."],
        wallGame: ["Ничья? Чат, это ничья.", "Никто не выиграл, всем грустно."],
        idle: ["Чат спрашивает, не уснул ли ты.", "Тишина в эфире! Ходи уже!"],
        riichi: ["Риичи! Жмите лайк!", "Чат, сейчас будет большая рука!"],
      },
    },
  },
  {
    id: "reiko",
    name: { en: "Reiko Shirase", ru: "Рэйко Сирасэ" },
    title: { en: "Project manager", ru: "Руководитель проектов" },
    age: 33,
    bio: {
      en: "Runs a team of thirty and plays mahjong after work to unwind. Patient, strategic, ruthless at the right moment.",
      ru: "Руководит командой из тридцати человек, а после работы отдыхает за маджонгом. Терпеливая, расчётливая, беспощадная в нужный момент.",
    },
    level: "hard",
    color: "#6d5dfc",
    accent: "#e3e0ff",
    stages: 5,
    stageLines: {
      en: ["Not in the plan. Noted.", "Fine, the meeting can wait.", "You're making me work overtime.", "Deadline missed. You win."],
      ru: ["Этого не было в плане. Учту.", "Ладно, совещание подождёт.", "Из-за тебя у меня переработка.", "Дедлайн сорван. Ты победил."],
    },
    lines: {
      en: {
        pleased: ["Delivered on schedule.", "That's how a project closes."],
        lossRon: ["A risk I accepted. Moving on.", "I'll add that to the retrospective."],
        lossBig: ["That blew the whole budget.", "...I need a coffee."],
        lossTsumo: ["Outside my control. Annoying.", "Well executed."],
        wallGame: ["No result. Reschedule.", "A draw is still a status update."],
        idle: ["Do you need more time for this decision?", "Let's keep the meeting short."],
        riichi: ["Riichi. Final stage.", "Commit and ship."],
      },
      ru: {
        pleased: ["Сдано точно в срок.", "Вот так закрываются проекты."],
        lossRon: ["Риск был принят. Идём дальше.", "Внесу это в ретроспективу."],
        lossBig: ["Это съело весь бюджет.", "...Мне нужен кофе."],
        lossTsumo: ["От меня не зависело. Досадно.", "Чисто сработано."],
        wallGame: ["Результата нет. Переносим.", "Ничья — тоже статус."],
        idle: ["Тебе нужно больше времени на решение?", "Давай не затягивать совещание."],
        riichi: ["Риичи. Финальный этап.", "Фиксируем и выпускаем."],
      },
    },
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
    level: "easy",
    color: "#2fb5a0",
    accent: "#d6f5ef",
    stages: 5,
    stageLines: {
      en: ["Hey, that hand was pretty!", "Okay, I'm sketching your face as the villain.", "One more! I'm warmed up now.", "You win. I'll draw you a trophy."],
      ru: ["Эй, красивая была рука!", "Всё, рисую тебя злодеем.", "Ещё одну! Я только разогрелась.", "Ты победил. Нарисую тебе кубок."],
    },
    lines: {
      en: {
        pleased: ["Look at those colours!", "That one's going in my sketchbook."],
        lossRon: ["Wait, that was the dangerous one?", "Ugh, I liked that composition."],
        lossBig: ["That's a whole commission gone!", "I'm going to need a new palette."],
        lossTsumo: ["Drew it yourself? Show-off.", "Hmph. Nice shading."],
        wallGame: ["Nobody finished? Same as my drafts.", "Blank canvas. Again."],
        idle: ["Are you sketching too?", "Take your time, I'm doodling."],
        riichi: ["Riichi! Final lineart!", "It's coming together!"],
      },
      ru: {
        pleased: ["Смотри, какие цвета!", "Это я зарисую в скетчбук."],
        lossRon: ["Стоп, это был опасный тайл?", "Эх, а мне нравилась композиция."],
        lossBig: ["Это же целый заказ!", "Придётся покупать новую палитру."],
        lossTsumo: ["Сам вытянул? Выпендрёжник.", "Хм. Красиво затенил."],
        wallGame: ["Никто не закончил? Как мои черновики.", "Опять чистый холст."],
        idle: ["Ты там тоже рисуешь?", "Не спеши, я пока порисую."],
        riichi: ["Риичи! Финальный лайн!", "Картинка складывается!"],
      },
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

export function isUnlocked(c: CharacterDef, firstPlaces: number): boolean {
  return !c.unlock || firstPlaces >= c.unlock.count;
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
  reward: (id: string, stage: number) => `${base()}characters/${id}/reward/stage${stage}.webp`,
  voice: (id: string, kind: string) => `${base()}voice/${id}/${kind}.mp3`,
};
