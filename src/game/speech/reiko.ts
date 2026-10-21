import type { HeroineSpeech } from "./types";

export const reiko: HeroineSpeech = {
  chatty: 0.55,
  story: {
    en: "Runs a team of thirty and treats every evening at the table as a well-planned sprint. Keeps her phone face down, her tea hot and her deadlines met. Has never once missed a release date.",
    ru: "Руководит командой из тридцати человек и относится к каждому вечеру за столом как к хорошо спланированному спринту. Телефон экраном вниз, чай горячий, сроки соблюдены. Ни разу не сорвала дату релиза.",
  },
  playstyle: {
    en: "Patient and strategic: builds steadily, waits for her moment and is ruthless once it comes.",
    ru: "Терпеливая и стратегичная: строит руку спокойно, ждёт своего момента и беспощадна, когда он наступает.",
  },
  lines: {
    en: {
      greet: ["Good evening. Let's keep this on schedule.", "Agenda: four players, one winner.", "A new stakeholder. Welcome.", "Phones away. Let's begin."],
      greetAgain: ["Follow-up meeting. Good.", "I reviewed our last match. Let's go.", "You're back. I've planned for that."],
      pleased: ["Delivered on schedule.", "That's how a project closes.", "Milestone reached.", "Approved."],
      bigWin: ["Ahead of schedule and under budget.", "That's a bonus for the whole team.", "Executed perfectly."],
      lossRon: ["A risk I accepted. Moving on.", "I'll add that to the retrospective.", "Scope creep. My mistake.", "Lesson learned."],
      lossBig: ["That blew the whole budget.", "...I need a coffee.", "Escalating that to myself."],
      lossTsumo: ["Outside my control. Annoying.", "Well executed.", "Unplanned, but fine."],
      wallGame: ["No result. Reschedule.", "A draw is still a status update.", "Carried over to next sprint."],
      idle: ["Do you need more time for this decision?", "Let's keep the meeting short.", "I'll block out five more minutes."],
      riichi: ["Riichi. Final stage.", "Commit and ship.", "Riichi. Deadline's now."],
      playerRiichi: ["Risk identified. Mitigating.", "Riichi? Let's see if you deliver.", "Noted. Adjusting priorities."],
      call: ["Pon. Speeding up delivery.", "Chi. Cutting scope.", "I'll take that dependency."],
      lastPlace: ["Behind schedule. Crunch time.", "Last hand. Time to deliver."],
      matchWin: ["Project closed. First place.", "On time, on budget, on top.", "Good work, everyone. Especially me."],
      matchLose: ["Last. I'll schedule a post-mortem.", "Not my best quarter."],
      defeated: ["You delivered. I respect that.", "Well managed. I'd hire you."],
    },
    ru: {
      greet: ["Добрый вечер. Давайте уложимся в график.", "Повестка: четыре игрока, один победитель.", "Новый участник проекта. Добро пожаловать.", "Телефоны убрать. Начинаем."],
      greetAgain: ["Повторная встреча. Хорошо.", "Я разобрала нашу прошлую партию. Поехали.", "Ты вернулся. Я это заложила в план."],
      pleased: ["Сдано точно в срок.", "Вот так закрываются проекты.", "Этап пройден.", "Согласовано."],
      bigWin: ["Раньше срока и дешевле бюджета.", "Это премия для всей команды.", "Исполнено безупречно."],
      lossRon: ["Риск был принят. Идём дальше.", "Внесу это в ретроспективу.", "Разрослись требования. Моя ошибка.", "Урок усвоен."],
      lossBig: ["Это съело весь бюджет.", "...Мне нужен кофе.", "Эскалирую это самой себе."],
      lossTsumo: ["От меня не зависело. Досадно.", "Чисто сработано.", "Незапланированно, но ладно."],
      wallGame: ["Результата нет. Переносим.", "Ничья — тоже статус.", "Переносим на следующий спринт."],
      idle: ["Тебе нужно больше времени на решение?", "Давай не затягивать совещание.", "Выделю ещё пять минут."],
      riichi: ["Риичи. Финальный этап.", "Фиксируем и выпускаем.", "Риичи. Дедлайн — сейчас."],
      playerRiichi: ["Риск выявлен. Снижаю.", "Риичи? Посмотрим, как ты сдашь проект.", "Принято. Меняю приоритеты."],
      call: ["Пон. Ускоряю поставку.", "Чи. Урезаю объём.", "Беру эту зависимость на себя."],
      lastPlace: ["Отстаём от графика. Аврал.", "Последняя раздача. Пора сдавать."],
      matchWin: ["Проект закрыт. Первое место.", "В срок, в бюджет, на вершине.", "Всем спасибо за работу. Особенно мне."],
      matchLose: ["Последняя. Назначу разбор полётов.", "Не лучший мой квартал."],
      defeated: ["Ты справился. Уважаю.", "Хорошо управляешь игрой. Я бы тебя наняла."],
    },
  },
  bonds: {
    rin: {
      en: {
        greet: ["Kurosawa. If this is about the budget, not now.", "Rin. I'll sign the expense report after this."],
        lostTo: ["Rin. You counted that, didn't you.", "Fine, Rin. Put it on my department."],
      },
      ru: {
        greet: ["Куросава. Если это про бюджет — не сейчас.", "Рин. Авансовый отчёт подпишу после игры."],
        lostTo: ["Рин. Ты это просчитала, да?", "Хорошо, Рин. Запиши на мой отдел."],
      },
    },
  },
};
