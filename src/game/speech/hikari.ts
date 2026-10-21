import type { HeroineSpeech } from "./types";

export const hikari: HeroineSpeech = {
  chatty: 1,
  story: {
    en: "Opens the café at six, closes the mahjong parlour at midnight. Learned the game from regulars on slow afternoons and never learned to sit still. Knows every customer's order and half of their life stories.",
    ru: "Открывает кафе в шесть утра и закрывает маджонг-салон в полночь. Игре научилась у постоянных гостей в тихие дни, а сидеть спокойно так и не научилась. Помнит заказ каждого посетителя и половину их историй.",
  },
  playstyle: {
    en: "Fast and reckless: calls a lot, pushes almost every hand and rarely folds. Wins quickly — and deals in just as quickly.",
    ru: "Быстрая и безрассудная: много открывается, почти всегда идёт до конца и редко сбрасывается. Быстро выигрывает и так же быстро набрасывает.",
  },
  lines: {
    en: {
      greet: ["Hi hi! Coffee's on whoever loses!", "A new player! Oh, this'll be fun!", "Let's go, let's go! I'm wide awake!", "First game? I'll go easy. Kidding!"],
      greetAgain: ["You came back! Same order as last time?", "Rematch! I've had three espressos.", "Oh, it's you! Ready to lose again?"],
      pleased: ["Yay! Coffee's on you!", "Told you I'm on a roll!", "Fast and tasty!", "Order up!"],
      bigWin: ["WOW! That's my rent sorted!", "Did you see that?! I'm amazing!", "Double shot, extra large!"],
      lossRon: ["Oops, that one slipped.", "Aww, I really liked that tile...", "Wait, you were ready?!", "Okay, okay, my bad!"],
      lossBig: ["Ouch, ouch, ouch!", "That's like a month of tips!", "Noooo, my savings!"],
      lossTsumo: ["Hey, no fair drawing it yourself!", "Grr. Lucky hands.", "Again? Seriously?"],
      wallGame: ["Nobody? Boring!", "Shuffle faster, I'm ready!", "Everyone's so careful today..."],
      idle: ["Hellooo? The tiles won't bite.", "Take your time... but not too much!", "Should I make you a coffee meanwhile?"],
      riichi: ["Riichi! Let's go, let's go!", "Here comes the good part!", "Riichi! No brakes!"],
      playerRiichi: ["Riichi? Who cares, I'm pushing!", "Ooh, scary! ...Anyway.", "You think that scares me?"],
      call: ["Pon! Gimme!", "Mine, mine!", "Chi! Faster, faster!"],
      lastPlace: ["Last place? No problem, I just need one big win!", "Okay! Full throttle, last hand!"],
      matchWin: ["I WON! Free coffee for everyone! ...Not really.", "First! Told you!", "Speed wins!"],
      matchLose: ["Last? Hmph. Rematch tomorrow!", "Too fast again, huh..."],
      defeated: ["You're good! Okay, the coffee's on me.", "No way! Teach me that!"],
    },
    ru: {
      greet: ["Привет-привет! Проигравший платит за кофе!", "Новый игрок! Ой, будет весело!", "Поехали, поехали! Я бодрая!", "Первая игра? Я буду помягче. Шучу!"],
      greetAgain: ["Ты вернулся! Как в прошлый раз?", "Реванш! Я выпила три эспрессо.", "О, это ты! Готов снова проиграть?"],
      pleased: ["Ура! Кофе за твой счёт!", "Говорила же, мне везёт!", "Быстро и вкусно!", "Заказ готов!"],
      bigWin: ["ВАУ! Аренда на месяц оплачена!", "Видели?! Я гениальна!", "Двойная порция, большой стакан!"],
      lossRon: ["Ой, этот я зря сбросила.", "Эх, а мне так нравился этот тайл...", "Подожди, ты был в темпае?!", "Ладно-ладно, моя ошибка!"],
      lossBig: ["Ай-ай-ай!", "Это же мои чаевые за месяц!", "Не-е-ет, мои сбережения!"],
      lossTsumo: ["Эй, сам себе вытянул — нечестно!", "Ррр. Везунчик.", "Опять? Серьёзно?"],
      wallGame: ["Никто? Скукота!", "Мешай быстрее, я готова!", "Все сегодня такие осторожные..."],
      idle: ["Ау? Тайлы не кусаются.", "Не торопись... но и не засыпай!", "Сделать тебе кофе, пока думаешь?"],
      riichi: ["Риичи! Поехали!", "Сейчас будет самое интересное!", "Риичи! Без тормозов!"],
      playerRiichi: ["Риичи? Да какая разница, я иду!", "Ой, страшно! ...Ну и ладно.", "Думаешь, меня это напугает?"],
      call: ["Пон! Давай сюда!", "Моё, моё!", "Чи! Быстрее, быстрее!"],
      lastPlace: ["Последняя? Ерунда, мне нужна всего одна большая рука!", "Так! Полный газ, последняя раздача!"],
      matchWin: ["Я ПОБЕДИЛА! Всем бесплатный кофе! ...Нет, шучу.", "Первая! Говорила же!", "Скорость решает!"],
      matchLose: ["Последняя? Хм. Завтра реванш!", "Опять слишком быстро, да..."],
      defeated: ["Ты крутой! Ладно, кофе за мой счёт.", "Не может быть! Научи меня так же!"],
    },
  },
  bonds: {
    kaede: {
      en: {
        greet: ["Kaede! Did you bring my coffee beans?", "Kaede's here! No speeding at the table!"],
        lostTo: ["Kaede! You overtook me again!", "Ugh, Kaede, not you!"],
      },
      ru: {
        greet: ["Каэдэ! Ты привезла мои зёрна?", "Каэдэ здесь! За столом без превышения скорости!"],
        lostTo: ["Каэдэ! Опять ты меня обогнала!", "Ну, Каэдэ, только не ты!"],
      },
    },
    akane: {
      en: {
        greet: ["Akane! Café versus izakaya, round two!", "Akane, your miso soup is still no match for my latte."],
        lostTo: ["Akane! That was totally overcooked luck.", "Fine, Akane, your kitchen wins today."],
      },
      ru: {
        greet: ["Аканэ! Кафе против идзакаи, второй раунд!", "Аканэ, твой мисо-суп всё равно не сравнится с моим латте."],
        lostTo: ["Аканэ! Это было пережаренное везение.", "Ладно, Аканэ, сегодня твоя кухня победила."],
      },
    },
  },
};
