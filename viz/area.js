// Total floor area of HSE buildings, measured in things you can picture.

import { CITIES, AREA_TOTAL } from '../data/hse.js';
import { nf, dec } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';

// Facts about the buildings themselves — they live here, not in data/hse.js,
// which only knows about the university.
const BUILDINGS = 200;

// Two metrics the first switch flips between; `field` is the key in data/hse.js.
const METRICS = [
  { key: 'total', label: 'Общая площадь', field: 'area' },
  { key: 'study', label: 'Учебно-лабораторная площадь', field: 'areaStudy' }
];

// Two objects we compare to. A FIFA-size pitch is 105 × 68 m; the flats of one
// five-storey block with two entrances add up to 1 680 m².
const HOUSE_M2 = 1680;
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
    legend: `1 пятиэтажка — 2 подъезда, 40 квартир общей площадью ${nf(HOUSE_M2)} м²`,
    m2: HOUSE_M2,
    ratio: 1.55                 // two entrances wide, five floors high
  }
];

export const meta = {
  id: 'area',
  title: 'Площадь зданий',
  subtitle: `У Вышки почти ${nf(BUILDINGS)} зданий общей площадью ${nf(AREA_TOTAL)} м². Но на сколько это много?`
};

export function init(root) {
  'use strict';

  // Canvas has no CSS variables — same values as the tokens of the same name.
  const PITCH = '#8CC63F';
  const LINE = 'rgba(255,255,255,0.75)';
  const MOW = 'rgba(255,255,255,0.13)';
  const WALL = '#E0D2BA';
  const ROOF = '#8B929C';
  const WINDOW = '#5C82A6';
  const DOOR = '#6B5B48';
  const GAP = 0.12;               // gap between icons, in icon widths

  // ---------- Markup ----------
  // The switches and the score card are specific to this visualisation, so
  // their styles live here and not in layout.css.
  root.innerHTML = `
    <style>
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
        font-size: 13px;
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
        font-size: 56px;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .area-score-note {
        font-size: 15px;
        color: var(--text-secondary);
      }

      /* On phones the wrappers dissolve, so the section itself lays out the
         picture, the switches and the cities — the switches end up under the
         sticky picture instead of above it. */
      @media (max-width: 860px) {
        .area-inner,
        .area-cols { display: contents; }

        .area-score-value { font-size: 40px; }
        .area-score-note { font-size: 14px; }
      }
    </style>

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
  const { canvas, ctx } = mountCanvas($('canvasWrap'), paint);
  let shown = null;         // icons currently drawn, animated
  let animFrame = null;

  // The grid is always built for the whole university, so an icon keeps the
  // same size whatever is selected — only the number of drawn icons changes.
  function layout(cssW, cssH) {
    const u = unit();
    const cells = Math.ceil(AREA_TOTAL / u.m2);
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

  // `part` — how much of the icon fits into the selected area. Only the last
  // icon of the row of icons is ever cut.
  function paintFields(icons) {
    icons.forEach((c) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(c.x, c.y, c.w * c.part, c.h);
      ctx.clip();

      ctx.fillStyle = PITCH;
      ctx.fillRect(c.x, c.y, c.w * c.part, c.h);
      ctx.fillStyle = MOW;
      const band = c.w / 6;
      for (let i = 1; i < 6; i += 2) ctx.fillRect(c.x + i * band, c.y, band, c.h);

      // Markings are laid out on the whole pitch, then cut by the same clip.
      ctx.strokeStyle = LINE;
      ctx.lineWidth = Math.max(1, c.w * 0.007);
      ctx.beginPath();
      ctx.moveTo(c.x + c.w / 2, c.y);
      ctx.lineTo(c.x + c.w / 2, c.y + c.h);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.h * 0.135, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // Five floors of windows and two doors. There are hundreds of blocks on the
  // screen, so everything goes into four paths instead of a fill per window.
  function paintHouses(icons) {
    const roof = new Path2D(), wall = new Path2D();
    const win = new Path2D(), door = new Path2D();

    icons.forEach((c) => {
      const edge = c.x + c.w * c.part;   // nothing is drawn past the cut
      const add = (path, x, y, w, h) => {
        const right = Math.min(x + w, edge);
        if (right > x) path.rect(x, y, right - x, h);
      };

      add(roof, c.x, c.y, c.w, c.h * 0.09);
      add(wall, c.x, c.y + c.h * 0.09, c.w, c.h * 0.91);

      const COLS = 6, ROWS = 5;
      const gx = c.x + c.w * 0.08, gw = c.w * 0.84;
      const gy = c.y + c.h * 0.19, gh = c.h * 0.58;
      const cw = gw / COLS, ch = gh / ROWS;
      const ww = Math.max(1, cw * 0.62), wh = Math.max(1, ch * 0.6);
      for (let r = 0; r < ROWS; r++) {
        for (let i = 0; i < COLS; i++) {
          add(win, gx + i * cw + (cw - ww) / 2, gy + r * ch + (ch - wh) / 2, ww, wh);
        }
      }

      const dw = Math.max(1, c.w * 0.07), dh = c.h * 0.13;
      add(door, c.x + c.w * 0.25 - dw / 2, c.y + c.h - dh, dw, dh);
      add(door, c.x + c.w * 0.75 - dw / 2, c.y + c.h - dh, dw, dh);
    });

    ctx.fillStyle = ROOF; ctx.fill(roof);
    ctx.fillStyle = WALL; ctx.fill(wall);
    ctx.fillStyle = WINDOW; ctx.fill(win);
    ctx.fillStyle = DOOR; ctx.fill(door);
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
    countEl.textContent = dec(shown);

    const cells = Math.ceil(shown);
    if (cells < 1) return;
    const g = layout(cssW, cssH);
    const icons = [];
    for (let i = 0; i < cells; i++) {
      icons.push({
        x: g.x + (i % g.cols) * (g.w + g.gap),
        y: g.y + Math.floor(i / g.cols) * (g.h + g.gap),
        w: g.w,
        h: g.h,
        part: Math.min(1, shown - i)
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
        <div class="city-name">${c.name}</div>
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

  render('instant');
  paint();
}
