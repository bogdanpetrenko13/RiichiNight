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
  lines: {
    en: {
      greet: ["Hey! I've got twenty minutes till my next delivery.", "Helmet off, game on!", "New rider on the road, huh? Let's race.", "Keep up if you can!"],
      greetAgain: ["You again! Same route as last time?", "Rematch! I know the shortcuts now.", "Back for another lap?"],
      pleased: ["Delivered! Sign here, please.", "Fastest route, as always.", "Beat the traffic!", "Express delivery!"],
      bigWin: ["Overnight express, full price!", "That's my best time ever!", "Nobody catches me!"],
      lossRon: ["Ran a red light there. My bad.", "Took the corner too fast.", "Oops, wrong turn.", "Speed camera got me."],
      lossBig: ["That's a whole week of tips!", "Okay, that one hurt the engine.", "Crashed and burned..."],
      lossTsumo: ["You beat me to the door?", "Hah. Nice overtake.", "Shortcut I didn't know about?"],
      wallGame: ["Stuck in traffic. Again.", "Nobody made it? Rush hour.", "Roadworks everywhere."],
      idle: ["Engine's running, you know.", "Green light! Go, go!", "My order's getting cold..."],
      riichi: ["Riichi! Full throttle!", "Last stretch. Hold on tight!", "Riichi! No brakes!"],
      playerRiichi: ["Riichi? I'll just ride through it!", "Danger ahead... eh, I'm going.", "Brakes? What brakes?"],
      call: ["Pon! Shortcut!", "Chi! Cutting through!", "Taking the fast lane!"],
      lastPlace: ["Last place? Time for a really big shortcut.", "Final lap, and I'm at the back. Hold my helmet."],
      matchWin: ["First across the line!", "Fastest rider in the city!", "Delivered: one victory!"],
      matchLose: ["Last... flat tyre today.", "I'll take the long way home."],
      defeated: ["Okay, you're faster. For now.", "Respect! Race you again tomorrow."],
    },
    ru: {
      greet: ["Привет! У меня двадцать минут до следующего заказа.", "Шлем снят, игра начата!", "Новый гонщик на трассе? Погнали.", "Не отставай, если сможешь!"],
      greetAgain: ["Опять ты! Тем же маршрутом?", "Реванш! Я теперь знаю короткие пути.", "Ещё кружок?"],
      pleased: ["Доставлено! Распишитесь, пожалуйста.", "Самым коротким путём, как всегда.", "Обогнала пробку!", "Экспресс-доставка!"],
      bigWin: ["Срочная ночная доставка, по полному тарифу!", "Мой лучший результат!", "Меня никто не догонит!"],
      lossRon: ["Проскочила на красный. Виновата.", "Слишком резво вошла в поворот.", "Ой, не туда свернула.", "Камера меня поймала."],
      lossBig: ["Это же чаевые за неделю!", "Ох, это по мотору ударило.", "Разбилась в хлам..."],
      lossTsumo: ["Обогнал меня у самой двери?", "Ха. Красивый обгон.", "Короткий путь, которого я не знала?"],
      wallGame: ["Опять пробка.", "Никто не доехал? Час пик.", "Ремонт дорог повсюду."],
      idle: ["Мотор-то работает.", "Зелёный! Поехали, поехали!", "Мой заказ остывает..."],
      riichi: ["Риичи! Полный газ!", "Финишная прямая. Держись крепче!", "Риичи! Без тормозов!"],
      playerRiichi: ["Риичи? Проскочу!", "Впереди опасность... а, поеду.", "Тормоза? Какие тормоза?"],
      call: ["Пон! Срезаю!", "Чи! Напрямик!", "Ухожу в скоростной ряд!"],
      lastPlace: ["Последняя? Пора срезать по-крупному.", "Последний круг, а я в хвосте. Подержи шлем."],
      matchWin: ["Первая на финише!", "Самый быстрый курьер города!", "Доставлено: одна победа!"],
      matchLose: ["Последняя... проколола колесо.", "Поеду домой длинной дорогой."],
      defeated: ["Ладно, ты быстрее. Пока что.", "Уважаю! Завтра реванш."],
    },
  },
  bonds: {
    hikari: {
      en: {
        greet: ["Hikari! Your beans are in my bag, I swear.", "Hikari's here! Coffee after, my treat."],
        lostTo: ["Hikari! You never let me overtake.", "Fine, Hikari, you win this lap."],
      },
      ru: {
        greet: ["Хикари! Твои зёрна у меня в сумке, честно.", "Хикари здесь! Кофе после игры — с меня."],
        lostTo: ["Хикари! Ты никогда не даёшь себя обогнать.", "Ладно, Хикари, этот круг твой."],
      },
    },
  },
};
