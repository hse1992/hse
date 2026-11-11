// Total floor area of HSE buildings, measured in things you can picture.

import { CITIES, AREA_TOTAL, STUDENTS, STAFF } from '../data/hse.js';
import { nf, plural } from '../lib/format.js';
import { mountCanvas, onResize, stepAhead } from '../lib/ui.js';
import { mountTownMap } from '../lib/town-map.js';

// Сколько у блока тактов, решает ширина: на телефоне фигуры идут по одной на
// экран, и порядок там свой. Спрашивается один раз, до meta, — число шагов
// каркас читает при сборке страницы.
const PHONE = window.matchMedia('(max-width: 860px)').matches;

// Facts about the buildings themselves — they live here, not in data/hse.js,
// which only knows about the university.
const BUILDINGS = 196;

// Two metrics the first switch flips between; `field` is the key in data/hse.js.
const METRICS = [
  { key: 'total', label: 'Общая площадь', field: 'area' },
  { key: 'study', label: 'Учебные площади', field: 'areaStudy' }
];

// Two objects we compare to. A FIFA-size pitch is 105 × 68 m; the flats of one
// five-storey block with two entrances add up to 1 680 m².
const HOUSE_M2 = 1680;
const FLATS = 40;                     // flats in one block, two entrances
const FLAT_M2 = HOUSE_M2 / FLATS;
const UNITS = [
  {
    key: 'field',
    label: 'В футбольных полях',
    noun: 'футбольных полей',
    legend: '1 футбольное поле — 105 × 68 м',
    m2: 105 * 68,
    ratio: 105 / 68
  },
  {
    key: 'house',
    label: 'В пятиэтажках',
    noun: 'пятиэтажных домов',
    legend: `1 пятиэтажка — 2 подъезда, ${FLATS} квартир общей площадью ${nf(HOUSE_M2)} м²`,
    m2: HOUSE_M2,
    ratio: 1.55                 // two entrances wide, five floors high
  }
];

export const meta = {
  id: 'area',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Здания',
  // The reader arrives straight from the arena, so the section opens with a
  // screen of its own: the stadium the university has not got, and the town
  // its buildings make instead. Обе строки приходят разом — вторая только
  // договаривала первую, и такт на нее был тактом без картинки. It does not
  // leave — it goes up to the top of the section and stays there while the
  // rest is told under it.
  lead: {
    exit: 'top',
    // Goes up in the same beat as the map of the town comes up under it:
    // parking alone would be a beat with nothing new on the screen.
    together: true,
    value: 'Для расположения всех студентов и сотрудников у Вышки нет своего стадиона <span class="area-soon">(пока)</span>',
    text: `<span class="area-lead-line" style="display: block">Но есть <span class="area-mark">${nf(BUILDINGS)} ${plural(BUILDINGS, 'здание', 'здания', 'зданий')}</span>. А это уже целый город</span>`
  },
  title: 'В тесноте да не в обиде',
  subtitle: 'На сколько это много?',
  intro: true,
  // Steps: the map of the town; the heading with the area of its buildings и
  // сразу поля, в которых она измерена; пятиэтажки с вопросом, который обе
  // цифры поднимают; ответ под каждой из них; и сама визуализация. Заголовок
  // без картинки и вопрос без картинки были тактами, на которых прибавлялась
  // одна строка, — теперь они приходят вместе с тем, о чем говорят. На
  // телефоне фигуры идут по одной на экран, и вопрос стоит до них, так что
  // тактов там больше: там ответ приходит под каждой фигурой отдельно, на том
  // же экране, где она стоит.
  steps: PHONE ? 7 : 5,
  opensOnStep: true,
  // The area the block ends on flies into the lead-in of the studies, where it
  // turns into the number of programmes those buildings are there for.
  handoff: 'area'
};

// How many whole pitches the whole university comes to — the figure the first
// step of the scene is about.
const FIELDS_TOTAL = Math.round(AREA_TOTAL / (105 * 68));
const HOUSES_TOTAL = Math.round(AREA_TOTAL / HOUSE_M2);

// What the area comes to once the people are put into it: everyone the section
// speaks of, spread over the pitches and over the flats.
const PEOPLE = STUDENTS + STAFF;
const PER_PITCH = Math.round(PEOPLE / FIELDS_TOTAL);
const PER_FLAT = Math.round(PEOPLE / (HOUSES_TOTAL * FLATS));

export function init(root) {
  'use strict';

  // Узкий экран решает и раскладку, и то, какие имена у городов в карточках:
  // разметка строится раньше, чем доходит до самой истории, поэтому
  // спрашивается он здесь, до всего остального.
  const phone = window.matchMedia('(max-width: 860px)');

  // Canvas has no CSS variables, so the palette is read once from the tokens —
  // read and not copied: a value written out here goes on being the old one
  // after the token beside it has changed, and nothing says so.
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const PITCH = token('--pitch');
  // The markings mown into the pitch: white at two strengths, which is not
  // a colour of the page and has no token to be read from.
  const LINE = 'rgba(255,255,255,0.75)';
  const MOW = 'rgba(255,255,255,0.13)';
  const WALL = token('--house-wall');
  const ROOF = token('--house-roof');
  const WINDOW = token('--house-window');
  const DOOR = token('--house-door');
  const WINDOW_LIT = token('--house-window-lit');
  const DOT = token('--hse-blue');   // a person on the pitch, in corporate blue
  const GAP = 0.12;               // gap between icons, in icon widths

  // ---------- Markup ----------
  // The switches and the score card are specific to this visualisation, so
  // their styles live here and not in layout.css.
  root.classList.add('area-body');
  root.innerHTML = `
    <style>
      /* The second line of the lead-in grows into place by height, so it needs
         a box of its own. */
      .area-lead-line {
        display: block;
      }

      /* An aside inside the opening line, so it is set back from it. */
      .area-soon {
        color: var(--text-caption);
      }

      /* The steps of the scene lie over the block, in two columns of one grid:
         the pitches on the left, the blocks of flats on the right. One grid
         rather than two halves, so both start at the same height however the
         lines above them wrap. The visualisation itself waits underneath,
         faded out, so nothing shifts when they swap. */
      .area-body {
        position: relative;
      }

      .area-steps {
        position: absolute;
        inset: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px 64px;
        align-content: center;
        align-items: start;
        pointer-events: none;
      }

      /* Whatever is leaving goes quickly and whatever is arriving waits for
         it, so the two never sit on top of each other for long. */
      .area-step {
        display: flex;
        flex-direction: column;
        gap: 16px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(18px);
        transition: opacity 300ms ease, transform 300ms ease, visibility 300ms;
      }

      .area-step.on {
        opacity: 1;
        visibility: visible;
        transform: none;
        transition: opacity 620ms ease 180ms, transform 620ms ease 180ms, visibility 0s;
      }

      /* Room for two lines whether the line takes them or not, so the two
         figures stand on one level. */
      .area-step-line {
        margin: 0;
        min-height: 2.4em;
        font-size: 2rem;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.02em;
        text-wrap: pretty;
      }

      /* The multiplier sits under its icon rather than beside it: both icons
         then take the whole column and come out the same size, whether the
         number beside them is two digits or three, and nothing crowds the
         gutter between the two halves. */
      .area-step-fig {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
      }

      /* On a short screen the icons give way — see fitFigures(). */
      .area-step-pitch,
      .area-step-house {
        width: 100%;
        max-width: 420px;
        border-radius: 4px;
        overflow: hidden;
      }

      .area-step-pitch { aspect-ratio: 105 / 68; }
      .area-step-house { aspect-ratio: 1.55; }

      /* Everything the story shows — the town and the steps over it — lies in
         one stage above the visualisation, so on a phone the two can be pinned
         to the screen together while the travel below scrolls under them. */
      .area-stage,
      .area-tell {
        position: absolute;
        inset: 0;
      }

      .area-run { display: none; }

      /* The town the buildings make, over the whole block — what comes up
         under the lead-in as it goes to the top. It steps aside for the
         figures the same way they come and go. */
      .area-town {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        container-type: size;
        --town-note: 36px;      /* the line over the map: 24 of type, 12 of air */
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 300ms ease, visibility 300ms;
      }

      .area-town.on {
        opacity: 1;
        visibility: visible;
        transition: opacity 620ms ease, visibility 0s;
      }

      /* The line over the map: what the map is there to show. It stands right
         on the map, so the two are laid out as one: the line takes --town-note
         of the block, the map keeps its proportions in the rest of it, and
         together they stand in the middle. */
      .area-town-note {
        margin: 0 0 12px;
        text-align: center;
        color: var(--text-caption);
        font-size: 1rem;
        line-height: 24px;
      }

      .area-town-map {
        flex: none;
        width: min(100cqw, calc((100cqh - var(--town-note)) * 1.6));
        height: min(calc(100cqh - var(--town-note)), calc(100cqw / 1.6));
        margin: 0 auto;
        display: flex;
      }

      /* The heading of the figures: the area itself, over both columns. */
      .area-step-title {
        grid-column: 1 / -1;
        margin: 0;
        font-size: 2rem;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.02em;
        text-wrap: pretty;
      }

      /* The question both figures raise, under the two of them. */
      .area-step-question {
        grid-column: 1 / -1;
        margin: 0;
        font-size: 2rem;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: -0.02em;
        text-wrap: pretty;
      }

      /* What each figure comes to once the people are in it — the answer the
         whole scene leads to, so it is set in full ink, not as a caption. */
      .area-step-note {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.35;
        color: var(--text);
        text-wrap: pretty;
      }

      /* Everything of a step keeps its place in the layout from the start and
         only fades in when its turn comes, so nothing below it ever jumps. */
      .area-step-title,
      .area-step-question,
      .area-step-note {
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 300ms ease, transform 300ms ease, color 620ms ease;
      }

      .area-step-title.on,
      .area-step-question.on,
      .area-step-note.on {
        opacity: 1;
        transform: none;
        transition: opacity 620ms ease 180ms, transform 620ms ease 180ms, color 620ms ease;
      }

      /* Once the answers are on the screen the question stays with them, but
         steps back: they are what is read now. */
      .area-step-question.is-answered {
        color: var(--text-caption);
      }

      .area-step-times {
        flex: none;
        font-size: 2.25rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      /* While the step is on, the visualisation is out of the way — invisible
         and not clickable. */
      .area-inner {
        transition: opacity 620ms ease 180ms;
      }

      .area-inner.off {
        opacity: 0;
        pointer-events: none;
        transition: opacity 300ms ease;
      }

      /* The figure on the lead-in screen is marked out in the corporate blue.
         It lives in the shell markup, which is drawn a moment before this
         style arrives — that is fine, the section starts well above the fold. */
      .area-mark {
        background: var(--hse-blue);
        color: #FFFFFF;
        padding: 0.06em 0.3em;
        border-radius: 0.2em;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      /* One row of switches above both columns, so the city cards and the
         score card start at the same height. */
      .area-inner {
        flex: 1;
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .area-cols {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 16px;
        align-items: stretch;
      }

      /* Narrow screens have no room for both switches side by side — they wrap,
         the units one staying on top. */
      .area-switches {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 24px;
        padding: 2px 0;
      }

      /* Same switch as the cities have, with a label on each side. */
      .area-switch {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .area-switch-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--check-inactive-label);
        cursor: pointer;
        user-select: none;
        transition: color 160ms ease;
      }

      .area-switch-label.on {
        color: var(--text);
        font-weight: 600;
      }

      /* Nothing here is coloured by city, so the switches are plain green. */
      .area-inner .city-card .toggle.on {
        background: var(--toggle-on);
      }

      .area-score {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .area-score-value {
        font-size: 3.5rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .area-score-note {
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      /* On phones the wrappers dissolve, so the section itself lays out the
         picture, the switches and the cities — the switches end up under the
         sticky picture instead of above it. */
      @media (max-width: 860px) {
        .area-inner,
        .area-cols { display: contents; }

        /* Припаркованный экран — заголовок блока, и фразе про стадион в этом
           заголовке не место. Прочитана она на самом переходном экране, где
           ей отдан целый экран и где она договаривает шутку предыдущего
           раздела; наверху каждого экрана блока нужна только строка, про
           которую нарисован город под ней — «Но есть 196 зданий. А это уже
           целый город». Три-четыре строки заголовка сверху отнимали у города
           треть экрана, и он сжимался в полосу посередине.

           Складывается она вместе с уходом экрана (--lead-away), а не
           пропадает рывком: такт на телефоне отыгрывается плавно, и в любой
           его точке картинка верная — сколько заголовка осталось, столько и
           видно. Своей высоты у текста нет, отнимать не от чего, поэтому
           блок меряет ее сам и кладет в --val-h (measureLead ниже). */
        #area .viz-lead-value {
          overflow: hidden;
          height: calc(var(--val-h, 0px) * (1 - var(--lead-away, 0)));
          opacity: calc(1 - var(--lead-away, 0) * 1.6);
        }

        /* Зазор между строками экрана уходит вместе с заголовком: иначе
           припаркованная строка резервировала бы под себя лишние 16 пикселей
           пустоты — каркас меряет парковку по размаху детей экрана. */
        #area .viz-lead {
          gap: calc(16px * (1 - var(--lead-away, 0)));
        }

        .area-score-value { font-size: 2.5rem; }
        .area-score-note { font-size: 0.875rem; }

        /* Площадь каждого города в его карточке уходит: сколько метров
           набралось, крупно сказано в карточке над списком, а от самой
           карточки на телефоне нужно только имя города и включен ли он.
           Строка цифр добавляла каждой карточке высоты там, где два ряда
           городов и без того стоят у нижнего края. */
        #area .city-stats { display: none; }

        /* On a phone the page is scrolled and no one plays the eight steps:
           the shell calls the last of them once, and the town, the pitches,
           the blocks of flats and the question the two raise were never shown
           at all. So the stage is pinned to the screen, and the travel under
           it is walked a stretch at a time — a step for every stretch. */
        /* Первой на узком экране идет сцена, а не калькулятор. Общее правило
           поднимает картинку блока (.col-right) наверх и прибивает ее там —
           но калькулятор принадлежит концу блока, а не его истории, и, встав
           выше сцены, он занимал верх экрана с самого начала: город из
           зданий, поля и пятиэтажки показывались под ним, в нижней половине.
           Сцена забирает себе место перед ним. */
        .area-stage { position: static; order: -2; }

        /* Под переходным экраном, который остался наверху: он читается как
           заголовок блока и занимает верх каждого экрана, так что сцена
           прибивается под ним и на столько же ниже ростом. */
        .area-tell {
          position: sticky;
          top: var(--lead-hold, 0px);
          height: calc(100dvh - var(--hint-room) - var(--lead-hold, 0px));
        }

        /* Путь истории меряется в svh, а не в dvh. dvh ходит вместе с
           панелью браузера: она прячется и показывается на ходу, путь от
           этого то растягивается, то укорачивается — а блок считает по нему,
           сколько состояний уже позади. Стоило пути укоротиться, и пройденное
           оказывалось за последней границей: блок отвечал «история
           рассказана», и один свайп проносил мимо все, что в ней оставалось.
           svh — это тот же экран, но с панелью: он не меняется. */
        .area-run {
          display: block;
          height: 245svh;
        }

        /* The calculator is read in the strip under a picture pinned to the
           top of the screen, and everything it is steered by has to stand in
           that strip: both switches and every city. The picture gives up the
           few dozen pixels they are short of — otherwise the switch of what is
           counted sits behind its lower edge, and the list of cities begins
           with nothing above it to say what the numbers in it are.

           Было 39: в полосе стояла еще строка кнопок «Снять все» и «Вернуть
           все». Кнопок на телефоне больше нет, и поля забирают их пикселы
           обратно себе. */
        .area-body .canvas-card { height: 43dvh; }

        /* Картинка перестает быть прибитой: блок помещается на экран целиком,
           и прибивать ее не к чему — зато при прокрутке она наезжала на
           переключатели, и те уходили под нее. На низком экране все наоборот:
           там блок в экран не влезает, и прибитая картинка нужна, чтобы было
           видно, что меняется. */
        @media (min-height: 760px) {
          .area-body .col-right { position: static; }
        }


        /* Карта города занимает всю сцену, а не полосу посередине: у нее свои
           пропорции только потому, что в них ровно укладывается сам город, —
           а вокруг него лежит пояс дорог и леса, которым есть чем заполнить
           экран любой формы. */
        .area-town-map {
          flex: 1;
          width: 100%;
          height: auto;
          min-height: 0;
        }

        .area-switches { gap: 6px 24px; padding: 0; }

        /* Одна колонка: заголовок наверху, продолжением припаркованной строки
           «Но есть 196 зданий», под ним фигура во всю оставшуюся высоту, а
           под ней вопрос. Фигура стоит в своей строке по центру: прижатая к
           верху, она оставляла под собой треть пустого экрана — поле на узком
           телефоне шире стать не может, и место под ним ничем не занять,
           значит, его нужно разделить поровну.

           Обе фигуры стоят в одной клетке, одна поверх другой. Делить высоту
           им нельзя — обе остались бы мелкими, — но и убирать уходящую из
           раскладки через display: none тоже: тогда поле не сменяется
           пятиэтажкой, а просто исчезает, и в том же кадре на пустом месте
           возникает другая картинка. В одной клетке уходящая гаснет, пока
           приходит следующая, как это и задумано у .area-step, — и ни одна
           не отнимает у другой ни пикселя высоты. Видно наложение только те
           полсекунды, пока идет подмена: показана всегда ровно одна. */
        .area-steps {
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr auto;
          gap: 16px;
          align-content: stretch;
          align-items: stretch;
        }

        .area-step-title { grid-area: 1 / 1; }
        .area-step { grid-area: 2 / 1; }
        .area-step-question { grid-area: 3 / 1; }

        .area-step {
          justify-content: center;
          min-height: 0;
        }

        /* Вопрос не держит себе места заранее, а разворачивается на своем
           такте — по мерке (--q-h) и плавно, вместе с тактом. Три строки,
           оставленные под него с самого начала, и были той пустотой под
           полем; а появись он рывком, фигура прыгала бы вверх. Теперь она
           уезжает ровно настолько, насколько вырос вопрос. */
        .area-step-question {
          overflow: hidden;
          max-height: 0;
          transition: max-height 620ms ease, opacity 300ms ease,
                      transform 300ms ease;
        }

        .area-step-question.on { max-height: var(--q-h, 50vh); }

        /* Карта уходит на такте заголовка, так что под ним она не стоит
           никогда — и подвигать ее под него нечего. */
        .area-town {
          transition: opacity 300ms ease, visibility 300ms;
        }

        .area-town.on {
          transition: opacity 620ms ease, visibility 0s;
        }

        /* «Общая площадь этих зданий» с числом приходит на экран одна, без
           поля и без пятиэтажки: до них еще два такта. Набранная в 22
           пикселя, она терялась в пустом экране — это главная цифра блока, и
           весит она столько же, сколько заголовок раздела. Здесь она идет от
           ширины: на узком телефоне помельче, на широком подходит к своим
           двум ремам с большого экрана. */
        .area-step-title {
          font-size: clamp(1.625rem, 7.2vw, 2rem);
          text-wrap: balance;
        }

        /* Вопрос под обеими цифрами — длинное предложение, и в размер
           заголовка он разворачивается в полэкрана. Он на ступеньку мельче. */
        .area-step-question { font-size: 1.5rem; }

        /* Плашке с числом при таком кегле нужно чуть больше воздуха по бокам,
           иначе цифры упираются в края. */
        .area-step-title .area-mark { padding: 0.1em 0.34em; }

        .area-step-line { font-size: 1rem; }
        .area-step-note { font-size: 0.9375rem; }
        .area-step-times { font-size: 1.375rem; }
      }
    </style>

    <div class="area-stage">
      <div class="area-tell">
        <div class="area-town" data-el="town">
          <p class="area-town-note">Тут правда ${nf(BUILDINGS)} ${plural(BUILDINGS, 'здание', 'здания', 'зданий')}</p>
          <div class="area-town-map" data-el="townMap"></div>
        </div>

        <div class="area-steps">
          <p class="area-step-title" data-el="areaTitle">Общая площадь этих зданий <span class="area-mark">${nf(AREA_TOTAL)} м²</span></p>

          <div class="area-step area-step-fields" data-el="stepFields">
            <p class="area-step-line">Это площадь ${nf(FIELDS_TOTAL)} футбольных полей</p>
            <div class="area-step-fig">
              <div class="canvas-wrap area-step-pitch" data-el="stepPitch"></div>
              <div class="area-step-times">&times;&nbsp;${nf(FIELDS_TOTAL)}</div>
            </div>
            <p class="area-step-note" data-el="pitchNote">Это ${nf(PER_PITCH)} «${plural(PER_PITCH, 'футболист', 'футболиста', 'футболистов')}» на одном поле</p>
          </div>

          <div class="area-step area-step-houses" data-el="stepHouses">
            <p class="area-step-line">Или площадь всех квартир в ${nf(HOUSES_TOTAL)} ${plural(HOUSES_TOTAL, 'пятиэтажке', 'пятиэтажках', 'пятиэтажках')}</p>
            <div class="area-step-fig">
              <div class="canvas-wrap area-step-house" data-el="stepHouse"></div>
              <div class="area-step-times">&times;&nbsp;${nf(HOUSES_TOTAL)}</div>
            </div>
            <p class="area-step-note" data-el="houseNote">Или по ${nf(PER_FLAT)} «${plural(PER_FLAT, 'жильцу', 'жильца', 'жильцов')}» в каждой квартире ${nf(FLAT_M2)} м²</p>
          </div>

          <p class="area-step-question" data-el="question">Много это или мало, учитывая сколько в Вышке студентов и сотрудников?</p>
        </div>
      </div>

      <!-- The travel the story needs on a phone: the stage above is pinned to
           the screen and this scrolls under it, a stretch of it for every step.
           Nothing on a wide screen, where the story is told in beats. -->
      <div class="area-run" data-el="run" aria-hidden="true"></div>
    </div>

    <div class="area-inner">
      <div class="area-switches">
        <div class="area-switch" data-el="unitSwitch">
          <span class="area-switch-label" data-value="${UNITS[0].key}">${UNITS[0].label}</span>
          <button type="button" class="toggle" role="switch"><span class="toggle-knob"></span></button>
          <span class="area-switch-label" data-value="${UNITS[1].key}">${UNITS[1].label}</span>
        </div>
        <div class="area-switch" data-el="metricSwitch">
          <span class="area-switch-label" data-value="${METRICS[0].key}">${METRICS[0].label}</span>
          <button type="button" class="toggle" role="switch"><span class="toggle-knob"></span></button>
          <span class="area-switch-label" data-value="${METRICS[1].key}">${METRICS[1].label}</span>
        </div>
      </div>

      <div class="area-cols">
        <div class="col-left">
          <div class="city-list" data-el="cityList"></div>
          <div class="actions">
            <button type="button" class="btn" data-el="clearAll">Снять все</button>
            <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
          </div>
        </div>

        <div class="col-right">
          <div class="meter-card">
            <div class="meter-title" data-el="scoreTitle"></div>
            <div class="area-score">
              <span class="area-score-value" data-el="count"></span>
              <span class="area-score-note">в <span data-el="area"></span> м²</span>
            </div>
          </div>

          <div class="canvas-card">
            <div class="canvas-legend">
              <span class="canvas-legend-swatch" data-el="legendSwatch"></span>
              <span data-el="legendText"></span>
            </div>
            <div class="canvas-wrap" data-el="canvasWrap"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- Высота заголовка переходного экрана ----------
  // На телефоне заголовок складывается вместе с уходом экрана — см. стили
  // выше. У текста нет высоты, от которой можно отнять долю, поэтому она
  // меряется тут: строка временно распускается в свою настоящую высоту, и то,
  // что получилось, кладется в --val-h. Заново — на каждом изменении размера:
  // кегль заголовка идет от --intro-k и --lead-fit, а переносы — от ширины
  // окна, так что вчерашняя мерка тут не годится.
  const section = root.closest('.viz-section');
  const leadValue = section && section.querySelector('.viz-lead-value');
  function measureLead() {
    if (!section || !leadValue) return;
    if (!phone.matches) { section.style.removeProperty('--val-h'); return; }
    leadValue.style.height = 'auto';
    const tall = leadValue.offsetHeight;
    leadValue.style.height = '';
    section.style.setProperty('--val-h', `${tall}px`);
  }
  // ---------- Хвост блока под сценой ----------
  // На телефоне за сценой идет калькулятор: карточка с числом, картинка,
  // переключатели и города. Ровно в этом месте блок отдает себя читателю, и
  // ход приводит страницу так, чтобы калькулятор встал под верхний край.
  //
  // Но каркас знает и другую границу — низ блока, — и если хвост ниже экрана,
  // она оказывается ближе: страница останавливалась, не довезя сотню пикселей,
  // и калькулятор приходил с белой полосой над собой. Полоса эта и есть то,
  // чего хвосту не хватает до экрана: обе границы — одно место, когда хвост
  // ровно в экран. Недостающее отдается картинке, ей всегда мало.
  //
  // Меряется это живьем, а не задается долей экрана: высота карточки с числом,
  // переключателей и городов — фиксированные пикселы, и доля то не добирала,
  // то вылезала.
  const stageEl = root.querySelector('.area-stage');
  // Именно карточка калькулятора: у карты города в сцене класс тот же.
  const canvasCard = root.querySelector('.col-right .canvas-card');

  // Полоса подсказки внизу: блоку она не принадлежит. Величина лежит в
  // --hint-room, а у переменной нет вычисленного значения — ее меряют.
  function hintRoom() {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;'
      + 'height:var(--hint-room,0px);pointer-events:none';
    root.appendChild(probe);
    const tall = probe.offsetHeight;
    probe.remove();
    return tall;
  }

  function fitTail() {
    if (!stageEl || !canvasCard) return;
    canvasCard.style.removeProperty('height');
    if (!phone.matches) return;
    const room = window.innerHeight - hintRoom();
    const tail = root.getBoundingClientRect().bottom
      - stageEl.getBoundingClientRect().bottom;
    const grow = Math.round(room - tail);
    // Хвост выше экрана — все как было: низ блока лежит дальше калькулятора,
    // ход приводит сначала к нему, а остаток хвоста читается следующим.
    if (grow > 2) canvasCard.style.height = `${canvasCard.offsetHeight + grow}px`;
  }

  measureLead();
  fitTail();
  // Следим за телом блока, а не за самой строкой: мерка меняет ее высоту, и
  // наблюдатель на ней звал бы сам себя по кругу.
  onResize(root, () => { measureLead(); fitTail(); });

  // ---------- State ----------
  const state = {
    metric: METRICS[0].key,
    unit: UNITS[0].key,
    active: { msk: true, spb: true, nn: true, perm: true }
  };

  const unit = () => UNITS.find((u) => u.key === state.unit);

  const cityArea = (c) => c[METRICS.find((m) => m.key === state.metric).field];

  const selectedArea = () =>
    CITIES.reduce((sum, c) => sum + (state.active[c.key] ? cityArea(c) : 0), 0);

  // ---------- Canvas painting ----------
  const { canvas, ctx } = mountCanvas($('canvasWrap'), paint,
    'Площадь выбранных зданий, выложенная футбольными полями или пятиэтажками');
  let shown = null;         // icons currently drawn, animated
  let animFrame = null;

  // The grid is always built for the whole university, so an icon keeps the
  // same size whatever is selected — only the number of drawn icons changes.
  function layout(cssW, cssH) {
    const u = unit();
    const cells = Math.round(AREA_TOTAL / u.m2);
    let best = null;
    for (let cols = 1; cols <= cells; cols++) {
      const rows = Math.ceil(cells / cols);
      const w = Math.min(
        cssW / (cols + GAP * (cols - 1)),
        cssH / (rows / u.ratio + GAP * (rows - 1))
      );
      if (!best || w > best.w) best = { cols, rows, w };
    }
    const w = best.w, h = w / u.ratio, gap = w * GAP;
    return {
      cols: best.cols, w, h, gap,
      x: (cssW - (best.cols * w + (best.cols - 1) * gap)) / 2,
      y: (cssH - (best.rows * h + (best.rows - 1) * gap)) / 2
    };
  }

  // One pitch: mown grass, the halfway line and the centre circle. Both the
  // grid and the single large pitch of the first step go through here.
  function drawPitch(g, x, y, w, h) {
    g.fillStyle = PITCH;
    g.fillRect(x, y, w, h);
    g.fillStyle = MOW;
    const band = w / 6;
    for (let i = 1; i < 6; i += 2) g.fillRect(x + i * band, y, band, h);

    g.strokeStyle = LINE;
    g.lineWidth = Math.max(1, w * 0.007);
    g.beginPath();
    g.moveTo(x + w / 2, y);
    g.lineTo(x + w / 2, y + h);
    g.stroke();
    g.beginPath();
    g.arc(x + w / 2, y + h / 2, h * 0.135, 0, Math.PI * 2);
    g.stroke();
  }

  // Only whole pitches are ever drawn — the count on the card is rounded, and
  // the picture has to show exactly that many.
  function paintFields(icons) {
    icons.forEach((c) => drawPitch(ctx, c.x, c.y, c.w, c.h));
  }

  // Five floors of windows and two doors. There are hundreds of blocks on the
  // screen, so a block adds its shapes to four shared paths and the whole
  // district is painted with four fills instead of a fill per window.
  const housePaths = () => ({
    roof: new Path2D(), wall: new Path2D(), win: new Path2D(), door: new Path2D()
  });

  function addHouse(paths, x, y, w, h) {
    paths.roof.rect(x, y, w, h * 0.09);
    paths.wall.rect(x, y + h * 0.09, w, h * 0.91);

    const COLS = 6, ROWS = 5;
    const gx = x + w * 0.08, gw = w * 0.84;
    const gy = y + h * 0.19, gh = h * 0.58;
    const cw = gw / COLS, ch = gh / ROWS;
    const ww = Math.max(1, cw * 0.62), wh = Math.max(1, ch * 0.6);
    for (let r = 0; r < ROWS; r++) {
      for (let i = 0; i < COLS; i++) {
        paths.win.rect(gx + i * cw + (cw - ww) / 2, gy + r * ch + (ch - wh) / 2, ww, wh);
      }
    }

    const dw = Math.max(1, w * 0.07), dh = h * 0.13;
    paths.door.rect(x + w * 0.25 - dw / 2, y + h - dh, dw, dh);
    paths.door.rect(x + w * 0.75 - dw / 2, y + h - dh, dw, dh);
  }

  // `lit` turns the light on in every window, from 0 to 1.
  function fillHouses(g, paths, lit = 0) {
    g.fillStyle = ROOF; g.fill(paths.roof);
    g.fillStyle = WALL; g.fill(paths.wall);
    g.fillStyle = WINDOW; g.fill(paths.win);
    if (lit > 0) {
      g.save();
      g.globalAlpha = lit;
      g.fillStyle = WINDOW_LIT;
      g.fill(paths.win);
      g.restore();
    }
    g.fillStyle = DOOR; g.fill(paths.door);
  }

  function paintHouses(icons) {
    const paths = housePaths();
    icons.forEach((c) => addHouse(paths, c.x, c.y, c.w, c.h));
    fillHouses(ctx, paths);
  }

  function paint() {
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (shown === null) shown = selectedArea() / unit().m2;

    // The card and the picture show the same rounded number of icons.
    const count = Math.round(shown);
    countEl.textContent = nf(count);

    if (count < 1) return;
    const g = layout(cssW, cssH);
    const icons = [];
    for (let i = 0; i < count; i++) {
      icons.push({
        x: g.x + (i % g.cols) * (g.w + g.gap),
        y: g.y + Math.floor(i / g.cols) * (g.h + g.gap),
        w: g.w,
        h: g.h
      });
    }
    if (state.unit === 'house') paintHouses(icons); else paintFields(icons);
  }

  // mode: 'instant' — no animation at all (first paint); 'fill' — grow from an
  // empty canvas, used when the icons themselves change and the count before
  // the switch means nothing; otherwise the count moves from where it was.
  function animateTo(target, mode) {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (mode === 'instant' || shown === null) { shown = target; paint(); return; }
    const from = mode === 'fill' ? 0 : shown;
    if (from === target) { shown = target; paint(); return; }
    const dur = 620, t0 = performance.now();
    const step = (now) => {
      // The frame timestamp can be slightly older than t0, and a negative
      // progress would show a count below zero on the first frame.
      const raw = Math.min(1, Math.max(0, (now - t0) / dur));
      const p = 1 - Math.pow(1 - raw, 3);
      shown = from + (target - from) * p;
      paint();
      if (raw < 1) animFrame = requestAnimationFrame(step);
      else { shown = target; paint(); }
    };
    animFrame = requestAnimationFrame(step);
  }

  // The single pitch and the single block of the first two steps, each on its
  // own little canvas — drawn by the same hand as the ones on the schema.
  const fitCanvas = (pair) => {
    const c = pair.canvas, g = pair.ctx;
    const w = c.clientWidth || 1, h = c.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g, w, h };
  };

  let dots = 0;      // people standing on the pitch of the step
  let lit = 0;        // how far the windows of the block have lit up

  const stepPitch = mountCanvas($('stepPitch'), paintStepPitch);
  function paintStepPitch() {
    const { g, w, h } = fitCanvas(stepPitch);
    drawPitch(g, 0, 0, w, h);
    drawCrowd(g, w, h, dots);
  }

  // The people on the pitch line up as two teams do: each half has its own
  // block, the two mirror each other across the halfway line, and they fill up
  // at the same time — one from each side with every other dot.
  function drawCrowd(g, w, h, n) {
    if (n <= 0) return;
    const perTeam = Math.ceil(PER_PITCH / 2);
    const padX = w * 0.045, padY = h * 0.07;
    const mid = w * 0.02;                       // room left along the halfway line
    const teamW = w / 2 - padX - mid;
    const teamH = h - padY * 2;
    const cols = Math.max(1, Math.round(Math.sqrt(perTeam * (teamW / teamH))));
    const rows = Math.ceil(perTeam / cols);
    const cw = teamW / cols, ch = teamH / rows;
    const r = Math.max(0.8, Math.min(cw, ch) * 0.26);

    g.fillStyle = DOT;
    for (let i = 0; i < n; i++) {
      const team = i % 2;
      const k = (i - team) / 2;
      if (k >= perTeam) continue;
      const c = k % cols, row = Math.floor(k / cols);
      const x = team === 0
        ? padX + cw * (c + 0.5)
        : w - padX - cw * (c + 0.5);
      g.beginPath();
      g.arc(x, padY + ch * (row + 0.5), r, 0, Math.PI * 2);
      g.fill();
    }
  }

  const stepHouse = mountCanvas($('stepHouse'), paintStepHouse);
  function paintStepHouse() {
    const { g, w, h } = fitCanvas(stepHouse);
    const paths = housePaths();
    addHouse(paths, 0, 0, w, h);
    fillHouses(g, paths, lit);
  }

  // The crowd and the light come on the same way everything else does here.
  function tween(from, to, set) {
    const dur = 620, t0 = performance.now();
    let frame = requestAnimationFrame(function run(now) {
      const raw = Math.min(1, Math.max(0, (now - t0) / dur));
      const p = 1 - Math.pow(1 - raw, 3);
      set(from + (to - from) * p);
      if (raw < 1) frame = requestAnimationFrame(run);
    });
    return () => cancelAnimationFrame(frame);
  }

  let stopDots = null, stopLit = null;

  function showCrowd(on) {
    const target = on ? PER_PITCH : 0;
    if (dots === target) return;
    if (stopDots) stopDots();
    stopDots = tween(dots, target, (v) => { dots = v; paintStepPitch(); });
  }

  function lightUp(on) {
    const target = on ? 1 : 0;
    if (lit === target) return;
    if (stopLit) stopLit();
    stopLit = tween(lit, target, (v) => { lit = v; paintStepHouse(); });
  }

  // ---------- DOM rendering ----------
  const cityList = $('cityList');
  const countEl = $('count');
  const areaLabelEl = $('area');
  const scoreTitleEl = $('scoreTitle');
  const legendSwatch = $('legendSwatch');
  const legendTextEl = $('legendText');

  const cityEls = {};
  CITIES.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${phone.matches ? c.short : c.name}</div>
        <div class="city-stats">
          <span class="city-stat"><span class="city-dot" style="background:${c.color}"></span><span class="city-stat-text"></span></span>
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
    cityEls[c.key] = { toggle: toggleBtn, text: card.querySelector('.city-stat-text') };
  });

  // Both switches work the same way: the knob sits on the side of the option
  // that is shown, and the labels are clickable too. Returns a sync function.
  function bindSwitch(name, key, values, mode) {
    const row = $(name);
    const toggle = row.querySelector('.toggle');
    const labels = row.querySelectorAll('.area-switch-label');
    const pick = (value) => {
      state[key] = value;
      render(mode);
    };
    toggle.addEventListener('click', () => {
      pick(state[key] === values[0] ? values[1] : values[0]);
    });
    labels.forEach((label) => {
      label.addEventListener('click', () => pick(label.dataset.value));
    });
    return () => {
      toggle.classList.toggle('on', state[key] === values[1]);
      labels.forEach((label) => {
        label.classList.toggle('on', label.dataset.value === state[key]);
      });
    };
  }

  const syncMetric = bindSwitch('metricSwitch', 'metric', METRICS.map((m) => m.key));
  const syncUnit = bindSwitch('unitSwitch', 'unit', UNITS.map((u) => u.key), 'fill');

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    render();
  });

  function render(mode) {
    syncMetric();
    syncUnit();

    const u = unit();
    scoreTitleEl.textContent = `Укладывается ${u.noun}`;
    legendTextEl.textContent = u.legend;
    legendSwatch.style.background = u.key === 'house' ? WALL : PITCH;
    legendSwatch.style.height = '8px';
    legendSwatch.style.width = `${Math.round(8 * u.ratio)}px`;

    CITIES.forEach((c) => {
      const on = !!state.active[c.key];
      cityEls[c.key].toggle.classList.toggle('on', on);
      cityEls[c.key].text.textContent = `${nf(cityArea(c))} м²`;
    });

    const area = selectedArea();
    areaLabelEl.textContent = nf(area);

    // The big number counts along with the icons — paint() keeps it in sync.
    animateTo(area / u.m2, mode);
  }

  // ---------- Scene ----------
  // The town the buildings make; the heading with their area; one pitch and
  // how many of them fit; the same area in blocks of flats beside it; the
  // question the two raise; the answer under each of them — the crowd on the
  // pitch and the light in the windows; and then the visualisation itself.
  const townEl = $('town');
  const titleEl = $('areaTitle');
  const fieldsStepEl = $('stepFields');
  const housesStepEl = $('stepHouses');
  const questionEl = $('question');
  const pitchNoteEl = $('pitchNote');
  const houseNoteEl = $('houseNote');
  const innerEl = root.querySelector('.area-inner');
  const host = root.closest('.viz-section') || root.parentElement;
  const LAST = meta.steps - 1;

  // The same town as the town section draws — see lib/town-map.js.
  // На телефоне тот же город показывается втрое уже, и дом в восемь пикселей
  // читается как точка: там он просит дома покрупнее.
  const townMap = mountTownMap($('townMap'), { fill: phone.matches, tall: phone.matches });

  function step(i) {
    const told = i < LAST;
    // На телефоне фигуры идут друг за другом, а не рядом: поле и пятиэтажка
    // в двух колонках на треть экрана — это две мелкие картинки вместо одной
    // понятной. Порядок тот же, просто каждая получает экран целиком, и свое
    // пояснение она приносит с собой.
    if (phone.matches) {
      // Город уходит вместе с тактом, который называет площадь: карта
      // ответила на свой вопрос — «196 зданий, а это уже целый город», — и
      // дальше речь о метрах, а не о домах. Держать ее под заголовком значит
      // показывать ответ на прошлый вопрос под новым.
      //
      // Порядок на телефоне другой, чем на широком экране: сначала площадь,
      // следом вопрос о ней — и только потом поле и пятиэтажка, которые на
      // него отвечают. Вопрос встает внизу экрана и с места больше не уходит:
      // фигуры приходят между ним и заголовком, в свободную строку сетки.
      townEl.classList.toggle('on', told && i === 0);
      titleEl.classList.toggle('on', told && i >= 1);
      questionEl.classList.toggle('on', told && i >= 1);
      questionEl.classList.remove('is-answered');
      fieldsStepEl.classList.toggle('on', told && i >= 2 && i <= 3);
      pitchNoteEl.classList.toggle('on', told && i === 3);
      housesStepEl.classList.toggle('on', told && i >= 4);
      houseNoteEl.classList.toggle('on', told && i >= 5);
      showCrowd(told && i >= 3);
      lightUp(told && i >= 5);
      innerEl.classList.toggle('off', told);
      host.classList.toggle('lead-gone', !told);
      return;
    }
    townEl.classList.toggle('on', told && i === 0);
    titleEl.classList.toggle('on', told && i >= 1);
    fieldsStepEl.classList.toggle('on', told && i >= 1);
    housesStepEl.classList.toggle('on', told && i >= 2);
    questionEl.classList.toggle('on', told && i >= 2);
    // Обе фигуры стоят рядом, и ответ у них общий: и толпа на поле, и свет в
    // окнах приходят одним тактом — порознь это были два такта на одну мысль.
    questionEl.classList.toggle('is-answered', told && i >= 3);
    pitchNoteEl.classList.toggle('on', told && i >= 3);
    houseNoteEl.classList.toggle('on', told && i >= 3);
    showCrowd(told && i >= 3);
    lightUp(told && i >= 3);
    innerEl.classList.toggle('off', told);
    // На телефоне переходный экран припаркован наверху и читается как
    // заголовок блока. Когда блок отдан читателю, место под ним нужнее
    // переключателям, а какой это раздел, говорит полоска сверху.
    host.classList.toggle('lead-gone', !told);
  }

  // The heading, both figures with their notes and the question under them
  // all have to fit under the lead-in that has gone up, however short the
  // screen. The text around the icons cannot give way, so the icons do: they
  // shrink by exactly what does not fit. Measured rather than worked out in
  // CSS, so a line that wraps on a narrower screen is taken into account too.
  const stepsEl = root.querySelector('.area-steps');
  const iconEls = [$('stepPitch'), $('stepHouse')];
  const BREATHE = 24;                 // left free above the heading and below the question
  // An icon smaller than this stops reading as a picture. A phone column is
  // narrower than a wide-screen one to begin with, so the floor is lower there.
  const LEAST = phone.matches ? 104 : 160;

  // Мерка для телефона: какой высоты вопрос. Он разворачивается на своем
  // такте, а у текста своей высоты нет — отнимать не от чего. Снимается она
  // на свободной высоте, в том состоянии, в котором вопрос встанет.
  function measureParts() {
    if (!phone.matches) {
      host.style.removeProperty('--q-h');
      return;
    }
    // Своя высота вопроса — та, что под обрезанием: сама коробка растянута на
    // строку сетки и о содержимом ничего не говорит.
    host.style.setProperty('--q-h', `${questionEl.scrollHeight}px`);
  }

  function fitFigures() {
    measureParts();
    // На телефоне фигура стоит в своей строке сетки и центруется в ней, так
    // что считать нужно одно: влезло ли в эту строку то, что в ней лежит.
    // Строка сжимается, когда снизу разворачивается вопрос, — и фигура
    // уступает ему ровно столько, сколько он забрал.
    if (phone.matches) {
      const step = root.querySelector('.area-step.on');
      iconEls.forEach((el) => { el.style.maxWidth = ''; });
      if (!step) return;
      const over = step.scrollHeight - step.clientHeight;
      if (over <= 0) return;
      const icon = iconEls[0];
      const width = Math.max(LEAST,
        (icon.offsetHeight - over) * (icon.offsetWidth / icon.offsetHeight));
      iconEls.forEach((el) => { el.style.maxWidth = `${Math.floor(width)}px`; });
      return;
    }
    const room = stepsEl.clientHeight - BREATHE * 2;
    if (room <= 0) return;
    iconEls.forEach((el) => { el.style.maxWidth = ''; });
    // Layout positions, not screen ones: the parts still waiting for their
    // step are shifted down by a transform, and that must not count.
    for (let pass = 0; pass < 2; pass++) {
      const used = questionEl.offsetTop + questionEl.offsetHeight - titleEl.offsetTop;
      const over = used - room;
      if (over <= 0) return;
      const icon = iconEls[0];
      const width = Math.max(LEAST, (icon.offsetHeight - over) * (icon.offsetWidth / icon.offsetHeight));
      iconEls.forEach((el) => { el.style.maxWidth = `${Math.floor(width)}px`; });
    }
  }
  onResize(stepsEl, fitFigures);
  // Следим и за самими фигурами: их строка сжимается, пока разворачивается
  // вопрос, — и подгонять картинку нужно каждый такой кадр, иначе она
  // уступила бы ему место рывком в конце такта.
  [fieldsStepEl, housesStepEl].forEach((el) => onResize(el, fitFigures));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFigures);

  render('instant');
  paint();
  paintStepPitch();
  paintStepHouse();
  step(0);

  // ---------- The story on a phone ----------
  // There the page is not read in beats: nothing calls step() but the shell,
  // once, with the last of them — so the reader was handed the calculator and
  // never saw the town, the pitches, the blocks of flats or the question. The
  // travel is in the markup (see .area-run), and this walks it: every stretch
  // of it is one step more. Scrolling back takes them off again, the way going
  // back a beat does, and the calculator takes over exactly where the travel
  // runs out.
  // Answered by the phone story below; on a wide screen there is no travel to
  // walk and the shell asks for nothing.
  let ahead = () => 0;
  let behind = () => 0;

  if (phone.matches) {
    const stage = root.querySelector('.area-stage');
    let told = -1;

    // Сколько пути сцена стоит на экране целиком: от ее верха до того места,
    // где из-под нее начинает выезжать калькулятор. Ровно на этом отрезке и
    // рассказывается история — дальше смотреть уже не на что.
    //
    // Меряется он по самой сцене, а не долей от .area-run, и панель браузера
    // ему не страшна: сцена — это прибитая картинка высотой в экран плюс
    // путь под ней, так что ее рост минус экран — это и есть путь, в svh, как
    // он и написан в разметке. Высота окна, которая ходит вместе с панелью,
    // сокращается.
    const пройти = () => Math.max(0, stage.offsetHeight - window.innerHeight);

    const follow = () => {
      const span = пройти();
      if (!span) return;
      const gone = -stage.getBoundingClientRect().top;
      // Семь отрезков на семь состояний, а калькулятор приходит восьмым — там,
      // где сцена кончилась. Открывается он на экран раньше, чем читатель до
      // него доедет: открытый ровно в точке приезда, он дергал страницу под
      // пальцем — он выше истории, которую собой заменяет, — а переключатели в
      // его голове успевали уйти за верх экрана.
      const i = gone >= span
        ? LAST
        : Math.min(LAST - 1, Math.max(0, Math.floor((gone / span) * LAST)));
      if (i === told) return;
      told = i;
      step(i);
    };
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', follow);
    follow();

    // And how far the next state is, for the shell that moves the page: the
    // same travel, read the other way round.
    //
    // Последний отрезок истории кончается там, где блок отдает себя читателю:
    // сцена пустеет, а калькулятор лежит ниже экрана — остановка ровно на этой
    // границе была пустым экраном, и следующий ход, которому не на что
    // опереться, пролетал мимо калькулятора на целый экран. Поэтому последний
    // ход истории и приход калькулятора — одно движение: ход ведет не на
    // границу отрезка, а на верх калькулятора.
    //
    // И поэтому же история меряется прибитым отрезком, а не долей от пути под
    // сценой: из последней остановки ход должен дотянуться до верха
    // калькулятора за один раз. Каркас дальше полутора экранов за такт не
    // ходит, и когда история кончалась раньше, чем сцена уезжала, этот
    // последний ход упирался в потолок — страница вставала, не довезя сотню
    // пикселей, и калькулятор приходил с белой полосой над собой.
    ahead = () => {
      const box = stage.getBoundingClientRect();
      const walked = -box.top;
      const span = пройти();
      const told = stepAhead(walked, span, LAST);
      // Калькулятор начинается там, где кончается сцена: собственной коробки
      // у него нет — на телефоне обертка раскрыта в display: contents, и
      // мерить у нее нечего.
      const toCalc = box.bottom > 2 ? Math.round(box.bottom) : 0;
      if (!told) return toCalc;
      return walked + told >= span ? (toCalc || told) : told;
    };

    // И столько же — назад: шаг назад возвращает предыдущий кадр истории, а
    // не уносит через всю ее. Из калькулятора он приводит к последнему кадру;
    // с первого — ноль, дальше назад лежит уже не история, а открытие, и там
    // свои остановки.
    behind = () => {
      const span = пройти();
      if (!span) return 0;
      const walked = -stage.getBoundingClientRect().top;
      const stretch = span / LAST;
      // Калькулятор идет следующим за последним кадром, и шаг назад из него
      // возвращает к этому кадру — поэтому счет доходит до LAST, а не до
      // последнего отрезка.
      const i = Math.min(LAST, Math.floor(walked / stretch));
      if (i <= 0) return 0;
      // На пиксель за границу, а не ровно на нее: ровно на границе сторона
      // остается за округлением.
      return Math.max(0, Math.round(walked - ((i - 1) * stretch + 1)));
    };
  }

  return {
    // On a phone the scroll above tells the story, and the shell must not cut
    // in: it plays the last step once, right after init, and that would hand
    // the reader the calculator while the travel still says step one.
    step: phone.matches ? () => {} : step,
    ahead: () => ahead(),
    behind: () => behind(),
    // The page opens this block — first time, or the reader has come back to
    // it. The town starts its traffic over, so the map is the same picture it
    // was when they first saw it.
    // Заодно перемеряется заголовок переходного экрана: мерка при сборке
    // блока могла случиться до того, как встали шрифты, и высота у нее тогда
    // от другого начертания.
    open: () => { measureLead(); fitTail(); townMap.open(); }
  };
}
