// Кем можно стать, отучившись в Вышке: все 44 укрупненные профессии сразу,
// по областям науки, с иконкой и с тем, что в каждую из них входит.

import { PROFESSIONS } from '../data/professions.js';
import { nf, plural } from '../lib/format.js';

// Every specialization the table lists under a profession. The lead-in of the
// section speaks of them, so the figure is counted rather than written down.
const KINDS_TOTAL = PROFESSIONS.reduce(
  (n, p) => n + (p.kinds ? p.kinds.split(',').length : 0), 0
);

// The areas in the order the table keeps them, with their professions.
const AREAS = [...new Set(PROFESSIONS.map((p) => p.area))].map((area) => ({
  area,
  items: PROFESSIONS.filter((p) => p.area === area)
}));

const kindsOf = (p) => (p.kinds ? p.kinds.split(',').map((s) => s.trim()) : []);

// The figure a line turns on, picked out by weight alone: HSE Sans Black on
// the plain text colour, against the grey the rest of the line is set in.
// Painted inline — the shell draws the line before the styles of the module
// arrive.
const mark = (text) =>
  `<span class="prof-mark" style="font-weight: 900; color: var(--text)">${text}</span>`;

export const meta = {
  id: 'professions',
  // Two words of the heading carry the whole thought, so they are picked out
  // the way the figures are — on a patch of the corporate blue. Painted inline
  // again: the heading is drawn before the styles of the module arrive.
  title: 'Высшая школа <span class="prof-accent" style="background: var(--hse-blue); color: var(--card)">не только</span> экономики',
  // Comes a screen after the heading, while the card still holds the middle:
  // first what the section says, then the wall that shows it.
  subtitle: `<span class="prof-lead intro-stage" data-stage="1">В Вышке можно стать кем угодно. ${mark(`${nf(KINDS_TOTAL)} ${plural(KINDS_TOTAL, 'специализация', 'специализации', 'специализаций')}`)}, где раскроется любой талант. Укрупненно из них можно выделить ${mark(`${PROFESSIONS.length} профессии`)}</span>`,
  intro: true,
  introStages: 2
};

export function init(root) {
  'use strict';

  // ---------- Markup ----------
  // The wall of professions and the card over it are specific to this
  // visualisation, so their styles live here and not in layout.css.
  root.classList.add('prof-body');
  root.innerHTML = `
    <style>
      /* The patch under two words of the heading. Colour comes inline with the
         markup — the shell draws the heading before these styles arrive; what
         is left here is the shape of it. */
      .prof-accent {
        padding: 0.06em 0.3em;
        border-radius: 0.2em;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }

      /* Nothing to switch here, so the section has no left column: the card
         and the wall under it take the whole width. */
      .prof-body .col-right {
        flex: 1;
        min-width: 0;
      }

      /* Whatever the reader is pointing at, across the top. It keeps one
         height whatever it shows — otherwise it would breathe while the
         pointer runs along the wall. */
      .prof-detail {
        flex: none;
        display: flex;
        align-items: stretch;
        gap: 32px;
        min-height: 5.8rem;
        padding: 16px 20px;
        border-radius: var(--r-card);
        background: var(--card);
        box-shadow: var(--card-shadow);
      }

      /* Who it is: the icon over the name, down the whole height of the card. */
      .prof-detail-head {
        flex: none;
        width: 230px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-align: center;
      }

      .prof-detail-art {
        flex: none;
        width: 72px;
        height: 72px;
      }

      .prof-detail-art img,
      .prof-detail-art svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .prof-detail-text {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .prof-detail-area {
        order: 2;
        font-size: 0.75rem;
        line-height: 1.25;
        letter-spacing: 0.02em;
        color: var(--text-caption);
      }

      .prof-detail-name {
        font-size: 1.125rem;
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.01em;
      }

      /* The specializations of one profession, in as many columns as the width
         allows. How tall the longest of the 44 lists comes out depends on that
         width, so the room kept for it is measured rather than guessed — see
         reserve() below. */
      .prof-kinds {
        flex: 1;
        min-width: 0;
        align-self: center;
        margin: 0;
        padding: 0 0 0 1.1em;
        columns: 15em;
        column-gap: 28px;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--text-secondary);
      }

      .prof-kinds li {
        break-inside: avoid;
      }

      .prof-kinds li::marker {
        color: var(--legend-swatch);
      }

      /* Stands in place of the list before the reader has pointed at anything.
         A profession with no specializations beside it says nothing at all —
         the card is simply that profession, and nothing else. */
      .prof-note {
        flex: 1;
        min-width: 0;
        align-self: center;
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.5;
        color: var(--text-secondary);
      }

      /* Absolute, like the canvases in the other sections: the wall must never
         push the card taller than the section. All 44 fit in it at once — the
         columns are what makes them fit, so nothing here ever scrolls.

         Areas of science are not named here: a group is simply kept whole
         inside one column, with air above and below it, and the eye reads the
         clusters without being told. */
      .prof-grid {
        position: absolute;
        inset: 0;
        overflow: hidden;
        column-count: 4;
        column-gap: 24px;
        padding: 2px;
      }

      /* A light ground under each area of science: the gap between groups says
         where one ends, and the fill says how far it reaches. */
      .prof-group {
        break-inside: avoid;
        margin-bottom: 10px;
        padding: 5px 6px;
        border-radius: 12px;
        background: var(--bg);
      }

      .prof-group:last-child {
        margin-bottom: 0;
      }

      /* The name of the area is for a phone, where the wall is one long column
         and the groups have nothing but a caption to tell them apart. */
      .prof-group-title {
        display: none;
        font-size: 0.7188rem;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: 0.02em;
        color: var(--text-caption);
      }

      .prof-group-items {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .prof-item {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        padding: 3px 8px;
        border: 0;
        border-radius: 10px;
        background: none;
        font: inherit;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: background 140ms ease;
      }

      .prof-item:hover,
      .prof-item:focus-visible,
      .prof-item.on {
        background: var(--card);
      }

      .prof-item-art {
        flex: none;
        display: block;
        width: 28px;
        height: 28px;
      }

      /* Long names hold the tile together rather than pushing it apart. */
      .prof-item-text {
        min-width: 0;
      }

      /* The name is never cut: four lines are enough for the longest of them
         even in a narrow column. */
      .prof-item-name {
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.25;
        /* A column can come out narrower than a word like
           «телекоммуникационных» — it is hyphenated then, never cut. */
        hyphens: auto;
        overflow-wrap: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Every tile carries its specializations, but on a wide screen they are
         read in the card above — here they would only be a cut-off line. */
      .prof-item-kinds {
        display: none;
      }

      /* On a phone there is no pointer to follow, so the card has nothing to
         add: every profession spells itself out in place, and the wall grows
         to its full height and scrolls with the page. */
      @media (max-width: 860px) {
        .prof-detail { display: none; }

        .prof-body .col-right {
          position: static;
          padding: 0;
          background: none;
        }

        .prof-body .col-right::after { display: none; }

        .prof-body .canvas-card { height: auto; }

        .prof-body .canvas-wrap {
          flex: none;
          height: auto;
        }

        .prof-grid {
          position: static;
          overflow: visible;
          column-count: auto;
        }

        .prof-group {
          margin-bottom: 14px;
          padding: 8px 10px;
        }

        .prof-group-title {
          display: block;
          margin: 2px 0 6px 2px;
        }

        .prof-group-items { gap: 4px; }

        .prof-item { align-items: flex-start; }
        .prof-item-art { width: 40px; height: 40px; }

        .prof-item-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .prof-item-name {
          display: block;
          font-size: 0.875rem;
        }

        .prof-item-kinds {
          display: block;
          font-size: 0.75rem;
          line-height: 1.3;
          color: var(--text-caption);
        }
      }
    </style>

    <div class="col-right">
      <div class="prof-detail">
        <div class="prof-detail-head" data-el="head">
          <span class="prof-detail-art" data-el="art"></span>
          <span class="prof-detail-text">
            <span class="prof-detail-area" data-el="area"></span>
            <span class="prof-detail-name" data-el="name"></span>
          </span>
        </div>
        <ul class="prof-kinds" data-el="kinds"></ul>
        <p class="prof-note" data-el="note"></p>
      </div>

      <div class="canvas-card">
        <div class="canvas-wrap">
          <div class="prof-grid" data-el="grid"></div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  const headEl = $('head');
  const artEl = $('art');
  const areaEl = $('area');
  const nameEl = $('name');
  const kindsEl = $('kinds');
  const noteEl = $('note');
  const grid = $('grid');

  // ---------- The card ----------
  // The mark of the university, drawn here rather than taken from
  // assets/hse-znak.svg: that file is painted by the page around it, and in
  // an <img> it would come out a black disc.
  const HSE_MARK = '<svg viewBox="0 0 283.47 283.47" aria-hidden="true" focusable="false">'
    + '<circle fill="var(--hse-blue)" cx="141.73" cy="141.74" r="141.73"/>'
    + '<path fill="var(--card)" d="M135.6,133.32c32.26,0,44.81,21.45,44.81,60.69v29.51h-20.69v-63.35h-23.9v63.42h-18.28V53.65h18.78c7.03,0,17.71,1.58,25.25,10.95c3.93,4.73,6.34,11.04,7.19,17.38h-32.94v9.35h33.23c-0.27,6.04-1.49,12.8-7.42,19.97c-5.2,6.51-13.76,12.56-25.83,12.56c-0.06,0-0.13,0-0.2,0V133.32 M206.41,197.55c0-34.86-11.26-58.29-40.45-68.6c9.21-3.77,14.82-9.58,18.49-13.99c7.01-8.06,9.88-17.96,9.88-27.31c0-7.56-2.08-22.65-15.35-33.04c-9.1-7.04-17.16-10.43-36.43-10.43h-9.75c-0.3-0.01-0.6-0.01-0.96-0.01H91.65v189.79h114.76V197.55z"/>'
    + '</svg>';

  // Before the reader has pointed at anything, the card speaks of the wall as
  // a whole — under that mark.
  const REST = {
    area: `${AREAS.length} ${plural(AREAS.length, 'область', 'области', 'областей')} науки`,
    name: `${PROFESSIONS.length} ${plural(PROFESSIONS.length, 'профессия', 'профессии', 'профессий')}`,
    note: `и ${nf(KINDS_TOTAL)} ${plural(KINDS_TOTAL, 'специализация', 'специализации', 'специализаций')} внутри них. Наведите на любую профессию, чтобы увидеть, кем именно можно стать`
  };

  let shown = null;

  function show(p) {
    shown = p;
    artEl.innerHTML = p
      ? `<img src="assets/professions/${p.icon}.svg" alt="" aria-hidden="true">`
      : HSE_MARK;
    areaEl.textContent = p ? p.area : REST.area;
    nameEl.textContent = p ? p.name : REST.name;

    const kinds = p ? kindsOf(p) : [];
    kindsEl.innerHTML = kinds.map((k) => `<li>${k}</li>`).join('');
    // The list holds its place even when it is empty — a profession with no
    // specializations beside it says nothing at all, and the card must not
    // shrink around that silence.
    kindsEl.hidden = !p;
    // The invitation stands only while nothing is picked.
    noteEl.hidden = !!p;
    noteEl.textContent = REST.note;
  }

  // The card must not breathe as the pointer runs along the wall, so it keeps
  // room for the longest of the 44 names and the longest of the 44 lists. How
  // many lines either of them takes depends on the width they are set in — so
  // both are measured, once here and again whenever the width changes.
  let measuredAt = 0;

  function reserve() {
    // The list is hidden while the card is at rest, and a hidden box has no
    // width to measure against — so it takes the place of the note for the
    // measurement, and the show() at the end puts both back.
    const back = shown;
    noteEl.hidden = true;
    kindsEl.hidden = false;
    const width = kindsEl.clientWidth;
    if (!width || width === measuredAt) {
      show(back);
      return;
    }
    measuredAt = width;

    kindsEl.style.minHeight = '0px';
    headEl.style.minHeight = '0px';
    let list = 0;
    let head = 0;
    PROFESSIONS.forEach((p) => {
      kindsEl.innerHTML = kindsOf(p).map((k) => `<li>${k}</li>`).join('');
      nameEl.textContent = p.name;
      areaEl.textContent = p.area;
      list = Math.max(list, kindsEl.scrollHeight);
      head = Math.max(head, headEl.scrollHeight);
    });
    kindsEl.style.minHeight = `${list}px`;
    noteEl.style.minHeight = `${list}px`;
    headEl.style.minHeight = `${head}px`;
    show(back);
  }

  // All 44 have to stand in the box at once — the section is one screen tall
  // and nothing here scrolls. Groups are not broken across columns, so how
  // many columns it takes is not a matter of width alone: the wall is laid out
  // again with one more column until nothing hangs out of the box.
  const MAX_COLUMNS = 8;
  const stacked = window.matchMedia('(max-width: 860px)');

  function fit() {
    if (stacked.matches) {
      grid.style.columnCount = '';       // one long column, scrolling with the page
      return;
    }
    const from = Math.max(3, Math.floor(grid.clientWidth / 230));
    for (let n = from; n <= MAX_COLUMNS; n++) {
      grid.style.columnCount = n;
      if (grid.scrollWidth <= grid.clientWidth + 1) return;
    }
  }

  function measure() {
    reserve();
    fit();                                // the card sets how tall the box is
  }

  window.addEventListener('resize', measure);
  stacked.addEventListener('change', measure);

  // ---------- The wall ----------
  let current = null;

  function pick(item, p) {
    if (current === item) return;
    if (current) current.classList.remove('on');
    current = item;
    item.classList.add('on');
    show(p);
  }

  AREAS.forEach(({ area, items }) => {
    const group = document.createElement('div');
    group.className = 'prof-group';
    group.innerHTML = '<div class="prof-group-title"></div><div class="prof-group-items"></div>';
    group.querySelector('.prof-group-title').textContent = area;
    const box = group.querySelector('.prof-group-items');

    items.forEach((p) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'prof-item';
      item.innerHTML = `
        <img class="prof-item-art" src="assets/professions/${p.icon}.svg" alt="" aria-hidden="true">
        <span class="prof-item-text">
          <span class="prof-item-name"></span>
          <span class="prof-item-kinds"></span>
        </span>
      `;
      item.querySelector('.prof-item-name').textContent = p.name;
      item.querySelector('.prof-item-kinds').textContent = kindsOf(p).join(', ');

      // The card follows the pointer and the keyboard alike, and keeps the
      // last profession when the pointer leaves the wall: it is there to be
      // read, not to blink.
      item.addEventListener('pointerenter', () => pick(item, p));
      item.addEventListener('focus', () => pick(item, p));
      item.addEventListener('click', () => pick(item, p));

      box.appendChild(item);
    });

    grid.appendChild(group);
  });

  show(null);
  measure();
}
