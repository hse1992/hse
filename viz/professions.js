// Кем можно стать, отучившись в Вышке: все 44 укрупненные профессии сразу,
// по областям науки, с иконкой и с тем, что в каждую из них входит.

import { PROFESSIONS } from '../data/professions.js';
import { nf, plural } from '../lib/format.js';
import { mountLogo } from '../lib/logo.js';

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
  // The card and the section have different headings. While the card holds,
  // it is «Мы —» and the logo under it, and the logo opens up on a beat of its
  // own to let «не только» into its ring. Once the card settles, the heading of
  // the section takes its place — the same one the block is read under.
  title: '<span class="prof-open">'
    +   '<span class="prof-open-row">'
    +     '<span class="prof-open-we">Мы —</span>'
    +     '<span class="prof-open-logo" data-el="logo"></span>'
    +   '</span>'
    + '</span>'
    + '<span class="prof-settled">Высшая школа '
    +   '<span class="prof-accent" style="background: var(--hse-blue); color: var(--card)">не только</span>'
    + ' экономики</span>',
  // The last beat of the card: what the wall under it is about.
  subtitle: `<span class="prof-lead intro-stage" data-stage="2">В Вышке можно стать кем угодно. ${mark(`${nf(KINDS_TOTAL)} ${plural(KINDS_TOTAL, 'специализация', 'специализации', 'специализаций')}`)}, где раскроется любой талант. Укрупненно из них можно выделить ${mark(`${PROFESSIONS.length} профессии`)}</span>`,
  intro: true,
  // Three beats before the block: the logo as it is, the logo opening up, and
  // the line under it.
  introStages: 3
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

      /* The two headings of the card hand over to each other: each holds as
         much height as the other has given up, so the card is one thing all
         the way down and the shell can centre it at both ends. Both heights
         are measured — see measureHeads() below. */
      .prof-open,
      .prof-settled {
        display: block;
        overflow: hidden;
      }

      .prof-open {
        /* Everything on this card is measured against the logo: it is the one
           thing on the screen, and the words beside it are its size. */
        --prof-logo: min(26vh, 25vw, 240px);
        height: calc(var(--prof-open-h, 0px) * (1 - var(--intro-body, 1)));
        opacity: calc(1 - var(--intro-body, 1));
      }

      /* «Мы —» and the logo stand side by side in the middle of the screen.
         The heading is as wide as the section, so centring them here centres
         them on the screen. */
      .prof-open-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: calc(var(--prof-logo) * 0.1);
      }

      .prof-settled {
        height: calc(var(--prof-settled-h, 1.2em) * var(--intro-body, 1));
        opacity: var(--intro-body, 1);
      }

      .prof-open-we {
        font-size: calc(var(--prof-logo) * 0.4);
        line-height: 1;
        letter-spacing: -0.03em;
      }

      /* The logo is laid out at the size it settles at and blown up with the
         card, like everything else in the heading. */
      .prof-open-logo {
        display: block;
        width: var(--prof-logo);
      }

      .prof-open-logo,
      .prof-rest-logo {
        position: relative;
        aspect-ratio: 1;
      }

      .prof-open-logo svg,
      .prof-open-logo img,
      .prof-rest-logo svg,
      .prof-rest-logo img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
      }

      .prof-rest-logo {
        display: block;
        width: 100%;
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
      /* The list and the caption over it stand together beside the head. */
      .prof-kinds-box {
        flex: 1;
        min-width: 0;
        align-self: center;
      }

      /* Kept in place even when there is nothing under it — the card holds one
         height whatever it shows. */
      .prof-kinds-title {
        margin-bottom: 6px;
        font-size: 0.7188rem;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: 0.02em;
        color: var(--text-caption);
      }

      .prof-kinds {
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

      /* The name is never cut: five lines are enough for the longest of them
         even in the narrowest column the wall ever comes to. */
      .prof-item-name {
        font-size: 0.75rem;
        font-weight: 600;
        line-height: 1.25;
        /* A column can come out narrower than a word like
           «телекоммуникационных» — it is hyphenated then, never cut. */
        hyphens: auto;
        overflow-wrap: break-word;
        display: -webkit-box;
        -webkit-line-clamp: 5;
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
        <div class="prof-kinds-box">
          <div class="prof-kinds-title" data-el="kindsTitle">Специализации</div>
          <ul class="prof-kinds" data-el="kinds"></ul>
          <p class="prof-note" data-el="note"></p>
        </div>
      </div>

      <div class="canvas-card">
        <div class="canvas-wrap">
          <div class="prof-grid" data-el="grid"></div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- The opening ----------
  const section = root.closest('.viz-section');
  const openEl = section.querySelector('.prof-open');
  const settledEl = section.querySelector('.prof-settled');

  // Each of the two headings holds the height the other has given up, and a
  // height cannot be handed over in the abstract: both are measured here, and
  // again whenever anything that could change them does.
  function measureHeads() {
    if (!openEl || !settledEl) return;
    [openEl, settledEl].forEach((el) => { el.style.height = 'auto'; });
    const open = openEl.offsetHeight;
    const settled = settledEl.offsetHeight;
    [openEl, settledEl].forEach((el) => { el.style.height = ''; });
    section.style.setProperty('--prof-open-h', `${open}px`);
    section.style.setProperty('--prof-settled-h', `${settled}px`);
  }

  measureHeads();
  window.addEventListener('resize', measureHeads);

  // The logo opens its ring on the first beat of the card. The shell tells the
  // beat through --stage-1 and has no other way of reaching a module, so the
  // drawing follows that variable — one change of it is one frame of the beat.
  const logoHost = section.querySelector('.prof-open-logo');
  let logo = null;
  let placed = -1;

  const follow = () => {
    if (!logo) return;
    const p = parseFloat(section.style.getPropertyValue('--stage-1')) || 0;
    if (p === placed) return;
    placed = p;
    logo.place(p);
  };

  if (logoHost) {
    mountLogo(logoHost).then((it) => {
      logo = it;
      follow();
      measureHeads();
      new MutationObserver(follow)
        .observe(section, { attributes: true, attributeFilter: ['style'] });
    });
  }

  const headEl = $('head');
  const artEl = $('art');
  const areaEl = $('area');
  const nameEl = $('name');
  const kindsEl = $('kinds');
  const kindsTitleEl = $('kindsTitle');
  const noteEl = $('note');
  const grid = $('grid');

  // ---------- The card ----------
  // The logo the section has just opened, standing still with «не только» in
  // its ring: that is what the card falls back to when nothing is picked.
  const restLogo = document.createElement('span');
  restLogo.className = 'prof-rest-logo';
  mountLogo(restLogo).then((it) => it.place(1));

  // Before the reader has pointed at anything, the card speaks of the wall as
  // a whole — under that logo.
  const REST = {
    area: `${AREAS.length} ${plural(AREAS.length, 'область', 'области', 'областей')} науки`,
    name: `${PROFESSIONS.length} ${plural(PROFESSIONS.length, 'профессия', 'профессии', 'профессий')}`,
    note: `и ${nf(KINDS_TOTAL)} ${plural(KINDS_TOTAL, 'специализация', 'специализации', 'специализаций')} внутри них. Наведите на любую профессию, чтобы увидеть, кем именно можно стать`
  };

  let shown = null;

  function show(p) {
    shown = p;
    if (p) artEl.innerHTML = `<img src="assets/professions/${p.icon}.svg" alt="" aria-hidden="true">`;
    else artEl.replaceChildren(restLogo);
    areaEl.textContent = p ? p.area : REST.area;
    nameEl.textContent = p ? p.name : REST.name;

    const kinds = p ? kindsOf(p) : [];
    kindsEl.innerHTML = kinds.map((k) => `<li>${k}</li>`).join('');
    // The list holds its place even when it is empty — a profession with no
    // specializations beside it says nothing at all, and the card must not
    // shrink around that silence.
    kindsEl.hidden = !p;
    // Hidden rather than dropped: the caption keeps its place over the
    // invitation and over a profession that has nothing beside it, so the card
    // stays one height.
    kindsTitleEl.style.visibility = kinds.length ? '' : 'hidden';
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

  // The box the wall stands in is not the same size all the way through: while
  // the card holds, the heading is a logo and takes most of the screen. So the
  // wall is laid out again whenever its box changes, not only on a resize.
  let pending = false;
  new ResizeObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; fit(); });
  }).observe(grid);

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
