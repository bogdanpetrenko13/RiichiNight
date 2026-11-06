import type { HeroineSpeech } from "./types";

export const midori: HeroineSpeech = {
  chatty: 0.4,
  story: {
    en: "Runs the reading room of the city library and has read every book on mahjong it owns — twice, with notes in the margins she later erased. Speaks quietly, plays quietly and remembers every discard you made.",
    ru: "Заведует читальным залом городской библиотеки и прочитала все книги о маджонге в её фонде — дважды, с заметками на полях, которые потом аккуратно стёрла. Говорит тихо, играет тихо и помнит каждый твой сброс.",
  },
  playstyle: {
    en: "Meticulous and closed: rarely calls, reads the table carefully and almost never deals in by accident.",
    ru: "Дотошная и закрытая: редко открывается, внимательно читает стол и почти никогда не набрасывает по невнимательности.",
  },
  beats: [
    {
      at: 1,
      en: "You've probably noticed the notebook. It isn't game records. Don't ask yet.",
      ru: "Вы, наверное, заметили блокнот. Это не записи партий. Не спрашивайте пока.",
    },
    {
      at: 3,
      en: "I write. I have for years. I've never shown anyone, not even at the library.",
      ru: "Я пишу. Давно. Никому не показывала, даже в библиотеке не знают.",
    },
    {
      at: 6,
      en: "It's a novel, set in a mahjong parlour. The people at this table are in it too.",
      ru: "Это роман. Действие — в маджонг-салоне. Люди за этим столом в нём тоже есть.",
    },
    {
      at: 10,
      en: "There's a character in it who is a lot like you. I don't know how things end for them. I don't like that.",
      ru: "Там есть персонаж, похожий на вас. Я не знаю, чем у него всё закончится. Мне это не нравится.",
    },
    {
      at: 15,
      en: "I finished it. The first copy is yours. Read it when you have time. Just not here, please.",
      ru: "Я дописала. Первый экземпляр — вам. Прочитаете, когда будет время. Только не здесь, пожалуйста.",
    },
  ],
  lines: {
    en: {
      greet: ["Good evening. I'm Midori. ...That's enough, isn't it?", "Have a seat. I'll try not to be in the way.", "Someone new. Good. Let's begin."],
      greetAgain: ["You again. I remember how you discarded last time.", "Good evening. I reserved this table early.", "You came back. ...I'm glad. I mean it."],
      greetFriend: ["Ah, it's you. Sit, I just finished a chapter.", "I brought you tea. Don't ask how I knew which kind.", "Good evening. I'll talk more today. A little."],
      pleased: ["Sorry. That was inevitable.", "Quietly, please. No applause.", "That's how it was meant to go."],
      bigWin: ["{points}. I'm surprised myself. Slightly.", "{yaku}. I've been waiting since the sixth turn.", "Hm. That was beautiful. Even for me."],
      ronYou: ["Ron. Sorry. You threw it so confidently.", "That tile. I was hoping you'd let it go.", "Ron. I did say I play quietly."],
      streak: ["Another one. Please don't look at me like that.", "The table seems to be on my side tonight."],
      comeback: ["The last chapters are usually the best.", "I don't give up. I just do it quietly."],
      lossRon: ["I knew it was dangerous. I wanted to see if I was right.", "I should write that down. ...No, I'll remember.", "{name}. Well read.", "Hm. My mistake."],
      lossBig: ["...That's a lot.", "Right. I need a minute.", "Beautiful. Painful, but beautiful."],
      lossTsumo: ["Drawn by your own hand. Well earned.", "Tsumo. Quieter, but it still stings."],
      wallGame: ["A draw. Like a novel without its last chapter.", "No one. That's an ending too.", "Everyone kept quiet. I rather liked that."],
      idle: ["Take your time. I'll read.", "You can think out loud. I won't tell anyone.", "I have a book. Don't worry about me."],
      riichi: ["Riichi.", "Riichi. Sorry in advance.", "Riichi. Careful now, please."],
      playerRiichi: ["I saw what you threw before riichi. I'll remember.", "Riichi. All right. I'll pay attention.", "Hm. Then I'll stay quiet."],
      call: ["Pon. Yes, I can do that too.", "Chi. Don't look so surprised.", "I'll take it. A rare occasion."],
      lastPlace: ["Last. Fine. One hand is a whole chapter.", "I'm last. That doesn't mean anything yet."],
      matchWin: ["I won. Quietly, please.", "Thank you for the game. I'll remember it.", "First. Strange to say that out loud."],
      matchLose: ["Last. It happens.", "I read more than I played tonight."],
      defeated: ["You were stronger today. It was interesting to watch.", "A good game. May I write it down?", "You play in a way that makes me want to reread it."],
    },
    ru: {
      greet: ["Добрый вечер. Я Мидори. ...Этого достаточно, правда?", "Садитесь. Я постараюсь не мешать.", "Новый человек. Хорошо. Начнём."],
      greetAgain: ["Снова вы. Я помню, как вы сбрасывали в прошлый раз.", "Добрый вечер. Я заняла этот стол заранее.", "Вы вернулись. ...Я рада. Это не из вежливости."],
      greetFriend: ["А, это вы. Садитесь, я как раз дочитала главу.", "Я принесла вам чай. Не спрашивайте, как узнала какой.", "Добрый вечер. Сегодня я буду разговорчивее. Немного."],
      pleased: ["Простите. Это было неизбежно.", "Тише, пожалуйста. Не надо аплодисментов.", "Так и должно было получиться."],
      bigWin: ["{points}. Я сама удивлена. Чуть-чуть.", "{yaku}. Я ждала этого с шестого хода.", "Хм. Это было красиво. Даже для меня."],
      ronYou: ["Рон. Простите. Вы так уверенно его сбросили.", "Этот тайл. Я надеялась, что вы его отдадите.", "Рон. Я же говорила, что играю тихо."],
      streak: ["Ещё одна. Не смотрите на меня так, пожалуйста.", "Кажется, стол сегодня на моей стороне."],
      comeback: ["Последние главы обычно самые интересные.", "Я не сдаюсь. Просто молча."],
      lossRon: ["Я знала, что это опасно. Хотела проверить, права ли.", "Записать бы это. ...Нет, запомню.", "{name}. Хорошо прочитано.", "Хм. Моя ошибка."],
      lossBig: ["...Это много.", "Так. Мне нужна минута.", "Красиво. Больно, но красиво."],
      lossTsumo: ["Своей рукой. Достойно.", "Цумо. Тише, но всё равно обидно."],
      wallGame: ["Ничья. Как роман без последней главы.", "Никто. Это тоже финал.", "Все промолчали. Мне это даже нравится."],
      idle: ["Не торопитесь. Я пока почитаю.", "Можно думать вслух. Я никому не скажу.", "У меня есть книга. Не беспокойтесь обо мне."],
      riichi: ["Риичи.", "Риичи. Простите заранее.", "Риичи. Теперь осторожнее, пожалуйста."],
      playerRiichi: ["Я видела, что вы сбросили перед риичи. Запомню.", "Риичи. Хорошо. Я буду внимательна.", "Хм. Тогда я помолчу."],
      call: ["Пон. Да, я тоже так умею.", "Чи. Не удивляйтесь.", "Беру. Редкий случай."],
      lastPlace: ["Последняя. Ладно. Одна раздача — это целая глава.", "Я последняя. Это ещё ничего не значит."],
      matchWin: ["Я выиграла. Тише, пожалуйста.", "Спасибо за партию. Я её запомню.", "Первая. Непривычно говорить это вслух."],
      matchLose: ["Последняя. Бывает.", "Сегодня я больше читала, чем играла."],
      defeated: ["Сегодня вы были сильнее. Было интересно смотреть.", "Хорошая партия. Можно я её запишу?", "Вы играете так, что хочется перечитать."],
    },
  },
  bonds: {
    nanami: {
      en: {
        greet: ["Nanami. Your covers are on the display shelf again.", "Hello, Nanami. Did you bring the sketchbook?"],
        lostTo: ["Nanami. That was... vivid.", "A beautiful hand, Nanami. Truly."],
      },
      ru: {
        greet: ["Нанами. Ваши обложки снова на выставочной полке.", "Здравствуйте, Нанами. Скетчбук сегодня с собой?"],
        lostTo: ["Нанами. Это было... ярко.", "Красивая рука, Нанами. Правда."],
      },
    },
  },
};
