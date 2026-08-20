// Every HSE programme taken one after another — how long a single student
// would sit through all of them.

import { CITIES } from '../data/hse.js';
import { HISTORY } from '../data/history.js';
import { nf, plural } from '../lib/format.js';

// Facts about the curriculum itself — they live here, not in data/hse.js,
// which only knows about the people. A bachelor's or a specialist's degree
// takes four years, a master's two.
const PROGRAMS = {
  msk: { bachelor: 80, master: 154 },
  spb: { bachelor: 21, master: 27 },
  nn: { bachelor: 17, master: 14 },
  perm: { bachelor: 9, master: 7 }
};

// The two levels the checkboxes switch on and off. `shade` is the colour a
// city lends to this level — the main one for the longer degree, the lighter
// one for the shorter, same as on the stadium.
const LEVELS = [
  { key: 'bachelor', label: 'Бакалавриат и специалитет', short: 'бакалавриат', years: 4, shade: (c) => c.color },
  { key: 'master', label: 'Магистратура', short: 'магистратура', years: 2, shade: (c) => c.colorLight }
];

const countOf = (city, level) => PROGRAMS[city.key][level.key];
const PROGRAMS_TOTAL = CITIES.reduce(
  (n, c) => n + LEVELS.reduce((m, l) => m + countOf(c, l), 0), 0
);
const YEARS_TOTAL = CITIES.reduce(
  (n, c) => n + LEVELS.reduce((m, l) => m + countOf(c, l) * l.years, 0), 0
);

export const meta = {
  id: 'study',
  title: 'Учиться, учиться и еще раз учиться',
  subtitle: `В Вышке ${nf(PROGRAMS_TOTAL)} образовательных программ. Если поступать на них по очереди, одну за другой, учиться придется ${nf(YEARS_TOTAL)} ${plural(YEARS_TOTAL, 'год', 'года', 'лет')}`
};

export function init(root) {
  'use strict';

  // The year the answer is counted back from. Pinned rather than taken from
  // the clock: every year the reader can land on has a historical event
  // attached to it in data/history.js, and a moving "now" would shift them all.
  const NOW = 2026;

  // ---------- Markup ----------
  // The stage with the big number is specific to this visualisation, so its
  // styles live here and not in layout.css.
  root.innerHTML = `
    <style>
      .study-stage {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px;
        text-align: center;
      }

      .study-years {
        display: flex;
        align-items: baseline;
        gap: 0.18em;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 700;
        font-size: clamp(3rem, 11vw, 8.5rem);
        font-variant-numeric: tabular-nums;
        color: var(--hse-blue);
      }

      .study-years-unit {
        font-size: 0.36em;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-secondary);
      }

      .study-caption {
        max-width: 30ch;
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      /* The date the studies would have to start at, with a picture of what
         was happening then. A card of its own, so it reads as a separate
         thought and not as a third line of the caption. */
      .study-history {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-top: 26px;
        padding: 18px 26px 18px 20px;
        border-radius: var(--r-canvas-card);
        background: var(--bg);
        max-width: 540px;
        text-align: left;
        opacity: 0;
        transition: opacity 260ms ease;
      }

      .study-history[hidden] { display: none; }

      .study-history.in { opacity: 1; }

      .study-art {
        flex: none;
        width: 88px;
        height: 88px;
      }

      .study-art svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .study-history-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .study-since {
        font-size: 1.125rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text);
      }

      .study-since b {
        font-weight: 700;
        color: var(--hse-blue);
      }

      .study-event {
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      @media (max-width: 860px) {
        .study-years { font-size: clamp(2.75rem, 17vw, 5rem); }
        .study-caption { font-size: 0.875rem; }
        .study-history { gap: 12px; margin-top: 18px; padding: 12px 16px; }
        .study-art { width: 64px; height: 64px; }
        .study-since { font-size: 1rem; }
        .study-event { font-size: 0.875rem; }

        /* The picture has no fixed height of its own, unlike the canvases in
           the other sections: a long event text must not be cut off. */
        #study .canvas-card { height: auto; min-height: 40dvh; }
      }
    </style>

    <div class="col-left">
      <div class="kind-row" data-el="kindRow"></div>
      <div class="city-list" data-el="cityList"></div>
      <div class="actions">
        <button type="button" class="btn" data-el="clearAll">Снять все</button>
        <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
      </div>
    </div>

    <div class="col-right">
      <div class="meter-card">
        <div class="meter-header">
          <div class="meter-title">Образовательных программ</div>
          <div class="meter-value"><strong data-el="programs"></strong> из ${nf(PROGRAMS_TOTAL)}</div>
        </div>
        <div class="meter-bar" data-el="bar"></div>
      </div>

      <div class="canvas-card">
        <div class="canvas-legend">
          <span>Бакалавриат и специалитет — 4 года, магистратура — 2 года</span>
        </div>
        <div class="study-stage">
          <div class="study-years">
            <span data-el="years">0</span>
            <span class="study-years-unit" data-el="yearsWord">лет</span>
          </div>
          <div class="study-caption" data-el="caption"></div>
          <div class="study-history" data-el="history" hidden>
            <span class="study-art" data-el="art" aria-hidden="true"></span>
            <span class="study-history-text">
              <span class="study-since" data-el="since"></span>
              <span class="study-event" data-el="event"></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = {
    active: { msk: true, spb: true, nn: true, perm: true },
    levels: { bachelor: true, master: true }
  };

  const selected = (city, level) =>
    state.active[city.key] && state.levels[level.key] ? countOf(city, level) : 0;

  const totals = () => {
    let programs = 0, years = 0;
    CITIES.forEach((c) => LEVELS.forEach((l) => {
      const n = selected(c, l);
      programs += n;
      years += n * l.years;
    }));
    return { programs, years };
  };

  // ---------- Counting animation ----------
  // Both numbers run to their new value together, on the same curve as the
  // rest of the page.
  const shown = { programs: 0, years: 0 };
  let tween = null;
  let frame = null;

  function animateTo(target, instant) {
    if (instant) {
      Object.assign(shown, target);
      tween = null;
      paint();
      paintHistory();
      return;
    }
    // The year runs together with the count, so the picture waits for both.
    historyEl.classList.remove('in');
    tween = { from: { ...shown }, to: target, t0: performance.now() };
    if (frame === null) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = null;
    if (!tween) return;
    const raw = Math.min(1, Math.max(0, (now - tween.t0) / 620));
    const p = 1 - Math.pow(1 - raw, 3);
    Object.keys(shown).forEach((key) => {
      shown[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * p;
    });
    if (raw >= 1) tween = null; else frame = requestAnimationFrame(tick);
    paint();
    if (tween === null) paintHistory();
  }

  const yearsEl = $('years');
  const yearsWordEl = $('yearsWord');
  const programsEl = $('programs');
  const captionEl = $('caption');
  const historyEl = $('history');
  const artEl = $('art');
  const sinceEl = $('since');
  const eventEl = $('event');

  function paint() {
    const years = Math.round(shown.years);
    const programs = Math.round(shown.programs);

    yearsEl.textContent = nf(years);
    yearsWordEl.textContent = plural(years, 'год', 'года', 'лет');
    programsEl.textContent = nf(programs);

    captionEl.textContent = programs
      ? `непрерывной учебы, чтобы пройти ${nf(programs)} ${plural(programs, 'выбранную программу', 'выбранные программы', 'выбранных программ')} одну за другой`
      : 'Выберите города и уровни обучения';

  }

  // The same span of time, counted backwards — a number of years is easier to
  // feel as a date, and even easier with something that happened in it.
  // Updated once the count has settled, not on every frame of it.
  function paintHistory() {
    const years = Math.round(shown.years);
    const from = NOW - years;
    const event = HISTORY[from];
    historyEl.hidden = years < 5 || !event;
    if (historyEl.hidden) {
      historyEl.classList.remove('in');
      return;
    }
    artEl.innerHTML = `<svg viewBox="0 0 64 64" focusable="false">${event.art}</svg>`;
    sinceEl.innerHTML = `Начинать пришлось бы в <b>${from}</b> году`;
    eventEl.textContent = `Тогда ${event.text}`;
    historyEl.classList.add('in');
  }

  // ---------- DOM rendering ----------
  const kindRow = $('kindRow');
  const cityList = $('cityList');
  const bar = $('bar');

  const kindEls = {};
  LEVELS.forEach((level) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kind-item';
    item.innerHTML = `
      <span class="kind-box"><span class="kind-check"></span></span>
      <span class="kind-label">${level.label}</span>
    `;
    item.addEventListener('click', () => {
      state.levels[level.key] = !state.levels[level.key];
      render();
    });
    kindRow.appendChild(item);
    kindEls[level.key] = item;
  });

  const cityEls = {};
  CITIES.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${c.name}</div>
        <div class="city-stats">
          ${LEVELS.map((l) => `
            <span class="city-stat" data-level="${l.key}">
              <span class="city-dot" style="background:${l.shade(c)}"></span>
              <span class="city-stat-text"></span>
            </span>
          `).join('')}
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
    cityEls[c.key] = {
      toggle: toggleBtn,
      rows: LEVELS.map((l) => card.querySelector(`.city-stat[data-level="${l.key}"]`))
    };
  });

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    LEVELS.forEach((l) => { state.levels[l.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    LEVELS.forEach((l) => { state.levels[l.key] = true; });
    render();
  });

  // The bar is one segment per city per level, in the order of the cards.
  const barSegs = [];
  CITIES.forEach((c) => LEVELS.forEach((l) => {
    const seg = document.createElement('div');
    seg.className = 'meter-bar-seg';
    seg.style.background = l.shade(c);
    bar.appendChild(seg);
    barSegs.push({ city: c, level: l, el: seg });
  }));

  function render(instant) {
    LEVELS.forEach((l) => {
      kindEls[l.key].classList.toggle('active', !!state.levels[l.key]);
    });

    CITIES.forEach((c) => {
      const els = cityEls[c.key];
      const on = !!state.active[c.key];
      els.toggle.classList.toggle('on', on);
      els.toggle.style.background = on ? c.color : '';
      LEVELS.forEach((l, i) => {
        const row = els.rows[i];
        row.style.display = state.levels[l.key] ? '' : 'none';
        const n = countOf(c, l);
        // The full name of the level would wrap the line, and the checkbox
        // above the list has already spelled it out.
        row.querySelector('.city-stat-text').textContent =
          `${n} ${plural(n, 'программа', 'программы', 'программ')} · ${l.short}`;
      });
    });

    barSegs.forEach(({ city, level, el }) => {
      const n = selected(city, level);
      el.style.width = `${(n / PROGRAMS_TOTAL) * 100}%`;
    });

    animateTo(totals(), instant);
  }

  // ---------- Column alignment ----------
  // Only the left column starts with the filter row, so without this the meter
  // card sits higher than the first city card.
  const colLeft = root.querySelector('.col-left');
  const colRight = root.querySelector('.col-right');
  const stacked = window.matchMedia('(max-width: 860px)');

  function alignColumns() {
    if (stacked.matches) {
      colRight.style.paddingTop = '';   // one column: nothing to line up with
      return;
    }
    const gap = parseFloat(getComputedStyle(colLeft).rowGap) || 0;
    colRight.style.paddingTop = `${kindRow.offsetHeight + gap}px`;
  }

  new ResizeObserver(alignColumns).observe(kindRow);
  stacked.addEventListener('change', alignColumns);

  render(true);
  alignColumns();
}
