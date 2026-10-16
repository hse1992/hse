// Countries HSE students come from, as a wall of flags split by part of the world.

import { CITIES, STUDENTS, FOREIGN } from '../data/hse.js';
import { COUNTRIES, REGIONS, BY_CITY } from '../data/countries.js';
import { nf, pct, plural } from '../lib/format.js';
import { onResize } from '../lib/ui.js';

// The world to compare against: 193 UN members plus 2 observer states, split
// by part of the world the same way the countries above are (UN M49, so the
// Caucasus, Turkey and Kazakhstan count as Asia).
const REGION_WORLD = { europe: 44, asia: 48, africa: 54, america: 35, oceania: 14 };
const WORLD = Object.values(REGION_WORLD).reduce((n, x) => n + x, 0);

const countries = (n) => plural(n, 'страна', 'страны', 'стран');

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
  // Hands the reader over from the stadium: the whole student body first, and
  // then the part of it that brings the quotation on.
  // The question comes straight after the figure it is about, and it stays:
  // the screen goes up to the top of the section and reads as its heading
  // while the reader answers under it. How many countries there are is said
  // only once they have.
  // The question is picked out in corporate blue, the way the page picks out
  // what a screen turns on. Painted inline: the shell draws the lead-in before
  // the styles of the module arrive.
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
      + '<span class="world-ask" style="background: var(--hse-blue); color: var(--card)">'
      + 'Как думаешь, из скольких стран?</span>'
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
  steps: 2,
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
  const TILE_PHONE = 26;          // on a phone the wall is as tall as it needs to be
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

      .world-tile:hover {
        transform: scale(1.14);
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
        outline: none;
      }

      .world-scale[aria-disabled="true"] {
        cursor: default;
      }

      .world-scale:focus-visible .meter-bar {
        box-shadow: 0 0 0 2px var(--hse-blue);
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
        height: 19px;
        margin-top: 5px;
      }

      .world-tick {
        position: absolute;
        top: 0;
        width: 1px;
        height: 4px;
        margin-left: -0.5px;
        background: var(--btn-border);
      }

      .world-tick.is-big {
        height: 7px;
        background: var(--text-caption);
      }

      .world-tick span {
        position: absolute;
        top: 9px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.75rem;
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

      /* The reader's mark: a line across the bar with a head above it. It
         stays after the answer, so the distance to the filled part is seen. */
      .world-guess {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 3px;
        margin-left: -1.5px;
        border-radius: 2px;
        background: var(--text);
        opacity: 0;
        transition: opacity 260ms ease;
        pointer-events: none;
      }

      .world-guess::before {
        content: '';
        position: absolute;
        left: 50%;
        top: -5px;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: var(--text);
        box-shadow: 0 0 0 2px var(--card);
        transform: translateX(-50%);
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
        0% { box-shadow: 0 0 0 0 var(--hse-blue); }
        30% { box-shadow: 0 0 0 4px var(--hse-blue); }
        100% { box-shadow: 0 0 0 0 transparent; }
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
        justify-content: center;
        max-height: 64px;
        padding-top: 6px;
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
        font-size: 0.9375rem;
        font-weight: 600;
        padding: 10px 30px;
        color: var(--card);
        background: var(--hse-blue);
        border-color: var(--hse-blue);
      }

      .world-check:hover {
        color: var(--card);
        background: var(--link-hover);
        border-color: var(--link-hover);
      }

      .world-check:disabled {
        opacity: 0.35;
        cursor: default;
        background: var(--hse-blue);
        border-color: var(--hse-blue);
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
         and the scale has the whole width of the page to itself. With the
         answer the campuses come back in from the left and the scale draws
         aside to the right; the wall of flags waits for that to finish and
         then comes in with the wave a switch runs across it. */

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

        .world-body.world-asking {
          gap: 0;
        }

        .world-asking .world-left {
          width: 0;
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .world-scale.is-nudged .meter-bar { animation: none; }
        .world-body,
        .world-left { transition: none; }
      }

      /* On a phone the columns are stacked, so there is nothing to draw aside:
         the campuses are simply out of the way until the answer. */
      @media (max-width: 860px) {
        .world-asking .world-left {
          display: none;
        }
      }

      /* Five captions and 128 flags do not fit into a screen-sized card on a
         phone: squeezed into 40dvh a flag is 16px wide and unrecognisable. So
         here the wall grows to its full height and scrolls with the page, and
         the counter sticks to the top instead of the picture. */
      @media (max-width: 860px) {
        .world-right {
          position: static;
          padding: 0;
          background: none;
        }

        .world-right::after { display: none; }

        .world-right .meter-card {
          position: sticky;
          top: 0;
          z-index: 2;
          box-shadow: var(--card-shadow), 0 10px 16px -14px rgba(16, 24, 40, 0.55);
        }

        .canvas-card.world-flags-card { height: auto; }

        .world-wrap {
          flex: none;
          height: auto;
        }

        .world-grid {
          position: static;
          overflow: visible;
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
          <button type="button" class="btn world-check" data-el="check">Ответить</button>
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

  // ---------- Flags ----------
  const grid = $('grid');
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
      // own tooltip over ours, a second late. It is still read aloud — it is
      // the alt of the flag.
      tile.dataset.name = name;
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
      tile.innerHTML = `<img src="assets/flags/${code}.svg" alt="${name}" decoding="async"`
        + `${phone.matches ? ' loading="lazy"' : ''}>`;
      flags.appendChild(tile);
      tiles.set(code, tile);
      index++;
    });

    grid.appendChild(group);
  });

  // Flags are laid out to fill the card: take the largest size at which every
  // group, caption and flag still fits without scrolling.
  function layout() {
    if (phone.matches) {
      grid.style.setProperty('--tile', `${TILE_PHONE}px`);
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

  // ---------- The name under the cursor ----------
  // One tip for the whole wall, and one listener: 128 flags with a listener
  // each would cost more to build than the wall itself. Only where there is a
  // cursor to follow — a tap on a phone would leave the name standing there.
  const tip = $('tip');
  const wrap = tip.parentElement;

  if (window.matchMedia('(hover: hover)').matches) {
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
      shown = tile;
      tip.textContent = tile.dataset.name;
      // Placed before it is shown: the width is known only once the name is in.
      place(tile);
      tip.classList.add('is-here');
    };

    const hide = () => {
      shown = null;
      tip.classList.remove('is-here');
    };

    grid.addEventListener('pointerover', (e) => {
      const tile = e.target.closest('.world-tile');
      if (tile) show(tile);
      else hide();
    });
    grid.addEventListener('pointerleave', hide);
    // The wall scrolls only when it does not fit; the tip is placed against
    // the card, so a scroll would leave it beside the wrong flag.
    grid.addEventListener('scroll', hide, { passive: true });
  }
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
        <div class="city-name">${c.name}</div>
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

  // The ruler under the bar. A mark every ten countries, a longer one with a
  // figure every fifty — and the last one at the end of the scale, so both
  // ends of it are named. A mark that would crowd the last one is left out.
  const TICK = 10;
  const FIGURE = 50;
  const ruler = $('ruler');
  const tick = (v, big) => {
    const el = document.createElement('i');
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

  // Beat by beat the page is read only on a wide screen. Elsewhere it simply
  // scrolls, there is no next beat to wait at, and the answer is behind a
  // button instead.
  const stepped = () => document.documentElement.classList.contains('is-stepped');

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
      // Where the page waits for a mark the button waits with it. Where the
      // page scrolls on regardless, the answer can be had without one.
      if (stepped()) {
        check.textContent = 'Ответить';
        check.disabled = guess === null;
      } else {
        check.textContent = guess === null ? 'Показать ответ' : 'Ответить';
        check.disabled = false;
      }
      return;
    }

    const set = selected();
    meterTitle.textContent = 'Стран, откуда приняты студенты';
    animateCountTo(set.size);
    noteEl.textContent = `из ${nf(WORLD)} стран мира — ${pct(set.size, WORLD)}`;
    barSeg.style.width = `${(set.size / WORLD) * 100}%`;
    // Said against all of them, whatever the switches are showing now.
    verdictEl.innerHTML = guess === null ? '' : `<b>${verdict(guess)}</b> — твоя догадка ${nf(guess)}`;
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
  check.addEventListener('click', () => {
    if (stepped()) {
      root.dispatchEvent(new CustomEvent('story:next', { bubbles: true }));
      return;
    }
    checked = true;
    setAsking(false);
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
      root.classList.remove('world-shut');
      void grid.offsetWidth;
      root.classList.remove('world-dim');
    }, after);
  }

  function setAsking(on) {
    if (on === asking) return;
    const first = asking === null;
    asking = on;
    // Only a change the reader watches is played; the first state is simply
    // set, and so is everything on a page that scrolls.
    const plays = !first && stepped();
    const from = root.getBoundingClientRect().top;
    if (plays) section.classList.add('world-turning');

    root.classList.toggle('world-asking', on);
    section.classList.toggle('world-answered', !on);
    if (on) {
      clearTimeout(unveiling);
      root.classList.add('world-shut', 'world-dim');
    } else {
      unveil(plays ? 620 : 0);
    }
    setHeading(on);
    scale.setAttribute('aria-disabled', on ? 'false' : 'true');
    scale.tabIndex = on ? 0 : -1;
    check.tabIndex = on ? 0 : -1;
    // The mark is kept, the scale is not a control any more: no focus ring
    // left standing round the answer.
    if (!on && [scale, check].includes(document.activeElement)) document.activeElement.blur();
    paintMeter();

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

  // Step 0 asks, step 1 answers. Where the page scrolls the shell does not
  // walk the steps — it asks straight for the last one — so there the answer
  // waits for the button instead.
  //
  // Except for a reader who has asked for less movement. For them the page is
  // not a story that plays but a page that is simply there, and the shell puts
  // every block into the state it ends in. A block holding its question would
  // be the one place that never got there: the number of countries was never
  // shown at all unless they found the scale and answered it.
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  function step(i) {
    if (!stepped() && still.matches) { setAsking(false); return; }
    setAsking(stepped() ? i < 1 : !checked);
  }

  // The answer does not come before the reader has put a mark down. Asked
  // because the reader wants to go on, it also shows them what is missing;
  // asked `quiet`ly — by anything that only wants to know — it just answers.
  function hold(i, { quiet = false } = {}) {
    if (i !== 1 || guess !== null) return false;
    if (!quiet) nudge();
    return true;
  }

  setAsking(true);
  render();
  layout();
  return { step, hold };
}
