// Countries HSE students come from, as a wall of flags split by part of the world.

import { CITIES, STUDENTS, FOREIGN } from '../data/hse.js';
import { COUNTRIES, REGIONS, BY_CITY } from '../data/countries.js';
import { nf, pct, plural } from '../lib/format.js';
import { onResize, toTop } from '../lib/ui.js';

// The world to compare against: 193 UN members plus 2 observer states, split
// by part of the world the same way the countries above are (UN M49, so the
// Caucasus, Turkey and Kazakhstan count as Asia).
const REGION_WORLD = { europe: 44, asia: 48, africa: 54, america: 35, oceania: 14 };
const WORLD = Object.values(REGION_WORLD).reduce((n, x) => n + x, 0);

const countries = (n) => plural(n, 'страна', 'страны', 'стран');

// Узкий экран решается один раз на загрузку: переходный экран собирается в
// meta, до всякого init, и смена ширины через границу страницу перезагружает.
const PHONE = window.matchMedia('(max-width: 860px)').matches;

// After «из» the numeral goes into the genitive: из 21 страны, но из 44 стран.
const countriesOf = (n) => plural(n, 'страны', 'стран', 'стран');

// Every country, by code — the flags are built from the regions, not the flat list.
const NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]));

// The screen before this section speaks of the students as a whole, rounded
// down to a round thousand: it is a scale, not a figure to be checked.
const STUDENTS_ROUND = Math.floor(STUDENTS / 1000) * 1000;

// The heading while the question stands. It is seen only where the page
// scrolls — on a wide screen the lead-in holds the top of the section then —
// and keeps the question in view while the reader answers it.
const ASK_TITLE = 'Из скольких стран?';
const ASK_SUBTITLE = 'Поставь метку на полосе';

export const meta = {
  id: 'world',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Страны',
  // На телефоне этот блок читается кадрами, а не прокруткой — как стадион,
  // см. «Чтение кадрами» в lib/stepper.js. История тут в два кадра: вопрос и
  // стена флагов, — и прокруткой она не рассказывалась вовсе. Своих остановок
  // блок каркасу не давал, так что один мах пальцем уводил с карточки с
  // догадкой прямо в следующий раздел, через голову всей стены: ответ блока
  // читатель не видел, если не догадался нажать кнопку. Кадрами же страница
  // останавливается на блоке, вопрос придерживает ход (`hold`), а с ответом
  // блок отдает себя читателю, и стена листается обычной прокруткой.
  taps: true,
  // Hands the reader over from the stadium: the whole student body first, and
  // then the part of it that brings the quotation on.
  // The question comes straight after the figure it is about, and it stays:
  // the screen goes up to the top of the section and reads as its heading
  // while the reader answers under it. How many countries there are is said
  // only once they have.
  // The question is picked out in corporate blue, the way the page picks out
  // what a screen turns on. Painted inline: the shell draws the lead-in before
  // the styles of the module arrive.
  //
  // На телефоне заливки у вопроса нет. Там строка вдвое уже, фраза переносится
  // на две строки, и синий прямоугольник разваливается на два куска поперек
  // экрана — рядом с красным «5 600+ иностранцев» это уже не выделение, а
  // пестрота. Вопрос там стоит отдельной строкой и выделен самим собой:
  // корпоративный синий, жирнее и крупнее соседней строки.
  //
  // Перенос и выделение заданы инлайном, а не стилями блока: каркас рисует
  // переходный экран до того, как приедет `init`, и строку, разбитую его
  // стилями, он обмеряет как одну длинную — решает, что она не влезает, и
  // уменьшает весь экран. См. «Что каркас рисует до сборки блока» в CLAUDE.md.
  lead: {
    exit: 'top',
    // The screen goes up and the scale comes up under it in the same beat:
    // there is nothing to wait for between a question and the place to answer.
    together: true,
    value: `На стадионе ${nf(STUDENTS_ROUND)}+ `
      + plural(STUDENTS_ROUND, 'студент', 'студента', 'студентов'),
    // The students from abroad in the colour they are picked out in on the
    // stadium the lead-in stands on.
    text: 'Из них <span class="world-ask" style="background: var(--foreign); color: var(--card)">'
      + `${nf(FOREIGN)}+ ${plural(FOREIGN, 'иностранец', 'иностранца', 'иностранцев')}</span>. `
      + (PHONE
        ? '<span class="world-ask-line" style="display: block; margin-top: 0.5em;'
          + ' color: var(--hse-blue); font-weight: 700; font-size: 1.12em">'
          + 'Как думаешь, из скольких стран?</span>'
        : '<span class="world-ask" style="background: var(--hse-blue); color: var(--card)">'
          + 'Как думаешь, из скольких стран?</span>')
  },
  // Pushkin himself closes the line, the way the scarf closes it on the
  // stadium: a slot shorter than the line holds the width, and the portrait
  // hangs out of it without pushing the line apart. The inline size holds
  // until the styles of the module arrive — the shell draws the heading a
  // moment earlier.
  title: '«Все флаги в гости будут к нам»'
    + '<span class="world-pushkin-slot" style="width: 1.25em">'
    + '<span class="world-pushkin"></span>'
    + '</span>',
  // The heading of the answer. While the question stands it is kept out of
  // sight — the quotation is the reply to the question, not its preface — and
  // it comes in with the answer; see «The heading» in init.
  subtitle: `У нас в гостях уже ${COUNTRIES.length} ${plural(COUNTRIES.length, 'флаг', 'флага', 'флагов')}`,
  // Opens with the lead-in screen and the title card, like the stadium does.
  intro: true,
  // Вопрос, ответ, стена — три кадра, и везде три.
  //
  // Ответ приходит на том же экране, где читатель ставил метку: крупное число
  // встает прямо над его догадкой, на той же шкале, и видно, насколько он
  // промахнулся. Стене достается свой кадр — с заголовком, счетом и флагами, —
  // и шкала к нему уходит: свое она сказала, а флагам ее полторы сотни
  // пикселей нужнее. Одним кадром ответ и стена приходили разом, и крупное
  // число терялось в приехавших под ним ста двадцати восьми флагах.
  steps: 3,
  opensOnStep: true
};

export function init(root) {
  'use strict';

  const GAP = 8;                  // gap between flags, px
  const HEAD = 21;                // a part-of-the-world caption with its gap, px
  // Gap between parts of the world. Wider than the gap between flags, so the
  // wall reads as five groups rather than one field — and as wide as it can be
  // for nothing: the flags are sized to whatever room is left, and up to here
  // there is enough of it for them to keep the size they would have had.
  const GROUP_GAP = 20;
  const TILE_MAX = 68;            // a flag never grows past this
  const TILE_MIN = 20;            // ...and never shrinks below it: the wall scrolls instead
  // На телефоне флаг — цель для пальца: по нему называют страну. Высота у
  // плитки 3/4 ширины, так что 34 дает 25 с половиной точек — выше того
  // порога в 24, ниже которого палец мимо цели не попадает. Место на это
  // освободилось от переключателей кампусов, которых на телефоне больше нет.
  const TILE_PHONE = 34;
  const phone = window.matchMedia('(max-width: 860px)');

  // ---------- Markup ----------
  // The wall of flags is specific to this visualisation, so its styles live
  // here and not in layout.css.
  root.innerHTML = `
    <style>
      /* The portrait at the end of the heading. It stands taller than the line
         it sits in, and a picture in the flow would push the whole line apart —
         which would drop the subtitle below where the lead-in screen puts its
         own. So it hangs out of a slot shorter than the line. */
      .world-pushkin-slot {
        display: inline-block;
        position: relative;
        width: 1.25em;
        height: 0.75em;
        margin-left: 0.16em;
        vertical-align: baseline;
      }

      /* Drawn as a mask so the profile takes the colour of the heading itself
         rather than staying flat black. */
      .world-pushkin {
        position: absolute;
        left: 0;
        bottom: -0.2em;
        width: 100%;
        aspect-ratio: 1;
        background: currentColor;
        -webkit-mask: url(assets/pushkin-profile.svg) center / contain no-repeat;
        mask: url(assets/pushkin-profile.svg) center / contain no-repeat;
      }

      /* Nothing on the wall is coloured by city, so the switches are plain green. */
      .world-city .toggle.on {
        background: var(--toggle-on);
      }

      /* Absolute, like the canvas in the other modules: a wall of flags must
         never push the card taller than the section, or the fit below would
         measure the height it has just caused itself. */
      .world-grid {
        position: absolute;
        inset: 0;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: ${GROUP_GAP}px;
        padding: 3px 2px;
      }

      .world-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .world-group-title {
        font-size: 0.7188rem;
        font-weight: 600;
        line-height: 15px;
        letter-spacing: 0.02em;
        color: var(--text-caption);
      }

      .world-group-title span {
        font-weight: 400;
        font-variant-numeric: tabular-nums;
      }

      .world-group-title b {
        font-weight: 600;
      }

      .world-group-flags {
        display: flex;
        flex-wrap: wrap;
        gap: ${GAP}px;
      }

      /* Flags keep a fixed order and never move — only their colour changes,
         so the eye can follow one country while the cities are switched. */
      /* The flag fills the tile exactly, so it is rounded off itself instead of
         being clipped by one: the wall is drawn for the first time on the frame
         it slides in, and 128 clipping layers are 128 things to do in it. */
      .world-tile {
        width: var(--tile, 40px);
        aspect-ratio: 4 / 3;
        border-radius: 3px;
        background: var(--shell);
        box-shadow: 0 0 0 1px rgba(16, 24, 40, 0.10);
        /* The delay is set per flag, so switching a city runs a wave across
           the wall instead of blinking all of it at once. */
        transition: opacity 260ms ease var(--d, 0ms),
                    filter 260ms ease var(--d, 0ms),
                    transform 140ms ease;
      }

      .world-tile img {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        object-fit: cover;
      }

      .world-tile.off {
        opacity: 0.2;
        filter: grayscale(1);
      }

      /* Под курсором флаг подрастает, под пальцем — тот, который назвали.
         Наведение при этом спрашивают: палец с флага его не уносит, и
         тронутый флаг оставался подросшим вместе с названным. */
      .world-tile.is-named {
        transform: scale(1.14);
      }

      @media (hover: hover) {
        .world-tile:hover {
          transform: scale(1.14);
        }
      }

      /* И с клавиатуры: флаг, на котором стоит читатель, подрастает так же —
         имя над ним приходит от фокуса, — и обводится, чтобы было видно, где
         он стоит. */
      .world-tile:focus-visible {
        outline: 2px solid var(--hse-blue);
        outline-offset: 2px;
      }

      /* Названный флаг стоит поверх соседей: подросший, он иначе уходит под
         тот, что нарисован после него. */
      .world-tile.is-named {
        position: relative;
        z-index: 2;
      }

      /* The name of the country under the cursor. The browser draws one of
         these itself for a title, but it waits about a second before it does
         and sets it in the type of the operating system — on a wall where the
         answer to «what is this flag» is the whole point, it has to come at
         once and be readable. One tip for the wall, moved to the flag under
         the cursor. */
      .world-tip {
        position: absolute;
        left: 0;
        top: 0;
        z-index: 3;
        padding: 5px 11px;
        border-radius: 999px;
        background: var(--hint-veil);
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
        box-shadow: var(--card-shadow);
        color: var(--text);
        font-size: 1rem;
        line-height: 1.2;
        white-space: nowrap;
        opacity: 0;
        transform: translateY(3px);
        /* The same 140ms the flag under it takes to grow. */
        transition: opacity 140ms ease, transform 140ms ease;
        pointer-events: none;
      }

      .world-tip.is-here {
        opacity: 1;
        transform: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .world-tip { transition: none; }
      }

      .world-score {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .world-score-value {
        font-size: 3.5rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .world-score-note {
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      /* One bar, one colour — the flags carry no city colour. It fills the way
         everything on the page appears: this is the answer coming in. */
      .world-bar-seg {
        background: var(--hse-blue);
        transition: width 620ms cubic-bezier(0.215, 0.61, 0.355, 1);
      }

      /* ---------- The guess ---------- */

      /* The bar is also the slider. Its hit area reaches above and below it,
         and the margin gives that room back, so the card keeps its height. */
      .world-scale {
        position: relative;
        padding: 9px 0;
        margin: -9px 0;
        cursor: pointer;
        touch-action: none;
      }

      .world-scale[aria-disabled="true"] {
        cursor: default;
      }

      /* Полоса набрана так же, как у вопроса в «Годах учебы»: два вопроса
         страницы читаются одинаково. Общий meter-bar из layout.css толще и
         темнее — он счетчик, а не шкала, по которой ставят метку, — так что
         здесь он переопределен на месте. */
      .world-scale .meter-bar {
        height: 10px;
        border-radius: 5px;
        background: var(--brand-grey-light);
      }

      .world-scale .world-bar-seg {
        border-radius: 5px;
      }

      /* Шкала сказала свое на кадре с ответом: крупное число встало прямо над
         меткой читателя, на той же полосе, где он ее ставил. Дальше экран
         принадлежит флагам, и шкала складывается, отдавая им свою высоту.
         Складывается, а не пропадает: такт играется на глазах, и в любой его
         точке картинка должна быть верной.
         Высота взята с запасом — из auto складывать нечего, а точную тут
         мерить незачем: кривая все равно доходит до нуля за свои 260мс. */
      .world-scale {
        max-height: 220px;
        transition: max-height 260ms ease, opacity 180ms ease;
      }

      /* Поля у шкалы уже погашены отрицательными отступами (см. выше), так
         что сложенная она не оставляет после себя ничего. */
      .world-walled .world-scale {
        max-height: 0;
        opacity: 0;
        overflow: hidden;            /* только на складывании: метка выше полосы */
        pointer-events: none;
      }

      @media (prefers-reduced-motion: reduce) {
        .world-scale { transition: none; }
      }

      /* On a phone the scale runs the width of the screen, and a finger that
         lands on it to scroll the page would be answering the question
         instead: "none" hands every touch to the slider. "pan-y" keeps the
         horizontal ones — the tap and the drag that set the guess — and gives
         the vertical ones back to the page. */
      @media (max-width: 860px) {
        .world-scale { touch-action: pan-y; }
      }

      .world-scale:focus-visible {
        outline: 2px solid var(--hse-blue);
        outline-offset: 6px;
        border-radius: 4px;
      }

      /* Bar, mark and ruler share one box: the mark is placed against the bar
         and reaches past it, the ruler hangs underneath. */
      .world-track {
        position: relative;
        padding: 6px 0;
        margin: -6px 0;
      }

      /* A ruler under the bar: a mark every ten countries and a longer one
         with a figure every fifty, so a guess can be put down by eye rather
         than by feel. It stays after the answer — 128 of 195 is easier to read
         against it too. */
      .world-ruler {
        position: relative;
        height: 23px;
        margin-top: 16px;
      }

      .world-tick {
        position: absolute;
        top: 0;
        width: 1px;
        height: 5px;
        margin-left: -0.5px;
        background: var(--btn-border);
      }

      .world-tick.is-big {
        height: 9px;
        background: var(--text-caption);
      }

      .world-tick span {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        font-size: 0.6875rem;
        line-height: 1;
        color: var(--text-caption);
        font-variant-numeric: tabular-nums;
      }

      /* The figures at the ends would hang over the edge of the card if they
         were centred on their mark like the rest. */
      .world-tick.is-first span {
        left: 0;
        transform: none;
      }

      .world-tick.is-last span {
        left: auto;
        right: 0;
        transform: none;
      }

      /* Метка читателя — та же, что у вопроса в «Годах учебы»: черточка
         поперек полосы, темная настолько, чтобы читаться и на пустой полосе,
         и на залитой. Остается после ответа, чтобы было видно расстояние до
         залитой части. */
      .world-guess {
        position: absolute;
        left: 0;
        top: 50%;
        width: 5px;
        height: 30px;
        border-radius: 3px;
        background: var(--text);
        opacity: 0;
        transform: translate(-50%, -50%);
        transition: opacity 260ms ease, left 160ms ease;
        pointer-events: none;
      }

      .world-guess.is-set {
        opacity: 1;
      }

      /* Asked to go on without a mark: the page stays, and the bar says where
         the reader is expected. */
      .world-scale.is-nudged .meter-bar {
        animation: world-nudge 620ms cubic-bezier(0.215, 0.61, 0.355, 1);
      }

      @keyframes world-nudge {
        0%, 100% { background: var(--brand-grey-light); }
        30% { background: var(--brand-cyan); }
      }

      /* The question in the lead-in. The colour comes inline with the markup;
         what is left here is the shape of the patch, and the clone break keeps
         both halves painted if the line wraps inside it. */
      .world-ask {
        padding: 0.06em 0.3em;
        border-radius: 0.2em;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }

      /* One line under the bar: what to do while the question stands, what the
         guess came to once the answer is out. */
      .world-verdict {
        font-size: 0.9375rem;
        line-height: 1.4;
        color: var(--text-secondary);
        transition: color 260ms ease;
      }

      /* Строка про догадку то есть, то нет — она уходит, когда читатель
         снимает город (см. paintMeter). Место за ней остается: иначе стена
         флагов под карточкой подпрыгивала бы на высоту строки от каждого
         тумблера. Держится оно только у того, кто угадывал: на пути
         «Показать ответ» строки не бывает вовсе, и пустая полоса в карточке
         была бы дырой без причины. */
      .world-verdict.is-kept {
        min-height: 1.4em;
      }

      .world-verdict b,
      .world-verdict.is-nudged {
        color: var(--text);
        font-weight: 600;
      }

      /* The button that sends the guess, under everything and in the middle:
         it is the one thing left to do. Once the answer is out its row folds
         away rather than leaving a hole in the card. */
      .world-send {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.6em;
        max-height: 120px;
        padding-top: 0.8em;
        overflow: hidden;
        transition: max-height 260ms ease, padding 260ms ease,
                    margin 260ms ease, opacity 260ms ease;
      }

      .world-answered .world-send {
        max-height: 0;
        padding-top: 0;
        margin-top: -10px;           /* and the gap of the card above it */
        opacity: 0;
      }

      /* Set apart from the plain buttons of the page: this one is the action
         the whole screen is waiting for. */
      .world-check {
        padding: 0.62em 2em;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--card);
        background: var(--hse-blue);
        border-color: var(--hse-blue);
      }

      @media (hover: hover) {
        .world-check:hover {
          color: var(--card);
          background: var(--link-hover);
          border-color: var(--link-hover);
        }
      }

      .world-check:disabled {
        opacity: 0.35;
        cursor: default;
        background: var(--hse-blue);
        border-color: var(--hse-blue);
      }

      /* Выход из вопроса рядом с ним — обычной кнопкой: угадывать никто не
         обязан, но главное действие на экране все же догадка. Своего display
         тут нет нарочно: кнопка прячется атрибутом hidden, когда метка
         поставлена, а любой display перебил бы его и оставил ее на экране. */
      .world-skip {
        padding: 0.62em 1.4em;
        font-size: 0.875rem;
      }

      /* ---------- The heading ---------- */

      /* Where the whole section is pinned, the lead-in with the question goes
         up and stays as the heading while the reader answers, and the heading
         of the section waits off to the right, where the shell leaves it. With
         the answer the question gives way and the heading comes in — the same
         move sideways every card on the page arrives with. */
      @media (min-width: 861px) {
        .world-scene .viz-lead {
          transition: opacity 260ms ease;
        }

        .world-scene.world-answered .viz-lead {
          opacity: 0;
        }

        .world-scene.world-answered .viz-header {
          transform: none;
        }

        .world-scene.world-turning .viz-header {
          transition: transform 620ms cubic-bezier(0.215, 0.61, 0.355, 1);
        }

        /* The room kept for the lead-in is not needed under the heading. */
        .world-scene.world-answered .viz-body {
          margin-top: 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .world-scene .viz-lead,
        .world-scene.world-turning .viz-header {
          transition: none;
        }
      }

      /* ---------- Asking and answering ---------- */

      /* While the question stands nothing on the screen may give the answer
         away — not the flags, not their captions, not the counts by campus —
         and the scale has the whole width of the page to itself.
         Дальше три кадра: ответ приходит на шкалу, под метку читателя; на
         следующем шкала складывается и стена занимает экран целиком; кампусы
         выезжают слева только тогда, когда о них попросили. */

      /* Out of the layout, not only out of sight: laid out at the width of the
         page, the wall would have to be packed again at every frame of the
         column drawing aside. It is put back once the column has settled. */
      .world-shut .world-flags-card {
        display: none;
      }

      .world-flags-card {
        transition: opacity 260ms ease;
      }

      .world-dim .world-flags-card,
      .world-dim .world-tile {
        opacity: 0;
      }

      @media (min-width: 861px) {
        .world-body {
          transition: gap 620ms cubic-bezier(0.215, 0.61, 0.355, 1);
        }

        .world-left {
          transition: width 620ms cubic-bezier(0.215, 0.61, 0.355, 1),
                      opacity 260ms ease;
        }

        /* Held at their own width while the column opens, so the cards are
           uncovered rather than squeezed. */
        .world-left > * {
          min-width: 340px;
        }

        /* Колонка свернута, пока стоит вопрос: счет по кампусам выдал бы
           ответ. Со стеной она приезжает сама — переключатели городов и есть
           то, чем читатель распоряжается дальше, и прятать их за лишнее
           нажатие не за что. */
        .world-shut {
          gap: 0;
        }

        .world-shut .world-left {
          width: 0;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        }

        /* Пока стена закрыта, в колонке стоит одна карточка — вопрос или
           ответ на него, — и ниже нее до низа экрана ничего нет. Карточка
           встает посередине: это отдельный кадр, а не верх страницы, у
           которой что-то срезали. На кадре со стеной карточка возвращается
           наверх: там под ней флаги. */
        .world-shut .world-right {
          justify-content: center;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .world-scale.is-nudged .meter-bar { animation: none; }
        .world-body,
        .world-left { transition: none; }
      }

      /* Кампусов на телефоне нет вовсе. Четыре переключателя внизу отнимали
         у стены треть экрана, а меняли в ней немного: убрав Пермь, читатель
         видел, что флагов стало на десяток меньше, — но какие это флаги,
         на стене в четыре ряда все равно было не разглядеть. Место стене
         нужнее: блок про то, из скольких стран приехали студенты, и ответ на
         это — сами флаги. На широком экране кампусы на месте. */
      @media (max-width: 860px) {
        .world-left {
          display: none;
        }

        /* Переехавший в экран заголовок перестает быть карточкой: каркас
           держал ее липкой и отводил за правый край (--card-x), чтобы она не
           приезжала вовсе. Внутри экрана ей и ехать некуда — она уже на
           месте. */
        .world-scene .viz-lead .viz-header {
          position: static;
          transform: none;
        }

        /* Заголовок стоит в припаркованном экране, то есть отнимает верх у
           каждого экрана блока. Подзаголовок там лишний: «У нас в гостях уже
           128 флагов» — это ровно то, что крупно написано в карточке счета
           строкой ниже. */
        .world-scene .viz-lead .viz-header > p {
          display: none;
        }
      }

      /* Пять заголовков и 128 флагов не влезают в экран ни при каком размере
         плитки: ужатый до 40dvh флаг — это шестнадцать пикселей, и узнать его
         нельзя. Раньше стена росла во всю высоту, а страница прокручивалась
         под ней. Теперь на телефоне страница не прокручивается, а читается
         тактами — и низ стены просто обрезало краем экрана: ни Европы, ни
         последних групп.
         Поэтому блок укладывается ровно в экран, а стена листается внутри
         своей карточки, как стена профессий: класс page-scrolls говорит
         каркасу не отнимать у нее прокрутку, а overscroll-behavior — не
         тянуть за собой страницу. */
      @media (max-width: 860px) {
        /* Блок начинается с экрана: карточка счета и стена стоят на нем
           вместе. На тесном телефоне — 320 точек «увеличенного» айфона — им
           там и вместе не поместиться, и блок честно вырастает выше экрана:
           низ у него каркас достает отдельным тактом. Что он не ужимается
           силой — важно: колонка, которой разрешили сжаться ниже своего
           содержимого, налезала на то, что под ней. */
        .world-body {
          flex: none;
          min-height: calc(var(--win, 100dvh) - var(--hint-room));
        }

        /* Верх каждого экрана занят припаркованным переходным экраном —
           значит, колонка начинается под ним, а не за ним. Высоту парковки
           каркас кладет в --lead-hold. Сжиматься ей нельзя: ужатая ниже
           своего содержимого, она налезает на переключатели под собой. */
        .world-right {
          position: static;
          padding: var(--lead-hold, 0px) 0 0;
          background: none;
          flex: none;
        }

        .world-right::after { display: none; }

        /* Липнуть не к чему: страница под карточкой не едет. А липкой она
           вставала поверх первых рядов стены — те сто тридцать пикселей
           флагов читатель не видел вовсе. */
        .world-right .meter-card {
          position: static;
        }

        .canvas-card.world-flags-card {
          flex: none;
          min-height: 0;
          height: auto;
        }

        .world-wrap {
          flex: none;
          min-height: 0;
          height: auto;
        }

        /* Высоту стене отмеряет сам блок — столько, сколько осталось от
           экрана (grow ниже). Отдать это флексу нельзя: колонка, ужатая ниже
           своего содержимого, не прокручивается, а налезает на то, что под
           ней. */
        .world-grid {
          position: static;
          height: auto;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        /* Кадр со стеной: наверху заголовок, в карточке счет, под ними флаги.
           Шкала сказала свое кадром раньше — на том экране, где читатель
           ставил метку и где ответ пришел прямо под его догадку; здесь ее
           место нужнее стене, и линейка с меткой и строка про догадку уходят
           вместе с ней. */
        .world-walled .world-scale,
        .world-walled .world-verdict {
          display: none;
        }

        .world-score-value { font-size: 2.5rem; }
        .world-score-note { font-size: 0.875rem; }
      }
    </style>

    <div class="col-left world-left">
      <div class="city-list" data-el="cityList"></div>
      <div class="actions">
        <button type="button" class="btn" data-el="clearAll">Снять все</button>
        <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
      </div>
    </div>

    <div class="col-right world-right">
      <div class="meter-card">
        <div class="meter-title" data-el="meterTitle"></div>
        <div class="world-score">
          <span class="world-score-value" data-el="count"></span>
          <span class="world-score-note" data-el="note"></span>
        </div>
        <div class="world-scale" data-el="scale" role="slider" tabindex="0"
             aria-label="Сколько стран, по-твоему" aria-valuemin="0" aria-valuemax="${WORLD}">
          <div class="world-track">
            <div class="meter-bar">
              <div class="meter-bar-seg world-bar-seg" data-el="barSeg"></div>
            </div>
            <div class="world-guess" data-el="guess"></div>
          </div>
          <div class="world-ruler" data-el="ruler" aria-hidden="true"></div>
        </div>
        <div class="world-verdict" data-el="verdict" aria-live="polite"></div>
        <div class="world-send">
          <button type="button" class="btn world-check" data-el="check">Проверить догадку</button>
          <button type="button" class="btn world-skip" data-el="skip">Показать ответ</button>
        </div>
      </div>

      <div class="canvas-card world-flags-card">
        <div class="canvas-wrap world-wrap">
          <div class="world-grid" data-el="grid"></div>
          <div class="world-tip" data-el="tip" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = { active: { msk: true, spb: true, nn: true, perm: true } };

  // Countries of every selected campus, without repeats.
  function selected() {
    const set = new Set();
    CITIES.forEach((c) => {
      if (state.active[c.key]) BY_CITY[c.key].forEach((code) => set.add(code));
    });
    return set;
  }

  // Карточка со счетом: она же стоит и на вопросе, и на ответе, и над стеной.
  const card = root.querySelector('.meter-card');

  // ---------- Flags ----------
  const grid = $('grid');
  // Каркас на телефоне отнимает прокрутку у всей страницы, кроме того, что
  // помечено этим классом. Стена — как раз такое место: ее листают пальцем.
  if (phone.matches) grid.classList.add('page-scrolls');
  const tiles = new Map();
  let index = 0;

  const groupCountEls = {};

  REGIONS.forEach((region) => {
    const group = document.createElement('div');
    group.className = 'world-group';
    group.innerHTML = `
      <div class="world-group-title">${region.label}
        <span><b data-el="groupCount"></b> из ${REGION_WORLD[region.key]} ${countriesOf(REGION_WORLD[region.key])}</span>
      </div>
      <div class="world-group-flags"></div>
    `;
    const flags = group.querySelector('.world-group-flags');
    groupCountEls[region.key] = group.querySelector('[data-el="groupCount"]');

    region.codes.forEach((code) => {
      const name = NAME.get(code);
      const tile = document.createElement('div');
      tile.className = 'world-tile';
      // The name the tip shows. Not a title: the browser would then draw its
      // own tooltip over ours, a second late.
      tile.dataset.name = name;
      // Названо имя один раз и на том, что берет фокус: клавиатурой флаги
      // обходят по самим плиткам (см. «Имя страны» ниже), и диктору нужно
      // прочесть страну именно там, где читатель остановился. Поэтому имя —
      // на плитке, а картинка внутри молчит: иначе страна называлась бы
      // дважды, плиткой и флагом.
      tile.setAttribute('role', 'img');
      tile.setAttribute('aria-label', name);
      // Один таб на всю стену: по ней ходят стрелками, а не табом — иначе
      // до следующего раздела сто двадцать восемь нажатий.
      tile.tabIndex = -1;
      // The wave crosses the whole wall in about the same time a repaint takes
      // elsewhere on the page.
      tile.style.setProperty('--d', `${Math.round(index * (340 / COUNTRIES.length))}ms`);
      // On a phone the wall is reached by scrolling, flag after flag, so they
      // are loaded as they are reached: a hundred and twenty-eight of them are
      // nearly a megabyte, and that is most of the page arriving before the
      // reader has got anywhere near it. Where the page is read beat by beat
      // the whole wall appears in one movement instead, and a flag that starts
      // loading on the frame it appears is a flag that appears empty — there
      // they are asked for as the block is built, a beat ahead.
      tile.innerHTML = `<img src="assets/flags/${code}.svg" alt="" decoding="async"`
        + `${phone.matches ? ' loading="lazy"' : ''}>`;
      flags.appendChild(tile);
      tiles.set(code, tile);
      index++;
    });

    grid.appendChild(group);
  });

  // Сколько экрана осталось стене. Блок на телефоне встает в один экран:
  // карточка счета и стена под ней. Стена
  // берет то, что осталось от экрана после нее, и листается внутри себя —
  // 128 флагов не влезут туда ни при каком размере плитки, а резать их краем
  // экрана нельзя: это и есть ответ блока. Где не осталось ничего — на
  // тесном телефоне — стене отдается полоса в четыре ряда, а блок честно
  // вырастает выше экрана: низ у него каркас достает отдельным тактом.
  const WALL_MIN = 140;              // меньше четырех рядов флагов не оставляем
  function grow() {
    if (!phone.matches) return;
    // Экран, который блоку отведен: min-height тела каркас считает по окну,
    // и это ровно то место, куда блок должен встать.
    const room = parseFloat(getComputedStyle(root).minHeight) || root.clientHeight;
    // И высота всего остального — стену убираем, а заодно и сам этот экран:
    // иначе тело меряется по нему и «остального» всегда ровно на экран.
    const kept = root.style.minHeight;
    root.style.minHeight = '0px';
    grid.style.maxHeight = '0px';
    const without = root.scrollHeight;
    root.style.minHeight = kept;
    grid.style.maxHeight = `${Math.max(WALL_MIN, Math.round(room - without))}px`;
  }

  // Flags are laid out to fill the card: take the largest size at which every
  // group, caption and flag still fits without scrolling.
  function layout() {
    if (phone.matches) {
      grid.style.setProperty('--tile', `${TILE_PHONE}px`);
      grow();
      return;
    }
    const style = getComputedStyle(grid);
    const w = grid.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const h = grid.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (w <= 0 || h <= 0) return;

    let size = TILE_MIN;
    for (let t = TILE_MAX; t > TILE_MIN; t--) {
      const cols = Math.max(1, Math.floor((w + GAP) / (t + GAP)));
      let need = GROUP_GAP * (REGIONS.length - 1);
      REGIONS.forEach((region) => {
        const rows = Math.ceil(region.codes.length / cols);
        need += HEAD + rows * ((t * 3) / 4) + (rows - 1) * GAP;
      });
      if (need <= h) { size = t; break; }
    }
    grid.style.setProperty('--tile', `${size}px`);

    // The estimate above does not know the exact height of a caption in the
    // loaded font, so the last word is left to the browser: shrink until the
    // wall really stops scrolling.
    while (size > TILE_MIN && grid.scrollHeight > grid.clientHeight) {
      size -= 1;
      grid.style.setProperty('--tile', `${size}px`);
    }
  }

  // The block is built a screen before it is shown, and then the whole wall
  // arrives in one movement. A flag left to be decoded on the frame it appears
  // is one of 128 doing the same thing at once — so they are decoded here,
  // while the reader is still reading the title card. On a phone there is
  // nothing to decode yet: the flags are left to load as they are reached.
  if (!phone.matches) {
    grid.querySelectorAll('img').forEach((img) => {
      if (img.decode) img.decode().catch(() => {});
    });
  }

  onResize(grid, layout);
  // Стена берет то, что осталось от экрана, — значит, следить надо за тем,
  // что его занимает: карточка счета подрастает с ответом и становится другой
  // высоты на повороте. И за самим экраном: он вырастает на полсотни
  // пикселей, когда уезжает панель браузера, — эти пикселы стене и достаются.
  if (phone.matches) {
    onResize(root, layout);
    onResize(root.querySelector('.meter-card'), layout);
  }

  // ---------- Имя страны ----------
  // One tip for the whole wall, and one listener: 128 flags with a listener
  // each would cost more to build than the wall itself.
  //
  // Спросить имя можно тремя способами, и все три работают: курсором —
  // наведением, пальцем — касанием, с клавиатуры — фокусом. Стена при этом
  // стоит в табе одной остановкой: таб приводит на нее, стрелки водят внутри
  // (`data-arrows` — см. lib/stepper.js, иначе стрелки забирает страница),
  // таб уводит дальше. Сто двадцать восемь отдельных остановок были бы той же
  // стеной, только поперек дороги.
  const tip = $('tip');
  const wrap = tip.parentElement;
  grid.setAttribute('data-arrows', '');

  {
    let shown = null;

    const place = (tile) => {
      const box = tile.getBoundingClientRect();
      const field = wrap.getBoundingClientRect();
      // Above the flag and centred on it, but never over the edge of the card:
      // the first and last flags of a row would hang outside it.
      const half = tip.offsetWidth / 2;
      const middle = box.left + box.width / 2 - field.left;
      const x = Math.min(Math.max(middle, half), field.width - half);
      const above = box.top - field.top - tip.offsetHeight - 8;
      // No room above — the top row — so it stands under the flag instead.
      const y = above < 0 ? box.bottom - field.top + 8 : above;
      // Placed by its corner, not moved by a transform: the transform is what
      // the tip arrives with, and the two would write over each other.
      tip.style.left = `${Math.round(x - half)}px`;
      tip.style.top = `${Math.round(y)}px`;
    };

    const show = (tile) => {
      if (tile === shown) return;
      if (shown) shown.classList.remove('is-named');
      shown = tile;
      tip.textContent = tile.dataset.name;
      // Placed before it is shown: the width is known only once the name is in.
      place(tile);
      tip.classList.add('is-here');
      tile.classList.add('is-named');
    };

    const hide = () => {
      if (shown) shown.classList.remove('is-named');
      shown = null;
      tip.classList.remove('is-here');
    };

    if (window.matchMedia('(hover: hover)').matches) {
      grid.addEventListener('pointerover', (e) => {
        const tile = e.target.closest('.world-tile');
        if (tile) show(tile);
        else hide();
      });
      grid.addEventListener('pointerleave', hide);
    } else {
      // Пальцем. Курсора нет, и имя страны зовут касанием: флаг под пальцем
      // подрастает, над ним встает название. Второе касание по нему же имя
      // убирает, касание по соседнему — переносит туда. Само оно уходит через
      // пару секунд: имя, оставленное стоять, закрывает собой соседние флаги,
      // а стена — это они и есть.
      let пора = 0;
      grid.addEventListener('click', (e) => {
        const tile = e.target.closest('.world-tile');
        clearTimeout(пора);
        if (!tile || tile === shown) { hide(); return; }
        show(tile);
        пора = setTimeout(hide, 2600);
      });
    }

    // С клавиатуры — фокусом: на каком флаге стоит читатель, тот и назван.
    grid.addEventListener('focusin', (e) => {
      const tile = e.target.closest('.world-tile');
      if (tile) { rove(tile); show(tile); }
    });
    grid.addEventListener('focusout', (e) => {
      if (!e.relatedTarget || !grid.contains(e.relatedTarget)) hide();
    });

    // The wall scrolls only when it does not fit; the tip is placed against
    // the card, so a scroll would leave it beside the wrong flag.
    // Кроме прокрутки, которую вызвал сам фокус: браузер подвозит флаг, на
    // который читатель перешел стрелкой, — имя тогда не убирают, а
    // переставляют следом за ним.
    grid.addEventListener('scroll', () => {
      if (shown && shown === document.activeElement) place(shown);
      else hide();
    }, { passive: true });
  }

  // ---------- Ход по стене с клавиатуры ----------
  // Стрелки водят от флага к флагу, вправо-влево по порядку, вверх-вниз —
  // рядом. Ряды считаются живьем, а не записаны: флаги уложены переносом, и в
  // ряду их столько, сколько влезло.
  //
  // Только стрелки: Home на этой странице уже значит «в начало» — он
  // возвращает читателя на обложку, — и отнимать его у страницы ради первого
  // флага не за что. Так и стрелки у стены есть только потому, что страница
  // отдает их сама, по `data-arrows` (см. lib/stepper.js).
  const order = [...tiles.values()];
  let roving = order[0];
  if (roving) roving.tabIndex = 0;

  function rove(tile) {
    if (!tile || tile === roving) return;
    if (roving) roving.tabIndex = -1;
    roving = tile;
    roving.tabIndex = 0;
  }

  function rowsNow() {
    const out = [];
    order.forEach((t) => {
      const top = t.getBoundingClientRect().top;
      const last = out[out.length - 1];
      if (last && Math.abs(last.top - top) < 3) last.list.push(t);
      else out.push({ top, list: [t] });
    });
    return out;
  }

  function nextTile(key) {
    const i = order.indexOf(roving);
    if (key === 'ArrowRight') return order[Math.min(order.length - 1, i + 1)];
    if (key === 'ArrowLeft') return order[Math.max(0, i - 1)];
    const rows = rowsNow();
    const r = rows.findIndex((row) => row.list.includes(roving));
    if (r < 0) return null;
    const to = rows[r + (key === 'ArrowDown' ? 1 : -1)];
    if (!to) return null;
    const col = rows[r].list.indexOf(roving);
    return to.list[Math.min(col, to.list.length - 1)];
  }

  const WALKS_WALL = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  grid.addEventListener('keydown', (e) => {
    if (!e.target.closest || !e.target.closest('.world-tile')) return;
    if (!WALKS_WALL.includes(e.key)) return;
    // Страница свои стрелки уже отдала (`data-arrows`), а браузеру они здесь
    // тоже ни к чему: прокрутку стены ведет фокус.
    e.preventDefault();
    const to = nextTile(e.key);
    if (!to) return;
    rove(to);
    to.focus();
  });
  phone.addEventListener('change', layout);
  // The web font arrives after the first paint and moves the captions.
  if (document.fonts) document.fonts.ready.then(layout);

  // ---------- Counter ----------
  const countEl = $('count');
  const noteEl = $('note');
  const meterTitle = $('meterTitle');
  const barSeg = $('barSeg');
  let shown = null;
  let animFrame = null;

  function animateCountTo(target) {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (shown === null) { shown = target; countEl.textContent = target; return; }
    const from = shown;
    if (from === target) return;
    const dur = 620, t0 = performance.now();
    const step = (now) => {
      const raw = Math.min(1, Math.max(0, (now - t0) / dur));
      const p = 1 - Math.pow(1 - raw, 3);
      shown = Math.round(from + (target - from) * p);
      countEl.textContent = shown;
      if (raw < 1) animFrame = requestAnimationFrame(step);
      else { shown = target; countEl.textContent = target; }
    };
    animFrame = requestAnimationFrame(step);
  }

  // ---------- City cards ----------
  const cityList = $('cityList');
  const cityEls = {};

  CITIES.forEach((c) => {
    const n = BY_CITY[c.key].length;
    const card = document.createElement('div');
    card.className = 'city-card world-city';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${phone.matches ? c.short : c.name}</div>
        <div class="city-stats">
          <span class="city-stat"><span class="city-dot" style="background:${c.color}"></span><span class="city-stat-text">${n} ${countries(n)}</span></span>
        </div>
      </div>
      <button type="button" class="toggle" role="switch"><span class="toggle-knob"></span></button>
    `;
    const toggleBtn = card.querySelector('.toggle');
    toggleBtn.addEventListener('click', () => {
      state.active[c.key] = !state.active[c.key];
      render();
    });
    cityList.appendChild(card);
    cityEls[c.key] = { toggle: toggleBtn };
  });

  // Колонка с городами выезжает слева вместе со стеной (см. .world-shut
  // .world-left в стилях и setWall ниже). Пока она сложена, в ней нечего
  // нажимать — `inert` убирает ее и из порядка табуляции, и из того, что
  // читает экранный диктор: ширина у колонки ноль, но кнопки в ней живые.
  const leftCol = root.querySelector('.world-left');

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    render();
  });

  // ---------- The guess ----------
  // Before the block shows how many countries there are, it asks. The bar of
  // the counter doubles as the scale of the guess — from none to the 195
  // countries of the world — so the mark and the answer land on the same bar
  // and the gap between them is seen rather than read.
  const ACTUAL = COUNTRIES.length;
  const scale = $('scale');
  const bar = scale.querySelector('.meter-bar');
  const guessEl = $('guess');
  const verdictEl = $('verdict');
  const check = $('check');
  const skip = $('skip');

  // The ruler under the bar. A mark every ten countries, a longer one with a
  // figure every fifty — and the last one at the end of the scale, so both
  // ends of it are named. A mark that would crowd the last one is left out.
  const TICK = 10;
  const FIGURE = 50;
  const ruler = $('ruler');
  // Штрих — `span`, а не `i`: у `i` курсив по умолчанию, и цифры под полосой
  // стояли наклонными — единственное место на странице, где это случилось.
  // У того же вопроса в «Годах учебы» штрихи всегда были `span`.
  const tick = (v, big) => {
    const el = document.createElement('span');
    el.className = `world-tick${big ? ' is-big' : ''}`;
    el.style.left = `${(v / WORLD) * 100}%`;
    if (big) {
      el.innerHTML = `<span>${nf(v)}</span>`;
      if (v === 0) el.classList.add('is-first');
      if (v === WORLD) el.classList.add('is-last');
    }
    ruler.appendChild(el);
  };
  for (let v = 0; v < WORLD; v += TICK) {
    if (WORLD - v < TICK) break;
    tick(v, v % FIGURE === 0);
  }
  tick(WORLD, true);

  let guess = null;       // the reader's mark, or null while there is none
  let asking = null;      // the question is on the screen, not the answer
  let checked = false;    // on a page that scrolls: the answer has been asked for
  let skipped = false;    // читатель попросил ответ, не угадывая
  let walled = null;      // стена флагов в блоке, а не за его краем

  // Beat by beat the page is read only on a wide screen. Elsewhere it simply
  // scrolls, there is no next beat to wait at, and the answer is behind a
  // button instead.
  const stepped = () => document.documentElement.classList.contains('is-stepped');
  // Кроме телефона: там блок читается кадрами, и кадры ведет каркас — те же
  // два состояния, только вместо колеса палец. При «меньше движения» режим
  // выключен (`byTaps` в lib/stepper.js), и там остается прокрутка с кнопкой.
  const tapped = phone.matches && !!meta.taps
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Историю ведет каркас — здесь или там.
  const walks = () => stepped() || tapped;
  // Ответ и стена — два кадра, а не один: см. meta.steps. Только там, где
  // кадры и есть: при «меньше движения» страница прокручивается и показывает
  // итоговое состояние целиком, одним экраном.
  const SPLIT = walks;

  // What to say once the answer is out. Judged by how far off the guess was
  // against the answer, not by the bare difference: forty away from 128 is
  // close, forty away from sixty is not. Nearly everyone guesses low, so that
  // side gets the most words.
  function verdict(g) {
    const diff = ACTUAL - g;
    if (diff === 0) return 'В точку!';
    if (Math.abs(diff) <= Math.round(ACTUAL * 0.1)) return 'Почти в точку';
    if (g === 0) return `Ни одной? А их ${nf(ACTUAL)}`;
    if (diff > 0) {
      const ratio = ACTUAL / g;
      if (ratio >= 1.75) {
        const k = Math.round(ratio);
        const almost = ratio < k - 0.1 ? 'Почти в' : 'В';
        return `${almost} ${nf(k)} ${plural(k, 'раз', 'раза', 'раз')} больше, чем казалось`;
      }
      return `На ${nf(diff)} ${plural(diff, 'страну', 'страны', 'стран')} больше, чем казалось`;
    }
    return `На ${nf(-diff)} ${plural(-diff, 'страну', 'страны', 'стран')} меньше, чем казалось`;
  }

  function paintMeter() {
    if (asking) {
      meterTitle.textContent = 'Твоя догадка';
      if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      countEl.textContent = guess === null ? '?' : guess;
      // The answer counts up from wherever the reader put the mark.
      shown = guess === null ? 0 : guess;
      noteEl.textContent = `из ${nf(WORLD)} стран мира`;
      barSeg.style.width = '0%';
      if (!verdictEl.classList.contains('is-nudged')) {
        verdictEl.textContent = guess === null
          ? 'Нажми на полосу или потяни метку'
          : `Твоя догадка — ${nf(guess)}`;
      }
      // «Ответить» ждет метку, «Показать ответ» — нет: угадывать никто не
      // обязан, и выход из вопроса виден с самого начала, а не только тогда,
      // когда читатель уже что-то поставил. Поставил — и второй кнопки
      // больше нет: обе делали бы одно и то же.
      check.disabled = guess === null;
      skip.hidden = guess !== null;
      return;
    }

    const set = selected();
    meterTitle.textContent = 'Стран, откуда приняты студенты';
    animateCountTo(set.size);
    noteEl.textContent = `из ${nf(WORLD)} стран мира — ${pct(set.size, WORLD)}`;
    barSeg.style.width = `${(set.size / WORLD) * 100}%`;
    // Строка про догадку сказана про ответ — про все 128. Как только читатель
    // снял город, крупное число рядом с ней уже другое, и «в 2 раза больше,
    // чем казалось» стоит рядом с 72, от которых догадка 60 отличается на
    // пятую часть. Поэтому строка держится, пока на экране ответ, и уходит,
    // когда читатель взял переключатели в свои руки; вернул все города —
    // вернулась и она.
    const whole = set.size === ACTUAL;
    verdictEl.classList.toggle('is-kept', guess !== null);
    verdictEl.innerHTML = guess === null || !whole
      ? ''
      // Неразрывный пробел перед числом: на телефоне строка переносится, и
      // «60» оставалось стоять отдельной строкой под «твоя догадка».
      : `<b>${verdict(guess)}</b> — твоя догадка&nbsp;${nf(guess)}`;
  }

  function setGuess(v) {
    if (v === guess) return;
    guess = v;
    guessEl.style.left = `${(v / WORLD) * 100}%`;
    guessEl.classList.add('is-set');
    scale.setAttribute('aria-valuenow', v);
    scale.setAttribute('aria-valuetext', `${nf(v)} ${countries(v)}`);
    verdictEl.classList.remove('is-nudged');
    paintMeter();
  }

  const valueAt = (x) => {
    const box = bar.getBoundingClientRect();
    return Math.round(Math.min(1, Math.max(0, (x - box.left) / box.width)) * WORLD);
  };

  // Taken by a click and by dragging, never by the wheel: on a wide screen the
  // wheel belongs to the story.
  scale.addEventListener('pointerdown', (e) => {
    if (!asking) return;
    e.preventDefault();
    scale.setPointerCapture(e.pointerId);
    scale.focus({ preventScroll: true });
    setGuess(valueAt(e.clientX));
  });
  scale.addEventListener('pointermove', (e) => {
    if (asking && scale.hasPointerCapture(e.pointerId)) setGuess(valueAt(e.clientX));
  });
  scale.addEventListener('keydown', (e) => {
    if (!asking) return;
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    const from = guess === null ? 0 : guess;
    setGuess(Math.min(WORLD, Math.max(0, from + by * (e.shiftKey ? 10 : 1))));
  });

  // The button sends the guess. Read beat by beat, the page is asked for its
  // next beat, and that beat brings the answer; where the page scrolls there
  // is no beat to ask for, and the answer is shown right here.
  const answer = () => {
    if (walks()) {
      root.dispatchEvent(new CustomEvent('story:next', { bubbles: true }));
      return;
    }
    checked = true;
    setAsking(false);
  };
  check.addEventListener('click', answer);

  // Тот же ответ, только без догадки. Такт его не придерживает: читатель
  // попросил ответ прямо, и ждать от него метку после этого незачем.
  skip.addEventListener('click', () => {
    skipped = true;
    answer();
  });

  // Asked to go on without a mark: the page stays where it is, and the bar
  // shows where the reader is expected.
  function nudge() {
    scale.classList.remove('is-nudged');
    void scale.offsetWidth;            // the same animation again, from its start
    scale.classList.add('is-nudged');
    verdictEl.classList.add('is-nudged');
    verdictEl.textContent = 'Сначала поставь метку на полосе';
    scale.focus({ preventScroll: true });
  }

  // ---------- The heading ----------
  // The shell draws the heading of the answer — the quotation — and that is
  // the name the block goes by in the progress bar. While the question stands
  // the header says the question instead: it is written into the header, and
  // the shell, which watches it, measures the card again.
  const section = root.closest('.viz-section');
  section.classList.add('world-scene');
  root.classList.add('world-body');
  const headingEl = section.querySelector('.viz-header h2');
  const subheadEl = section.querySelector('.viz-header > p');

  function setHeading(on) {
    headingEl.innerHTML = on ? ASK_TITLE : meta.title;
    subheadEl.innerHTML = on ? ASK_SUBTITLE : meta.subtitle;
  }

  // На телефоне карточка с заголовком не приезжает справа — ее место наверху
  // занял припаркованный экран с вопросом, и приезжать ей некуда. Поэтому
  // заголовок переезжает в сам экран: вопрос уступает ему место, как и на
  // широком. Переезжает именно узлом, а не копией текста, — все, что каркас
  // умеет с этим экраном (парковка, высота под ним, исчезновение вместе с
  // секцией), продолжает работать само, он меряет своих детей, а дети теперь
  // заголовок.
  //
  // И уезжает обратно. Экран этот живет не только над блоком: он же стоит над
  // ареной, которую отдал стадион, — а это такт до блока. Оставшись там
  // заголовком, он читался как чужой: арена предыдущего раздела под надписью
  // «Все флаги в гости будут к нам». Так что наверху стоит то, про что сейчас
  // картинка: над ареной — строки про нее, над стеной флагов — заголовок
  // блока. Меняются они разом, без полупрозрачной середины: это не переход, а
  // два разных экрана (см. «Кроссфейд» в CLAUDE.md).
  const leadEl = section.querySelector('.viz-lead');
  const headEl = section.querySelector('.viz-header');
  const headHome = headEl ? headEl.parentNode : null;
  const askKids = leadEl ? [...leadEl.childNodes] : [];
  // Вопрос уходит из экрана вместе с ответом: читатель возвращается сюда
  // шагом назад, и спрашивать его второй раз не о чем — над ареной остается
  // то, что она показывает. Прячется он руками, а не стилями блока: перенос
  // строки у него записан инлайном (иначе каркас обмерит экран до того, как
  // приедут стили, — см. CLAUDE.md), а инлайн стилям блока не перебить.
  const askLine = leadEl ? leadEl.querySelector('.world-ask-line') : null;
  let leadIs = 'ask';
  function leadShow(what) {
    if (!phone.matches || !leadEl || !headEl || leadIs === what) return;
    leadIs = what;
    if (what === 'head') leadEl.replaceChildren(headEl);
    else {
      leadEl.replaceChildren(...askKids);
      if (headHome) headHome.appendChild(headEl);
    }
    // Экран стал другой высоты, а его место наверху каркас пересчитывает на
    // движении страницы — которого в этот момент может и не быть: читатель
    // нажал кнопку, а не листал. Без толчка под заголовком осталась бы
    // полоса от вопроса.
    window.dispatchEvent(new Event('scroll'));
  }

  // Сколько места занял наверху припаркованный экран, каркас считает сам и
  // не сразу: высота его меняется вместе с тем, что в нем стоит, — вопрос
  // выше заголовка. Ловить этот момент тактами бесполезно, он приходит то
  // раньше, то позже отрисовки; поэтому стена просто пересчитывает себя,
  // когда парковка стала другой. Случается это за чтение считаные разы.
  let held = -1;
  function growSoon() {
    const now = parseFloat(getComputedStyle(section).getPropertyValue('--lead-hold')) || 0;
    if (now === held) return;
    held = now;
    grow();
  }

  // Блок занял экран — значит, читают его, а не открытие над ним. Ровно в
  // ноль верх блока при этом не встает: на тесном телефоне он не влезает в
  // экран целиком, и каркас доводит его до своей границы кадра, а не до
  // пикселя. Поэтому четверть экрана — это все еще «блок наверху».
  function follow() {
    const top = root.getBoundingClientRect().top;
    // Где кадров три, заголовок приходит со стеной, а не с ответом: кадр с
    // ответом — это все еще тот экран, где спрашивали, и вопрос стоит над
    // своим ответом, пока его не сменят флаги.
    const done = SPLIT() ? !!walled : !asking;
    leadShow(done && top <= window.innerHeight * 0.25 ? 'head' : 'ask');
    // А сам вопрос уходит с ответом, не дожидаясь стены: «Как думаешь, из
    // скольких стран?» над карточкой, где крупно написано 128, спрашивает о
    // том, что под ним и отвечено. Остальное в экране — 63 000 студентов и
    // 5 600 иностранцев — это то, из чего эти 128 взялись, и стоит над ними
    // до самой стены.
    if (askLine) askLine.style.display = asking ? 'block' : 'none';
    growSoon();
  }
  if (PHONE) window.addEventListener('scroll', follow, { passive: true });

  // The block stands under the lead-in while the question is asked and under
  // the heading once it is answered, and the two are not the same height. So
  // it is moved to its new place at once and then eased there from the old
  // one — it slides, rather than jumps. Played as an animation of its own, so
  // it does not take over the transitions the block already has.
  let turning = 0;
  function glide(from) {
    const dy = from - root.getBoundingClientRect().top;
    clearTimeout(turning);
    turning = setTimeout(() => section.classList.remove('world-turning'), 660);
    if (Math.abs(dy) < 1 || !root.animate) return;
    root.animate(
      [{ transform: `translateY(${dy.toFixed(1)}px)` }, { transform: 'translateY(0px)' }],
      { duration: 620, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' }
    );
  }

  // The wall comes back only once the scale has drawn aside: first into the
  // layout, then — a frame later, or there is no wave — into sight.
  let unveiling = 0;
  function unveil(after) {
    clearTimeout(unveiling);
    unveiling = setTimeout(() => {
      // Пока стена закрыта, карточка стоит посреди пустого экрана (см.
      // .world-shut .world-right в стилях), а со стеной возвращается наверх —
      // это две сотни пикселей, которые она проходила за один кадр. Съезжает
      // она туда так же, как блок съезжает под сменившийся заголовок: место
      // меняется сразу, а поверх играет то, чего не хватает.
      const was = card.getBoundingClientRect().top;
      root.classList.remove('world-shut');
      // Стена вернулась в раскладку — теперь ее можно мерить вместе с
      // карточкой, которая над ней стоит.
      grow();
      slideCard(was);
      void grid.offsetWidth;
      root.classList.remove('world-dim');
    }, after);
  }

  // Стена приходит и уходит: на широком экране — вместе с ответом, на
  // телефоне — своим кадром, следующим за ним. С ней приходит заголовок
  // (follow выше) и уходит шкала.
  function setWall(on, after) {
    if (on === walled) return;
    // Первое состояние просто ставится, а не играется — как и в setAsking.
    const first = walled === null;
    walled = on;
    const was = card.getBoundingClientRect().top;
    root.classList.toggle('world-walled', on);
    if (on) {
      unveil(after);
    } else {
      clearTimeout(unveiling);
      root.classList.add('world-shut', 'world-dim');
    }
    // Кампусы приезжают и уезжают вместе со стеной: счет по городам — такой
    // же ответ, как сами флаги, и на вопросе его на экране быть не должно.
    // Сложенная колонка не берет ни таб, ни диктора — ширина у нее ноль, но
    // кнопки в ней живые.
    if (leftCol) leftCol.inert = !on;
    follow();
    grow();
    // Назад карточка съезжает так же, как вперед (см. unveil), только сразу:
    // ждать нечего, стена уходит вместе с тактом. Такт назад — то же
    // движение, отыгранное обратно, и прыжок в две сотни пикселей ему не к
    // лицу.
    if (!on && !first) slideCard(was);
  }

  // Карточка уже на новом месте — поверх играет то, чего не хватает до
  // старого. Так же съезжает и сам блок под сменившимся заголовком (glide).
  function slideCard(was) {
    const dy = was - card.getBoundingClientRect().top;
    if (Math.abs(dy) < 1 || !card.animate) return;
    card.animate(
      [{ transform: `translateY(${dy.toFixed(1)}px)` }, { transform: 'translateY(0px)' }],
      { duration: 620, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' }
    );
  }

  function setAsking(on) {
    if (on === asking) return;
    const first = asking === null;
    asking = on;
    // Only a change the reader watches is played; the first state is simply
    // set, and so is everything on a page that scrolls.
    const plays = !first && walks();
    const from = root.getBoundingClientRect().top;
    if (plays) section.classList.add('world-turning');

    root.classList.toggle('world-asking', on);
    section.classList.toggle('world-answered', !on);
    // Где ответ и стена — один кадр, стена идет за ответом; где два, ею
    // распоряжается свой кадр.
    if (!SPLIT()) setWall(!on, plays ? 620 : 0);
    setHeading(on);
    follow();
    scale.setAttribute('aria-disabled', on ? 'false' : 'true');
    scale.tabIndex = on ? 0 : -1;
    check.tabIndex = on ? 0 : -1;
    skip.tabIndex = on ? 0 : -1;
    // The mark is kept, the scale is not a control any more: no focus ring
    // left standing round the answer.
    if (!on && [scale, check, skip].includes(document.activeElement)) document.activeElement.blur();
    paintMeter();
    // С ответом в блоке прибавилось: карточка счета подросла, а на широком
    // экране пришли еще и кампусы — стене осталось меньше. Меряем сразу,
    // иначе до первого движения она стоит во всю высоту и вылезает за край.
    if (!on) grow();

    if (plays) glide(from);
  }

  // ---------- Render ----------
  function render() {
    CITIES.forEach((c) => {
      cityEls[c.key].toggle.classList.toggle('on', !!state.active[c.key]);
    });

    const set = selected();
    tiles.forEach((tile, code) => tile.classList.toggle('off', !set.has(code)));

    REGIONS.forEach((region) => {
      groupCountEls[region.key].textContent = region.codes.filter((code) => set.has(code)).length;
    });

    paintMeter();
  }

  // Кадр 0 спрашивает, кадр 1 отвечает, кадр 2 открывает стену. Там, где
  // страница просто прокручивается, каркас кадров не играет — он просит сразу
  // последний, — и ответ ждет не такта, а кнопки.
  //
  // Except for a reader who has asked for less movement. For them the page is
  // not a story that plays but a page that is simply there, and the shell puts
  // every block into the state it ends in. A block holding its question would
  // be the one place that never got there: the number of countries was never
  // shown at all unless they found the scale and answered it.
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  function step(i) {
    if (!walks()) {
      // Без кадров ответ и стена приходят вместе — их разводит setAsking.
      setAsking(still.matches ? false : !checked);
      return;
    }
    setAsking(i < 1);
    // Третий кадр — стена. Ответ на шкале к этому моменту уже прочитан, и
    // шкала уходит, освобождая флагам свои полторы сотни пикселей. На широком
    // экране она складывается плавно — стена ждет, пока карточка над ней
    // осядет, иначе флаги приезжают в еще едущую раскладку. На телефоне шкала
    // пропадает разом, и ждать нечего.
    setWall(i >= 2, phone.matches ? 0 : 280);
  }

  // The answer does not come before the reader has put a mark down. Asked
  // because the reader wants to go on, it also shows them what is missing;
  // asked `quiet`ly — by anything that only wants to know — it just answers.
  function hold(i, { quiet = false } = {}) {
    if (i !== 1 || guess !== null || skipped) return false;
    if (!quiet) nudge();
    return true;
  }

  setAsking(true);
  setWall(false, 0);
  render();
  layout();
  // Стена листается пальцем, и место, на котором ее бросили, — такое же
  // положение картинки, как поворот планеты: вернувшись в раздел, читатель
  // застает ее с первой строки, а не с середины Африки. Возвращает ее toTop(),
  // а не простое обнуление: на айфоне мах оставляет после себя инерцию, и
  // ноль, записанный ей поперек, она перетирает обратно.
  return {
    step,
    hold,
    open: () => {
      toTop(grid);
      // И ход по стене с клавиатуры — туда же, к первому флагу: читатель,
      // вернувшийся в раздел, застает ее с начала целиком.
      rove(order[0]);
    }
  };
}
