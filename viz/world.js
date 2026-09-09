// Countries HSE students come from, as a wall of flags split by part of the world.

import { CITIES, STUDENTS, FOREIGN } from '../data/hse.js';
import { COUNTRIES, REGIONS, BY_CITY } from '../data/countries.js';
import { nf, pct, plural } from '../lib/format.js';

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

export const meta = {
  id: 'world',
  // Hands the reader over from the stadium: the whole student body first, and
  // then the part of it that brings the quotation on.
  // The countries are picked out in corporate blue: that is what the whole
  // section is about, and the wall of flags starts from it. Painted inline —
  // the shell draws the lead-in before the styles of the module arrive.
  lead: {
    value: `На стадионе было ${nf(STUDENTS_ROUND)}+ `
      + plural(STUDENTS_ROUND, 'студент', 'студента', 'студентов'),
    text: `Из них ${nf(FOREIGN)}+ ${plural(FOREIGN, 'иностранец', 'иностранца', 'иностранцев')} `
      + '<span class="world-lead-mark"'
      + ' style="background: var(--hse-blue); color: var(--card)">'
      + `из ${COUNTRIES.length} ${countriesOf(COUNTRIES.length)}</span>`
      + '. Вспоминаются слова классика…'
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
  subtitle: `У нас в гостях уже ${COUNTRIES.length} ${plural(COUNTRIES.length, 'флаг', 'флага', 'флагов')}`,
  // Opens with the lead-in screen and the title card, like the stadium does.
  intro: true
};

export function init(root) {
  'use strict';

  const GAP = 8;                  // gap between flags, px
  const HEAD = 21;                // a part-of-the-world caption with its gap, px
  const GROUP_GAP = 12;           // gap between parts of the world, px
  const TILE_MAX = 68;            // a flag never grows past this
  const TILE_MIN = 20;            // ...and never shrinks below it: the wall scrolls instead
  const TILE_PHONE = 26;          // on a phone the wall is as tall as it needs to be
  const phone = window.matchMedia('(max-width: 860px)');

  // ---------- Markup ----------
  // The wall of flags is specific to this visualisation, so its styles live
  // here and not in layout.css.
  root.innerHTML = `
    <style>
      /* The countries picked out in the lead-in. Colour comes inline with the
         markup; what is left here is the shape of the patch. The clone break
         keeps both halves painted if the line wraps inside it. */
      .world-lead-mark {
        padding: 0.06em 0.26em;
        border-radius: 0.2em;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }

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
         it slides in, and 129 clipping layers are 129 things to do in it. */
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

      /* One bar, one colour — the flags carry no city colour. */
      .world-bar-seg {
        background: var(--hse-blue);
      }

      /* Five captions and 129 flags do not fit into a screen-sized card on a
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

    <div class="col-left">
      <div class="city-list" data-el="cityList"></div>
      <div class="actions">
        <button type="button" class="btn" data-el="clearAll">Снять все</button>
        <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
      </div>
    </div>

    <div class="col-right world-right">
      <div class="meter-card">
        <div class="meter-title">Стран, откуда приняты студенты</div>
        <div class="world-score">
          <span class="world-score-value" data-el="count"></span>
          <span class="world-score-note">из ${WORLD} стран мира — <span data-el="pct"></span></span>
        </div>
        <div class="meter-bar">
          <div class="meter-bar-seg world-bar-seg" data-el="barSeg"></div>
        </div>
      </div>

      <div class="canvas-card world-flags-card">
        <div class="canvas-wrap world-wrap">
          <div class="world-grid" data-el="grid"></div>
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
      tile.title = name;
      // The wave crosses the whole wall in about the same time a repaint takes
      // elsewhere on the page.
      tile.style.setProperty('--d', `${Math.round(index * (340 / COUNTRIES.length))}ms`);
      tile.innerHTML = `<img src="assets/flags/${code}.svg" alt="${name}">`;
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
  // is one of 129 doing the same thing at once — so they are decoded here,
  // while the reader is still reading the title card.
  grid.querySelectorAll('img').forEach((img) => {
    if (img.decode) img.decode().catch(() => {});
  });

  new ResizeObserver(layout).observe(grid);
  phone.addEventListener('change', layout);
  // The web font arrives after the first paint and moves the captions.
  if (document.fonts) document.fonts.ready.then(layout);

  // ---------- Counter ----------
  const countEl = $('count');
  const pctEl = $('pct');
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

    animateCountTo(set.size);
    pctEl.textContent = pct(set.size, WORLD);
    barSeg.style.width = `${(set.size / WORLD) * 100}%`;
  }

  render();
  layout();
}
