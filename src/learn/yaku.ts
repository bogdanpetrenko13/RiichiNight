import type { Lang } from "../i18n/strings";

export interface YakuInfo {
  id: string;
  name: Record<Lang, string>;
  ja: string;
  /** Han with a closed hand. */
  closed: number;
  /** Han with an open hand; null = closed hands only. */
  open: number | null;
  yakuman?: boolean;
  /** Situational yaku have no example hand. */
  example?: string;
  desc: Record<Lang, string>;
}

export type YakuGroup = { id: "1" | "2" | "3" | "6" | "yakuman"; items: YakuInfo[] };

// Example hands use the engine's notation: digits followed by the suit
// (m, p, s, z = honours 1-7: E S W N White Green Red). Spaces separate groups.
// tests/python/test_yaku_examples.py checks that every example is a complete
// 14-tile hand and that its listed yaku is really scored. The last tile is the
// winning tile (won by ron), so a triplet completed by it counts as open.
export const YAKU_GROUPS: YakuGroup[] = [
  {
    id: "1",
    items: [
      {
        id: "riichi",
        name: { en: "Riichi", ru: "Риичи" },
        ja: "立直",
        closed: 1,
        open: null,
        example: "123m 456p 789s 234s 55p",
        desc: {
          en: "Declare when your closed hand is one tile from winning. Costs a 1,000-point stick; after that you can only discard the tile you draw.",
          ru: "Объявляется, когда закрытой руке не хватает одного тайла. Стоит палочку в 1 000 очков; после этого можно сбрасывать только вытянутый тайл.",
        },
      },
      {
        id: "menzen_tsumo",
        name: { en: "Fully Concealed Tsumo", ru: "Мэндзэн цумо" },
        ja: "門前清自摸和",
        closed: 1,
        open: null,
        desc: {
          en: "Win by drawing the tile yourself with a fully closed hand.",
          ru: "Выигрыш самостоятельно вытянутым тайлом при полностью закрытой руке.",
        },
      },
      {
        id: "ippatsu",
        name: { en: "Ippatsu", ru: "Иппацу" },
        ja: "一発",
        closed: 1,
        open: null,
        desc: {
          en: "Win within one go-around after riichi, before anyone calls a tile.",
          ru: "Выигрыш в течение одного круга после риичи, пока никто не объявил вызов.",
        },
      },
      {
        id: "tanyao",
        name: { en: "All Simples", ru: "Таняо" },
        ja: "断么九",
        closed: 1,
        open: 1,
        example: "234m 567p 345s 678s 22p",
        desc: {
          en: "Only tiles 2-8: no terminals (1, 9) and no honours. Allowed open with the kuitan rule.",
          ru: "Только тайлы 2–8: без единиц, девяток и козырей. В открытой руке — если включён куитан.",
        },
      },
      {
        id: "pinfu",
        name: { en: "Pinfu", ru: "Пинфу" },
        ja: "平和",
        closed: 1,
        open: null,
        example: "123m 456m 789p 55s 234s",
        desc: {
          en: "Closed hand of four sequences, a non-value pair and a two-sided wait.",
          ru: "Закрытая рука из четырёх последовательностей, пары без ценности и двустороннего ожидания.",
        },
      },
      {
        id: "iipeikou",
        name: { en: "Pure Double Sequence", ru: "Иипейко" },
        ja: "一盃口",
        closed: 1,
        open: null,
        example: "112233m 456p 789s 55s",
        desc: {
          en: "Two identical sequences in the same suit, closed hand.",
          ru: "Две одинаковые последовательности одной масти в закрытой руке.",
        },
      },
      {
        id: "yakuhai",
        name: { en: "Value Tiles", ru: "Якухай" },
        ja: "役牌",
        closed: 1,
        open: 1,
        example: "777z 123m 456p 789s 11p",
        desc: {
          en: "A triplet of dragons, of the round wind or of your seat wind. Each counts separately.",
          ru: "Тройка драконов, ветра раунда или своего ветра. Каждая считается отдельно.",
        },
      },
      {
        id: "haitei",
        name: { en: "Under the Sea / River", ru: "Хайтей / Хотей" },
        ja: "海底 / 河底",
        closed: 1,
        open: 1,
        desc: {
          en: "Win on the very last tile of the wall, or on the discard after it.",
          ru: "Выигрыш последним тайлом стены или последним сбросом раздачи.",
        },
      },
      {
        id: "rinshan",
        name: { en: "After a Kan / Robbing a Kan", ru: "Риншан / Чанкан" },
        ja: "嶺上開花 / 槍槓",
        closed: 1,
        open: 1,
        desc: {
          en: "Win on the replacement tile after a kan, or on a tile someone adds to a pon.",
          ru: "Выигрыш добирающим тайлом после кана или тайлом, которым соперник достраивает пон до кана.",
        },
      },
    ],
  },
  {
    id: "2",
    items: [
      {
        id: "double_riichi",
        name: { en: "Double Riichi", ru: "Дабл риичи" },
        ja: "ダブル立直",
        closed: 2,
        open: null,
        desc: {
          en: "Riichi declared on your very first discard, before any call.",
          ru: "Риичи на самом первом сбросе, до любых вызовов.",
        },
      },
      {
        id: "chiitoitsu",
        name: { en: "Seven Pairs", ru: "Чиитойцу" },
        ja: "七対子",
        closed: 2,
        open: null,
        example: "11m 33m 55p 77p 22s 66s 44z",
        desc: {
          en: "Seven different pairs instead of sets.",
          ru: "Семь разных пар вместо сетов.",
        },
      },
      {
        id: "toitoi",
        name: { en: "All Triplets", ru: "Тойтой" },
        ja: "対々和",
        closed: 2,
        open: 2,
        example: "111m 444p 999m 22z 777s",
        desc: {
          en: "Four triplets (or kans) and a pair.",
          ru: "Четыре тройки (или кана) и пара.",
        },
      },
      {
        id: "sanankou",
        name: { en: "Three Concealed Triplets", ru: "Сананко" },
        ja: "三暗刻",
        closed: 2,
        open: 2,
        example: "222m 555p 888s 345s 77p",
        desc: {
          en: "Three triplets collected without calling.",
          ru: "Три тройки, собранные без вызовов.",
        },
      },
      {
        id: "sanshoku_doujun",
        name: { en: "Mixed Triple Sequence", ru: "Саншоку" },
        ja: "三色同順",
        closed: 2,
        open: 1,
        example: "123m 123p 123s 789m 55p",
        desc: {
          en: "The same sequence in all three suits.",
          ru: "Одинаковая последовательность во всех трёх мастях.",
        },
      },
      {
        id: "sanshoku_doukou",
        name: { en: "Triple Triplets", ru: "Саншоку доко" },
        ja: "三色同刻",
        closed: 2,
        open: 2,
        example: "333m 333p 333s 789s 55p",
        desc: {
          en: "The same triplet in all three suits.",
          ru: "Одинаковая тройка во всех трёх мастях.",
        },
      },
      {
        id: "ittsu",
        name: { en: "Pure Straight", ru: "Иццу" },
        ja: "一気通貫",
        closed: 2,
        open: 1,
        example: "123456789m 456p 11s",
        desc: {
          en: "1-2-3, 4-5-6 and 7-8-9 in one suit.",
          ru: "1-2-3, 4-5-6 и 7-8-9 одной масти.",
        },
      },
      {
        id: "chanta",
        name: { en: "Outside Hand", ru: "Чанта" },
        ja: "混全帯么九",
        closed: 2,
        open: 1,
        example: "123m 999p 789s 111z 99s",
        desc: {
          en: "Every set and the pair contain a terminal or an honour.",
          ru: "В каждом сете и в паре есть единица, девятка или козырь.",
        },
      },
      {
        id: "shousangen",
        name: { en: "Little Three Dragons", ru: "Сёсанген" },
        ja: "小三元",
        closed: 2,
        open: 2,
        example: "555z 666z 77z 123m 456p",
        desc: {
          en: "Two dragon triplets and a pair of the third dragon (plus the two value-tile han).",
          ru: "Две тройки драконов и пара третьего (плюс два хана за якухай).",
        },
      },
      {
        id: "honroutou",
        name: { en: "All Terminals and Honours", ru: "Хонрото" },
        ja: "混老頭",
        closed: 2,
        open: 2,
        example: "111m 999p 222z 77z 111s",
        desc: {
          en: "Only terminals and honours. Always comes with toitoi or seven pairs.",
          ru: "Только единицы, девятки и козыри. Всегда вместе с тойтоем или семью парами.",
        },
      },
      {
        id: "sankantsu",
        name: { en: "Three Kans", ru: "Санканцу" },
        ja: "三槓子",
        closed: 2,
        open: 2,
        desc: {
          en: "Three kans of any kind.",
          ru: "Три кана любого вида.",
        },
      },
    ],
  },
  {
    id: "3",
    items: [
      {
        id: "ryanpeikou",
        name: { en: "Twice Pure Double Sequence", ru: "Рянпейко" },
        ja: "二盃口",
        closed: 3,
        open: null,
        example: "112233m 778899p 55s",
        desc: {
          en: "Two pairs of identical sequences, closed hand.",
          ru: "Две пары одинаковых последовательностей в закрытой руке.",
        },
      },
      {
        id: "junchan",
        name: { en: "Terminal in Each Set", ru: "Джунчан" },
        ja: "純全帯么九",
        closed: 3,
        open: 2,
        example: "123m 789m 999p 123s 11s",
        desc: {
          en: "Every set and the pair contain a 1 or a 9; no honours.",
          ru: "В каждом сете и паре есть единица или девятка; козырей нет.",
        },
      },
      {
        id: "honitsu",
        name: { en: "Half Flush", ru: "Хонъицу" },
        ja: "混一色",
        closed: 3,
        open: 2,
        example: "234m 567m 999m 111z 33z",
        desc: {
          en: "One suit plus honours.",
          ru: "Одна масть плюс козыри.",
        },
      },
    ],
  },
  {
    id: "6",
    items: [
      {
        id: "chinitsu",
        name: { en: "Full Flush", ru: "Чинъицу" },
        ja: "清一色",
        closed: 6,
        open: 5,
        example: "123m 345m 567m 789m 99m",
        desc: {
          en: "The whole hand in one suit.",
          ru: "Вся рука одной масти.",
        },
      },
    ],
  },
  {
    id: "yakuman",
    items: [
      {
        id: "kokushi_musou",
        name: { en: "Thirteen Orphans", ru: "Кокуши мусо" },
        ja: "国士無双",
        closed: 13,
        open: null,
        yakuman: true,
        example: "119m 19p 19s 123456z 7z",
        desc: {
          en: "One of each terminal and honour, plus a pair of one of them.",
          ru: "По одному каждой единицы, девятки и козыря плюс пара одного из них.",
        },
      },
      {
        id: "suuankou",
        name: { en: "Four Concealed Triplets", ru: "Сууанко" },
        ja: "四暗刻",
        closed: 13,
        open: null,
        yakuman: true,
        example: "111m 333p 555s 777s 22z",
        desc: {
          en: "Four triplets collected without calls.",
          ru: "Четыре тройки, собранные без вызовов.",
        },
      },
      {
        id: "daisangen",
        name: { en: "Big Three Dragons", ru: "Дайсанген" },
        ja: "大三元",
        closed: 13,
        open: 13,
        yakuman: true,
        example: "555z 666z 777z 123m 44p",
        desc: {
          en: "Triplets of all three dragons.",
          ru: "Тройки всех трёх драконов.",
        },
      },
      {
        id: "shousuushi",
        name: { en: "Little Four Winds", ru: "Сёсууши" },
        ja: "小四喜",
        closed: 13,
        open: 13,
        yakuman: true,
        example: "111z 222z 333z 44z 123m",
        desc: {
          en: "Three wind triplets and a pair of the fourth wind.",
          ru: "Три тройки ветров и пара четвёртого ветра.",
        },
      },
      {
        id: "daisuushi",
        name: { en: "Big Four Winds", ru: "Дайсууши" },
        ja: "大四喜",
        closed: 13,
        open: 13,
        yakuman: true,
        example: "111z 222z 333z 444z 55m",
        desc: {
          en: "Triplets of all four winds.",
          ru: "Тройки всех четырёх ветров.",
        },
      },
      {
        id: "tsuuiisou",
        name: { en: "All Honours", ru: "Цуиисо" },
        ja: "字一色",
        closed: 13,
        open: 13,
        yakuman: true,
        example: "111z 222z 555z 666z 77z",
        desc: {
          en: "Only wind and dragon tiles.",
          ru: "Только ветра и драконы.",
        },
      },
      {
        id: "chinroutou",
        name: { en: "All Terminals", ru: "Чинрото" },
        ja: "清老頭",
        closed: 13,
        open: 13,
        yakuman: true,
        example: "111m 999m 111p 999p 11s",
        desc: {
          en: "Only 1s and 9s.",
          ru: "Только единицы и девятки.",
        },
      },
      {
        id: "ryuuiisou",
        name: { en: "All Green", ru: "Рюиисо" },
        ja: "緑一色",
        closed: 13,
        open: 13,
        yakuman: true,
        example: "234s 234s 666s 888s 66z",
        desc: {
          en: "Only green tiles: 2, 3, 4, 6, 8 of bamboo and the green dragon.",
          ru: "Только зелёные тайлы: 2, 3, 4, 6, 8 бамбука и зелёный дракон.",
        },
      },
      {
        id: "chuuren_poutou",
        name: { en: "Nine Gates", ru: "Чуурен поото" },
        ja: "九蓮宝燈",
        closed: 13,
        open: null,
        yakuman: true,
        example: "1112345567899m 9m",
        desc: {
          en: "1112345678999 in one suit plus any tile of that suit, closed.",
          ru: "1112345678999 одной масти плюс любой тайл этой масти, закрытая рука.",
        },
      },
      {
        id: "suukantsu",
        name: { en: "Four Kans", ru: "Сууканцу" },
        ja: "四槓子",
        closed: 13,
        open: 13,
        yakuman: true,
        desc: {
          en: "Four kans of any kind.",
          ru: "Четыре кана любого вида.",
        },
      },
      {
        id: "tenhou",
        name: { en: "Heavenly / Earthly Hand", ru: "Тенхо / Чихо" },
        ja: "天和 / 地和",
        closed: 13,
        open: null,
        yakuman: true,
        desc: {
          en: "The dealer wins on the deal itself, or a non-dealer wins on their first draw before any call.",
          ru: "Дилер выигрывает сразу после раздачи, или не-дилер — первым же тайлом до любых вызовов.",
        },
      },
    ],
  },
];

/** "123m 55p" -> ["1m","2m","3m","5p","5p"] (spaces kept as null separators). */
export function parseExample(text: string): (string | null)[] {
  const out: (string | null)[] = [];
  for (const group of text.split(" ")) {
    if (out.length) out.push(null);
    const suit = group[group.length - 1];
    for (const d of group.slice(0, -1)) out.push(`${d}${suit}`);
  }
  return out;
}
