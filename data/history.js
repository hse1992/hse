// What was happening in the year a run through the programmes would have to
// start. The years were written down for the reporting year: one entry for
// every year the studies section could land on then.
//
// The section counts back from today, so those years move by one with every
// new year, and an exact entry is only there while the calendar agrees. When
// it does not, the section takes the closest event and names the year it
// happened in instead of saying «тогда» — see eventOf() in viz/study.js. New
// entries are worth adding whenever the programme counts are updated.
//
// `art` is the inside of a 64 × 64 SVG. Colours come from the --ill-* tokens,
// so the drawings stay part of the page palette.

export const HISTORY = {
  1114: {
    text: 'в Ладоге заложили первую на Руси каменную крепость',
    art: `<rect x="8" y="30" width="48" height="26" fill="var(--ill-stone)"/>
      <rect x="4" y="20" width="15" height="36" fill="var(--ill-light)"/>
      <rect x="45" y="20" width="15" height="36" fill="var(--ill-light)"/>
      <rect x="4" y="15" width="4" height="5" fill="var(--ill-stone)"/>
      <rect x="9.5" y="15" width="4" height="5" fill="var(--ill-stone)"/>
      <rect x="15" y="15" width="4" height="5" fill="var(--ill-stone)"/>
      <rect x="45" y="15" width="4" height="5" fill="var(--ill-stone)"/>
      <rect x="50.5" y="15" width="4" height="5" fill="var(--ill-stone)"/>
      <rect x="56" y="15" width="4" height="5" fill="var(--ill-stone)"/>
      <rect x="9.5" y="27" width="4" height="8" rx="2" fill="var(--ill-ink)"/>
      <rect x="50.5" y="27" width="4" height="8" rx="2" fill="var(--ill-ink)"/>
      <path d="M27 56V43a5 5 0 0 1 10 0v13z" fill="var(--ill-ink)"/>`
  },

  1164: {
    text: 'во Владимире достроили Золотые ворота',
    art: `<rect x="10" y="24" width="44" height="32" fill="var(--ill-light)"/>
      <rect x="8" y="52" width="48" height="4" fill="var(--ill-stone)"/>
      <path d="M23 56V41a9 9 0 0 1 18 0v15z" fill="var(--ill-ink)"/>
      <rect x="24" y="18" width="16" height="6" fill="var(--ill-stone)"/>
      <rect x="28" y="12" width="8" height="6" fill="var(--ill-stone)"/>
      <path d="M32 2c5 5 6 8 6 10H26c0-2 1-5 6-10z" fill="var(--ill-gold)"/>`
  },

  1210: {
    text: 'папа римский разрешил Франциску Ассизскому проповедовать вместе с братьями',
    art: `<path d="M4 46h34" stroke="var(--ill-warm)" stroke-width="3" stroke-linecap="round"/>
      <path d="M14 46c-2-6 2-9 7-9-1 5-3 8-7 9zM28 46c-2-6 2-9 7-9-1 5-3 8-7 9z" fill="var(--ill-green)"/>
      <ellipse cx="22" cy="34" rx="9" ry="7" fill="var(--ill-blue)"/>
      <circle cx="30" cy="28" r="5" fill="var(--ill-blue)"/>
      <path d="M35 28l6 2-6 2z" fill="var(--ill-gold)"/>
      <circle cx="31.5" cy="27" r="1.2" fill="var(--ill-light)"/>
      <path d="M13 32L4 28l6 9z" fill="var(--ill-blue)"/>
      <path d="M34 12c5-6 9-2 11 1 3-4 8-6 12-1-7 5-16 5-23 0z" fill="var(--ill-stone)"/>`
  },

  1252: {
    text: 'Александр Невский стал великим князем владимирским',
    art: `<path d="M18 24a14 14 0 0 1 28 0v20H18z" fill="var(--hse-blue)"/>
      <circle cx="32" cy="8" r="4" fill="var(--ill-gold)"/>
      <rect x="20" y="34" width="24" height="9" rx="3" fill="var(--ill-red)"/>
      <rect x="12" y="42" width="40" height="8" rx="2" fill="var(--ill-warm)"/>
      <rect x="14" y="50" width="6" height="8" fill="var(--ill-warm)"/>
      <rect x="44" y="50" width="6" height="8" fill="var(--ill-warm)"/>`
  },

  1260: {
    text: 'внук Чингисхана Хубилай стал великим ханом монголов',
    art: `<path d="M12 52V36c0-9 9-15 20-15s20 6 20 15v16z" fill="var(--ill-light)"/>
      <rect x="12" y="34" width="40" height="4" fill="var(--ill-stone)"/>
      <rect x="6" y="52" width="52" height="5" rx="2" fill="var(--ill-stone)"/>
      <path d="M27 52V40h10v12z" fill="var(--ill-ink)"/>
      <path d="M32 21V8" stroke="var(--ill-ink)" stroke-width="2"/>
      <path d="M33 8h13l-3.5 5 3.5 5H33z" fill="var(--ill-red)"/>`
  },

  1302: {
    text: 'Москва получила Переславль-Залесский — первую свою прибавку земель',
    art: `<rect x="6" y="32" width="14" height="22" fill="var(--ill-light)"/>
      <path d="M6 32l7-9 7 9z" fill="var(--ill-stone)"/>
      <rect x="42" y="20" width="18" height="34" fill="var(--ill-light)"/>
      <path d="M42 20l9-11 9 11z" fill="var(--hse-blue)"/>
      <rect x="4" y="54" width="56" height="4" rx="2" fill="var(--ill-stone)"/>
      <path d="M24 40h12" stroke="var(--ill-ink)" stroke-width="2.5"/>
      <path d="M38 40l-7-4v8z" fill="var(--ill-ink)"/>`
  },

  1348: {
    text: 'в Праге открыли Карлов университет — первый в Центральной Европе',
    art: `<path d="M14 56V26l18-14 18 14v30z" fill="var(--ill-light)"/>
      <rect x="8" y="54" width="48" height="4" fill="var(--ill-stone)"/>
      <path d="M20 46V36a4 4 0 0 1 8 0v10z" fill="var(--hse-blue)"/>
      <path d="M36 46V36a4 4 0 0 1 8 0v10z" fill="var(--hse-blue)"/>
      <path d="M28 56V48a4 4 0 0 1 8 0v8z" fill="var(--ill-ink)"/>
      <circle cx="32" cy="7" r="3" fill="var(--ill-gold)"/>`
  },

  1398: {
    text: 'на Белом озере монах Ферапонт основал монастырь, который потом расписал Дионисий',
    art: `<rect x="18" y="28" width="26" height="26" fill="var(--ill-light)"/>
      <rect x="27" y="20" width="8" height="8" fill="var(--ill-stone)"/>
      <path d="M31 8c6 6 7 9 7 12H24c0-3 1-6 7-12z" fill="var(--ill-gold)"/>
      <rect x="44" y="36" width="14" height="18" fill="var(--ill-light)"/>
      <rect x="49" y="31" width="5" height="5" fill="var(--ill-stone)"/>
      <path d="M51.5 24c3.5 3.5 4 5 4 7h-8c0-2 .5-3.5 4-7z" fill="var(--ill-gold)"/>
      <path d="M26 54V45a4 4 0 0 1 8 0v9z" fill="var(--ill-ink)"/>
      <path d="M8 58h48" stroke="var(--ill-stone)" stroke-width="3" stroke-linecap="round"/>`
  },

  1518: {
    text: 'в Москву приехал Максим Грек — переводить книги для великого князя',
    art: `<path d="M6 18h20a6 6 0 0 1 6 6v28a8 8 0 0 0-8-5H6z" fill="var(--ill-light)"/>
      <path d="M58 18H38a6 6 0 0 0-6 6v28a8 8 0 0 1 8-5h18z" fill="var(--ill-light)"/>
      <rect x="30" y="18" width="4" height="34" fill="var(--ill-stone)"/>
      <rect x="10" y="26" width="16" height="2.5" fill="var(--ill-stone)"/>
      <rect x="10" y="32" width="16" height="2.5" fill="var(--ill-stone)"/>
      <rect x="38" y="26" width="16" height="2.5" fill="var(--ill-stone)"/>
      <rect x="38" y="32" width="16" height="2.5" fill="var(--ill-stone)"/>
      <path d="M56 4c-10 4-16 12-18 22 10-2 16-10 18-22z" fill="var(--ill-gold)"/>`
  },

  1554: {
    text: 'англичане получили от Ивана Грозного первую грамоту на торговлю с Русью',
    art: `<rect x="30" y="14" width="4" height="38" fill="var(--ill-warm)"/>
      <path d="M18 58h28l-5-7H23z" fill="var(--ill-warm)"/>
      <circle cx="32" cy="12" r="4" fill="var(--ill-gold)"/>
      <path d="M10 20h44" stroke="var(--ill-ink)" stroke-width="3" stroke-linecap="round"/>
      <path d="M14 20v8M50 20v8" stroke="var(--ill-ink)" stroke-width="1.5"/>
      <path d="M4 28h20l-5 9H9z" fill="var(--ill-gold)"/>
      <path d="M40 28h20l-5 9h-10z" fill="var(--ill-stone)"/>`
  },

  1586: {
    text: 'в Сибири поставили Тюмень — первый русский город за Уралом',
    art: `<rect x="14" y="26" width="24" height="28" fill="var(--ill-warm)"/>
      <path d="M10 26L26 10l16 16z" fill="var(--ill-stone)"/>
      <path d="M14 34h24M14 42h24" stroke="var(--ill-light)" stroke-width="1.5"/>
      <path d="M22 54V44a4 4 0 0 1 8 0v10z" fill="var(--ill-ink)"/>
      <path d="M52 20l7 12H45zM52 30l9 14H43zM52 40l11 14H41z" fill="var(--ill-green)"/>
      <rect x="50" y="52" width="4" height="6" fill="var(--ill-warm)"/>`
  },

  1602: {
    text: 'Борис Годунов впервые отправил русских студентов учиться за границу',
    art: `<path d="M40 8v30" stroke="var(--ill-ink)" stroke-width="2"/>
      <path d="M42 10h16l-4 10 4 10H42z" fill="var(--ill-light)"/>
      <path d="M26 38h36l-7 9H33z" fill="var(--ill-warm)"/>
      <rect x="4" y="34" width="22" height="7" rx="2" fill="var(--hse-blue)"/>
      <rect x="6" y="43" width="20" height="7" rx="2" fill="var(--ill-red)"/>
      <rect x="3" y="52" width="24" height="7" rx="2" fill="var(--ill-gold)"/>`
  },

  1622: {
    text: 'во Франции родился Мольер',
    art: `<path d="M4 14h26v18c0 9-6 15-13 15S4 41 4 32z" fill="var(--ill-light)"/>
      <circle cx="11" cy="26" r="2.5" fill="var(--ill-ink)"/>
      <circle cx="23" cy="26" r="2.5" fill="var(--ill-ink)"/>
      <path d="M10 34c3 4 11 4 14 0" fill="none" stroke="var(--ill-ink)" stroke-width="2" stroke-linecap="round"/>
      <path d="M34 22h26v18c0 9-6 15-13 15s-13-6-13-15z" fill="var(--ill-gold)"/>
      <circle cx="41" cy="34" r="2.5" fill="var(--ill-ink)"/>
      <circle cx="53" cy="34" r="2.5" fill="var(--ill-ink)"/>
      <path d="M40 46c3-4 11-4 14 0" fill="none" stroke="var(--ill-ink)" stroke-width="2" stroke-linecap="round"/>`
  },

  1636: {
    text: 'в британских колониях в Америке основали Гарвардский колледж',
    art: `<path d="M32 12l28 12-28 12L4 24z" fill="var(--hse-blue)"/>
      <path d="M14 29v11c0 4 8 7 18 7s18-3 18-7V29l-18 8z" fill="var(--ill-light)"/>
      <path d="M56 26v14" stroke="var(--ill-gold)" stroke-width="2.5"/>
      <circle cx="56" cy="43" r="4" fill="var(--ill-gold)"/>`
  },

  1638: {
    text: 'отряд Ивана Москвитина отправился из Томска к Тихому океану',
    art: `<circle cx="32" cy="24" r="13" fill="var(--ill-gold)"/>
      <path d="M28 38h12l-3 6h-6z" fill="var(--ill-ink)"/>
      <path d="M34 26v12" stroke="var(--ill-ink)" stroke-width="1.5"/>
      <path d="M35 27h7l-2 4 2 4h-7z" fill="var(--ill-light)"/>
      <path d="M4 48c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0" fill="none" stroke="var(--ill-blue)" stroke-width="3" stroke-linecap="round"/>
      <path d="M4 57c5-4 9-4 14 0s9 4 14 0 9-4 14 0 9 4 14 0" fill="none" stroke="var(--ill-stone)" stroke-width="3" stroke-linecap="round"/>`
  },

  1650: {
    text: 'в Оксфорде открылась первая в Англии кофейня',
    art: `<ellipse cx="30" cy="54" rx="24" ry="5" fill="var(--ill-light)"/>
      <path d="M10 24h38v12c0 9-7 15-15 15h-8c-8 0-15-6-15-15z" fill="var(--ill-light)" stroke="var(--ill-stone)" stroke-width="2"/>
      <ellipse cx="29" cy="26" rx="18" ry="4.5" fill="var(--ill-warm)"/>
      <path d="M48 28c8 0 8 12 0 12" fill="none" stroke="var(--ill-stone)" stroke-width="4"/>
      <path d="M22 16c4-4-2-6 1-10M34 16c4-4-2-6 1-10" fill="none" stroke="var(--ill-stone)" stroke-width="2.5" stroke-linecap="round"/>`
  },

  1664: {
    text: 'англичане переименовали Новый Амстердам в Нью-Йорк',
    art: `<rect x="29" y="12" width="6" height="46" fill="var(--ill-warm)"/>
      <path d="M35 16h19l6 7-6 7H35z" fill="var(--ill-light)"/>
      <path d="M29 34H10l-6 7 6 7h19z" fill="var(--ill-stone)"/>
      <rect x="39" y="21" width="12" height="2.5" rx="1" fill="var(--ill-stone)"/>
      <rect x="14" y="39" width="11" height="2.5" rx="1" fill="var(--ill-light)"/>`
  },

  1670: {
    text: 'в Париже впервые сыграли «Мещанина во дворянстве» Мольера',
    art: `<rect x="20" y="12" width="24" height="44" fill="var(--ill-light)"/>
      <path d="M6 12h18c-5 14-5 30 0 44H6z" fill="var(--ill-red)"/>
      <path d="M58 12H40c5 14 5 30 0 44h18z" fill="var(--ill-red)"/>
      <rect x="2" y="6" width="60" height="6" rx="3" fill="var(--ill-gold)"/>
      <circle cx="24" cy="34" r="3" fill="var(--ill-gold)"/>
      <circle cx="40" cy="34" r="3" fill="var(--ill-gold)"/>`
  },

  1676: {
    text: 'на престол вступил царь Федор Алексеевич',
    art: `<path d="M16 44V30c0-9 7-16 16-16s16 7 16 16v14z" fill="var(--ill-gold)"/>
      <rect x="12" y="42" width="40" height="12" rx="6" fill="var(--ill-light)"/>
      <rect x="30" y="2" width="4" height="12" fill="var(--ill-gold)"/>
      <rect x="26" y="5" width="12" height="4" fill="var(--ill-gold)"/>
      <circle cx="24" cy="28" r="3" fill="var(--ill-light)"/>
      <circle cx="40" cy="28" r="3" fill="var(--ill-light)"/>
      <circle cx="32" cy="22" r="3" fill="var(--ill-light)"/>`
  },

  1690: {
    text: 'юный Петр I строил потешную флотилию на Плещеевом озере',
    art: `<path d="M32 6v34" stroke="var(--ill-ink)" stroke-width="2"/>
      <path d="M34 12l14 26H34z" fill="var(--ill-light)"/>
      <path d="M30 18L16 38h14z" fill="var(--ill-light)"/>
      <path d="M33 6h11l-3 3.5L44 13H33z" fill="var(--ill-red)"/>
      <path d="M10 40h44l-7 10H17z" fill="var(--ill-warm)"/>
      <path d="M4 56c5-4 9-4 14 0s9 4 14 0 9-4 14 0" fill="none" stroke="var(--ill-blue)" stroke-width="3" stroke-linecap="round"/>`
  },

  1704: {
    text: 'Петр I отчеканил серебряный рубль в сто копеек',
    art: `<circle cx="42" cy="42" r="13" fill="var(--ill-gold)"/>
      <circle cx="26" cy="28" r="21" fill="var(--ill-stone)"/>
      <circle cx="26" cy="28" r="16" fill="var(--ill-light)"/>
      <path d="M20 36V22h7a5 5 0 0 1 0 10h-9" fill="none" stroke="var(--ill-ink)" stroke-width="2.5" stroke-linecap="round"/>`
  },

  1706: {
    text: 'Петр I велел открыть в Москве первый в России госпиталь и лекарскую школу',
    art: `<path d="M14 34h30l-5 20H19z" fill="var(--ill-stone)"/>
      <rect x="9" y="29" width="40" height="6" rx="3" fill="var(--ill-light)"/>
      <path d="M40 8l8 7-16 18-8-7z" fill="var(--ill-warm)"/>
      <rect x="48" y="36" width="13" height="18" rx="3" fill="var(--hse-blue)"/>
      <rect x="51" y="29" width="7" height="7" rx="1" fill="var(--ill-stone)"/>
      <rect x="52" y="42" width="5" height="7" rx="1" fill="var(--ill-light)"/>`
  },

  1718: {
    text: 'Петр I ввел ассамблеи — первые в России светские вечера',
    art: `<path d="M22 56h20l-5-7H27z" fill="var(--ill-gold)"/>
      <rect x="30" y="28" width="4" height="22" fill="var(--ill-gold)"/>
      <path d="M14 32c0-9 9-9 18-9s18 0 18 9" fill="none" stroke="var(--ill-gold)" stroke-width="3"/>
      <rect x="11" y="20" width="6" height="13" rx="2" fill="var(--ill-light)"/>
      <rect x="29" y="14" width="6" height="13" rx="2" fill="var(--ill-light)"/>
      <rect x="47" y="20" width="6" height="13" rx="2" fill="var(--ill-light)"/>
      <path d="M14 20c0-3 3-4 3-7 2 3 3 4 3 7z" fill="var(--ill-red)"/>
      <path d="M32 14c0-3 3-4 3-7 2 3 3 4 3 7z" fill="var(--ill-red)"/>
      <path d="M50 20c0-3 3-4 3-7 2 3 3 4 3 7z" fill="var(--ill-red)"/>`
  },

  1742: {
    text: 'Семен Челюскин дошел до самой северной точки Евразии',
    art: `<rect x="0" y="48" width="64" height="10" fill="var(--ill-blue)"/>
      <path d="M2 50l12-11 9 6 11-10 10 8 12-6 6 5v8H2z" fill="var(--ill-light)"/>
      <path d="M32 42V10" stroke="var(--ill-ink)" stroke-width="2.5"/>
      <path d="M34 10h16l-4 6 4 6H34z" fill="var(--ill-red)"/>`
  },

  1792: {
    text: 'Карамзин напечатал «Бедную Лизу» — повесть, над которой плакала вся Россия',
    art: `<rect x="14" y="8" width="38" height="46" rx="3" fill="var(--ill-red)"/>
      <rect x="14" y="8" width="8" height="46" rx="3" fill="var(--ill-ink)"/>
      <rect x="50" y="12" width="5" height="38" rx="2" fill="var(--ill-light)"/>
      <path d="M36 44c-8-5-12-9-12-14a6 6 0 0 1 12-3 6 6 0 0 1 12 3c0 5-4 9-12 14z" fill="var(--ill-light)"/>`
  },

  1838: {
    text: 'Борис Якоби провел по Неве первое в мире судно с электромотором',
    art: `<path d="M36 2l-12 18h8l-5 12 14-18h-8z" fill="var(--ill-gold)"/>
      <rect x="22" y="32" width="18" height="10" rx="2" fill="var(--hse-blue)"/>
      <path d="M8 42h48l-8 10H16z" fill="var(--ill-light)"/>
      <path d="M4 56c5-4 9-4 14 0s9 4 14 0 9-4 14 0" fill="none" stroke="var(--ill-blue)" stroke-width="3" stroke-linecap="round"/>`
  },

  1874: {
    text: 'Мусоргский написал «Картинки с выставки»',
    art: `<rect x="5" y="12" width="54" height="40" rx="3" fill="var(--ill-gold)"/>
      <rect x="11" y="18" width="42" height="28" fill="var(--ill-light)"/>
      <circle cx="21" cy="26" r="4.5" fill="var(--ill-gold)"/>
      <path d="M11 46l13-14 8 8 9-11 12 17z" fill="var(--ill-green)"/>
      <rect x="26" y="52" width="12" height="4" rx="2" fill="var(--ill-stone)"/>`
  },

  1880: {
    text: 'в Москве открыли памятник Пушкину',
    art: `<circle cx="32" cy="14" r="7" fill="var(--ill-stone)"/>
      <path d="M21 40V32c0-6 5-11 11-11s11 5 11 11v8z" fill="var(--hse-blue)"/>
      <rect x="18" y="40" width="28" height="12" fill="var(--ill-stone)"/>
      <rect x="12" y="52" width="40" height="6" rx="2" fill="var(--ill-light)"/>`
  },

  1888: {
    text: 'Чайковский написал Пятую симфонию',
    art: `<rect x="4" y="14" width="56" height="2.5" fill="var(--ill-stone)"/>
      <rect x="4" y="22" width="56" height="2.5" fill="var(--ill-stone)"/>
      <rect x="4" y="30" width="56" height="2.5" fill="var(--ill-stone)"/>
      <rect x="4" y="38" width="56" height="2.5" fill="var(--ill-stone)"/>
      <ellipse cx="22" cy="44" rx="9" ry="6.5" fill="var(--hse-blue)"/>
      <ellipse cx="46" cy="38" rx="9" ry="6.5" fill="var(--hse-blue)"/>
      <rect x="28" y="12" width="3.5" height="34" fill="var(--hse-blue)"/>
      <rect x="52" y="6" width="3.5" height="34" fill="var(--hse-blue)"/>
      <path d="M28 12h27.5v7H28z" fill="var(--hse-blue)"/>`
  },

  1906: {
    text: 'в Таврическом дворце собралась первая Государственная дума',
    art: `<path d="M2 24 32 6l30 18z" fill="var(--ill-light)"/>
      <rect x="6" y="26" width="52" height="5" fill="var(--ill-stone)"/>
      <rect x="10" y="31" width="7" height="19" fill="var(--ill-light)"/>
      <rect x="22" y="31" width="7" height="19" fill="var(--ill-light)"/>
      <rect x="35" y="31" width="7" height="19" fill="var(--ill-light)"/>
      <rect x="47" y="31" width="7" height="19" fill="var(--ill-light)"/>
      <rect x="4" y="50" width="56" height="6" rx="2" fill="var(--ill-stone)"/>`
  },

  1922: {
    text: 'на карте появился Советский Союз',
    art: `<rect x="10" y="6" width="4" height="52" rx="2" fill="var(--ill-ink)"/>
      <path d="M14 10h40c-5 8-5 16 0 24H14z" fill="var(--ill-red)"/>
      <polygon points="36,12 37.9,17.4 43.6,17.5 39,21 40.7,26.5 36,23.2 31.3,26.5 33,21 28.4,17.5 34.1,17.4" fill="var(--ill-gold)"/>`
  },

  1930: {
    text: 'в СССР ввели всеобщее начальное обучение — в школу пошли все дети',
    art: `<path d="M24 22v-4a8 8 0 0 1 16 0v4" fill="none" stroke="var(--ill-ink)" stroke-width="3"/>
      <rect x="6" y="22" width="52" height="30" rx="5" fill="var(--ill-warm)"/>
      <path d="M6 27a5 5 0 0 1 5-5h42a5 5 0 0 1 5 5v7H6z" fill="var(--hse-blue)"/>
      <rect x="27" y="30" width="10" height="8" rx="2" fill="var(--ill-gold)"/>`
  },

  1942: {
    text: 'на экраны вышел мультфильм «Бэмби»',
    art: `<ellipse cx="15" cy="18" rx="6" ry="8" transform="rotate(-25 15 18)" fill="var(--ill-warm)"/>
      <ellipse cx="49" cy="18" rx="6" ry="8" transform="rotate(25 49 18)" fill="var(--ill-warm)"/>
      <ellipse cx="32" cy="34" rx="14" ry="15" fill="var(--ill-warm)"/>
      <ellipse cx="32" cy="45" rx="7.5" ry="6" fill="var(--ill-light)"/>
      <ellipse cx="32" cy="42" rx="2.6" ry="2" fill="var(--ill-ink)"/>
      <circle cx="25" cy="31" r="2.4" fill="var(--ill-ink)"/>
      <circle cx="39" cy="31" r="2.4" fill="var(--ill-ink)"/>
      <circle cx="21" cy="22" r="2" fill="var(--ill-light)"/>
      <circle cx="43" cy="22" r="2" fill="var(--ill-light)"/>`
  },

  1944: {
    text: 'в новогоднюю ночь по радио впервые прозвучал новый гимн страны',
    art: `<rect x="8" y="20" width="46" height="32" rx="5" fill="var(--ill-warm)"/>
      <circle cx="25" cy="36" r="10" fill="var(--ill-ink)"/>
      <circle cx="25" cy="36" r="4" fill="var(--ill-stone)"/>
      <circle cx="45" cy="30" r="4.5" fill="var(--ill-gold)"/>
      <rect x="38" y="40" width="14" height="5" rx="2.5" fill="var(--ill-light)"/>
      <path d="M45 20v-9" stroke="var(--ill-ink)" stroke-width="2"/>
      <path d="M49 6a10 10 0 0 1 7 7M52 2a15 15 0 0 1 10 10" fill="none" stroke="var(--ill-gold)" stroke-width="2" stroke-linecap="round"/>`
  },

  1958: {
    text: 'Борис Пастернак получил Нобелевскую премию по литературе',
    art: `<path d="M4 14h20a4 4 0 0 1 4 4v30a6 6 0 0 0-6-4H4z" fill="var(--hse-blue)"/>
      <path d="M28 18a4 4 0 0 1 4-4h4v34h-4a6 6 0 0 0-4 2z" fill="var(--ill-light)"/>
      <path d="M38 8h14l-3 12H41z" fill="var(--ill-red)"/>
      <circle cx="45" cy="38" r="14" fill="var(--ill-gold)"/>
      <circle cx="45" cy="38" r="8" fill="var(--ill-light)" opacity="0.45"/>`
  },

  1972: {
    text: 'сборная СССР сыграла с канадцами хоккейную Суперсерию',
    art: `<path d="M16 6h7v34h22v7H16z" fill="var(--ill-warm)"/>
      <path d="M23 40h22v7H23z" fill="var(--ill-ink)"/>
      <ellipse cx="52" cy="50" rx="9" ry="5" fill="var(--ill-ink)"/>
      <ellipse cx="52" cy="47" rx="9" ry="5" fill="var(--ill-stone)"/>`
  },

  1976: {
    text: 'станция «Луна-24» привезла на Землю лунный грунт',
    art: `<circle cx="48" cy="14" r="12" fill="var(--ill-stone)"/>
      <circle cx="44" cy="10" r="3" fill="var(--ill-light)"/>
      <circle cx="52" cy="18" r="2" fill="var(--ill-light)"/>
      <path d="M10 34h32l-5 14H15z" fill="var(--ill-light)"/>
      <rect x="20" y="22" width="12" height="12" rx="3" fill="var(--hse-blue)"/>
      <path d="M14 48l-6 8M38 48l6 8" stroke="var(--ill-ink)" stroke-width="3" stroke-linecap="round"/>
      <path d="M26 22v-8" stroke="var(--ill-ink)" stroke-width="2"/>
      <circle cx="26" cy="11" r="3.5" fill="var(--ill-gold)"/>
      <path d="M2 58h60" stroke="var(--ill-stone)" stroke-width="3" stroke-linecap="round"/>`
  },

  1984: {
    text: 'Светлана Савицкая первой из женщин вышла в открытый космос',
    art: `<circle cx="30" cy="30" r="19" fill="var(--ill-light)"/>
      <path d="M17 27a13 13 0 0 1 26 0v5a13 13 0 0 1-26 0z" fill="var(--hse-blue)"/>
      <path d="M22 26a8 8 0 0 1 7-4" fill="none" stroke="var(--ill-gold)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M48 40c9 5 12 10 12 18" fill="none" stroke="var(--ill-stone)" stroke-width="2.5"/>
      <circle cx="10" cy="8" r="2" fill="var(--ill-gold)"/>
      <circle cx="54" cy="10" r="2.5" fill="var(--ill-gold)"/>
      <circle cx="58" cy="26" r="1.8" fill="var(--ill-gold)"/>`
  },

  1990: {
    text: 'Россия приняла Декларацию о государственном суверенитете',
    art: `<rect x="10" y="6" width="4" height="52" rx="2" fill="var(--ill-ink)"/>
      <rect x="14" y="12" width="40" height="10" fill="var(--card)"/>
      <rect x="14" y="22" width="40" height="10" fill="var(--ill-blue)"/>
      <rect x="14" y="32" width="40" height="10" fill="var(--ill-red)"/>
      <rect x="14" y="12" width="40" height="30" fill="none" stroke="var(--ill-stone)" stroke-width="1"/>`
  },

  1998: {
    text: 'на орбиту отправился первый модуль будущей МКС — российская «Заря»',
    art: `<rect x="22" y="26" width="20" height="15" rx="7" fill="var(--ill-light)"/>
      <rect x="30" y="17" width="5" height="9" fill="var(--ill-stone)"/>
      <rect x="2" y="28" width="18" height="11" rx="1.5" fill="var(--hse-blue)"/>
      <rect x="44" y="28" width="18" height="11" rx="1.5" fill="var(--hse-blue)"/>
      <path d="M8 28v11M14 28v11M50 28v11M56 28v11" stroke="var(--ill-light)" stroke-width="1.2"/>
      <circle cx="12" cy="10" r="2.2" fill="var(--ill-gold)"/>
      <circle cx="52" cy="12" r="2.8" fill="var(--ill-gold)"/>
      <circle cx="34" cy="52" r="2" fill="var(--ill-gold)"/>`
  },

  2012: {
    text: 'во Владивостоке открыли Русский мост — самый большой вантовый в мире',
    art: `<path d="M16 42V8M48 42V8" stroke="var(--ill-stone)" stroke-width="4" stroke-linecap="round"/>
      <path d="M16 10L2 40M16 10l14 30M48 10l14 30M48 10L34 40" fill="none" stroke="var(--ill-stone)" stroke-width="1.5"/>
      <rect x="0" y="40" width="64" height="6" fill="var(--ill-light)"/>
      <path d="M4 56c5-4 9-4 14 0s9 4 14 0 9-4 14 0" fill="none" stroke="var(--ill-blue)" stroke-width="3" stroke-linecap="round"/>`
  }
};
