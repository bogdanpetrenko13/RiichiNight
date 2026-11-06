import type { HeroineSpeech } from "./types";

export const kaede: HeroineSpeech = {
  chatty: 0.85,
  story: {
    en: "Knows every shortcut in the city and every red light worth risking. Plays at the parlour between evening deliveries, helmet on the chair next to her. Has never been late — and never been patient.",
    ru: "Знает каждый короткий путь в городе и каждый светофор, на котором стоит рискнуть. Играет в салоне между вечерними заказами, шлем лежит на соседнем стуле. Ни разу не опоздала — и ни разу не проявила терпения.",
  },
  playstyle: {
    en: "Fast and bold: calls to speed up her hand and takes the shortest route to a win, even through danger.",
    ru: "Быстрая и смелая: открывается, чтобы ускорить руку, и идёт к выигрышу кратчайшим путём, даже через опасность.",
  },
  beats: [
    {
      at: 1,
      en: "A hundred and forty kilometres around town today. And this is still the calmest place I've been all day.",
      ru: "Сегодня сто сорок километров по городу. И всё равно это самое спокойное место за весь день.",
    },
    {
      at: 3,
      en: "Everyone thinks I rush because of deliveries. Nope. I just can't stand sitting still.",
      ru: "Все думают, что я тороплюсь из-за заказов. Нет. Мне просто плохо, когда стоишь на месте.",
    },
    {
      at: 6,
      en: "I used to race. On a track, for real, in an amateur league. I'll tell you some other time. Deal.",
      ru: "Я раньше гоняла. На треке, по-настоящему, в любительской лиге. Потом расскажу. Сдавай.",
    },
    {
      at: 10,
      en: "Crashed in practice. Nothing serious, the arm healed. Getting back on the track, though... that still scares me.",
      ru: "Разбилась на тренировке. Ничего страшного, рука срослась. А вот снова выехать на трек — страшно. До сих пор.",
    },
    {
      at: 15,
      en: "I signed up for a track day. Sunday. First time in three years. Come and watch?",
      ru: "Записалась на трек-день. В воскресенье. Первый раз за три года. Придёшь посмотреть?",
    },
  ],
  lines: {
    en: {
      greet: ["Hey. I've got forty minutes, so no warm-up.", "New face? Fine, sit. Just don't drag your feet.", "Helmet on the chair, phone on silent. Let's go."],
      greetAgain: ["Oh, it's you. Faster than last time, deal?", "You again. Good, at least you're not boring.", "Three deliveries back to back today. I'm cranky. Sit."],
      greetFriend: ["Finally. I've been sitting here like an idiot for ten minutes.", "Hey. Saved you a seat, by the way.", "Same as always? You slow, me fast."],
      pleased: ["Mine. Next!", "Didn't even brake.", "There. No detours."],
      bigWin: ["{points}! Now that's speed.", "Whoa. Didn't see that coming myself.", "{yaku}! And they say I only grab cheap hands."],
      ronYou: ["Your tile, my hand. Thanks.", "That tile? Really? Thanks.", "Ron. Sorry, I don't do slow."],
      streak: ["Another one. We're not stopping.", "That's a streak. Somebody hit the brakes.", "Back to back! I'm on a roll."],
      comeback: ["Counted me out? Mistake.", "From last place. Best part of the race."],
      lossRon: ["Ugh. Saw that tile coming... threw it anyway.", "Yeah, I took the risk. No regrets. Mostly.", "{name}, you're way too patient.", "My fault. I'll win it back."],
      lossBig: ["Ow. That one hurt.", "There goes half my points. Nice hand, though.", "Great. Now I really need to speed up."],
      lossTsumo: ["Tsumo? I didn't even blink.", "Passed me right at the finish line. Ugh.", "Fine. Next one's mine."],
      wallGame: ["Wall's out and my hand's half done. Annoying.", "A draw. The most boring thing ever.", "All that for nothing? Come on."],
      idle: ["Hey, you still with us?", "I've got a pickup in eighteen minutes. Just saying.", "Traffic lights change faster than this."],
      riichi: ["Riichi. Hold on.", "Riichi! No turning back now.", "Riichi. Come on, throw me something."],
      playerRiichi: ["Riichi? Don't care, I'm going through.", "Oh no, so scary. ...Okay, a little scary.", "You're in riichi. This'll be fun."],
      call: ["Pon! Not waiting.", "Chi. It's faster.", "Taking it. No time to build it pretty."],
      lastPlace: ["Last? Fine. The final hand's my favourite.", "I'm good at falling behind. Better at catching up."],
      matchWin: ["First! Obviously.", "Okay, I'm off. Kidding. One more?", "A win, and my order's still hot."],
      matchLose: ["Last. What a day.", "Fine. Not my track today."],
      defeated: ["Okay, you were faster today. For now.", "Respect. Seriously. Rematch tomorrow.", "That was great. Don't tell anyone I said so."],
    },
    ru: {
      greet: ["Привет. У меня минут сорок, так что без раскачки.", "Новенькие? Ладно, садись. Только не тяни.", "Шлем на стул, телефон на беззвучный. Погнали."],
      greetAgain: ["О, это ты. Сегодня быстрее, чем в прошлый раз, идёт?", "Опять ты. Хорошо, с тобой хотя бы не скучно.", "Три заказа подряд, я злая. Садись."],
      greetFriend: ["Наконец-то. Я тут уже десять минут сижу как дура.", "Привет. Место тебе держала, между прочим.", "Ну что, как обычно? Ты медленно, я быстро."],
      pleased: ["Моя. Следующая!", "Даже не притормозила.", "Вот так. Без лишних кругов."],
      bigWin: ["{points}! Вот это я понимаю — скорость.", "Ого. Сама не ожидала.", "{yaku}! А говорят, я только мелочь собираю."],
      ronYou: ["Твой тайл, моя рука. Спасибо.", "Этот тайл? Серьёзно? Спасибо.", "Рон. Извини, медленно я не умею."],
      streak: ["Ещё одна. Не тормозим.", "Это уже серия. Кто-нибудь, остановите меня.", "Подряд! Вот это поток."],
      comeback: ["Списали меня? Зря.", "С последнего места — самое интересное."],
      lossRon: ["Блин. Видела же этот тайл... и всё равно скинула.", "Ну да, рискнула. Не жалею. Почти.", "{name}, ну ты и терпеливая.", "Сама виновата, сама и отыграю."],
      lossBig: ["Ай. Вот это было больно.", "Минус половина моих очков. Красиво, не спорю.", "Отлично. Теперь точно надо ускориться."],
      lossTsumo: ["Цумо? Я даже моргнуть не успела.", "Обогнали прямо перед финишем. Обидно.", "Ну и ладно. Следующая — моя."],
      wallGame: ["Стена кончилась, а я так и не дособрала. Бесит.", "Ничья. Самое скучное, что бывает.", "И ради чего всё это было?"],
      idle: ["Эй, ты там вообще с нами?", "У меня заказ через восемнадцать минут. Просто к слову.", "Светофор и то быстрее переключается."],
      riichi: ["Риичи. Держитесь.", "Риичи! Всё, назад дороги нет.", "Риичи. Ну давай, подкинь мне что-нибудь."],
      playerRiichi: ["Риичи? Да мне всё равно, я иду дальше.", "Ой, как страшно. ...Ладно, немного страшно.", "Риичи у тебя. Значит, будет весело."],
      call: ["Пон! Не жду.", "Чи. Так быстрее.", "Беру. Некогда собирать красиво."],
      lastPlace: ["Последняя? Ладно. Последняя раздача — моя любимая.", "Отставать я умею. Догонять — ещё лучше."],
      matchWin: ["Первая! А как иначе.", "Всё, я поехала. Шучу. Ещё одну?", "Победа, и заказ ещё не остыл."],
      matchLose: ["Последняя. Ну и день.", "Ладно. Сегодня не моя трасса."],
      defeated: ["Ладно, сегодня ты быстрее. Пока что.", "Уважаю. Правда. Завтра реванш.", "Это было здорово. Только никому не говори, что я так сказала."],
    },
  },
  bonds: {
    hikari: {
      en: {
        greet: ["Hikari! Your beans are in the box, don't start.", "Oh, Hikari. Bet I'm faster today?"],
        lostTo: ["Hikari! You waited on purpose, didn't you?", "Fine, Hikari. Coffee's on me."],
      },
      ru: {
        greet: ["Хикари! Твои зёрна в кофре, не начинай.", "О, Хикари. Спорим, я сегодня быстрее?"],
        lostTo: ["Хикари! Ты специально ждала, да?", "Ладно, Хикари. Кофе с меня."],
      },
    },
  },
};
