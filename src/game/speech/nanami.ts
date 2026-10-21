import type { HeroineSpeech } from "./types";

export const nanami: HeroineSpeech = {
  chatty: 0.75,
  story: {
    en: "Draws book covers by day and builds pretty hands by night. Learned mahjong from the art club seniors and still plays for the colours more than the points. Her sketchbook is full of hands she thought were beautiful.",
    ru: "Днём рисует обложки книг, ночью собирает красивые руки. Маджонгу научилась у старших из художественного кружка и до сих пор играет скорее ради цветов, чем ради очков. Скетчбук у неё полон рук, которые показались ей красивыми.",
  },
  playstyle: {
    en: "Chases one-suit hands and rarely folds. Easy to read, but a flush she finishes hurts.",
    ru: "Гонится за руками одной масти и редко сбрасывается. Её легко прочитать, но собранная хоницу бьёт больно.",
  },
  lines: {
    en: {
      greet: ["Hi! Mind if I sketch while we play?", "Let's make some pretty hands today.", "Oh, a new face! Nice to meet you.", "I brought my lucky pencil."],
      greetAgain: ["You again! I drew you last time, you know.", "Ready for round two?", "I've been practising my flushes since then!"],
      pleased: ["Look at those colours!", "That one's going in my sketchbook.", "See? Pretty hands win too.", "All one colour, just how I like it."],
      bigWin: ["A masterpiece! Sign it, frame it!", "Now THAT is a cover illustration.", "One suit, all the way. Perfect."],
      lossRon: ["Wait, that tile was dangerous?", "Aw, I liked that composition.", "I didn't even look at your discards...", "Oops. Eraser, please."],
      lossBig: ["That was a whole commission!", "Guess I'm buying a new palette.", "My poor flush..."],
      lossTsumo: ["Drew it yourself? Show-off.", "Hm. Nice shading.", "Lucky stroke."],
      wallGame: ["Nobody finished? Like my drafts.", "A blank canvas again.", "All sketches, no paintings."],
      idle: ["Are you drawing too over there?", "Take your time, I'll doodle.", "I could finish a whole sketch here."],
      riichi: ["Riichi! The final lineart!", "The picture's coming together!", "Riichi! Just one more stroke."],
      playerRiichi: ["Eek, a riichi. Do I fold? ...Nah.", "You're ready? So am I. Almost.", "Riichi already? Let me think... no, I'll push."],
      call: ["Pon! Colours first!", "I'll take that, it matches!", "That's my shade!"],
      lastPlace: ["Last hand... one big flush could fix this!", "Okay, all or nothing. Mostly all."],
      matchWin: ["First place! I'm drawing a trophy.", "My style won today!", "Pretty hands for the win!"],
      matchLose: ["Last... but I got some nice sketches out of it.", "I'll practise folding. Maybe."],
      defeated: ["You win! Can I draw your hands next time?", "That was good. Really good."],
    },
    ru: {
      greet: ["Привет! Можно я буду рисовать во время игры?", "Давай соберём сегодня что-нибудь красивое.", "О, новое лицо! Приятно познакомиться.", "Я взяла свой счастливый карандаш."],
      greetAgain: ["Снова ты! Я тебя в прошлый раз нарисовала.", "Готов ко второму раунду?", "Я с тех пор тренировала хоницу!"],
      pleased: ["Смотри, какие цвета!", "Это я зарисую в скетчбук.", "Видишь? Красивые руки тоже выигрывают.", "Всё в одном цвете, как я люблю."],
      bigWin: ["Шедевр! Подписать и в рамку!", "Вот это уже обложка.", "Одна масть до конца. Идеально."],
      lossRon: ["Стоп, это был опасный тайл?", "Эх, а мне нравилась композиция.", "Я даже не смотрела на твой сброс...", "Ой. Дайте ластик."],
      lossBig: ["Это же целый заказ!", "Придётся покупать новую палитру.", "Моя бедная хоницу..."],
      lossTsumo: ["Сам вытянул? Выпендрёжник.", "Хм. Красиво затенил.", "Удачный штрих."],
      wallGame: ["Никто не закончил? Как мои черновики.", "Опять чистый холст.", "Одни наброски, ни одной картины."],
      idle: ["Ты там тоже рисуешь?", "Не спеши, я пока порисую.", "Я тут целый скетч успею закончить."],
      riichi: ["Риичи! Финальный лайн!", "Картинка складывается!", "Риичи! Остался один штрих."],
      playerRiichi: ["Ой, риичи. Сбрасываться? ...Не-а.", "Ты готов? Я тоже. Почти.", "Уже риичи? Подумаю... нет, иду дальше."],
      call: ["Пон! Сначала цвета!", "Беру, подходит по тону!", "Это мой оттенок!"],
      lastPlace: ["Последняя раздача... одна большая хоницу всё исправит!", "Ладно, всё или ничего. В основном всё."],
      matchWin: ["Первое место! Нарисую себе кубок.", "Мой стиль сегодня победил!", "Красивые руки побеждают!"],
      matchLose: ["Последняя... зато столько набросков.", "Потренируюсь сбрасываться. Может быть."],
      defeated: ["Ты победил! Можно в следующий раз нарисовать твои руки?", "Это было здорово. Правда здорово."],
    },
  },
  bonds: {
    yuzu: {
      en: {
        greet: ["Yuzu! You still owe me for the stream overlay.", "Oh no, Yuzu's here. Don't let her stream my hand."],
        lostTo: ["Yuzu! Don't you dare clip that.", "Of course it's you, Yuzu."],
      },
      ru: {
        greet: ["Юдзу! Ты мне всё ещё должна за оверлей для стрима.", "Ой, Юдзу здесь. Только не стримь мою руку."],
        lostTo: ["Юдзу! Только попробуй это клипнуть.", "Ну конечно, это ты, Юдзу."],
      },
    },
    midori: {
      en: {
        greet: ["Midori! Did the library get my new covers?", "Hi, Midori. I'll be quiet, promise."],
        lostTo: ["Midori, that was textbook. Literally.", "Ouch. Chapter four again, Midori?"],
      },
      ru: {
        greet: ["Мидори! Мои новые обложки уже в библиотеке?", "Привет, Мидори. Я буду тихо, честно."],
        lostTo: ["Мидори, это было по учебнику. Буквально.", "Ай. Опять четвёртая глава, Мидори?"],
      },
    },
  },
};
