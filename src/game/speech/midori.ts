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
  lines: {
    en: {
      greet: ["Good evening. Please keep your voice down.", "I've reserved this table for us.", "A new reader. Welcome.", "Let's begin. Quietly."],
      greetAgain: ["You're back. I took notes last time.", "Returning visitor. Your card is still valid.", "I reread a chapter for tonight."],
      pleased: ["As described in chapter four.", "Shh. Quietly, please.", "Correctly catalogued.", "Footnote confirmed."],
      bigWin: ["A first edition.", "That one belongs in the rare books room.", "Exactly as the theory predicts."],
      lossRon: ["I misfiled that one.", "A footnote I overlooked.", "Hm. Not in any of my books.", "I'll look that up later."],
      lossBig: ["That's... a whole volume lost.", "I need to reread the basics.", "That's overdue. Very overdue."],
      lossTsumo: ["A textbook finish.", "Well written.", "Nicely bound."],
      wallGame: ["An unfinished story.", "No ending this time.", "To be continued."],
      idle: ["The library closes at nine.", "Still reading the table?", "Take your time. I'll read."],
      riichi: ["Riichi. The final chapter.", "Please return your discards on time.", "Riichi. Quietly."],
      playerRiichi: ["Riichi. I'll read your river first.", "Noted. Retreating to the reading room.", "Safe tiles only, then."],
      call: ["Pon. Excuse me.", "Chi. Pardon.", "I'll borrow that."],
      lastPlace: ["Last place. I've read about comebacks like this.", "One hand left. Chapter twelve, then."],
      matchWin: ["First place. Exactly as written.", "Shh. No applause, please.", "A satisfying ending."],
      matchLose: ["Last. I'll return to the basics.", "Not a story I'll reread."],
      defeated: ["You played like a book I haven't read yet.", "Well played. May I take notes on your game?"],
    },
    ru: {
      greet: ["Добрый вечер. Пожалуйста, потише.", "Я забронировала для нас этот стол.", "Новый читатель. Добро пожаловать.", "Начнём. Тихо."],
      greetAgain: ["Ты вернулся. В прошлый раз я делала заметки.", "Повторный визит. Читательский ещё действует.", "Я перечитала главу к сегодняшнему вечеру."],
      pleased: ["Ровно как в четвёртой главе.", "Тсс. Потише, пожалуйста.", "Каталогизировано верно.", "Сноска подтвердилась."],
      bigWin: ["Первое издание.", "Это место в отделе редких книг.", "Ровно как предсказывает теория."],
      lossRon: ["Не на ту полку поставила.", "Пропустила сноску.", "Хм. Такого нет ни в одной моей книге.", "Потом посмотрю, как это было."],
      lossBig: ["Это... целый том потерян.", "Надо перечитать основы.", "Это просрочено. Сильно просрочено."],
      lossTsumo: ["Как по учебнику.", "Хорошо написано.", "Аккуратный переплёт."],
      wallGame: ["Незаконченная история.", "В этот раз без развязки.", "Продолжение следует."],
      idle: ["Библиотека закрывается в девять.", "Всё ещё читаешь стол?", "Не спеши. Я почитаю."],
      riichi: ["Риичи. Последняя глава.", "Пожалуйста, сдавайте сбросы вовремя.", "Риичи. Тихо."],
      playerRiichi: ["Риичи. Сначала прочитаю твою реку.", "Принято. Ухожу в читальный зал.", "Тогда только безопасные тайлы."],
      call: ["Пон. Простите.", "Чи. Извините.", "Возьму на время."],
      lastPlace: ["Последнее место. Я читала о таких камбэках.", "Осталась одна раздача. Значит, двенадцатая глава."],
      matchWin: ["Первое место. Как и написано.", "Тсс. Без аплодисментов, пожалуйста.", "Хорошая концовка."],
      matchLose: ["Последняя. Вернусь к основам.", "Эту историю я перечитывать не буду."],
      defeated: ["Ты играешь как книга, которую я ещё не читала.", "Хорошо сыграно. Можно я законспектирую твою игру?"],
    },
  },
  bonds: {
    nanami: {
      en: {
        greet: ["Nanami. Your covers are very popular at the library.", "Hello, Nanami. Please don't sketch on the table this time."],
        lostTo: ["Nanami. A beautiful hand. I'll allow it.", "That flush deserves a cover, Nanami."],
      },
      ru: {
        greet: ["Нанами. Твои обложки в библиотеке нарасхват.", "Здравствуй, Нанами. Только не рисуй на столе в этот раз."],
        lostTo: ["Нанами. Красивая рука. Так и быть.", "Эта хоницу заслуживает обложки, Нанами."],
      },
    },
  },
};
