// The last screen of the page: every figure it has counted, all at once and
// without a word of explanation. Then they are added up into one number, and
// that number is taken apart down to one. Nothing here is drawn — the whole
// scene is the numbers themselves, set in the same face as the rest of the page.

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

  // What the board comes to when it is added up. It is not a quantity of
  // anything — square metres, years and people all go into it — and nothing on
  // the screen claims otherwise: it is every figure of the page put together,
  // and it is there to be taken apart again.
  const TOTAL = FIGURES.reduce((n, f) => n + f.n, 0);
  const ALL = FIGURES.map((_, i) => i);

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

      /* The figure in the middle carries its own clearing: a soft field of the
         card's own white, so the board draining around it never runs across
         its digits. On a white card it is invisible — it only ever shows as
         the room it makes. */
      .each-sum.is-clearing {
        box-shadow: 0 0 130px 42px var(--card);
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

        /* A phone gets the board and its answer as one still picture; a frame
           and a caption in each corner of a card this small would only crowd
           it. */
        .each-hud { display: none; }

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

  function measure() {
    probe.style.fontSize = `${REF}px`;
    const read = (text, html) => {
      if (html) probe.innerHTML = html; else probe.textContent = text;
      const r = probe.getBoundingClientRect();
      return { w: r.width, h: r.height };
    };
    tiles.forEach((t) => { t.m = read(null, markup(t)); });
    sumM = read(nf(TOTAL));
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
    const big = pack([{ m: sumM, w: 1 }], wide, Math.min(area.h * 0.62, 300));

    // Once the answer is there, the figure and the two lines under it stand as
    // one block in the middle of the screen.
    const numH = big[0].h;
    const gap = Math.round(Math.min(40, h * 0.06));
    const top = (h - (numH + gap + endH)) / 2;

    // The board is laid out inside the frame of the shot, clear of the caption
    // strips along its top and bottom edges — and clear of the frame itself,
    // the way a photograph is given a margin.
    const capTop = $('metaTop').offsetHeight + 14;
    const capBottom = $('metaBottom').offsetHeight + 12;
    const shot = {
      x: airX,
      y: capTop + airY,
      w: Math.max(120, w - airX * 2),
      h: Math.max(80, h - capTop - capBottom - airY * 2)
    };

    L = {
      board: pack(tiles.map((t) => ({ m: t.m, w: t.size })), shot, 150),
      big,
      end: [{ ...big[0], cy: top + numH / 2 }],
      endTop: Math.round(top + numH + gap),
      // On a phone the board has the card to itself — the one it comes down
      // to arrives in its place, on the next turn of the finger, rather than
      // standing under it from the start. The sizes are drawn closer together
      // than on the wide board: at a phone's width the smallest of them would
      // otherwise be unreadable.
      poster: pack(tiles.map((t) => ({ m: t.m, w: 0.6 + 0.4 * t.w })),
        { x: airX, y: airY, w: Math.max(120, w - airX * 2), h: Math.max(60, h - airY * 2) }, 90)
    };
  }

  // ---------- Moving ----------
  // Every change of state is the same move: each figure is told where it ends
  // up and how large it is there, and is then carried over from wherever it
  // was. The type size is set at once and the difference is taken up by a
  // scale, so nothing is animated by reflow and the figures are crisp at rest.
  function apply(targets, { dur = 620, fade = null, delay = () => 0 } = {}) {
    const d = still ? 0 : dur;
    const f = still ? 0 : (fade === null ? Math.min(d, 420) : fade);

    tiles.forEach((t, i) => {
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

      const from = t.at && t.at.a ? t.at : { cx: to.cx, cy: to.cy, num: to.num * 0.86, a: 0 };
      t.el.style.transition = 'none';
      t.el.style.transform = `translate(${from.cx}px, ${from.cy}px) translate(-50%, -50%)`
        + ` scale(${from.num / to.num})`;
      t.el.style.opacity = `${from.a}`;
      t.next = { to, wait };
    });

    // One reflow for all of them, and then everybody sets off together.
    void stage.offsetWidth;

    tiles.forEach((t) => {
      if (!t.next) return;
      const { to, wait } = t.next;
      t.next = null;
      const a = to.a === undefined ? 1 : to.a;
      t.el.style.transition = `transform ${d}ms ${EASE} ${wait}ms, opacity ${f}ms ease ${wait}ms,`
        + ' color 620ms ease';
      t.el.style.transform = `translate(${to.cx}px, ${to.cy}px) translate(-50%, -50%) scale(1)`;
      t.el.style.opacity = `${a}`;
      t.at = { ...to, a };
    });
  }

  // The middle never moves sideways and never changes size, so it needs none
  // of the above: it is put where it goes and told what to say.
  function placeSum(at, { dur = 620, show = true, text = null, color = null } = {}) {
    const d = still ? 0 : dur;
    if (text !== null) sum.textContent = text;
    if (color) sum.style.color = color;
    sum.style.fontSize = `${at.num}px`;
    sum.style.transition = `transform ${d}ms ${EASE}, opacity ${Math.min(d, 420)}ms ease,`
      + ' color 620ms ease';
    sum.style.transform = `translate(${at.cx}px, ${at.cy}px) translate(-50%, -50%)`;
    sum.style.opacity = show ? '1' : '0';
  }

  // ---------- The counts ----------
  let counting = null;
  const stopCount = () => { if (counting) { cancelAnimationFrame(counting); counting = null; } };

  // The board is added up. The figures come into the middle one after another,
  // quicker and quicker, and the middle takes each of them on as it arrives —
  // so the number growing there is the sum of everything that has landed.
  function addUp(done) {
    stopCount();
    sum.classList.add('is-clearing');
    const c = L.big[0];
    const span = 1000;
    const flight = 560;
    const gone = 300;                              // how long one takes to go

    // Nearest first: the middle of the board empties before the figure that
    // is growing there has to share the room with anything, and the drain
    // reads as one movement outwards rather than as a scatter.
    const reach = (k) => Math.hypot(L.board[k].cx - c.cx, L.board[k].cy - c.cy);
    const wait = rush(ALL.slice().sort((a, b) => reach(a) - reach(b)), span);

    placeSum(c, { dur: 0, show: false, text: nf(0), color: INK.ink });

    // A figure sets off towards the middle and is spent before it gets there:
    // it fades out about half way, so nothing ever piles up on the number
    // growing in the centre and no two of them cross in front of it. Only the
    // way they are all heading is read, which is the whole point.
    apply(tiles.map((t, k) => {
      const from = L.board[k];
      const half = 0.5;
      return {
        cx: from.cx + (c.cx - from.cx) * half,
        cy: from.cy + (c.cy - from.cy) * half,
        num: from.num * 0.62,
        a: 0
      };
    }), { dur: flight, fade: gone, delay: wait });

    if (still) { placeSum(c, { dur: 0, text: nf(TOTAL) }); done(); return; }

    // Each of them is taken on at the moment it disappears, so the number in
    // the middle grows exactly as the board is spent.
    const lands = ALL.map((k) => ({ n: FIGURES[k].n, at: wait(k) + gone * 0.9 }));
    const last = Math.max(...lands.map((x) => x.at));
    const t0 = performance.now();
    sum.style.transition = 'opacity 320ms ease';
    let shownYet = false;

    const frame = (now) => {
      const t = now - t0;
      const got = lands.reduce((n, x) => n + (t >= x.at ? x.n : 0), 0);
      sum.textContent = nf(got);
      if (got > 0 && !shownYet) { shownYet = true; sum.style.opacity = '1'; }
      if (t < last) { counting = requestAnimationFrame(frame); return; }
      counting = null;
      sum.textContent = nf(TOTAL);
      done();
    };
    counting = requestAnimationFrame(frame);
  }

  // And the sum falls to one, with an equal share of the time for every digit
  // it loses: it slows down of its own accord and the last dozens can be read
  // one by one. It keeps its size and simply grows shorter.
  function countDown(done) {
    stopCount();
    if (still) { done(); return; }
    const t0 = performance.now();
    const dur = 2200;
    const frame = (now) => {
      const raw = Math.min(1, (now - t0) / dur);
      const u = 1 - Math.pow(1 - raw, 1.6);
      sum.textContent = nf(Math.max(1, Math.round(Math.pow(TOTAL, 1 - u))));
      if (raw < 1) { counting = requestAnimationFrame(frame); return; }
      counting = null;
      done();
    };
    counting = requestAnimationFrame(frame);
  }

  // What is left takes the colour of the university itself — the only place on
  // the page where it stands for something other than a campus.
  function landOne() {
    stopCount();
    sum.textContent = '1';
    sum.style.transition = 'color 620ms ease';
    sum.style.color = HSE;
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
    // Nothing is flying past it here, and the clearing would only wash out
    // the board it stands in.
    sum.classList.remove('is-clearing');
    say(null);
    placeSum(L.end[0], { dur: 0, show: false, text: '1', color: HSE });
    apply(tiles.map((t, k) => ({ ...L.poster[k], a: 1 })), { delay: rush(ALL, 700, 100) });
  }

  // The question, which on a wide screen is read over a board gone grey. Here
  // it is read over the board itself, so the board also gives way: grey alone
  // left two things of equal weight on one small card.
  function phoneAsk() {
    hush(false);
    paint(true);
    sum.classList.remove('is-clearing');
    say('turn');
    placeSum(L.end[0], { dur: 0, show: false, text: '1', color: HSE });
    apply(tiles.map((t, k) => ({ ...L.poster[k], a: 0.18 })), {});
  }

  function phoneOne() {
    sum.classList.remove('is-clearing');
    endAt(L.endTop);
    apply(tiles.map(() => null), {});
    placeSum(L.end[0], { dur: 620, text: '1', color: HSE });
    say('end');
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
    if (want === phoneStage && !force) return;
    phoneStage = want;
    PHONE_STATE[want]();
  }

  // The closing beat, put back as it ended instead of played again. A window
  // resized after the answer has arrived still has to be laid out afresh —
  // the board is packed to the size of the card — but running the whole count
  // a second time would take the answer off the screen and make the reader
  // watch five seconds of it to get the same screen back.
  function settle() {
    clearLater();
    stopCount();
    if (narrow.matches) { phone(true); return; }
    $('hud').classList.add('is-gone');
    say('end');
    hush(true);
    paint(true);
    endAt(L.endTop);
    sum.classList.remove('is-clearing');
    apply(tiles.map(() => null), { dur: 0 });
    placeSum(L.end[0], { dur: 0, text: '1', color: HSE });
  }

  function play(i) {
    clearLater();
    stopCount();
    done = false;
    if (!L) relayout();
    if (narrow.matches) { phone(true); return; }

    // The shot stays a shot while the board is up; once it starts adding up,
    // the frame around it goes.
    $('hud').classList.toggle('is-gone', i >= 2);

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
      sum.classList.remove('is-clearing');
      placeSum(L.big[0], { dur: 0, show: false, text: nf(TOTAL), color: INK.ink });
      apply(tiles.map((t, k) => ({ ...L.board[k], a: 1 })), { dur: asked ? 620 : 0 });
      paint(asked);
      return;
    }

    // The end, all of it, on one turn of the wheel. The board adds itself up
    // into the middle, that number falls to one, and the one is told what it
    // is — with the question still standing where the heading was. Splitting
    // this across beats made the reader ask for the answer to a question the
    // screen had already finished asking; it is one thought, so it is one
    // movement, and nothing waits on the wheel again.
    say('turn');
    hush(true);
    paint(true);
    addUp(() => {
      // The whole sum is held first — it is the figure the page has been
      // adding up to, and seven digits take a moment to become a number
      // rather than a row of marks. Half a second was not enough: it began
      // coming apart while the eye was still reading it.
      later(() => countDown(() => {
        landOne();
        // And the one is left alone before it is told what it is — a shorter
        // wait than the sum got, and deliberately so. One digit is read at a
        // glance, and the count slows into it of its own accord, so the pause
        // that number needed would be a stop here.
        later(() => {
          say('end');
          placeSum(L.end[0], { dur: 620 });
          done = true;
        }, 900);
      }), 1200);
    });
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
