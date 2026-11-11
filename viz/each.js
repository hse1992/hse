// The last screen of the page: every figure it has counted, all at once and
// without a word of explanation. Then they gather in the middle and stand in
// the shape of the one figure the page comes down to — the shape gives way to
// that figure, and the figure is told what it is. Nothing here is drawn: the
// whole scene is the numbers themselves, set in the same face as the rest of
// the page.

import { CITIES, LYCEUM, STAFF, STUDENTS, FOREIGN, HSE_TOTAL, ADMITTED, AREA_TOTAL } from '../data/hse.js';
import { COUNTRIES } from '../data/countries.js';
import { ORBIT_KM, INCLINE, SATELLITES } from '../data/satellites.js';
import { nf, dec, plural } from '../lib/format.js';
import { onResize } from '../lib/ui.js';

// The teaching part of the floor area — data/hse.js keeps it campus by campus.
const AREA_STUDY = CITIES.reduce((n, c) => n + c.areaStudy, 0);

// Figures the page has already shown. Each of them is counted in the section
// that earned it, and a module knows nothing about its neighbours — so they
// are quoted here by hand rather than imported. If a section ever changes its
// answer, its line below has to change with it.
const BUILDINGS = 196;      // buildings — the floor area section
const PROGRAMS = 329;       // programmes — the studies section

// The day the shot was taken is the day it is looked at: the frame along the
// edge says «now», whenever the reader's now happens to be. Written out here
// rather than through toLocaleDateString, which the page keeps out of modules.
const today = () => {
  const d = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

// The satellites are not quoted like the rest: «Космос» draws them and this
// block captions the picture they took, so both read the same data file and
// a corrected orbit cannot leave the caption behind. The one that took the
// shot is the last to go up — the one still flying, whose laps are counted.
const CAMERA = SATELLITES[SATELLITES.length - 1].name;

export const meta = {
  id: 'each',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Все цифры',
  // The section arrives out of the white of a satellite's flash, like a photo
  // developing — and the heading is the caption to that shot: the whole
  // university in one frame.
  title: 'Вышка такая большая, что ее можно увидеть только со спутника',
  subtitle: '',
  // No title card: the flash opens straight onto the photograph, figures and
  // all. A heading waiting alone in the middle of the screen would be one more
  // beat between the camera going off and the picture it took.
  // The board is what the section arrives with, rather than an empty field
  // that spends a beat of the reader's on filling it.
  opensOnStep: true,
  // The board is there, the question comes up over it — and then the whole
  // end plays out in one beat: the figures add up into one number, that number
  // falls to one, and the one is told what it is.
  steps: 3
};

export function init(root) {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 860px)');
  const REF = 100;                                 // size everything is measured at
  const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';   // 1 - (1 - p)³

  const cityOf = (key) => CITIES.find((c) => c.key === key);

  // The board is a photograph, so it is printed in one ink: the university's
  // blue at three depths, like a cyanotype. The larger a figure, the deeper its
  // tone — the eye goes from the heaviest figures to the lighter ones, instead
  // of hopping between five unrelated colours. The words after the numbers
  // stay a quiet grey, so the colour belongs to the figures alone.
  const HSE = 'var(--hse-blue)';
  const INK = {
    ink: 'var(--text)',
    deep: HSE,
    mid: 'color-mix(in srgb, var(--hse-blue) 70%, var(--card))',
    light: 'color-mix(in srgb, var(--hse-blue) 46%, var(--card))'
  };
  const toneOf = (w) => (w >= 1.3 ? 'deep' : w >= 1.0 ? 'mid' : 'light');
  // What the board fades to once the question has been asked: the figures are
  // all still there, they have simply stopped being the point — so far back
  // that the only dark thing left on the screen is the question itself.
  const GREY = 'var(--text-faded)';

  // Every figure of the page, in the order it turns up here, each with what it
  // counts: the number is read first, the word after it says of what. `w` is
  // how much it weighs against the others, and its tone of blue follows from
  // that. `size` is what the layout uses: the same order of sizes as `w`,
  // drawn much closer together — a board where one figure is three times
  // another reads as a mess, not as a hierarchy.
  const fig = (n, w, noun, text) =>
    ({ n, w, c: toneOf(w), size: 0.55 + 0.5 * w, noun, value: text || nf(n) });
  const of = (n, one, few, many) => plural(n, one, few, many);
  const students = (key, where) =>
    `${of(cityOf(key).students, 'студент', 'студента', 'студентов')} ${where}`;

  const FIGURES = [
    fig(STUDENTS, 1.5, of(STUDENTS, 'студент', 'студента', 'студентов')),
    fig(STAFF, 1.05, of(STAFF, 'сотрудник', 'сотрудника', 'сотрудников')),
    fig(LYCEUM, 0.75, of(LYCEUM, 'лицеист', 'лицеиста', 'лицеистов')),
    fig(ADMITTED, 1.2, of(ADMITTED, 'первокурсник', 'первокурсника', 'первокурсников')),
    fig(COUNTRIES.length, 0.9, of(COUNTRIES.length, 'страна', 'страны', 'стран')),
    fig(FOREIGN, 0.85, of(FOREIGN, 'иностранец', 'иностранца', 'иностранцев'), `${nf(FOREIGN)}+`),
    fig(BUILDINGS, 1.05, of(BUILDINGS, 'здание', 'здания', 'зданий')),
    fig(AREA_TOTAL, 1.35, 'м² площади'),
    fig(AREA_STUDY, 0.85, 'м² для учебы'),
    fig(PROGRAMS, 1.1, of(PROGRAMS, 'программа', 'программы', 'программ')),
    fig(SATELLITES.length, 1.0, of(SATELLITES.length, 'спутник', 'спутника', 'спутников')),
    // The campuses themselves, just before what each of them holds.
    fig(CITIES.length, 1.0, of(CITIES.length, 'кампус', 'кампуса', 'кампусов')),
    fig(cityOf('msk').students, 1.1, students('msk', 'в Москве')),
    fig(cityOf('spb').students, 0.75, students('spb', 'в Санкт-Петербурге')),
    fig(cityOf('nn').students, 0.7, students('nn', 'в Нижнем Новгороде')),
    fig(cityOf('perm').students, 0.7, students('perm', 'в Перми')),
    fig(HSE_TOTAL, 1.9, of(HSE_TOTAL, 'человек', 'человека', 'человек'))
  ];

  // A figure as it is set: the number, and the word after it smaller, on the
  // same line — one phrase, but the number is what the eye lands on.
  const markup = (f) => `<span class="each-n">${f.value}</span>`
    + `<span class="each-w">\u00a0${f.noun}</span>`;

  const ALL = FIGURES.map((_, i) => i);

  // The board is never added up — square metres, people and programmes do not
  // make a quantity of anything, and a seven-digit number that is not a count
  // of anything was the page claiming otherwise. The figures do not become one
  // number: they gather and stand in the shape of one figure. Where each of
  // them goes is in fillOf() below.

  // ---------- Markup ----------
  root.innerHTML = `
    <style>
      /* The stage is one white field with nothing on it but figures, each put
         in its place from JS — hence absolute positioning and no flow at all. */
      .each-stage {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .each-tile {
        position: absolute;
        left: 0;
        top: 0;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        opacity: 0;
        will-change: transform, opacity;
      }

      /* Цифры, из которых набирается единица. Слоя заранее они не просят:
         восемьдесят пять слоев — это память телефона, а летят цифры один раз,
         и на это время слой им даст сам переход. */
      .each-digit {
        will-change: auto;
      }

      /* The card is the print the photograph is on, and it goes with the rest
         of the frame: by the time the one is told what it is, there is nothing
         on the screen but the figure and the two lines under it. */
      .each-card {
        transition: background 620ms ease, box-shadow 620ms ease;
      }

      .each-card.is-bare {
        background: transparent;
        box-shadow: none;
      }

      /* What the figure counts: after the number, in grey, smaller and without
         the tight tracking of the figures. Large enough to be read as part of
         the phrase, not as a footnote to it. */
      .each-w {
        font-size: 0.42em;
        font-weight: 500;
        letter-spacing: 0;
        color: var(--text-secondary);
        transition: color 620ms ease;
      }

      /* Once the board steps back, the words go with their figures. */
      .each-stage.is-faded .each-w {
        color: inherit;
      }

      /* And while the figures gather into the shape of the one, what each of
         them counts drops away: there they are no longer figures of anything,
         they are what the one is made of. The word keeps its place in the box
         — the move that carries the figure takes half of it back, so what
         lands on the point is the number. */
      .each-stage.is-shaping .each-w {
        opacity: 0;
        transition: opacity 420ms ease;
      }

      /* The board is a shot from orbit: the corners of a viewfinder, and the
         satellite's own caption along the edges of the frame. It belongs to
         the photograph only — once the figures start adding up, the frame is
         no longer a picture of anything and goes.

         The caption says what took the shot, from how high, and when — and,
         first of all, what was shot. Without that last field the heading
         promises a university seen from orbit and the screen answers with a
         board of figures, leaving the reader to make the connection; said in
         the caption it is not an explanation from the page, it is the frame
         stating its subject the way a frame does. */
      .each-hud {
        position: absolute;
        inset: 0;
        pointer-events: none;
        transition: opacity 620ms ease;
      }

      .each-hud.is-gone {
        opacity: 0;
      }

      .each-corner {
        position: absolute;
        width: 30px;
        height: 30px;
        border: 0 solid var(--text);
      }

      .each-corner.tl { left: 0; top: 0; border-left-width: 3px; border-top-width: 3px; }
      .each-corner.tr { right: 0; top: 0; border-right-width: 3px; border-top-width: 3px; }
      .each-corner.bl { left: 0; bottom: 0; border-left-width: 3px; border-bottom-width: 3px; }
      .each-corner.br { right: 0; bottom: 0; border-right-width: 3px; border-bottom-width: 3px; }

      .each-meta {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 1px;
        font-size: 0.8125rem;
        line-height: 1.3;
        letter-spacing: 0.02em;
        font-variant-numeric: tabular-nums;
        color: var(--text-secondary);
        white-space: nowrap;
      }

      .each-meta b {
        font-weight: 700;
        color: var(--text);
      }

      .each-meta.tl { left: 42px; top: 0; }
      .each-meta.tr { right: 42px; top: 0; text-align: right; }
      .each-meta.bl { left: 42px; bottom: 0; }
      .each-meta.br { right: 42px; bottom: 0; text-align: right; }

      /* The stand-in the figures are measured on: parked out of sight, never
         moved, never scaled. */
      .each-probe {
        left: -99999px;
        opacity: 0;
        transform: none;
      }

      /* The question does not live in the white field at all: it takes the
         place of the heading of the section. It is laid over the heading
         instead of swapped into the flow, so the header keeps its height and
         nothing underneath it moves. */
      @media (min-width: 861px) {
        .each-scene .viz-header {
          position: relative;
          /* And room for two lines of it is held from the first beat, before
             there is anything to show. The question is long enough to need
             them at any width, and it is laid over the heading rather than
             put in its place — so nothing in the flow grows when it arrives,
             and without room held here its second line would come down onto
             the card. Held from the start the board never moves under it;
             added on arrival, the whole board would re-pack mid-sentence. */
          min-height: calc(2.12 * clamp(1.125rem, 3.3vw, 2.25rem));
        }
      }

      .each-turn {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        /* Larger than the heading it replaces — it has to be the one thing on
           the screen that is read. It runs to two lines, and the size gives
           way on a narrow window so that it stays at two and never reaches
           the card underneath. */
        font-size: clamp(1.125rem, 3.3vw, 2.25rem);
        font-weight: 700;
        line-height: 1.06;
        letter-spacing: -0.02em;
        color: var(--text);
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 620ms ease,
                    transform 620ms cubic-bezier(0.33, 1, 0.68, 1);
        pointer-events: none;
      }

      .each-turn.is-on {
        opacity: 1;
        transform: none;
      }

      /* What the whole screen turns on, picked out the way the page picks out
         a figure that matters — and in the colour the answer arrives in. */
      .each-mark {
        padding: 0.06em 0.26em;
        border-radius: 0.22em;
        background: var(--hse-blue);
        color: var(--card);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      /* The answer, along the bottom edge of the white field. */
      .each-line {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 4px;
        text-align: center;
        opacity: 0;
        transition: opacity 620ms ease;
        pointer-events: none;
      }

      .each-line.is-on {
        opacity: 1;
      }

      /* And the heading of the section steps aside: from here on the screen
         belongs to a single figure. It only fades — taking it out of the flow
         would resize the card underneath and re-pack the whole board. */
      /* Only the heading itself steps aside — the question standing in for it
         is inside the same header and has to stay. */
      .each-scene .viz-header h2,
      .each-scene .viz-header > p {
        transition: opacity 620ms ease;
      }

      .each-scene.each-hushed .viz-header h2,
      .each-scene.each-hushed .viz-header > p {
        opacity: 0;
      }

      /* The heading does not merely vanish: it steps up and out as the
         question comes up from below to take its place. */
      .each-scene .viz-header h2 {
        transition: opacity 620ms ease,
                    transform 620ms cubic-bezier(0.33, 1, 0.68, 1);
      }

      .each-scene.each-hushed .viz-header h2 {
        transform: translateY(-12px);
      }

      /* The answer is said in plain text, all but black: the blue is left to
         the figure above it, which is the only thing on the page wearing it. */
      .each-you {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--text);
      }

      .each-why {
        margin-top: 6px;
        font-size: 1.125rem;
        color: var(--text-secondary);
      }

      @media (max-width: 860px) {
        /* The turn of the whole page happened here on one screen: the board,
           the one and the answer all at once, and the reader scrolled past
           the answer to a question they had not been asked yet. So the block
           is given travel and the card is pinned inside it — the board, the
           question over it, and the one after them. */
        .each-scene .viz-body {
          display: block;
          min-height: 235dvh;
        }

        /* By the time the board is pinned, the heading the question takes the
           place of on a wide screen has scrolled off the top — so here the
           question is said over the board itself, which steps back to grey
           under it exactly as it does there. */
        .each-stage .each-turn {
          top: 50%;
          z-index: 2;
          padding: 0 16px;
          text-align: center;
          transform: translateY(calc(-50% + 12px));
        }

        .each-stage .each-turn.is-on {
          transform: translateY(-50%);
        }

        .each-card {
          flex: none;
          position: sticky;
          top: 6dvh;
          height: 72dvh;
          min-height: 380px;
        }

        .each-you { font-size: 1.375rem; }
        .each-why { font-size: 0.9375rem; }

        /* The shot stays a shot on a phone too: the corners of the viewfinder
           and the satellite's caption along the edges, only smaller — the card
           is narrower, and at the wide sizes the two top captions would run
           into each other. They go where they go on a wide screen: once the
           figures start adding up, the frame is no longer a picture. */
        .each-corner { width: 20px; height: 20px; }
        .each-corner.tl { border-left-width: 2px; border-top-width: 2px; }
        .each-corner.tr { border-right-width: 2px; border-top-width: 2px; }
        .each-corner.bl { border-left-width: 2px; border-bottom-width: 2px; }
        .each-corner.br { border-right-width: 2px; border-bottom-width: 2px; }

        .each-meta { font-size: 0.75rem; letter-spacing: 0; }
        .each-meta.tl, .each-meta.bl { left: 26px; }
        .each-meta.tr, .each-meta.br { right: 26px; }

        /* The figures on a phone come out small, and a word at a third of a
           small number cannot be read — here it is set relatively larger. At
           half the smallest figure on the board it still came out at 11.4px,
           under the twelve the rest of the page keeps to. */
        .each-w { font-size: 0.55em; }
      }
    </style>

    <div class="canvas-card each-card">
      <div class="each-stage" data-el="stage">
        <div class="each-hud" data-el="hud" aria-hidden="true">
          <i class="each-corner tl"></i><i class="each-corner tr"></i>
          <i class="each-corner bl"></i><i class="each-corner br"></i>
          <div class="each-meta tl" data-el="metaTop"><b>${CAMERA}</b><span>Объект съемки: НИУ ВШЭ</span></div>
          <div class="each-meta tr"><span>высота ${nf(ORBIT_KM)} км</span><span>наклонение ${dec(INCLINE)}°</span></div>
          <div class="each-meta bl" data-el="metaBottom"><span>Дата снимка: ${today()}</span></div>
          <div class="each-meta br"><span>кадр 1</span></div>
        </div>
        <div class="each-line each-end" data-el="end">
          <div class="each-you">Это ты</div>
          <div class="each-why">Потому что для Вышки важен каждый</div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const stage = $('stage');
  const card = root.querySelector('.each-card');

  // The heading of this section — the shell draws it, but the scene sends it
  // away and puts its own line in its place.
  const host = root.closest('.viz-section') || root.parentElement;
  host.classList.add('each-scene');
  const hush = (on) => host.classList.toggle('each-hushed', on);

  const turn = document.createElement('div');
  turn.className = 'each-turn';
  turn.innerHTML = 'Но несмотря на весь масштаб Вышки и количество показателей, есть '
    + '<span class="each-mark">одна самая главная цифра</span>';
  // On a wide screen the question comes up in the place of the heading. On a
  // phone the heading is above the travel the pinned card rides through, and
  // is long gone by the time the question is due — so there it belongs to the
  // board, inside the card.
  const header = host.querySelector('.viz-header');
  const seat = narrow.matches ? stage : header;
  if (seat) seat.appendChild(turn);

  const tiles = FIGURES.map((f) => {
    const el = document.createElement('div');
    el.className = 'each-tile';
    el.innerHTML = markup(f);
    el.style.color = INK[f.c];
    stage.appendChild(el);
    return { ...f, el, at: null };
  });

  // Цифры всех чисел, по одной. Числами единицу не набрать: их семнадцать, и
  // плашка «687 332» в знаке стоит поперек него, сколько ее ни верти. А цифр
  // шестьдесят восемь, и каждая — квадратик в кегль высотой: из таких знак и
  // заливается. До поворота их на экране нет вовсе; на повороте числа
  // рассыпаются — каждая цифра встает ровно там, где она и стояла в своем
  // числе, и оттуда летит на свое место в единице.
  const digits = [];
  tiles.forEach((t, ti) => {
    Array.from(t.value).forEach((ch, k) => {
      if (!/\d/.test(ch)) return;
      const el = document.createElement('div');
      el.className = 'each-tile each-digit';
      // Числа уже прочитаны диктором на доске; это их же цифры, по одной.
      el.setAttribute('aria-hidden', 'true');
      el.textContent = ch;
      stage.appendChild(el);
      digits.push({ t: ti, k, el, at: null });
    });
  });

  // The figure in the middle: the board adds up into it, and it counts itself
  // down to the one. It belongs to no campus, so it is set in plain text until
  // the very end.
  const sum = document.createElement('div');
  sum.className = 'each-tile each-sum';
  sum.style.color = INK.ink;
  stage.appendChild(sum);

  // The board is in colour while it is the point of the screen, and grey from
  // the moment the question is asked over it.
  const paint = (grey) => {
    stage.classList.toggle('is-faded', grey);
    tiles.forEach((t) => { t.el.style.color = grey ? GREY : INK[t.c]; });
  };

  // And as they gather into the shape of the one they take its colour, so the
  // figure grows out of figures already wearing it rather than arriving over
  // a grey crowd. Grey here left the shape too faint to be read as a one at
  // all, which is the only thing those few hundred milliseconds are for.
  const paintOne = () => {
    stage.classList.add('is-faded');
    tiles.forEach((t) => { t.el.style.color = HSE; });
  };

  // ---------- The lines ----------
  const lines = { turn, end: $('end') };
  const say = (name) => Object.keys(lines).forEach((k) => lines[k].classList.toggle('is-on', k === name));

  // ---------- Measuring ----------
  // Every figure is read once at a reference size. Type is linear in its size,
  // so from then on the whole scene is laid out in arithmetic, without asking
  // the browser anything again.
  //
  // The reading is taken on a stand-in and never on the figures themselves:
  // they are usually in the middle of moving, and the scale that carries them
  // would be measured along with them — which is how a board comes out four
  // per cent too wide for the screen it was packed into.
  const probe = document.createElement('div');
  probe.className = 'each-tile each-probe';
  probe.setAttribute('aria-hidden', 'true');
  stage.appendChild(probe);

  let sumM = null;                                 // the widest the middle gets
  let digW = REF * 0.55;                           // and the width of one digit

  function measure() {
    probe.style.fontSize = `${REF}px`;
    const read = (text, html) => {
      if (html) probe.innerHTML = html; else probe.textContent = text;
      const r = probe.getBoundingClientRect();
      return { w: r.width, h: r.height };
    };
    tiles.forEach((t) => {
      t.m = read(null, markup(t));
      // And the number on its own: in the shape of the one the words are gone,
      // and a figure placed by the box it had with its word would stand half a
      // word to the left of the point it was sent to.
      t.mn = read(t.value);
    });
    sumM = read('1');
    // Все цифры одной ширины — страница набрана табличными. Значит, и место
    // цифры в числе берется счетом: сколько места заняло все, что стоит перед
    // ней. Пробелы в числе свое место занимают, но цифрами не считаются.
    digW = read('0').w;
    digits.forEach((d) => {
      const t = tiles[d.t];
      d.x = read(t.value.slice(0, d.k)).w + digW / 2;
    });
    glyph = readGlyph();
  }

  // ---------- The outline of the one ----------
  // Форма единицы берется с того самого знака, которым набрана страница, а не
  // выдумывается: единица один раз печатается в холст, и у каждой строки
  // пикселей меряется, где начинается краска и где кончается. Из этих строк
  // fillOf() ниже и заливает знак цифрами — не тремя штрихами, а по контуру,
  // ряд за рядом.
  let glyph = null;

  function readGlyph() {
    const cv = document.createElement('canvas');
    const g = cv.getContext && cv.getContext('2d', { willReadFrequently: true });
    if (!g) return null;

    const cs = getComputedStyle(sum);
    const H = 180;
    const font = `${cs.fontWeight} ${H}px ${cs.fontFamily}`;
    g.font = font;
    const m = g.measureText('1');
    const left = m.actualBoundingBoxLeft || 0;
    const right = m.actualBoundingBoxRight || m.width;
    const up = m.actualBoundingBoxAscent || H * 0.72;
    const down = m.actualBoundingBoxDescent || 0;
    const pad = 4;
    cv.width = Math.ceil(left + right) + pad * 2;
    cv.height = Math.ceil(up + down) + pad * 2;
    g.font = font;                       // resizing the canvas clears its state
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#000';
    g.fillText('1', pad + left, pad + up);

    let px;
    try {
      px = g.getImageData(0, 0, cv.width, cv.height).data;
    } catch (err) {
      return null;                       // nothing to read it from; see fillOf
    }
    const inked = (x, y) => px[(y * cv.width + x) * 4 + 3] > 80;

    let y0 = -1;
    let y1 = -1;
    let x0 = cv.width;
    let x1 = -1;
    for (let y = 0; y < cv.height; y++) {
      for (let x = 0; x < cv.width; x++) {
        if (!inked(x, y)) continue;
        if (y0 < 0) y0 = y;
        y1 = y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
    if (y1 <= y0) return null;

    const tall = y1 - y0 + 1;
    const mid = (x0 + x1 + 1) / 2;
    if (tall < 8) return null;
    // Сама краска, пиксель за пикселем. Пролета строки — докуда в ней краска —
    // тут мало: у единицы между косым штрихом и стойкой лежит пустое место, и
    // ряд, выключенный от края до края, заливал бы цифрами и его.
    const mask = new Uint8Array(cv.width * cv.height);
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < cv.width; x++) if (inked(x, y)) mask[y * cv.width + x] = 1;
    }

    // Where the ink sits inside the box the figure is placed by: the element
    // is centred on its box, and the box is taller and wider than the mark in
    // it. Without this the shape and the one growing out of it would stand a
    // few per cent apart — which is the whole of the effect.
    const fbUp = m.fontBoundingBoxAscent;
    const fbDown = m.fontBoundingBoxDescent;
    const base = fbUp === undefined ? 0.5 + (up - down) / 2 / H
      : (1 - (fbUp + fbDown) / H) / 2 + fbUp / H;

    return {
      mask,
      mw: cv.width,
      mh: cv.height,
      tall,
      mid,
      y0,
      // Края краски, в единицах ее же высоты от ее середины.
      a: (x0 - mid) / tall,
      b: (x1 + 1 - mid) / tall,
      k: tall / H,                       // how tall the ink is per unit of type
      dx: (right - left - m.width) / 2 / H,
      dy: base - (up - down) / 2 / H - 0.5
    };
  }

  // ---------- Layout ----------
  const sizeOf = (m, F) => ({ w: (m.w * F) / REF, h: (m.h * F) / REF, num: F });

  // Packs figures into justified rows, the numbers of one row sitting on one
  // line. Returns null when they do not fit — the search below then tries a
  // smaller size.
  function rows(entries, F, area, force) {
    const gapX = F * 0.5, gapY = F * 0.42;
    const sizes = entries.map((e) => sizeOf(e.m, F * e.w));
    const packed = [];
    let line = null;
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      if (!force && s.w > area.w) return null;
      if (!line) {
        line = { idx: [i], w: s.w, h: s.h };
      } else if (line.w + gapX + s.w > area.w) {
        packed.push(line);
        line = { idx: [i], w: s.w, h: s.h };
      } else {
        line.idx.push(i);
        line.w += gapX + s.w;
        line.h = Math.max(line.h, s.h);
      }
    }
    if (line) packed.push(line);

    const total = packed.reduce((n, l) => n + l.h, 0) + gapY * (packed.length - 1);
    if (!force && total > area.h) return null;

    const out = [];
    let y = area.y + (area.h - total) / 2;
    packed.forEach((l) => {
      // Justified — but a short last line is centred rather than torn apart.
      const n = l.idx.length;
      const extra = n > 1 ? Math.min((area.w - l.w) / (n - 1), gapX * 1.5) : 0;
      const used = l.w + extra * (n - 1);
      let x = area.x + (area.w - used) / 2;
      const bottom = y + l.h;                      // one line for the whole row
      l.idx.forEach((i) => {
        const s = sizes[i];
        out[i] = { ...s, cx: x + s.w / 2, cy: bottom - s.h / 2 };
        x += s.w + extra + gapX;
      });
      y += l.h + gapY;
    });
    return out;
  }

  // As large as the figures will go inside the area, never above `maxFont`.
  function pack(entries, area, maxFont) {
    let lo = 6, hi = maxFont, best = null;
    for (let k = 0; k < 20; k++) {
      const F = (lo + hi) / 2;
      const got = rows(entries, F, area);
      if (got) { best = got; lo = F; } else { hi = F; }
    }
    return best || rows(entries, 6, area, true);
  }

  let L = null;

  function relayout() {
    const w = stage.clientWidth || 900;
    const h = stage.clientHeight || 500;
    const area = { x: 0, y: 0, w, h };

    // How much room is left clear along the edges. The figures are packed as
    // large as they will go inside whatever area they are given, so the air
    // has to be taken out of the area — trimming the type size instead would
    // be undone by the next reflow.
    const airX = Math.round(Math.min(104, w * 0.095));
    const airY = Math.round(Math.min(44, h * 0.07));

    // How much room the answer takes along the bottom edge. Measured, not
    // guessed: on a narrow screen it runs to two rows.
    const endH = lines.end.offsetHeight;

    // The middle is sized for the longest thing it ever says — the whole sum —
    // and keeps that size all the way down to the one.
    // Half the board's margin: this one figure is meant to fill the screen,
    // and only needs to stop short of the edge of the card.
    const wide = { x: airX / 2, y: 0, w: Math.max(200, w - airX), h };
    // As large as the card will take it. The figure is the point of the
    // screen — and the shape the board stands in before it is the same height,
    // so a bigger one is also what lets the figures in that shape be set
    // large enough to read.
    const big = pack([{ m: sumM, w: 1 }], wide, Math.min(area.h * 0.68, 360));

    // Once the answer is there, the figure and the two lines under it stand as
    // one block in the middle of the screen. The shape the figures take stands
    // in exactly that place and at exactly that height: the one does not move
    // in after them, it grows out of where they are standing.
    const numH = big[0].h;
    const gap = Math.round(Math.min(40, h * 0.06));
    const block = numH + gap + endH;
    let top = (h - block) / 2;

    // On a phone the card is pinned part way down the screen, and the print it
    // is on goes with the frame — so the closing composition is centred on the
    // window and not on a card that by then is no longer there. Where the card
    // comes to rest is asked of the card itself; clamped to what the stage can
    // hold, because it clips whatever goes past its edge.
    if (narrow.matches) {
      const cs = getComputedStyle(card);
      const stuck = (parseFloat(cs.top) || 0) + (parseFloat(cs.paddingTop) || 0);
      const vh = document.documentElement.clientHeight || window.innerHeight;
      top = Math.max(0, Math.min(h - block, (vh - block) / 2 - stuck));
    }

    const seat = { cx: big[0].cx, cy: top + numH / 2, h: numH, num: big[0].num };

    // The board is laid out inside the frame of the shot, clear of the caption
    // strips along its top and bottom edges — and clear of the frame itself,
    // the way a photograph is given a margin.
    const capTop = $('metaTop').offsetHeight + 14;
    const capBottom = $('metaBottom').offsetHeight + 12;
    const airPoster = Math.round(airY * 0.4);
    const shot = {
      x: airX,
      y: capTop + airY,
      w: Math.max(120, w - airX * 2),
      h: Math.max(80, h - capTop - capBottom - airY * 2)
    };

    L = {
      board: pack(tiles.map((t) => ({ m: t.m, w: t.size })), shot, 150),
      big,
      end: [{ ...big[0], cy: seat.cy }],
      endTop: Math.round(top + numH + gap),
      // On a phone the board has the card to itself — the one it comes down
      // to arrives in its place, on the next turn of the finger, rather than
      // standing under it from the start. The sizes are drawn closer together
      // than on the wide board: at a phone's width the smallest of them would
      // otherwise be unreadable. It stands inside the same frame, and there the
      // captions along the edges already hold the board clear of them, so it
      // does not add the full margin of the wide board on top of that.
      poster: pack(tiles.map((t) => ({ m: t.m, w: 0.6 + 0.4 * t.w })),
        { x: airX, y: capTop + airPoster,
          w: Math.max(120, w - airX * 2),
          h: Math.max(60, h - capTop - capBottom - airPoster * 2) }, 90)
    };

    // Measured against the board the figures are actually standing on, so that
    // every point of the shape takes the figure already nearest to it.
    L.shape = fillOf(narrow.matches ? L.poster : L.board, seat);
  }

  // ---------- The shape of the one ----------
  // Единица не рисуется штрихами и не складывается из чисел — она заливается
  // цифрами по самой краске знака. Числа для этого рассыпаются: «687 332» —
  // это шесть цифр, а не одна длинная плашка, и из шестидесяти восьми цифр
  // знак набирается, как мозаика: клетка за клеткой по сетке, и цифра встает
  // только туда, где под ней краска. Поэтому стойка выходит ровным бруском,
  // лапа внизу шире, а флаг сверху сходит ступенями по косому штриху — и
  // пустота между флагом и стойкой остается пустотой.
  const LEAD = 1.04;                  // междустрочие: ряды почти касаются
  const KERN = 0.1;                   // и цифры в ряду — тоже
  const COVER = 0.42;                 // доля краски под цифрой, при которой она встает

  // Сколько краски под прямоугольником. Углы и края знака этим и отсекаются:
  // цифра, которой краска досталась меньше чем наполовину, не ставится вовсе.
  function inkUnder(x, y, w, h) {
    const px = (u) => glyph.mid + u * glyph.tall;
    const py = (v) => glyph.y0 + v * glyph.tall;
    const S = 5;
    let hit = 0;
    for (let i = 0; i < S; i++) {
      const cy = Math.round(py(y + (h * (i + 0.5)) / S));
      if (cy < 0 || cy >= glyph.mh) continue;
      for (let j = 0; j < S; j++) {
        const cx = Math.round(px(x + (w * (j + 0.5)) / S));
        if (cx < 0 || cx >= glyph.mw) continue;
        hit += glyph.mask[cy * glyph.mw + cx];
      }
    }
    return hit / (S * S);
  }

  function fillOf(from, box) {
    const N = digits.length;
    // No canvas to read the glyph from: the figures still gather, in a plain
    // column, and the one still grows out of them.
    if (!glyph || !N) {
      const unit = box.h * 0.055;
      const per = Math.max(1, Math.round(Math.sqrt(N)));
      return digits.map((d, i) => ({
        cx: box.cx + ((i % per) - (per - 1) / 2) * unit * 0.6,
        cy: box.cy + (Math.floor(i / per) / Math.max(1, Math.ceil(N / per) - 1) - 0.5) * box.h * 0.9,
        num: unit
      }));
    }

    const F = box.num;                             // the one's own type size
    const ink = glyph.k * F;
    const cx = box.cx + glyph.dx * F;
    const cy = box.cy + glyph.dy * F;
    const top = cy - ink / 2;

    // Какой кегль у цифр, столько их и встанет в знак. Прямо это не считается:
    // клеток в сетке тем больше, чем они мельче, а сколько из них окажется на
    // краске — дело формы знака. Поэтому примеряем и берем самый крупный
    // кегль, при котором места хватает всем.
    const shape = (s) => {
      const rowH = s * LEAD;
      const R = Math.max(1, Math.round(ink / rowH));
      const stepY = ink / R;
      const pitch = (digW * s * (1 + KERN)) / REF;
      const cols = Math.max(1, Math.ceil(((glyph.b - glyph.a) * ink) / pitch));
      // Сетка прибита к правому краю краски: прямой край стойки во всю высоту
      // — то, по чему единица и узнается, и он должен быть ровным.
      const right = cx + glyph.b * ink;
      // Цифра занимает не всю клетку: краску под ней мерим по ней самой.
      const w = (digW * 0.8) / REF * s;
      const h = s * 0.7;
      const cells = [];
      for (let i = 0; i < R; i++) {
        const y = top + (i + 0.5) * stepY;
        for (let j = cols - 1; j >= 0; j--) {
          const x = right - (j + 0.5) * pitch;
          const got = inkUnder((x - w / 2 - cx) / ink, (y - h / 2 - top) / ink, w / ink, h / ink);
          if (got >= COVER) cells.push({ cx: x, cy: y, num: s, row: i, got });
        }
      }
      return cells;
    };

    let lo = 2;
    let hi = ink / 2;
    let cells = null;
    for (let k = 0; k < 20; k++) {
      const s = (lo + hi) / 2;
      const got = shape(s);
      if (got.length >= N) { cells = got; lo = s; } else { hi = s; }
    }
    if (!cells) cells = shape(2);

    // Лишние клетки — те, под которыми краски меньше всех: это края знака, и
    // сходит он от них ровнее, чем от середины.
    if (cells.length > N) {
      const weak = cells.slice().sort((a, b) => a.got - b.got).slice(0, cells.length - N);
      const cut = new Set(weak);
      cells = cells.filter((c) => !cut.has(c));
    }
    // Сверху вниз, слева направо — порядок, в котором их и раздают.
    cells.sort((a, b) => (a.row - b.row) || (a.cx - b.cx));

    // Цифры одного числа идут подряд — в единице они стоят рядом, и в ней
    // по-прежнему читаются куски тех самых чисел. А числа раздаются сверху
    // вниз в том порядке, в каком они стоят на доске, чтобы по дороге цифры
    // не пролетали сквозь чужие.
    const order = tiles.map((t, i) => i).sort((a, b) => {
      const A = from && from[a];
      const B = from && from[b];
      if (!A || !B) return a - b;
      return (A.cy - B.cy) || (A.cx - B.cx);
    });
    const out = [];
    let k = 0;
    order.forEach((ti) => {
      digits.forEach((d, di) => {
        if (d.t !== ti) return;
        const c = cells[k];
        out[di] = c ? { cx: c.cx, cy: c.cy, num: c.num } : null;
        k += 1;
      });
    });
    return out;
  }

  // ---------- Moving ----------
  // Every change of state is the same move: each figure is told where it ends
  // up and how large it is there, and is then carried over from wherever it
  // was. The type size is set at once and the difference is taken up by a
  // scale, so nothing is animated by reflow and the figures are crisp at rest.
  function move(items, targets, { dur = 620, fade = null, delay = () => 0 } = {}) {
    const d = still ? 0 : dur;
    const f = still ? 0 : (fade === null ? Math.min(d, 420) : fade);

    items.forEach((t, i) => {
      const to = targets[i];
      const wait = still ? 0 : delay(i);
      // Nowhere to go: it simply goes out where it stands.
      if (!to || to.cx === undefined) {
        t.el.style.transition = `opacity ${f}ms ease ${wait}ms`;
        t.el.style.opacity = '0';
        if (t.at) t.at = { ...t.at, a: 0 };
        return;
      }
      t.el.style.fontSize = `${to.num}px`;

      const from = t.at && t.at.a ? t.at
        : { cx: to.cx, cy: to.cy, num: to.num * 0.86, a: 0, turn: to.turn };
      t.el.style.transition = 'none';
      t.el.style.transform = `translate(${from.cx}px, ${from.cy}px) translate(-50%, -50%)`
        + ` scale(${from.num / to.num}) rotate(${from.turn || 0}deg)`;
      t.el.style.opacity = `${from.a}`;
      t.next = { to, wait };
    });

    // One reflow for all of them, and then everybody sets off together.
    void stage.offsetWidth;

    items.forEach((t) => {
      if (!t.next) return;
      const { to, wait } = t.next;
      t.next = null;
      const a = to.a === undefined ? 1 : to.a;
      t.el.style.transition = `transform ${d}ms ${EASE} ${wait}ms, opacity ${f}ms ease ${wait}ms,`
        + ' color 620ms ease';
      t.el.style.transform = `translate(${to.cx}px, ${to.cy}px) translate(-50%, -50%) scale(1)`
        + ` rotate(${to.turn || 0}deg)`;
      t.el.style.opacity = `${a}`;
      t.at = { ...to, a };
    });
  }

  // The middle never moves sideways and never changes size, so it needs none
  // of the above: it is put where it goes and told what to say.
  function placeSum(at, { dur = 620, show = true, text = null, color = null, scale = 1 } = {}) {
    const d = still ? 0 : dur;
    if (text !== null) sum.textContent = text;
    if (color) sum.style.color = color;
    sum.style.fontSize = `${at.num}px`;
    sum.style.transition = `transform ${d}ms ${EASE}, opacity ${Math.min(d, 420)}ms ease,`
      + ' color 620ms ease';
    sum.style.transform = `translate(${at.cx}px, ${at.cy}px) translate(-50%, -50%) scale(${scale})`;
    sum.style.opacity = show ? '1' : '0';
  }

  const apply = (targets, opts) => move(tiles, targets, opts);
  const applyDigits = (targets, opts) => move(digits, targets, opts);
  // Цифр на экране нет, пока не началось рассыпание, и нет после него.
  const noDigits = (dur = 0) => applyDigits(digits.map(() => null), { dur });

  // Число рассыпается на цифры: каждая встает ровно туда, где она в этом числе
  // и стояла — в том же кегле и того же цвета, — а само число в тот же кадр
  // исчезает. Подмены не видно: на экране те же пиксели. И только с этого
  // места цифры разлетаются каждая по своему делу.
  function crumble() {
    digits.forEach((d) => {
      const t = tiles[d.t];
      d.el.style.color = HSE;
      if (!t.at) { d.at = null; return; }
      const num = t.at.num;
      // Число стоит в коробке вместе со своим словом и выключено в ней влево;
      // слово к этому времени уже погашено, но место свое держит.
      const left = t.at.cx - (t.m.w * num) / REF / 2;
      d.at = { cx: left + (d.x * num) / REF, cy: t.at.cy, num, a: 1, turn: 0 };
    });
    apply(tiles.map(() => null), { dur: 0 });
  }

  // ---------- The scene ----------
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, still ? 0 : ms)); };
  const clearLater = () => timers.splice(0).forEach(clearTimeout);

  // Arrivals run on this curve: the gaps between them get shorter as it goes,
  // so the screen fills up — and adds up — quicker and quicker.
  function rush(order, span, hold = 0) {
    const place = new Map(order.map((v, k) => [v, k]));
    const n = Math.max(1, order.length - 1);
    return (i) => {
      const k = place.get(i);
      return k === undefined ? 0 : hold + span * (1 - Math.pow(1 - k / n, 1.8));
    };
  }

  // Where the two closing lines sit: under the figure while the scene is being
  // played out, along the bottom edge of the still picture on a phone.
  function endAt(top) {
    lines.end.style.top = top === null ? '' : `${top}px`;
    lines.end.style.bottom = top === null ? '' : 'auto';
  }

  // ---------- The turn ----------
  // The board gathers into the shape of the one, the shape gives way to the
  // figure, and the figure is told what it is. One movement from end to end:
  // the page has been leading here, and a turn that waits on the wheel twice
  // is two smaller turns.
  const GATHER = 1100;        // the figures fly in and take their places
  const LOOK = 1000;          // and stand there long enough to be read as a one
  const BECOME = 760;         // the shape gives way to the figure
  const ALONE = 680;          // the one by itself before it is told what it is

  // Everything the photograph was made of, put back the way it was: the frame,
  // the print it is on, and the word after every figure.
  function photo(on) {
    $('hud').classList.toggle('is-gone', !on);
    card.classList.toggle('is-bare', !on);
    stage.classList.toggle('is-shaping', !on);
  }

  // The last composition, with nothing playing: the one and the two lines
  // under it on a bare field. This is also what a window resized after the
  // turn comes back to — running the whole thing again would take the answer
  // off the screen and make the reader sit through it to get it back.
  function settled() {
    // Asked for less movement, the reader is shown the state the block ends
    // in and nothing else — so this one screen is the whole section for them,
    // and the heading has to stay on it. Played out, the heading has already
    // said its piece and given way to the question, and the last composition
    // is the one and the two lines under it.
    hush(!still);
    photo(false);
    paint(true);
    endAt(L.endTop);
    apply(tiles.map(() => null), { dur: 0 });
    noDigits();
    placeSum(L.end[0], { dur: 0, text: '1', color: HSE, scale: 1 });
    say('end');
  }

  // Куда летит цифра. Без места она не остается — но если раскладка все же
  // не нашла ей клетки, считаем, что она в середине: ей все равно гаснуть.
  const place = (i) => L.shape[i] || L.end[0];

  function finish(onDone) {
    if (still) { settled(); onDone(); return; }

    // On a wide screen the question stands where the heading was and can stay
    // until it is answered. On a phone it is said over the board itself, in
    // the middle of the card — exactly where the one is about to stand.
    say(narrow.matches ? null : 'turn');

    // Nothing of the photograph survives the turn: the corners of the
    // viewfinder, the caption along its edges and the print itself all go
    // while the figures are still on their way in.
    photo(false);
    paintOne();
    endAt(L.endTop);

    // Числа рассыпаются на цифры там, где стоят, и дальше летит уже не доска,
    // а шестьдесят восемь цифр.
    crumble();

    // From the middle of the stem outwards, so the one builds rather than
    // lands all at once.
    const from = L.end[0].cy;
    const order = digits.map((d, i) => i).sort((a, b) =>
      Math.abs(place(a).cy - from) - Math.abs(place(b).cy - from));
    applyDigits(L.shape.map((p) => (p ? { ...p, a: 1 } : null)),
      { dur: GATHER, fade: 420, delay: rush(order, 420) });

    placeSum(L.end[0], { dur: 0, show: false, text: '1', color: HSE, scale: 0.88 });

    later(() => {
      // The shape gives way to the figure it was standing in for. The numbers
      // draw in towards the middle as they go, so the one grows out of them
      // instead of being swapped in over them.
      applyDigits(L.shape.map((p) => (p ? {
        cx: L.end[0].cx + (p.cx - L.end[0].cx) * 0.84,
        cy: L.end[0].cy + (p.cy - L.end[0].cy) * 0.84,
        num: p.num,
        a: 0
      } : null)), { dur: BECOME, fade: 560 });
      placeSum(L.end[0], { dur: BECOME, show: true, scale: 1 });

      later(() => {
        say('end');
        onDone();
      }, BECOME + ALONE);
    }, GATHER + LOOK);
  }

  // ---------- The phone ----------
  // A narrow screen has no beats, so the turn is driven by the scroll. The
  // card is pinned inside a block of travel and the reader walks it: the
  // board of figures, then the question over it, and then the figures go and
  // the one is left standing in their place.
  //
  // Three states and a line between each pair, not a figure that grows with
  // the finger. The whole page has been leading to this one turn, and a turn
  // the reader can scrub back and forth is a toy, not a turn.
  let phoneStage = -1;

  function phoneBoard() {
    hush(false);
    paint(false);
    photo(true);
    say(null);
    noDigits();
    placeSum(L.end[0], { dur: 0, show: false, text: '1', color: HSE, scale: 0.88 });
    apply(tiles.map((t, k) => ({ ...L.poster[k], a: 1 })), { delay: rush(ALL, 700, 100) });
  }

  // The question, which on a wide screen is read over a board gone grey. Here
  // it is read over the board itself, so the board also gives way: grey alone
  // left two things of equal weight on one small card.
  function phoneAsk() {
    hush(false);
    paint(true);
    photo(true);
    say('turn');
    noDigits();
    placeSum(L.end[0], { dur: 0, show: false, text: '1', color: HSE, scale: 0.88 });
    apply(tiles.map((t, k) => ({ ...L.poster[k], a: 0.18 })), {});
  }

  // One swipe of the finger plays the whole of it, exactly as one turn of the
  // wheel does on a wide screen. Coming back to a turn already played puts it
  // back as it ended instead of playing it again.
  function phoneOne() {
    if (done) { settled(); return; }
    finish(() => { done = true; });
  }

  // Where the reader is through the block, counted over the distance the
  // pinned card can ride: 0 as it arrives at the top of the screen, 1 as the
  // block lets go of it.
  function phonePart() {
    const box = host.getBoundingClientRect();
    const vh = document.documentElement.clientHeight || window.innerHeight;
    const travel = box.height - vh;
    return travel > 8 ? Math.min(1, Math.max(0, -box.top / travel)) : 1;
  }

  // Each line is crossed later going forward than coming back, so that a
  // finger resting exactly on one does not flicker the state on and off.
  const AHEAD = [0.3, 0.62];          // far enough along for the next state
  const BACK = [0.22, 0.54];          // far enough back for the one before
  const PHONE_STATE = [phoneBoard, phoneAsk, phoneOne];

  function phone(force) {
    const p = phonePart();
    let want = Math.max(0, phoneStage);
    while (want < AHEAD.length && p > AHEAD[want]) want += 1;
    while (want > 0 && p < BACK[want - 1]) want -= 1;
    // Back out of the turn and it is a turn again: the next swipe plays it.
    if (want < 2) done = false;
    if (want === phoneStage && !force) return;
    phoneStage = want;
    clearLater();
    PHONE_STATE[want]();
  }

  // The closing beat, put back as it ended instead of played again. A window
  // resized after the answer has arrived still has to be laid out afresh —
  // the board is packed to the size of the card — but playing the turn a
  // second time would take the answer off the screen and make the reader sit
  // through it to get the same screen back.
  function settle() {
    clearLater();
    if (narrow.matches) { phone(true); return; }
    settled();
  }

  function play(i) {
    clearLater();
    done = false;
    if (!L) relayout();
    if (narrow.matches) { phone(true); return; }

    // The whole board at once. It is put up without an arrival of its own: the
    // section is still coming in when this is called, so anything played here
    // would be played to nobody — and a reader quick on the wheel would catch
    // it half filled. The block fading in brings it whole.
    if (i === 0 || i === 1) {
      // The question turns up the moment the reader gets to it: on a delay it
      // is missed by anyone scrolling quickly through this screen. It arrives
      // in the place of the heading, and the board goes grey under it.
      const asked = i === 1;
      say(asked ? 'turn' : null);
      hush(asked);
      endAt(L.endTop);
      // Back from the turn, the photograph is a photograph again.
      photo(true);
      noDigits();
      placeSum(L.end[0], { dur: 0, show: false, text: '1', color: HSE, scale: 0.88 });
      apply(tiles.map((t, k) => ({ ...L.board[k], a: 1 })), { dur: asked ? 620 : 0 });
      paint(asked);
      return;
    }

    // The end, all of it, on one turn of the wheel: the board gathers into
    // the shape of the one, the shape gives way to the figure, and the figure
    // is told what it is — with the question still standing where the heading
    // was. Splitting this across beats made the reader ask for the answer to
    // a question the screen had already finished asking; it is one thought,
    // so it is one movement, and nothing waits on the wheel again.
    hush(true);
    finish(() => { done = true; });
  }

  // ---------- Wiring ----------
  let shown = -1;
  let done = false;             // the closing beat has played itself out
  const replay = () => {
    if (shown < 0) return;
    if (done) { settle(); return; }
    play(shown);
  };

  measure();
  relayout();

  // Type arrives after the page does; measure again once it is really there.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measure(); relayout(); replay(); });
  }

  onResize(stage, () => { relayout(); replay(); });

  // Only the phone reads by scrolling; on a wide screen this never fires a
  // thing. Answered on the next frame, like every other measurement here.
  let asked = false;
  window.addEventListener('scroll', () => {
    if (!narrow.matches || asked) return;
    asked = true;
    requestAnimationFrame(() => { asked = false; if (L) phone(false); });
  }, { passive: true });
  narrow.addEventListener('change', () => { relayout(); replay(); });

  // How far the next of the three states is, for the button the shell puts in
  // the corner of a phone. The lines between them are not evenly spaced — the
  // board holds the screen longer than the question does — so this asks the
  // same thresholds follow asks, instead of cutting the travel into equal
  // parts the way the other blocks can.
  const ahead = () => {
    if (!narrow.matches) return 0;
    const box = host.getBoundingClientRect();
    const travel = box.height - (document.documentElement.clientHeight || window.innerHeight);
    if (travel <= 8 || box.top > 0) return 0;
    const p = phonePart();
    const line = AHEAD.find((m) => p < m);
    return line === undefined ? 0 : Math.ceil((line - p) * travel) + 2;
  };

  return {
    ahead,
    step(i) {
      shown = i;
      play(i);
    },
    // The closing beat runs some five seconds, far longer than the shell will
    // hold the wheel for: it is given the most there is, and plays the rest
    // out on a screen that stays put. Nothing follows it, so an overrun costs
    // the reader nothing — and holding the wheel at all stops a quick one from
    // setting the count going over a sum still being made.
    span: (i) => (still || narrow.matches ? 0 : i === 2 ? 2500 : 0)
  };
}
