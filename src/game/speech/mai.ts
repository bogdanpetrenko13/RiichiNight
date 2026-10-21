import type { HeroineSpeech } from "./types";

export const mai: HeroineSpeech = {
  chatty: 0.7,
  story: {
    en: "Inherited a run-down parlour from her aunt and turned it into the most respected table in the district. Has watched thousands of players and can read most of them before their third discard. Pours tea for everyone, including people who are beating her.",
    ru: "Получила от тёти обветшалый салон и превратила его в самый уважаемый стол района. Повидала тысячи игроков и почти каждого читает уже к третьему сбросу. Наливает чай всем, даже тем, кто её обыгрывает.",
  },
  playstyle: {
    en: "Sharp and experienced: folds at exactly the right moment and strikes hard when the hand is worth it.",
    ru: "Опытная и острая: сбрасывается ровно тогда, когда нужно, и бьёт сильно, когда рука того стоит.",
  },
  lines: {
    en: {
      greet: ["Welcome to my table, dear.", "Sit, sit. Tea is on the house.", "A new face. Let's see what you're made of.", "House rules: no crying over discards."],
      greetAgain: ["Back again? The parlour missed you.", "I remember how you play, dear.", "Your usual seat is free."],
      pleased: ["The house always wins, dear.", "Thank you for playing at my table.", "Mm. Nicely done, if I say so myself.", "Read you like a menu."],
      bigWin: ["That one pays the rent for the month.", "Now that's how the house wins.", "Don't look so pale, dear."],
      lossRon: ["Well read. I'll remember that.", "You caught me. How rude.", "My, you're sharper than you look.", "I'll pour you a cup for that one."],
      lossBig: ["My, my. That stings.", "Now you have my full attention.", "Careful, dear. I hold grudges."],
      lossTsumo: ["Drawn from the wall. Graceful.", "The tiles like you tonight.", "Lucky. Don't get used to it."],
      wallGame: ["A quiet hand. I don't mind.", "Patience is a strategy too.", "Nobody blinked. Good table."],
      idle: ["No rush. The parlour never closes.", "Shall I pour some tea while you think?", "Thinking is free here, dear."],
      riichi: ["Riichi. Careful now.", "I'm waiting, dear.", "Riichi. Mind your discards."],
      playerRiichi: ["Riichi? Then I'll step aside. For now.", "Ah, a declaration. Let me see your river...", "Bold. I'll play safe, dear."],
      call: ["Pon. Don't mind me.", "I'll take that, thank you.", "Chi. Just tidying up."],
      lastPlace: ["Last place in my own parlour? Not tonight.", "One hand is all I need, dear."],
      matchWin: ["The house wins. As it should.", "Thank you for the lovely evening.", "Come again. Bring more points."],
      matchLose: ["Last... Don't tell my regulars.", "Hm. Even the house has bad nights."],
      defeated: ["Well played, dear. You've earned my respect.", "You're welcome at my table any time."],
    },
    ru: {
      greet: ["Добро пожаловать за мой стол, милый.", "Садись, садись. Чай за счёт заведения.", "Новое лицо. Посмотрим, на что ты способен.", "Правило заведения: над сбросом не плачут."],
      greetAgain: ["Снова к нам? Салон по тебе скучал.", "Я помню, как ты играешь, милый.", "Твоё обычное место свободно."],
      pleased: ["Заведение всегда в выигрыше, милый.", "Спасибо, что сыграл за моим столом.", "Мм. Неплохо, если позволишь.", "Прочитала тебя, как меню."],
      bigWin: ["Этой рукой оплачена аренда за месяц.", "Вот так выигрывает заведение.", "Не бледней так, милый."],
      lossRon: ["Хорошо прочитал. Запомню.", "Поймал меня. Как невежливо.", "Ты острее, чем кажешься.", "За это налью тебе чашку."],
      lossBig: ["Ох. Это ощутимо.", "Теперь ты завладел моим вниманием.", "Осторожнее, милый. Я злопамятная."],
      lossTsumo: ["Сам вытянул. Изящно.", "Тайлы тебя сегодня любят.", "Повезло. Не привыкай."],
      wallGame: ["Тихая раздача. Я не против.", "Терпение — тоже стратегия.", "Никто не дрогнул. Хороший стол."],
      idle: ["Не спеши. Салон никогда не закрывается.", "Налить чаю, пока думаешь?", "Думать здесь бесплатно, милый."],
      riichi: ["Риичи. Теперь осторожнее.", "Я жду, милый.", "Риичи. Следи за сбросом."],
      playerRiichi: ["Риичи? Тогда я отступлю. Пока.", "О, объявление. Посмотрим на твою реку...", "Смело. Сыграю безопасно, милый."],
      call: ["Пон. Не обращай внимания.", "Возьму, спасибо.", "Чи. Просто навожу порядок."],
      lastPlace: ["Последняя в собственном салоне? Не сегодня.", "Мне нужна всего одна рука, милый."],
      matchWin: ["Заведение выигрывает. Как и положено.", "Спасибо за чудесный вечер.", "Заходи ещё. Приноси побольше очков."],
      matchLose: ["Последняя... Только постоянным не говори.", "Хм. И у заведения бывают плохие вечера."],
      defeated: ["Хорошо сыграно, милый. Ты заслужил моё уважение.", "Тебе всегда рады за моим столом."],
    },
  },
  bonds: {
    tsukiko: {
      en: {
        greet: ["Tsukiko. You took your title at this very table, remember?", "The queen in my parlour again. I'll put the kettle on."],
        lostTo: ["Still the queen, Tsukiko. Still annoying.", "Same as the night you took the title, Tsukiko."],
      },
      ru: {
        greet: ["Цукико. Свой титул ты взяла именно за этим столом, помнишь?", "Королева снова в моём салоне. Поставлю чайник."],
        lostTo: ["Всё ещё королева, Цукико. Всё ещё невыносима.", "Как в ту ночь, когда ты взяла титул, Цукико."],
      },
    },
    akane: {
      en: {
        greet: ["Akane, dear. The regulars are asking for your karaage.", "Akane's here. Who's minding the kitchen?"],
        lostTo: ["Akane. I'm cutting your catering bill.", "Well cooked, Akane. Too well."],
      },
      ru: {
        greet: ["Аканэ, милая. Постоянные гости просят твой караагэ.", "Аканэ здесь. А кто следит за кухней?"],
        lostTo: ["Аканэ. Урежу тебе счёт за кейтеринг.", "Хорошо приготовлено, Аканэ. Даже слишком."],
      },
    },
  },
};
