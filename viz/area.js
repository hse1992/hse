// Total floor area of HSE buildings, measured in things you can picture.

import { CITIES, AREA_TOTAL, STUDENTS, STAFF } from '../data/hse.js';
import { nf, plural } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';

// Facts about the buildings themselves — they live here, not in data/hse.js,
// which only knows about the university.
const BUILDINGS = 196;

// Two metrics the first switch flips between; `field` is the key in data/hse.js.
const METRICS = [
  { key: 'total', label: 'Общая площадь', field: 'area' },
  { key: 'study', label: 'Учебно-лабораторная площадь', field: 'areaStudy' }
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
  // The reader arrives straight from the arena, so the section opens with a
  // screen of its own, told in two goes: the stadium the university has not
  // got, and the figure it has instead. It does not leave — it goes up to the
  // top of the section and stays there while the rest is told under it.
  lead: {
    exit: 'top',
    // Goes up in the same beat as the pitches come up under it: parking alone
    // would be a beat with nothing new on the screen.
    together: true,
    value: 'Для расположения всех студентов и сотрудников у Вышки нет своего стадиона <span class="area-soon">(пока)</span>',
    text: `<span class="area-lead-line intro-stage" data-stage="1">Но есть ${nf(BUILDINGS)} ${plural(BUILDINGS, 'здание', 'здания', 'зданий')} <span class="area-mark">общей площадью ${nf(AREA_TOTAL)} м²</span></span>`
  },
  title: 'В тесноте да не в обиде',
  subtitle: 'На сколько это много?',
  intro: true,
  // Steps: the area in pitches, the same area in blocks of flats beside it,
  // the question both raise, the answer under each of them, and then the
  // visualisation itself. The pitches are on the screen the moment the block
  // fades in, so no beat is spent on showing what is already there.
  steps: 6,
  opensOnStep: true
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

  // Canvas has no CSS variables — same values as the tokens of the same name.
  const PITCH = '#8CC63F';
  const LINE = 'rgba(255,255,255,0.75)';
  const MOW = 'rgba(255,255,255,0.13)';
  const WALL = '#E0D2BA';
  const ROOF = '#8B929C';
  const WINDOW = '#5C82A6';
  const DOOR = '#6B5B48';
  const WINDOW_LIT = '#FFC85C';
  const DOT = '#102D69';          // a person on the pitch, in corporate blue
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
        gap: 44px 64px;
        align-content: center;
        align-items: start;
        pointer-events: none;
      }

      /* Whatever is leaving goes quickly and whatever is arriving waits for
         it, so the two never sit on top of each other for long. */
      .area-step {
        display: flex;
        flex-direction: column;
        gap: 20px;
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

      .area-step-pitch,
      .area-step-house {
        width: 100%;
        max-width: 420px;
        border-radius: 4px;
        overflow: hidden;
      }

      .area-step-pitch { aspect-ratio: 105 / 68; }
      .area-step-house { aspect-ratio: 1.55; }

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
      .area-step-question,
      .area-step-note {
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 300ms ease, transform 300ms ease, color 620ms ease;
      }

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

        .area-score-value { font-size: 2.5rem; }
        .area-score-note { font-size: 0.875rem; }
      }
    </style>

    <div class="area-steps">
      <div class="area-step area-step-fields" data-el="stepFields">
        <p class="area-step-line">Это площадь ${nf(FIELDS_TOTAL)} футбольных полей</p>
        <div class="area-step-fig">
          <div class="canvas-wrap area-step-pitch" data-el="stepPitch"></div>
          <div class="area-step-times">&times;&nbsp;${nf(FIELDS_TOTAL)}</div>
        </div>
        <p class="area-step-note" data-el="pitchNote">Это ${nf(PER_PITCH)} «${plural(PER_PITCH, 'футболист', 'футболиста', 'футболистов')}» на одном поле</p>
      </div>

      <div class="area-step area-step-houses" data-el="stepHouses">
        <p class="area-step-line">Или ${nf(HOUSES_TOTAL)} ${plural(HOUSES_TOTAL, 'пятиэтажка', 'пятиэтажки', 'пятиэтажек')}</p>
        <div class="area-step-fig">
          <div class="canvas-wrap area-step-house" data-el="stepHouse"></div>
          <div class="area-step-times">&times;&nbsp;${nf(HOUSES_TOTAL)}</div>
        </div>
        <p class="area-step-note" data-el="houseNote">Или по ${nf(PER_FLAT)} «${plural(PER_FLAT, 'жильцу', 'жильца', 'жильцов')}» в каждой квартире ${nf(FLAT_M2)} м²</p>
      </div>

      <p class="area-step-question" data-el="question">Много это или мало, учитывая сколько в Вышке студентов и сотрудников?</p>
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

  // ---------- Scene ----------
  // One pitch and how many of them fit; the same area in blocks of flats
  // beside it; the question the two raise; the answer under each of them —
  // the crowd on the pitch and the light in the windows; and then the
  // visualisation itself.
  const fieldsStepEl = $('stepFields');
  const housesStepEl = $('stepHouses');
  const questionEl = $('question');
  const pitchNoteEl = $('pitchNote');
  const houseNoteEl = $('houseNote');
  const innerEl = root.querySelector('.area-inner');
  const LAST = 5;

  function step(i) {
    const told = i < LAST;
    fieldsStepEl.classList.toggle('on', told);
    housesStepEl.classList.toggle('on', told && i >= 1);
    questionEl.classList.toggle('on', told && i >= 2);
    questionEl.classList.toggle('is-answered', told && i >= 3);
    pitchNoteEl.classList.toggle('on', told && i >= 3);
    houseNoteEl.classList.toggle('on', told && i >= 4);
    showCrowd(told && i >= 3);
    lightUp(told && i >= 4);
    innerEl.classList.toggle('off', told);
  }

  render('instant');
  paint();
  paintStepPitch();
  paintStepHouse();
  step(0);

  return { step };
}
