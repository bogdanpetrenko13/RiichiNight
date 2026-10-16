import type { Level } from "../engine/protocol";
import type { Lang } from "../i18n/strings";

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
  /** Speech-bubble lines at the table, picked at random per event. */
  lines: Record<Lang, Record<SpeechKind, string[]>>;
  /**
   * Locked until the player finishes 1st in a match where every heroine in
   * `with` sat at the table; omitted = available from the start. The ladder
   * opens one step at a time: steps 1–4 are open, each next step needs a 1st
   * place with the heroine of the step before it.
   */
  unlock?: { kind: "firstPlaceWith"; with: string[] };
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
    step: 2,
    level: "heur:0.3",
    style: "reckless",
    color: "#f2a65a",
    accent: "#ffe3c4",
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
    step: 4,
    level: "heur:0.16",
    style: "precise",
    color: "#5b8def",
    accent: "#dbe6ff",
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
    unlock: { kind: "firstPlaceWith", with: ["rin"] },
    name: { en: "Mai Tachibana", ru: "Май Татибана" },
    title: { en: "Mahjong parlor owner", ru: "Хозяйка маджонг-салона" },
    age: 31,
    bio: {
      en: "Runs the parlor and has seen every trick. Folds at the right moment and strikes hard.",
      ru: "Держит салон и видела все уловки. Вовремя сбрасывается и бьёт наверняка.",
    },
    step: 5,
    level: "heur:0.13",
    style: "sharp",
    color: "#c2456b",
    accent: "#ffd6e2",
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
    step: 3,
    level: "heur:0.22",
    style: "showy",
    color: "#8e6cd8",
    accent: "#ece2ff",
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
    unlock: { kind: "firstPlaceWith", with: ["mai"] },
    name: { en: "Reiko Shirase", ru: "Рэйко Сирасэ" },
    title: { en: "Project manager", ru: "Руководитель проектов" },
    age: 33,
    bio: {
      en: "Runs a team of thirty and plays mahjong after work to unwind. Patient, strategic, ruthless at the right moment.",
      ru: "Руководит командой из тридцати человек, а после работы отдыхает за маджонгом. Терпеливая, расчётливая, беспощадная в нужный момент.",
    },
    step: 6,
    level: "heur:0.06",
    style: "patient",
    color: "#6d5dfc",
    accent: "#e3e0ff",
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
    step: 1,
    level: "heur:0.25",
    style: "flush",
    color: "#2fb5a0",
    accent: "#d6f5ef",
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
    lines: {
      en: {
        pleased: ["Delivered! Sign here, please.", "Fastest route, as always."],
        lossRon: ["Ran a red light there. My bad.", "Took the corner too fast."],
        lossBig: ["That's a whole week of tips!", "Okay, that one hurt the engine."],
        lossTsumo: ["You beat me to the door?", "Hah. Nice overtake."],
        wallGame: ["Stuck in traffic. Again.", "Nobody made it? Rush hour."],
        idle: ["Engine's running, you know.", "Green light! Go, go!"],
        riichi: ["Riichi! Full throttle!", "Last stretch. Hold on tight!"],
      },
      ru: {
        pleased: ["Доставлено! Распишитесь, пожалуйста.", "Самым коротким путём, как всегда."],
        lossRon: ["Проскочила на красный. Виновата.", "Слишком резво вошла в поворот."],
        lossBig: ["Это же чаевые за неделю!", "Ох, это по мотору ударило."],
        lossTsumo: ["Обогнал меня у самой двери?", "Ха. Красивый обгон."],
        wallGame: ["Опять пробка.", "Никто не доехал? Час пик."],
        idle: ["Мотор-то работает.", "Зелёный! Поехали, поехали!"],
        riichi: ["Риичи! Полный газ!", "Финишная прямая. Держись крепче!"],
      },
    },
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
    lines: {
      en: {
        pleased: ["Thank you for flying with us.", "A smooth landing, I'd say."],
        lossRon: ["A little turbulence. Nothing serious.", "Please keep your seatbelt fastened."],
        lossBig: ["That was quite a storm.", "We seem to have lost an engine."],
        lossTsumo: ["Right on schedule. Well done.", "A perfect approach."],
        wallGame: ["We'll circle and try again.", "Delayed. It happens."],
        idle: ["Take your time, we're still boarding.", "May I offer you something to drink?"],
        riichi: ["Riichi. Preparing for landing.", "Cabin crew, seats for arrival."],
      },
      ru: {
        pleased: ["Благодарим, что выбрали нашу авиакомпанию.", "Мягкая посадка, я бы сказала."],
        lossRon: ["Небольшая турбулентность. Ничего страшного.", "Пожалуйста, не отстёгивайте ремни."],
        lossBig: ["Ну и гроза была.", "Кажется, мы потеряли двигатель."],
        lossTsumo: ["Точно по расписанию. Молодец.", "Безупречный заход."],
        wallGame: ["Уходим на второй круг.", "Рейс задерживается. Бывает."],
        idle: ["Не спешите, посадка ещё идёт.", "Принести вам что-нибудь выпить?"],
        riichi: ["Риичи. Готовимся к посадке.", "Экипаж, занять места."],
      },
    },
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
    level: "mortal:0.55",
    style: "showy",
    color: "#c8323a",
    accent: "#ffd9db",
    lines: {
      en: {
        pleased: ["Order up! Enjoy your meal.", "That's the house special."],
        lossRon: ["Burnt it. Back to the stove.", "Too much salt on that one."],
        lossBig: ["That was the whole night's stock!", "Someone tell the kitchen to close."],
        lossTsumo: ["Cooked it yourself? Not bad.", "Hmph. Decent seasoning."],
        wallGame: ["Nothing came out of the kitchen.", "Service is over, nobody ate."],
        idle: ["The rice is getting cold.", "Chop chop! Orders are waiting."],
        riichi: ["Riichi! Into the pan!", "Plating it now. Watch this."],
      },
      ru: {
        pleased: ["Заказ готов! Приятного аппетита.", "Это фирменное блюдо заведения."],
        lossRon: ["Пригорело. Назад к плите.", "Пересолила, признаю."],
        lossBig: ["Это же запас на весь вечер!", "Скажите кухне, что мы закрываемся."],
        lossTsumo: ["Сам приготовил? Неплохо.", "Хм. Приправы в меру."],
        wallGame: ["С кухни ничего не вышло.", "Смена закончилась, никто не поел."],
        idle: ["Рис остывает.", "Живее! Заказы ждут."],
        riichi: ["Риичи! На сковороду!", "Подаю. Смотри внимательно."],
      },
    },
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
    level: "mortal:0.38",
    style: "precise",
    color: "#8cbf3f",
    accent: "#ecf7d6",
    lines: {
      en: {
        pleased: ["As described in chapter four.", "Shh. Quietly, please."],
        lossRon: ["I misfiled that one.", "A footnote I overlooked."],
        lossBig: ["That's... a whole volume lost.", "I need to reread the basics."],
        lossTsumo: ["A textbook finish.", "Well written."],
        wallGame: ["An unfinished story.", "No ending this time."],
        idle: ["The library closes at nine.", "Still reading the table?"],
        riichi: ["Riichi. The final chapter.", "Please return your discards on time."],
      },
      ru: {
        pleased: ["Ровно как в четвёртой главе.", "Тсс. Потише, пожалуйста."],
        lossRon: ["Не на ту полку поставила.", "Пропустила сноску."],
        lossBig: ["Это... целый том потерян.", "Надо перечитать основы."],
        lossTsumo: ["Как по учебнику.", "Хорошо написано."],
        wallGame: ["Незаконченная история.", "В этот раз без развязки."],
        idle: ["Библиотека закрывается в девять.", "Всё ещё читаешь стол?"],
        riichi: ["Риичи. Последняя глава.", "Пожалуйста, сдавайте сбросы вовремя."],
      },
    },
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
    lines: {
      en: {
        pleased: ["Clean incision.", "Operation successful."],
        lossRon: ["A complication. Noted.", "I misjudged the bleeding."],
        lossBig: ["Critical condition.", "...That will leave a scar."],
        lossTsumo: ["Precise work. I approve.", "Steady hands."],
        wallGame: ["Stable. For now.", "No intervention needed."],
        idle: ["Every second counts.", "Scalpel ready when you are."],
        riichi: ["Riichi. Beginning the procedure.", "Hold still."],
      },
      ru: {
        pleased: ["Чистый разрез.", "Операция прошла успешно."],
        lossRon: ["Осложнение. Учту.", "Недооценила кровотечение."],
        lossBig: ["Состояние критическое.", "...Останется шрам."],
        lossTsumo: ["Точная работа. Одобряю.", "Твёрдая рука."],
        wallGame: ["Состояние стабильное. Пока.", "Вмешательство не требуется."],
        idle: ["Каждая секунда на счету.", "Скальпель наготове, когда будешь готов."],
        riichi: ["Риичи. Начинаю операцию.", "Не двигайся."],
      },
    },
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
    lines: {
      en: {
        pleased: ["As expected.", "The table remembers its queen."],
        lossRon: ["Interesting. You may continue.", "Bold. I like that."],
        lossBig: ["So you can bite after all.", "Now this is a game."],
        lossTsumo: ["The wall chose you. For now.", "Elegant."],
        wallGame: ["A pause. Nothing more.", "The night is long."],
        idle: ["I can wait. I always do.", "Think carefully. I would."],
        riichi: ["Riichi. Bow your head.", "This is where it ends."],
      },
      ru: {
        pleased: ["Как и ожидалось.", "Стол помнит свою королеву."],
        lossRon: ["Любопытно. Продолжай.", "Смело. Мне нравится."],
        lossBig: ["Значит, всё-таки умеешь кусаться.", "Вот это уже игра."],
        lossTsumo: ["Стена выбрала тебя. Пока.", "Изящно."],
        wallGame: ["Пауза. Не более того.", "Ночь длинная."],
        idle: ["Я подожду. Я всегда жду.", "Думай как следует. Я бы думала."],
        riichi: ["Риичи. Склони голову.", "Здесь всё и закончится."],
      },
    },
  },
];

export function validateRoster(roster: CharacterDef[]): CharacterDef[] {
  return roster.filter((c) => {
    const ok = Number.isFinite(c.age) && c.age >= 18;
    if (!ok) console.error(`[roster] character "${c.id}" rejected: must be 18+`);
    return ok;
  });
}

/** The roster in ladder order. */
export const CHARACTERS = validateRoster(ROSTER).sort((a, b) => a.step - b.step);

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
