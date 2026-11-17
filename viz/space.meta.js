// Что каркас знает о разделе «Космос» до того, как тот загружен: заголовок,
// подзаголовок, число шагов, переходы. Каркас берет это при старте
// (index.html), а сама картинка — viz/space.js — грузится по требованию,
// когда читатель к разделу подходит. Поэтому здесь только строки и числа и
// ни одного импорта: иначе с ними вернулось бы в начальную загрузку то, ради
// чего раздел вынесен.
//
// Сам модуль берет meta отсюда же и отдает дальше — второй копии нет.

export const meta = {
  id: 'space',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Космос',
  // The block opens on one sentence alone, and the card of the section comes
  // in over it a beat later — see the lead-in screen in lib/page.js.
  lead: {
    // The phrase goes and the card comes in its place in the one movement:
    // a beat with the card standing alone in the middle would show nothing
    // the beat before and the beat after do not.
    together: true,
    // Up rather than aside: the phrase is about reaching the orbit, so it
    // leaves the way the block goes — and the card rises from below with the
    // planet instead of sliding in from the side.
    exit: 'up',
    // Two lines by design, and the break is chosen rather than left to the
    // width of the window. Set inline, not from the stylesheet of the module:
    // the shell measures the lead-in to decide whether it fits, and it does
    // that before the block is built. Left to the stylesheet, the two lines
    // are measured as one long one, judged not to fit, and the whole screen
    // is set a quarter smaller than every other lead-in on the page.
    // The second line is picked out the way the page picks out what a screen
    // turns on — только наоборот: плашка цвета карточки, буквы корпоративные
    // синие. Небо этой главы лежит на всю секцию, и синяя плашка на нем
    // пропадала; белая на черном читается как выделение, а на белой странице
    // от нее остаются просто синие буквы — то есть экран верен и в том
    // случае, если каркас показал его раньше, чем блок собрался и принес
    // свое небо. Выделение
    // идет по тексту, а не коробкой: на телефоне фраза сама переносится на две
    // строки, и коробке в fit-content доставалась ширина самой длинной из них —
    // под коротким «орбиты» синее поле тянулось до правого края. Строчное с
    // box-decoration-break: clone дает каждой строке свою плашку по словам.
    // Перенос перед выделением — тегом, а не стилем: строчное выделение иначе
    // встало бы сразу за запятой.
    // Строки идут просторнее обычного: плашка строчная, ее поля сверху и снизу
    // наслаиваются на соседние строки — воздух под них дает межстрочие.
    value: '<span style="display: block; white-space: normal; line-height: 1.45">Вышка настолько большая,<br>'
      + '<span style="padding: 0.1em 0.26em; border-radius: 0.22em;'
      + ' -webkit-box-decoration-break: clone; box-decoration-break: clone;'
      + ' background: var(--card); color: var(--hse-blue)">что достает даже до орбиты</span>'
      + '</span>',
    text: ''
  },
  title: 'Вышка — просто космос!',
  // Phrasing content: the shell puts it inside a <p>.
  subtitle: 'Запустили уже <span class="space-mark">три своих спутника</span>',
  intro: true,
  // The empty Earth arrives with the block, then one satellite a beat, a
  // beat for the one still flying, and the last one for the picture it takes.
  // На широком экране снимок — свой такт: спутник доворачивается к Вышке и
  // ждет, а снимает следующее движение колеса или кнопка «Снять Вышку со
  // спутника». На телефоне снимает только кнопка, и такта для снимка там нет.
  steps: window.matchMedia('(max-width: 860px)').matches ? 6 : 7,
  opensOnStep: true,
  // The block ends on a photograph about to be taken, and the next one comes
  // in the flash of it — the shell draws the flash, see «Вспышка на стыке».
  flash: true
};
