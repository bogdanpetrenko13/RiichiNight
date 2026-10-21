import type { HeroineSpeech } from "./types";

export const rin: HeroineSpeech = {
  chatty: 0.5,
  story: {
    en: "Keeps the books for a mid-sized company and keeps count of every tile in the wall. Plays twice a week, logs every hand in a spreadsheet and has never once raised her voice at the table.",
    ru: "Ведёт бухгалтерию средней компании и ведёт счёт каждому тайлу в стене. Играет дважды в неделю, записывает каждую раздачу в таблицу и ни разу не повысила голос за столом.",
  },
  playstyle: {
    en: "Precise and steady: plays for efficiency, folds early against danger and seldom deals in. Wins small and often.",
    ru: "Точная и ровная: играет на эффективность, рано сбрасывается от опасности и редко набрасывает. Выигрывает понемногу, но часто.",
  },
  lines: {
    en: {
      greet: ["Good evening. Shall we begin?", "I'll be keeping score. Precisely.", "A new opponent. I'll start a new sheet.", "Let's keep this efficient."],
      greetAgain: ["Welcome back. I have your numbers from last time.", "Your deal-in rate has improved. Let's see.", "Round two. I adjusted my model."],
      pleased: ["As calculated.", "The numbers were on my side.", "Expected value, realised.", "Balanced."],
      bigWin: ["A rare outcome. Recorded.", "That exceeds the forecast.", "Quarterly target: met."],
      lossRon: ["A rounding error. Won't happen again.", "Noted. I'll adjust the model.", "I misjudged the risk.", "Hm. An audit is in order."],
      lossBig: ["That's... a significant loss.", "I need to recalculate.", "This will show up in the report."],
      lossTsumo: ["Unlikely. But it happened.", "Hm. The wall favoured you.", "Within variance."],
      wallGame: ["Zero expected value. Acceptable.", "Nobody tenpai? Inefficient.", "A neutral result."],
      idle: ["Thinking is allowed. Within reason.", "Time is a resource, too.", "I'm counting the wall while I wait."],
      riichi: ["Riichi. Your odds just changed.", "I'm ready. Are you?", "Riichi. The figures are final."],
      playerRiichi: ["Riichi. I'll fold. Statistically sound.", "Your discards suggest three waits. Folding.", "Understood. Switching to defence."],
      call: ["Pon. Speeds up the hand.", "Chi. Efficient.", "Taking it. The maths says so."],
      lastPlace: ["Last place. A large hand is required. Calculating.", "The gap is closable. Barely."],
      matchWin: ["First place. Consistent with my projections.", "The books balance in my favour.", "Efficient match."],
      matchLose: ["Last place. I'll review the data.", "An unprofitable evening."],
      defeated: ["You played better. The numbers don't lie.", "Well played. I'll study your discards."],
    },
    ru: {
      greet: ["Добрый вечер. Начнём?", "Счёт веду я. Точно.", "Новый соперник. Заведу новый лист.", "Давайте без лишних движений."],
      greetAgain: ["С возвращением. Твои цифры с прошлого раза у меня.", "Твой процент набросов улучшился. Проверим.", "Второй раунд. Я поправила модель."],
      pleased: ["Всё по расчёту.", "Цифры были на моей стороне.", "Матожидание реализовано.", "Сходится."],
      bigWin: ["Редкий исход. Записано.", "Это выше прогноза.", "Квартальный план выполнен."],
      lossRon: ["Погрешность округления. Больше не повторится.", "Учту. Поправлю модель.", "Неверно оценила риск.", "Хм. Нужна проверка."],
      lossBig: ["Это... ощутимая потеря.", "Нужно пересчитать.", "Это попадёт в отчёт."],
      lossTsumo: ["Маловероятно. Но случилось.", "Хм. Стена тебе подыграла.", "В пределах дисперсии."],
      wallGame: ["Матожидание ноль. Допустимо.", "Никто не в темпае? Неэффективно.", "Нейтральный результат."],
      idle: ["Думать можно. В разумных пределах.", "Время — тоже ресурс.", "Пока жду, пересчитываю стену."],
      riichi: ["Риичи. Твои шансы изменились.", "Я готова. А ты?", "Риичи. Цифры окончательные."],
      playerRiichi: ["Риичи. Сбрасываюсь. Статистически оправдано.", "По твоему сбросу три ожидания. Ухожу в защиту.", "Понятно. Перехожу в оборону."],
      call: ["Пон. Ускоряет руку.", "Чи. Эффективно.", "Беру. Математика за."],
      lastPlace: ["Последнее место. Нужна крупная рука. Считаю.", "Отрыв можно закрыть. С трудом."],
      matchWin: ["Первое место. В пределах прогноза.", "Баланс в мою пользу.", "Эффективная партия."],
      matchLose: ["Последнее место. Разберу данные.", "Убыточный вечер."],
      defeated: ["Ты сыграл лучше. Цифры не врут.", "Хорошо сыграно. Изучу твой сброс."],
    },
  },
  bonds: {
    reiko: {
      en: {
        greet: ["Ms Shirase. Your department is over budget again.", "Reiko. I brought the quarterly figures. Later."],
        lostTo: ["Reiko. That was within your forecast, I assume.", "Noted, Reiko. I'll invoice you."],
      },
      ru: {
        greet: ["Сирасэ-сан. Ваш отдел опять превысил бюджет.", "Рэйко. Квартальные цифры у меня. Потом."],
        lostTo: ["Рэйко. Полагаю, это было в вашем прогнозе.", "Учтено, Рэйко. Выставлю вам счёт."],
      },
    },
  },
};
