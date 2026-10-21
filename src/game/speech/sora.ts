import type { HeroineSpeech } from "./types";

export const sora: HeroineSpeech = {
  chatty: 0.6,
  story: {
    en: "Has played in hotel lounges on four continents between long-haul flights. Carries a travel mahjong set in her cabin bag and a smile that never slips, whatever the turbulence.",
    ru: "Играла в лаунжах отелей на четырёх континентах между дальними рейсами. Возит в ручной клади дорожный набор для маджонга и улыбку, которая не сходит с лица, какой бы ни была турбулентность.",
  },
  playstyle: {
    en: "Balanced and calm: attacks when the odds are good, folds when they aren't. Hard to rattle, hard to read.",
    ru: "Уравновешенная и спокойная: атакует, когда шансы хорошие, и сбрасывается, когда нет. Её трудно вывести из себя и трудно прочитать.",
  },
  lines: {
    en: {
      greet: ["Good evening, and welcome aboard.", "Please make yourself comfortable.", "A new passenger. Pleasure to meet you.", "We're cleared for take-off."],
      greetAgain: ["Welcome back on board.", "A returning passenger. How lovely.", "Same seat as last time?"],
      pleased: ["Thank you for flying with us.", "A smooth landing, I'd say.", "Right on time.", "We have arrived."],
      bigWin: ["First class, all the way.", "An exceptionally smooth flight.", "Upgrade complete."],
      lossRon: ["A little turbulence. Nothing serious.", "Please keep your seatbelt fastened.", "Oh. A slight detour.", "My apologies, that was careless."],
      lossBig: ["That was quite a storm.", "We seem to have lost an engine.", "Emergency procedures, then."],
      lossTsumo: ["Right on schedule. Well done.", "A perfect approach.", "A textbook landing."],
      wallGame: ["We'll circle and try again.", "Delayed. It happens.", "Holding pattern."],
      idle: ["Take your time, we're still boarding.", "May I offer you something to drink?", "We're in no hurry."],
      riichi: ["Riichi. Preparing for landing.", "Cabin crew, seats for arrival.", "Riichi. Final approach."],
      playerRiichi: ["Riichi. Please fasten your seatbelts.", "Turbulence ahead. I'll play safe.", "Understood. Changing course."],
      call: ["Pon. Thank you.", "Chi, if you don't mind.", "I'll take that, please."],
      lastPlace: ["Last place. Let's try for a soft landing.", "Final approach, and we're low on fuel."],
      matchWin: ["We have landed in first place.", "Thank you for a pleasant flight.", "A perfect journey."],
      matchLose: ["Last... a rough flight, but we made it.", "I'll write it in the logbook."],
      defeated: ["Congratulations. You flew beautifully.", "It was a pleasure to have you on board."],
    },
    ru: {
      greet: ["Добрый вечер, добро пожаловать на борт.", "Пожалуйста, располагайтесь.", "Новый пассажир. Рада знакомству.", "Взлёт разрешён."],
      greetAgain: ["С возвращением на борт.", "Постоянный пассажир. Как приятно.", "То же место, что и в прошлый раз?"],
      pleased: ["Благодарим, что выбрали нашу авиакомпанию.", "Мягкая посадка, я бы сказала.", "Точно по расписанию.", "Мы прибыли."],
      bigWin: ["Первый класс, от начала до конца.", "Исключительно мягкий полёт.", "Повышение класса обслуживания."],
      lossRon: ["Небольшая турбулентность. Ничего страшного.", "Пожалуйста, не отстёгивайте ремни.", "Ой. Небольшой крюк.", "Прошу прощения, это было неосторожно."],
      lossBig: ["Ну и гроза была.", "Кажется, мы потеряли двигатель.", "Что ж, аварийные процедуры."],
      lossTsumo: ["Точно по расписанию. Молодец.", "Безупречный заход.", "Посадка по учебнику."],
      wallGame: ["Уходим на второй круг.", "Рейс задерживается. Бывает.", "Ждём в зоне ожидания."],
      idle: ["Не спешите, посадка ещё идёт.", "Принести вам что-нибудь выпить?", "Мы никуда не торопимся."],
      riichi: ["Риичи. Готовимся к посадке.", "Экипаж, занять места.", "Риичи. Заходим на посадку."],
      playerRiichi: ["Риичи. Пожалуйста, пристегните ремни.", "Впереди турбулентность. Сыграю осторожно.", "Поняла. Меняю курс."],
      call: ["Пон. Благодарю.", "Чи, если позволите.", "Возьму, пожалуйста."],
      lastPlace: ["Последнее место. Постараемся мягко приземлиться.", "Заход на посадку, а топлива мало."],
      matchWin: ["Мы приземлились на первом месте.", "Спасибо за приятный полёт.", "Идеальное путешествие."],
      matchLose: ["Последняя... тяжёлый рейс, но мы долетели.", "Запишу в бортовой журнал."],
      defeated: ["Поздравляю. Вы летели прекрасно.", "Было приятно видеть вас на борту."],
    },
  },
  bonds: {
    yuki: {
      en: {
        greet: ["Yuki! Same city on the same night, finally.", "Yuki, you look tired. Long shift?"],
        lostTo: ["Yuki, you haven't changed since school.", "Clean as ever, Yuki."],
      },
      ru: {
        greet: ["Юки! Наконец-то в одном городе в один вечер.", "Юки, ты устала. Долгая смена?"],
        lostTo: ["Юки, ты не изменилась со школы.", "Чисто, как всегда, Юки."],
      },
    },
  },
};
