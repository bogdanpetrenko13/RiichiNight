import type { HeroineSpeech } from "./types";

export const akane: HeroineSpeech = {
  chatty: 0.8,
  story: {
    en: "Runs the kitchen of a tiny izakaya with eight seats and a two-week waiting list. Comes to the table straight from service, still smelling of grilled fish, and plays every hand like it's going on the menu.",
    ru: "Заведует кухней крошечной идзакаи на восемь мест с записью на две недели вперёд. Приходит за стол прямо со смены, ещё пахнущая жареной рыбой, и разыгрывает каждую руку так, будто её подадут гостям.",
  },
  playstyle: {
    en: "Showy and expensive: chases big hands with dora and yaku stacked high, and doesn't back down under pressure.",
    ru: "Яркая и дорогая: гонится за большими руками с дорой и кучей яку и не отступает под давлением.",
  },
  lines: {
    en: {
      greet: ["Evening! Kitchen's closed, the table's open.", "Let's cook something big tonight.", "A new guest! What'll it be?", "Aprons off. Let's play."],
      greetAgain: ["Back for seconds?", "Our regular! The usual?", "I've been sharpening my knives since last time."],
      pleased: ["Order up! Enjoy your meal.", "That's the house special.", "Hot and fresh!", "Chef's choice!"],
      bigWin: ["The full omakase course!", "Premium ingredients, premium price!", "Now THAT is a signature dish."],
      lossRon: ["Burnt it. Back to the stove.", "Too much salt on that one.", "Dropped the plate...", "Wrong ingredient, my bad."],
      lossBig: ["That was the whole night's stock!", "Someone tell the kitchen to close.", "There goes the good tuna."],
      lossTsumo: ["Cooked it yourself? Not bad.", "Hmph. Decent seasoning.", "Home cooking, huh."],
      wallGame: ["Nothing came out of the kitchen.", "Service is over, nobody ate.", "All prep, no dishes."],
      idle: ["The rice is getting cold.", "Chop chop! Orders are waiting.", "In my kitchen you'd be fired by now."],
      riichi: ["Riichi! Into the pan!", "Plating it now. Watch this.", "Riichi! Fire's on high!"],
      playerRiichi: ["Riichi? Doesn't scare a chef.", "Hot pan, eh? I've handled worse.", "I'm not leaving the kitchen."],
      call: ["Pon! Extra ingredient!", "Chi! Into the pot!", "I'll take that for the sauce."],
      lastPlace: ["Last place? Time for the secret recipe.", "One dish to save the night. Here goes."],
      matchWin: ["Three stars! First place!", "Best kitchen in town!", "Full house tonight!"],
      matchLose: ["Last... the critics were harsh tonight.", "Back to washing dishes."],
      defeated: ["You're a real chef at this table.", "My compliments. Come by the izakaya sometime."],
    },
    ru: {
      greet: ["Вечер добрый! Кухня закрыта, стол открыт.", "Приготовим сегодня что-нибудь крупное.", "Новый гость! Что будем заказывать?", "Фартуки долой. Играем."],
      greetAgain: ["За добавкой?", "Наш постоянный гость! Как обычно?", "Я с прошлого раза точила ножи."],
      pleased: ["Заказ готов! Приятного аппетита.", "Это фирменное блюдо заведения.", "С пылу с жару!", "Выбор шефа!"],
      bigWin: ["Полный сет омакасэ!", "Отборные продукты, отборная цена!", "Вот это фирменное блюдо."],
      lossRon: ["Пригорело. Назад к плите.", "Пересолила, признаю.", "Уронила тарелку...", "Не тот ингредиент, виновата."],
      lossBig: ["Это же запас на весь вечер!", "Скажите кухне, что мы закрываемся.", "Прощай, хороший тунец."],
      lossTsumo: ["Сам приготовил? Неплохо.", "Хм. Приправы в меру.", "Домашняя кухня, значит."],
      wallGame: ["С кухни ничего не вышло.", "Смена закончилась, никто не поел.", "Одна заготовка, ни одного блюда."],
      idle: ["Рис остывает.", "Живее! Заказы ждут.", "На моей кухне тебя бы уже уволили."],
      riichi: ["Риичи! На сковороду!", "Подаю. Смотри внимательно.", "Риичи! Огонь на максимум!"],
      playerRiichi: ["Риичи? Шефа этим не напугать.", "Горячая сковорода, да? Бывало и хуже.", "С кухни я не уйду."],
      call: ["Пон! Ещё ингредиент!", "Чи! В кастрюлю!", "Возьму для соуса."],
      lastPlace: ["Последнее место? Время для секретного рецепта.", "Одно блюдо, чтобы спасти вечер. Поехали."],
      matchWin: ["Три звезды! Первое место!", "Лучшая кухня в городе!", "Сегодня полный зал!"],
      matchLose: ["Последняя... критики сегодня суровые.", "Обратно мыть посуду."],
      defeated: ["Ты настоящий шеф за этим столом.", "Моё почтение. Загляни как-нибудь в идзакаю."],
    },
  },
  bonds: {
    hikari: {
      en: {
        greet: ["Hikari! Still selling sugar water as coffee?", "The café girl's here. Izakaya versus café, round two!"],
        lostTo: ["Hikari, that was luck. Pure, sweet luck.", "Fine, Hikari. One latte for me."],
      },
      ru: {
        greet: ["Хикари! Всё ещё продаёшь сладкую воду под видом кофе?", "Девочка из кафе здесь. Идзакая против кафе, второй раунд!"],
        lostTo: ["Хикари, это везение. Чистое, сладкое везение.", "Ладно, Хикари. Один латте мне."],
      },
    },
    mai: {
      en: {
        greet: ["Mai! I brought the karaage your regulars asked for.", "Evening, Mai. Don't cut my catering bill, please."],
        lostTo: ["Mai, you read me like my own menu.", "Of course, Mai. The house always wins."],
      },
      ru: {
        greet: ["Май! Я принесла караагэ, который просили твои гости.", "Вечер добрый, Май. Только не урезай мне счёт за кейтеринг."],
        lostTo: ["Май, ты читаешь меня, как моё же меню.", "Ну конечно, Май. Заведение всегда в выигрыше."],
      },
    },
  },
};
