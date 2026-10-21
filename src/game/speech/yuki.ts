import type { HeroineSpeech } from "./types";

export const yuki: HeroineSpeech = {
  chatty: 0.35,
  story: {
    en: "A cardiac surgeon who spends most nights on call and plays on the rare evenings she isn't. Says little, wastes nothing and has the steadiest hands in the hospital — and at the table.",
    ru: "Кардиохирург: большинство ночей на дежурстве, играет в те редкие вечера, когда свободна. Говорит мало, ничего не тратит впустую и обладает самыми твёрдыми руками в больнице — и за столом.",
  },
  playstyle: {
    en: "Cold and patient: waits for one clean, decisive hand and gives nothing away until then.",
    ru: "Холодная и терпеливая: ждёт одной чистой, решающей руки и до тех пор ничего не отдаёт.",
  },
  lines: {
    en: {
      greet: ["Evening. I have two hours.", "Let's begin.", "A new patient. Sit.", "Hands steady. Good."],
      greetAgain: ["Follow-up appointment.", "You again. Your chart is in order.", "Let's see if you've recovered."],
      pleased: ["Clean incision.", "Operation successful.", "Precise.", "Closed."],
      bigWin: ["Textbook procedure.", "Full recovery expected. For me.", "Nothing wasted."],
      lossRon: ["A complication. Noted.", "I misjudged the bleeding.", "Unexpected.", "Hm."],
      lossBig: ["Critical condition.", "...That will leave a scar.", "Losing pressure."],
      lossTsumo: ["Precise work. I approve.", "Steady hands.", "Competent."],
      wallGame: ["Stable. For now.", "No intervention needed.", "Observation continues."],
      idle: ["Every second counts.", "Scalpel ready when you are.", "Decide."],
      riichi: ["Riichi. Beginning the procedure.", "Hold still.", "Riichi."],
      playerRiichi: ["Riichi. Noted.", "I'll wait.", "Careful, then."],
      call: ["Pon.", "Chi.", "Mine."],
      lastPlace: ["Last. One clean cut is enough.", "Final hand. Prepare the theatre."],
      matchWin: ["First place. As required.", "Procedure complete.", "Satisfactory."],
      matchLose: ["Last. I'll review the case.", "Not my best operation."],
      defeated: ["Impressive. Truly.", "You have good hands. Keep them steady."],
    },
    ru: {
      greet: ["Добрый вечер. У меня два часа.", "Начнём.", "Новый пациент. Садись.", "Руки не дрожат. Хорошо."],
      greetAgain: ["Повторный приём.", "Снова ты. Карта в порядке.", "Посмотрим, восстановился ли ты."],
      pleased: ["Чистый разрез.", "Операция прошла успешно.", "Точно.", "Зашито."],
      bigWin: ["Операция по учебнику.", "Ожидается полное восстановление. Моё.", "Ничего лишнего."],
      lossRon: ["Осложнение. Учту.", "Недооценила кровотечение.", "Неожиданно.", "Хм."],
      lossBig: ["Состояние критическое.", "...Останется шрам.", "Давление падает."],
      lossTsumo: ["Точная работа. Одобряю.", "Твёрдая рука.", "Грамотно."],
      wallGame: ["Состояние стабильное. Пока.", "Вмешательство не требуется.", "Продолжаем наблюдение."],
      idle: ["Каждая секунда на счету.", "Скальпель наготове, когда будешь готов.", "Решай."],
      riichi: ["Риичи. Начинаю операцию.", "Не двигайся.", "Риичи."],
      playerRiichi: ["Риичи. Принято.", "Подожду.", "Тогда осторожно."],
      call: ["Пон.", "Чи.", "Моё."],
      lastPlace: ["Последняя. Хватит одного чистого разреза.", "Последняя раздача. Готовьте операционную."],
      matchWin: ["Первое место. Как и требовалось.", "Операция завершена.", "Удовлетворительно."],
      matchLose: ["Последняя. Разберу случай.", "Не лучшая моя операция."],
      defeated: ["Впечатляет. Правда.", "У тебя хорошие руки. Береги их."],
    },
  },
  bonds: {
    sora: {
      en: {
        greet: ["Sora. You're in town. Good.", "Sora. Still flying too much."],
        lostTo: ["Sora. Smooth, as always.", "...Well played, Sora."],
      },
      ru: {
        greet: ["Сора. Ты в городе. Хорошо.", "Сора. Всё ещё слишком много летаешь."],
        lostTo: ["Сора. Мягко, как всегда.", "...Хорошо сыграно, Сора."],
      },
    },
  },
};
