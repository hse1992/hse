// Кем можно стать, отучившись в Вышке: все 44 укрупненные профессии сразу,
// по направлениям подготовки, с иконкой и с тем, что в каждую из них входит.

import { PROFESSIONS } from '../data/professions.js';
import { nf, plural } from '../lib/format.js';
import { mountLogo } from '../lib/logo.js';
import { toTop } from '../lib/ui.js';

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

const listOf = (s) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
const kindsOf = (p) => listOf(p.kinds);

// What the card says beside the name. Usually the specializations the table
// lists under the profession — but four of the 44 have none, and an empty
// half of the card says nothing at all. Those four show the programmes of
// their area instead.
const insideOf = (p) => {
  const kinds = kindsOf(p);
  return kinds.length
    ? { title: 'Специализации', items: kinds }
    : { title: 'Программы направления', items: listOf(p.programs) };
};

// The figure a line turns on, picked out by weight alone: HSE Sans Black on
// the plain text colour, against the grey the rest of the line is set in.
// Painted inline — the shell draws the line before the styles of the module
// arrive.
const mark = (text) =>
  `<span class="prof-mark" style="font-weight: 900; color: var(--text)">${text}</span>`;

// The styles of the card itself travel with the heading, not with the block:
// the shell draws the heading and the line under it several beats before the
// block is built, and the block is where a module's stylesheet lives. Left
// there, these parts stand unstyled while the card plays — both headings at
// once, and a line the shell cannot squeeze shut, because an inline span takes
// no height. The card then does not grow into place: it simply appears.
const CARD_STYLE = `<style>
  /* A line of air over the line under the logo while the card holds: without
     it the two read as one block. Once the card settles it is the subtitle of
     a heading again and needs none — so the air goes away with the card, by
     --intro-body. A block, not a span: the shell opens a part of the card by
     its height, and height is something only a block has. */
  .prof-lead {
    display: block;
    margin-top: calc(1em * (1 - var(--intro-body, 1)));
  }

  /* The patch under two words of the heading. Colour comes inline with the
     markup; what is left here is the shape of it. */
  .prof-accent {
    padding: 0.06em 0.3em;
    border-radius: 0.2em;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }

  /* The two headings of the card hand over to each other: each holds as much
     height as the other has given up, so the card is one thing all the way
     down and the shell can centre it at both ends. Both heights are measured —
     see measureHeads() below. */
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

  /* «Мы —» and the logo stand side by side in the middle of the screen. The
     heading is as wide as the section, so centring them here centres them on
     the screen. */
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

  /* The phone used to get the plain heading alone: the card followed the thumb
     there, and a reader could park halfway through this swap, where the logo
     and the line that replaces it stand on top of each other at half height
     each. Now the page is read by beats on a phone too — the swap only ever
     plays, never holds — so the logo is back. It only has to be measured
     against the narrow screen: a quarter of its width is a logo the size of a
     coin. */
  @media (max-width: 860px) {
    .prof-open { --prof-logo: min(24vh, 44vw, 240px); }

    .prof-open-we { font-size: calc(var(--prof-logo) * 0.34); }
  }

  .prof-open-we {
    font-size: calc(var(--prof-logo) * 0.4);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  /* The logo is laid out at the size it settles at and blown up with the card,
     like everything else in the heading. */
  .prof-open-logo {
    display: block;
    position: relative;
    width: var(--prof-logo);
    aspect-ratio: 1;
  }

  .prof-open-logo svg,
  .prof-open-logo img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
</style>`;

export const meta = {
  id: 'professions',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Профессии',
  // The card and the section have different headings. While the card holds,
  // it is «Мы —» and the logo under it, and the logo opens up on a beat of its
  // own to let «не только» into its ring. Once the card settles, the heading of
  // the section takes its place — the same one the block is read under.
  title: CARD_STYLE
    + '<span class="prof-open" aria-hidden="true">'
    +   '<span class="prof-open-row">'
    +     '<span class="prof-open-we">Мы —</span>'
    +     '<span class="prof-open-logo" data-el="logo"></span>'
    +   '</span>'
    + '</span>'
    + '<span class="prof-settled">Мы — Высшая школа '
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
      .prof-rest-logo {
        display: block;
        position: relative;
        width: 100%;
        aspect-ratio: 1;
      }

      .prof-rest-logo svg,
      .prof-rest-logo img {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
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
        /* Measured against the height of the screen, like the wall under it:
           on a short one the card gives up its room first. */
        gap: clamp(18px, 3.4vh, 32px);
        min-height: 5.8rem;
        padding: clamp(10px, 1.8vh, 16px) 20px;
        border-radius: var(--r-card);
        background: var(--card);
        box-shadow: var(--card-shadow);
      }

      /* Who it is: the icon over the name, down the whole height of the card. */
      /* Kept at one width: a narrower column would only make the longest name
         take another line, and the card taller — which is what the wall under
         it would have to pay for. */
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
        width: clamp(44px, 8vh, 72px);
        height: clamp(44px, 8vh, 72px);
      }

      /* At rest the head holds nothing but the logo, so it takes the room the
         name and the area give up — as much of it as the card keeps for them
         anyway, and no more, or the card would breathe. */
      .prof-detail.at-rest .prof-detail-art {
        width: clamp(68px, 12.5vh, 124px);
        height: clamp(68px, 12.5vh, 124px);
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
        font-size: clamp(0.9375rem, 2.2vh, 1.125rem);
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

      /* The line and the list under it are one block, and it is that block the
         card keeps room for — see reserve(). */
      .prof-inside[hidden] {
        display: none;
      }

      .prof-kinds {
        margin: 0;
        padding: 0 0 0 1.1em;
        columns: 15em;
        column-gap: 28px;
        font-size: clamp(0.75rem, 1.7vh, 0.875rem);
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
      /* The invitation is one line in a box kept as tall as the longest list of
         specializations, so it stands in the middle of it — beside the logo,
         not above it. */
      .prof-note {
        display: flex;
        align-items: center;
        /* A display of its own beats the browser's own rule for [hidden], and
           the card would keep room for a line it is not showing. */
        margin: 0;
        font-size: clamp(0.75rem, 1.7vh, 0.875rem);
        line-height: 1.5;
        color: var(--text-secondary);
      }

      .prof-note[hidden] {
        display: none;
      }

      /* At rest there is no list, so the caption over it does not hold its
         place either — otherwise the invitation would sit that much below the
         middle of the card. The card is as tall as the logo beside it anyway. */
      .prof-detail.at-rest .prof-kinds-title {
        display: none;
      }

      /* Where the card's two halves are measured: out of sight, out of the
         flow, and every block in it at its own natural height. */
      .prof-probe {
        position: absolute;
        left: -10000px;
        top: 0;
        visibility: hidden;
        pointer-events: none;
      }

      .prof-probe .prof-inside,
      .prof-probe .prof-detail-head {
        min-height: 0;
      }

      /* Absolute, like the canvases in the other sections: the wall must never
         push the card taller than the section. All 44 fit in it at once — the
         columns are what makes them fit, so nothing here ever scrolls.

         Everything in the wall is measured against the height of the screen:
         it is the height that the wall has to fit into, so on a short one the
         tiles are smaller rather than the columns more numerous. */
      .prof-grid {
        --prof-icon: calc(clamp(20px, 3vh, 30px) * var(--prof-fit, 1));
        --prof-name: calc(clamp(0.6875rem, 1.55vh, 0.8125rem) * var(--prof-fit, 1));
        --prof-area: calc(clamp(0.625rem, 1.35vh, 0.75rem) * var(--prof-fit, 1));
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

      /* Every group says which area of science it is: the fill tells where a
         group ends, the caption tells what it was. */
      .prof-group-title {
        margin: 1px 0 3px 8px;
        font-size: var(--prof-area);
        font-weight: 600;
        line-height: 1.2;
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
        width: var(--prof-icon);
        height: var(--prof-icon);
      }

      /* Long names hold the tile together rather than pushing it apart. */
      .prof-item-text {
        min-width: 0;
      }

      /* The name is never cut: five lines are enough for the longest of them
         even in the narrowest column the wall ever comes to. */
      .prof-item-name {
        font-size: var(--prof-name);
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
         read in the card above — here they would only be a cut-off line. The
         same goes for the mark that says a tile opens: there is nothing to
         open, the card has it all already. */
      .prof-item-kinds,
      .prof-item-more {
        display: none;
      }

      /* On a phone there is no pointer to follow, so the card has nothing to
         add: every profession spells itself out in place, and the wall grows
         to its full height and scrolls with the page. */
      @media (max-width: 860px) {
        .prof-detail { display: none; }

        /* Forty-four professions in one column are seven screens of thumb, and
           somewhere in the middle of them a reader has no idea which field they
           are reading about any more. The caption of the group holds the top of
           the screen while its own professions go by, and gives way to the next
           one — the list says where it is without anything being added to it. */
        .prof-group {
          padding-top: 0;
        }

        .prof-group-title {
          position: sticky;
          top: 0;
          z-index: 1;
          margin: 0 0 3px;
          padding: 7px 8px 5px;
          background: var(--bg);
          border-radius: 12px 12px 0 0;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .prof-body .col-right {
          position: static;
          padding: 0;
          background: none;
        }

        .prof-body .col-right::after { display: none; }

        /* Стена листается сама, а не отщелкивается тактами. Сорок четыре
           карточки — не кадры истории: это список, и палец должен вести по
           нему, а не просить каркас сдвинуть страницу на экран. Поэтому у
           карточки своя высота в экран, а у стены внутри нее — своя
           прокрутка; класс page-scrolls говорит каркасу не отнимать ее.
           Прокрутка остановится на своем краю и дальше страницу не потянет
           (overscroll-behavior), так что ход к следующему разделу
           по-прежнему просит отдельного движения. */
        .prof-body .canvas-card {
          height: calc(100dvh - var(--hint-room) - 16px);
          min-height: 0;
        }

        .prof-body .canvas-wrap {
          flex: 1;
          min-height: 0;
          height: auto;
        }

        .prof-grid {
          position: static;
          column-count: auto;
          height: 100%;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .prof-group {
          margin-bottom: 14px;
          padding: 8px 10px;
        }

        .prof-group-title {
          margin: 2px 0 6px 2px;
          font-size: 0.7188rem;
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

        /* Специализации есть у каждой профессии, и это еще три строки мелким
           шрифтом: сорок четыре профессии так разворачиваются в семь экранов
           пальца, и читатель листает их, уже не глядя. Поэтому список держит
           одни названия, а специализации приходят по тапу — по одной
           профессии за раз. */
        .prof-item-kinds {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          font-size: 0.75rem;
          line-height: 1.3;
          color: var(--text-caption);
          transition: grid-template-rows 260ms ease, opacity 260ms ease;
        }

        /* Закрытая плитка прячет специализации и от экранного диктора:
           нулевая высота для него не значит ничего, и кнопка называлась бы
           всеми пятью специализациями разом — при том что aria-expanded
           говорит, что они закрыты. Переход держит их видимыми, пока строка
           складывается: visibility переключается в скрытое в конце, а в
           видимое — сразу. */
        .prof-item-kinds > span {
          overflow: hidden;
          visibility: hidden;
          transition: visibility 260ms ease;
        }

        .prof-item.on .prof-item-kinds {
          grid-template-rows: 1fr;
          opacity: 1;
        }

        .prof-item.on .prof-item-kinds > span {
          visibility: visible;
        }

        /* Тонкая галка у правого края: без нее о том, что плитку можно
           нажать, читателю неоткуда узнать. Стоит она на строке с названием,
           а не посередине плитки — раскрытая плитка вдвое выше, и галка
           уехала бы к специализациям. */
        .prof-item-more {
          flex: none;
          display: block;
          align-self: flex-start;
          width: 8px;
          height: 8px;
          margin: 13px 2px 0 auto;
          border: solid var(--text-caption);
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
          transition: transform 260ms ease;
        }

        .prof-item.on .prof-item-more {
          transform: translateY(3px) rotate(-135deg);
        }
      }
    </style>

    <div class="col-right">
      <div class="prof-detail" data-el="detail">
        <div class="prof-detail-head" data-el="head">
          <span class="prof-detail-art" data-el="art"></span>
          <span class="prof-detail-text">
            <span class="prof-detail-area" data-el="area"></span>
            <span class="prof-detail-name" data-el="name"></span>
          </span>
        </div>
        <div class="prof-kinds-box">
          <div class="prof-inside" data-el="inside">
            <div class="prof-kinds-title" data-el="kindsTitle">Специализации</div>
            <ul class="prof-kinds" data-el="kinds"></ul>
          </div>
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
  //
  // Measured at the settled size, not at whatever the card is doing at that
  // moment: a card blown up half again is that much narrower in layout terms,
  // and the heading wraps onto a second line there. Kept room for that line,
  // the settled heading would carry an empty one under it for ever.
  function measureHeads() {
    if (!openEl || !settledEl) return;
    const keptK = section.style.getPropertyValue('--intro-k');
    section.style.setProperty('--intro-k', '1');
    [openEl, settledEl].forEach((el) => { el.style.height = 'auto'; });
    const open = openEl.offsetHeight;
    const settled = settledEl.offsetHeight;
    [openEl, settledEl].forEach((el) => { el.style.height = ''; });
    if (keptK) section.style.setProperty('--intro-k', keptK);
    else section.style.removeProperty('--intro-k');
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

  const detailEl = $('detail');
  const headEl = $('head');
  const artEl = $('art');
  const areaEl = $('area');
  const nameEl = $('name');
  const kindsEl = $('kinds');
  const insideEl = $('inside');
  const kindsTitleEl = $('kindsTitle');
  const noteEl = $('note');
  const grid = $('grid');
  // Каркас на телефоне отнимает прокрутку у всей страницы, кроме того, что
  // помечено этим классом. Стена — как раз такое место: ее листают пальцем.
  if (window.matchMedia('(max-width: 860px)').matches) grid.classList.add('page-scrolls');

  // ---------- The card ----------
  // The logo the section has just opened, standing still with «не только» in
  // its ring: that is what the card falls back to when nothing is picked.
  const restLogo = document.createElement('span');
  restLogo.className = 'prof-rest-logo';
  mountLogo(restLogo).then((it) => it.place(1));

  // Before the reader has pointed at anything the card holds the logo and the
  // invitation, and says nothing else: the figures it used to carry are all in
  // the line above the card anyway.
  const REST_NOTE = 'Наведи на любую профессию, чтобы увидеть, кем именно можно стать';

  let shown = null;

  function show(p) {
    shown = p;
    if (p) artEl.innerHTML = `<img src="assets/professions/${p.icon}.svg" alt="" aria-hidden="true">`;
    else artEl.replaceChildren(restLogo);
    detailEl.classList.toggle('at-rest', !p);
    areaEl.textContent = p ? p.area : '';
    nameEl.textContent = p ? p.name : '';

    const inside = p ? insideOf(p) : { title: '', items: [] };
    kindsEl.innerHTML = inside.items.map((k) => `<li>${k}</li>`).join('');
    // The block holds its place even when it is empty — the card must not
    // shrink around a profession that has less to say than its neighbours.
    insideEl.hidden = !p;
    // Hidden rather than dropped: the caption keeps its place over the
    // invitation, so the card stays one height.
    kindsTitleEl.textContent = inside.title || 'Специализации';
    kindsTitleEl.style.visibility = inside.items.length ? '' : 'hidden';
    // The invitation stands only while nothing is picked.
    noteEl.hidden = !!p;
    noteEl.textContent = REST_NOTE;
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
    // Measured as the card looks with a profession in it: at rest it holds the
    // logo, which is bigger than any icon, and measuring against that would
    // keep room the card never needs.
    detailEl.classList.remove('at-rest');
    noteEl.hidden = true;
    insideEl.hidden = false;
    const width = insideEl.clientWidth;
    if (!width || width === measuredAt) {
      show(back);
      return;
    }
    measuredAt = width;

    // All 44 at once, not one after another: reading a height back straight
    // after writing the text makes the browser lay the whole page out again,
    // and 88 of those is most of what building this section used to cost. Here
    // they are written into one hidden probe and read in a single pass.
    const list = tallest(width, PROFESSIONS.map((p) => {
      const inside = insideOf(p);
      return '<div class="prof-inside">'
        + `<div class="prof-kinds-title">${inside.title}</div>`
        + `<ul class="prof-kinds">${inside.items.map((k) => `<li>${k}</li>`).join('')}</ul>`
        + '</div>';
    }).join(''));
    const head = tallest(headEl.clientWidth, PROFESSIONS.map((p) =>
      '<div class="prof-detail-head">'
      + '<span class="prof-detail-art"></span>'
      + '<span class="prof-detail-text">'
      +   `<span class="prof-detail-area">${p.area}</span>`
      +   `<span class="prof-detail-name">${p.name}</span>`
      + '</span></div>').join(''));

    insideEl.style.minHeight = `${list}px`;
    noteEl.style.minHeight = `${list}px`;
    headEl.style.minHeight = `${head}px`;
    show(back);
  }

  // Lays the given blocks out side by side in a box of that width, out of
  // sight, and gives back the tallest of them.
  function tallest(width, html) {
    const probe = document.createElement('div');
    probe.className = 'prof-probe';
    probe.style.width = `${width}px`;
    probe.innerHTML = html;
    root.appendChild(probe);
    // Rounded up, not to the nearest pixel: lines come out a fraction of a
    // pixel tall, and a reserve that is a fraction short lets the card grow by
    // that much for the tallest of them — enough to set the wall re-fitting.
    const height = Math.max(...[...probe.children].map((el) => el.getBoundingClientRect().height));
    probe.remove();
    return Math.ceil(height);
  }

  // All 44 have to stand in the box at once — the section is one screen tall
  // and nothing here scrolls. Groups are not broken across columns, so what it
  // takes to fit them is not a matter of width alone.
  //
  // There are two ways of winning room, and they pull against each other: one
  // more column, and smaller tiles. Columns come at the price of width, and a
  // narrow column breaks a name like «Инженер электронных и телекоммуника-
  // ционных систем» into a stack of syllables — so the wall first tries to
  // shrink a little, and only takes another column when shrinking is not
  // enough.
  const MAX_COLUMNS = 8;
  const SHRINK = [1, 0.94, 0.88, 0.82];
  const idle = window.requestIdleCallback
    ? (fn, opts) => window.requestIdleCallback(fn, opts)
    : (fn) => setTimeout(fn, 60);
  const wrap = grid.parentElement;
  const COLUMN = 250;                    // the width a column would like to be
  const stacked = window.matchMedia('(max-width: 860px)');

  // What is over the edge is whole columns wide, so how many the wall would
  // take can be read off instead of searched for: every trial costs a full
  // layout of all 44, and there is no need to walk to the answer one column
  // at a time.
  const columnsNeeded = () => {
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const n = Number(grid.style.columnCount) || 1;
    const column = (grid.clientWidth - gap * (n - 1)) / n;
    return Math.round((grid.scrollWidth + gap) / (column + gap));
  };

  // A trial is a layout of all 44, and a run of them in one go is a stutter
  // the reader can see. So the trials are taken one at a time, in the moments
  // the page has nothing else to do: the first right away — on a wide screen
  // it is usually the only one — and the rest as they come.
  let walk = null;

  function fit() {
    if (walk) walk.stopped = true;
    walk = null;

    if (stacked.matches) {
      grid.style.columnCount = '';       // one long column, scrolling with the page
      grid.style.removeProperty('--prof-fit');
      return;
    }
    const from = Math.max(3, Math.floor(grid.clientWidth / COLUMN));
    grid.style.position = '';
    wrap.style.overflowY = '';

    const state = { n: from, left: [...SHRINK], stopped: false };
    walk = state;

    const trial = () => {
      if (state.stopped) return;
      grid.style.columnCount = state.n;
      grid.style.setProperty('--prof-fit', state.left.shift());
      if (grid.scrollWidth <= grid.clientWidth + 1) { walk = null; return; }

      if (!state.left.length) {
        state.n = Math.max(state.n + 1, columnsNeeded());
        state.left = [...SHRINK];
      }

      if (state.n > MAX_COLUMNS) {
        // A window too short for all of it even shrunk — a laptop turned
        // sideways, a browser with three toolbars. Better a wall the reader
        // can scroll than one that quietly keeps nine professions off the
        // screen: the wall leaves its fixed box, becomes as tall as it needs
        // and the box scrolls. One column more than the width would like, at
        // full size: it is scrolled anyway, so the tiles may as well be
        // readable and the scroll short.
        grid.style.columnCount = Math.min(MAX_COLUMNS, from + 1);
        grid.style.setProperty('--prof-fit', 1);
        grid.style.position = 'static';
        wrap.style.overflowY = 'auto';
        walk = null;
        return;
      }
      idle(trial, { timeout: 120 });
    };

    trial();
  }

  function measure() {
    reserve();
    fit();                                // the card sets how tall the box is
  }

  window.addEventListener('resize', measure);
  stacked.addEventListener('change', measure);
  // The first measurement is taken before the page has finished settling —
  // fonts land, the logo in the card arrives — and the wall is laid out
  // against what it sees. So it is taken again once all that is over.
  requestAnimationFrame(measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  // The box the wall stands in is not the same size all the way through: while
  // the card holds, the heading is a logo and takes most of the screen. So the
  // wall is laid out again whenever its box changes, not only on a resize.
  //
  // The box is watched, not the wall itself: laying the wall out changes its
  // size, and watching it would have it lay itself out for ever.
  //
  // Only a change of whole pixels counts. A re-fit starts over from the
  // biggest tiles and shrinks them back trial by trial — a fraction of a pixel
  // of the card is not worth the wall visibly jumping under the pointer.
  let pending = false;
  let box = '';
  new ResizeObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const size = `${Math.round(wrap.clientWidth)}x${Math.round(wrap.clientHeight)}`;
      if (size === box) return;
      box = size;
      fit();
    });
  }).observe(wrap);

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
          <span class="prof-item-kinds"><span></span></span>
        </span>
        <span class="prof-item-more" aria-hidden="true"></span>
      `;
      item.querySelector('.prof-item-name').textContent = p.name;
      item.querySelector('.prof-item-kinds > span').textContent = kindsOf(p).join(', ');

      if (stacked.matches) {
        // На телефоне карточки с подробностями нет, и плитка открывается
        // сама. Открыта всегда одна: сорок четыре раскрытых профессии — это
        // ровно тот список, от которого тап и спасает. Повторный тап
        // закрывает — иначе однажды открытое уже никак не убрать.
        item.setAttribute('aria-expanded', 'false');
        item.addEventListener('click', () => {
          const open = current !== item;
          if (current) {
            current.classList.remove('on');
            current.setAttribute('aria-expanded', 'false');
          }
          current = open ? item : null;
          item.classList.toggle('on', open);
          item.setAttribute('aria-expanded', String(open));
        });
      } else {
        // The card follows the pointer and the keyboard alike, and keeps the
        // last profession when the pointer leaves the wall: it is there to be
        // read, not to blink.
        item.addEventListener('pointerenter', () => pick(item, p));
        item.addEventListener('focus', () => pick(item, p));
        item.addEventListener('click', () => pick(item, p));
      }

      box.appendChild(item);
    });

    grid.appendChild(group);
  });

  show(null);
  // Laying the wall out is the expensive part of this module, and nobody is
  // looking at it yet: the card holds the screen for three beats first. So the
  // section is built now and laid out when the page has a moment — the beat
  // that brings it in, and the one that carries the page to it, stay smooth.
  idle(measure, { timeout: 500 });

  // На телефоне стену листают пальцем, и то, где она остановилась, — такое же
  // положение картинки, как поворот планеты или место поезда на кольце.
  // Поэтому читатель, вернувшийся в раздел, застает стену с первой строки, а
  // не там, где бросил ее в прошлый раз. Раскрытая плитка закрывается вместе
  // с этим: открытой осталась бы та, до которой отсюда уже не видно.
  //
  // Возвращает стену toTop(), а не простое обнуление: на айфоне мах оставляет
  // после себя инерцию, и ноль, записанный ей поперек, она перетирает обратно.
  return {
    open() {
      toTop(grid);
      if (current && stacked.matches) {
        current.classList.remove('on');
        current.setAttribute('aria-expanded', 'false');
        current = null;
      }
    }
  };
}
