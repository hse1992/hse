// Trains long enough to carry everyone the university admits in a year.
// They snake down the screen from the top left corner and disappear into the
// tunnel at the bottom right, only to come out of the first one again.

import { CITIES, ADMITTED } from '../data/hse.js';
import { nf, dec, plural } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';
import { loadMark } from '../lib/hse-mark.js';

// Facts about the metro itself — they live here, not in data/hse.js, which
// only knows about the university. 165 people is a packed car at rush hour,
// eight cars make one train, one car is 19,2 m long.
const PER_CAR = 165;
const TRAIN = 8;
const CAR_M = 19.2;

// Every city takes a whole number of cars: nobody rides half a car.
const carsOf = (c) => Math.ceil(c.admitted / PER_CAR);
const CARS_TOTAL = CITIES.reduce((n, c) => n + carsOf(c), 0);
const TRAINS = Math.floor(CARS_TOTAL / TRAIN);
const KM = (CARS_TOTAL * CAR_M) / 1000;

// The train is drawn from its last car forward, so the head of it is Moscow
// and the colours follow the order of the cities on the cards.
const TAIL_FIRST = CITIES.slice().reverse();

export const meta = {
  id: 'metro',
  title: 'Следующая станция Вышка',
  subtitle: `За одну приемную кампанию Вышка набирает ${nf(ADMITTED)} студентов. Чтобы увезти их всех разом, нужно ${nf(CARS_TOTAL)} ${plural(CARS_TOTAL, 'вагон', 'вагона', 'вагонов')} метро — ${TRAINS} ${plural(TRAINS, 'полный поезд', 'полных поезда', 'полных поездов')} длиной ${dec(KM)} километра`
};

export function init(root) {
  'use strict';

  // Canvas has no CSS variables — same values as the tokens of the same name.
  const RAIL = '#C9CFD8';
  const TUNNEL = '#464C56';
  const COUPLING = '#8B929C';
  const HSE_BLUE = '#102D69';

  const M = 22;                 // margin around the track
  const GAP = 0.26;             // coupling between cars, in car lengths
  const TRAIN_GAP = 1;          // gap between trains, same units
  const SHARE = 0.33;           // how much of the track all the trains take
  const MIN_CAR = 7;            // below this a car stops reading as a car, px
  const SEC_PER_ROW = 16;       // how long a train takes to cross one row

  // Length of the whole chain, in car lengths.
  const UNITS = CARS_TOTAL * (1 + GAP) + Math.ceil(CARS_TOTAL / TRAIN) * TRAIN_GAP;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Markup ----------
  // The score card is specific to this visualisation, so its styles live here
  // and not in layout.css.
  root.innerHTML = `
    <style>
      .metro-score {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .metro-score-value {
        font-size: 3.5rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .metro-score-note {
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      @media (max-width: 860px) {
        .metro-score-value { font-size: 2.5rem; }
        .metro-score-note { font-size: 0.875rem; }
      }
    </style>

    <div class="col-left">
      <div class="city-list" data-el="cityList"></div>
      <div class="actions">
        <button type="button" class="btn" data-el="clearAll">Снять все</button>
        <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
      </div>
    </div>

    <div class="col-right">
      <div class="meter-card">
        <div class="meter-title">Вагонов метро</div>
        <div class="metro-score">
          <span class="metro-score-value" data-el="count"></span>
          <span class="metro-score-note">на <span data-el="people"></span> принятых студентов</span>
        </div>
      </div>

      <div class="canvas-card">
        <div class="canvas-legend">
          <span class="canvas-legend-swatch" data-el="legendSwatch"></span>
          <span>1 поезд — ${TRAIN} вагонов, в каждом ${PER_CAR} человек</span>
        </div>
        <div class="canvas-wrap" data-el="canvasWrap"></div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = { active: { msk: true, spb: true, nn: true, perm: true } };

  // Cars currently on the track, per city. Fractional while a city is coming
  // or going: the tail car grows out of nothing and pushes the rest along.
  const shown = {};
  let tween = null;                 // { from, to, t0 }

  const targets = () => {
    const out = {};
    CITIES.forEach((c) => { out[c.key] = state.active[c.key] ? carsOf(c) : 0; });
    return out;
  };

  function animateTo(target, instant) {
    if (instant) {
      Object.assign(shown, target);
      tween = null;
      return;
    }
    tween = { from: Object.assign({}, shown), to: target, t0: performance.now() };
  }

  // Moves `shown` towards the target — called once per painted frame.
  function tick(now) {
    if (!tween) return;
    const raw = Math.min(1, Math.max(0, (now - tween.t0) / 620));
    const p = 1 - Math.pow(1 - raw, 3);
    CITIES.forEach((c) => {
      const from = tween.from[c.key] || 0;
      shown[c.key] = from + (tween.to[c.key] - from) * p;
    });
    if (raw >= 1) tween = null;
  }

  // ---------- The track ----------
  // Rows of straight track joined by half-circle turns. The track is always
  // laid out for the whole university, so a car keeps the same size whatever
  // is selected — only the length of the train on it changes.
  // An odd number of rows, so the last one ends in the bottom right corner;
  // as few of them as possible, as long as a car stays big enough to see.
  function layout(w, h) {
    let last = null;
    for (let rows = 5; rows <= 13; rows += 2) {
      const dy = (h - 2 * M) / (rows - 1);
      const r = dy / 2;
      const straight = w - 2 * M - 2 * r;      // middle rows are the shortest
      if (straight < r * 2) continue;
      // The first and the last row are longer by r: they reach into the corner
      // instead of making a turn there.
      const len = rows * (w - 2 * M) + (rows - 1) * r * (Math.PI - 2);
      const car = (len * SHARE) / UNITS;
      const carW = Math.min(car * 0.58, dy * 0.4);
      last = { rows, dy, r, straight, car, carW };
      if (car >= MIN_CAR) break;
    }
    return last;
  }

  // Samples the whole snake into a polyline: everything else (cars, rails,
  // tunnels) is measured in pixels along it.
  function buildTrack(w, h) {
    const L = layout(w, h);
    const pts = [];
    const push = (x, y) => {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 0.01) pts.push({ x, y });
    };

    const STEP = 4;
    for (let i = 0; i < L.rows; i++) {
      const y = M + i * L.dy;
      const dir = i % 2 === 0 ? 1 : -1;       // even rows go right, odd ones left
      // A row keeps clear of the turn on the side where there is one; the very
      // first and the very last one reach into their corner instead.
      const from = dir === 1 ? M + (i ? L.r : 0) : w - M - (i ? L.r : 0);
      const to = dir === 1 ? w - M - (i < L.rows - 1 ? L.r : 0) : M + (i < L.rows - 1 ? L.r : 0);
      const n = Math.max(1, Math.ceil(Math.abs(to - from) / STEP));
      for (let k = 0; k <= n; k++) push(from + (to - from) * (k / n), y);

      if (i === L.rows - 1) break;
      const cx = to, cy = y + L.r;
      const n2 = Math.max(8, Math.ceil((Math.PI * L.r) / STEP));
      for (let k = 1; k <= n2; k++) {
        const a = -Math.PI / 2 + dir * Math.PI * (k / n2);
        push(cx + Math.cos(a) * L.r, cy + Math.sin(a) * L.r);
      }
    }

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const len = cum[cum.length - 1];

    // Two rails, the polyline shifted along its normal to either side. They
    // stick out a little from under the cars, which are narrow at this scale.
    const gauge = Math.max(1.1, L.carW * 0.55);
    const rails = [gauge, -gauge].map((d) => {
      const rail = new Path2D();
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y;
        const m = Math.hypot(dx, dy) || 1;
        const x = p.x - (dy / m) * d, y = p.y + (dx / m) * d;
        if (i === 0) rail.moveTo(x, y); else rail.lineTo(x, y);
      });
      return rail;
    });

    return { pts, cum, len, rails, car: L.car, carW: L.carW, straight: L.straight, dy: L.dy };
  }

  let track = null, trackKey = '';
  let mark = null;                  // the HSE mark, once it is loaded

  // ---------- Canvas painting ----------
  const { canvas, ctx } = mountCanvas($('canvasWrap'), paint);

  // Point at `s` pixels along the track, plus the index of the sample after it.
  function at(s) {
    const clamped = Math.max(0, Math.min(track.len, s));
    let lo = 0, hi = track.cum.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (track.cum[m] < clamped) lo = m + 1; else hi = m;
    }
    const i = Math.max(1, lo);
    const s0 = track.cum[i - 1], s1 = track.cum[i];
    const f = s1 > s0 ? (clamped - s0) / (s1 - s0) : 0;
    const a = track.pts[i - 1], b = track.pts[i];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, i };
  }

  // Strokes the piece of the track between two marks with the current style.
  function strokeAlong(s0, s1) {
    const a = at(s0), b = at(s1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = a.i; i < b.i; i++) ctx.lineTo(track.pts[i].x, track.pts[i].y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // The piece between two marks, cut in two where it runs off the end of the
  // track: everything past the end comes back at its start.
  function pieces(s0, s1) {
    const a = ((s0 % track.len) + track.len) % track.len;
    const b = a + (s1 - s0);
    if (b <= track.len) return [[a, b]];
    return [[a, track.len], [0, b - track.len]];
  }

  // A car is rigid, so on a turn it sits on the chord between its ends instead
  // of bending with the rails.
  function drawCar(s0, s1, color) {
    ctx.fillStyle = color;
    pieces(s0, s1).forEach(([s, e]) => {
      const a = at(s), b = at(e);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.2) return;
      ctx.save();
      ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillRect(-len / 2, -track.carW / 2, len, track.carW);
      ctx.restore();
    });
  }

  // The coupling between two cars — a thin bar following the rails.
  function drawCoupling(s0, s1) {
    ctx.strokeStyle = COUPLING;
    ctx.lineWidth = Math.max(1, track.carW * 0.4);
    ctx.lineCap = 'butt';
    pieces(s0, s1).forEach(([s, e]) => { if (e - s > 0.2) strokeAlong(s, e); });
  }

  // Both ends of the track, drawn over the cars so the train really slides
  // under them: the tunnel it comes out of, and the mark of the university it
  // drives into. Until the mark is loaded the far end is a tunnel too.
  function drawEnds() {
    const h = Math.min(track.dy * 0.5, 26), w = h * 0.55, r = h / 2;
    const first = track.pts[0], last = track.pts[track.pts.length - 1];

    ctx.fillStyle = TUNNEL;
    const portal = (x, y, dir) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y - h / 2, w, h, dir === 1 ? [4, r, r, 4] : [r, 4, 4, r]);
      else ctx.rect(x, y - h / 2, w, h);
      ctx.fill();
    };

    portal(first.x, first.y, 1);
    if (!mark) { portal(last.x - w, last.y, -1); return; }

    // The mark sits in the corner the track ends in, so it takes the margin
    // as its radius and no more.
    const size = Math.min(M - 1, track.dy * 0.5);
    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.scale(size / mark.r, size / mark.r);
    ctx.translate(-mark.cx, -mark.cy);
    ctx.fillStyle = HSE_BLUE;
    ctx.fill(mark.disc);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(mark.mark);
    ctx.restore();
  }

  function paint(now) {
    const t = typeof now === 'number' ? now : performance.now();
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    tick(t);
    updateScore();

    const key = `${cssW}x${cssH}`;
    if (key !== trackKey) { track = buildTrack(cssW, cssH); trackKey = key; }

    // rails
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = RAIL;
    ctx.lineWidth = Math.max(0.9, track.carW * 0.16);
    track.rails.forEach((rail) => ctx.stroke(rail));

    // trains: the whole chain of cars, city after city, cut into eights.
    // Cars of one train are coupled; between trains there is just a gap.
    // Laid out back to front, so that Moscow leads and Perm brings up the rear.
    const gap = track.car * GAP, trainGap = track.car * TRAIN_GAP;
    let s = still ? 0 : (t / 1000) * (track.straight / SEC_PER_ROW);
    let idx = 0;                     // car number in the whole chain
    let prev = null;                 // back of the car in front, if coupled
    TAIL_FIRST.forEach((c) => {
      for (let left = shown[c.key] || 0; left > 0.02; left -= 1) {
        const part = Math.min(1, left);
        const end = s + track.car * part;
        if (prev !== null) drawCoupling(prev, s);
        drawCar(s, end, c.color);
        idx += 1;
        s = end + gap;
        prev = end;
        if (idx % TRAIN === 0) { s += trainGap * part; prev = null; }
      }
    });

    drawEnds();
  }

  // ---------- Animation loop ----------
  // The trains never stop, so the loop runs while the track is on the screen
  // and is parked as soon as it scrolls away.
  let frame = null;
  const loop = (now) => {
    paint(now);
    frame = requestAnimationFrame(loop);
  };
  const start = () => { if (frame === null) frame = requestAnimationFrame(loop); };
  const stop = () => { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } };

  new IntersectionObserver((entries) => {
    if (entries[entries.length - 1].isIntersecting) start(); else stop();
  }).observe($('canvasWrap'));

  loadMark().then((m) => {
    mark = m;
    if (frame === null) paint();
  });

  // ---------- DOM rendering ----------
  const cityList = $('cityList');
  const countEl = $('count');
  const peopleEl = $('people');

  // The sample in the legend is one car: a short bar, not the default one.
  const legendSwatch = $('legendSwatch');
  legendSwatch.style.background = CITIES[0].color;
  legendSwatch.style.width = '11px';
  legendSwatch.style.height = '5px';
  legendSwatch.style.borderRadius = '1px';

  const cityEls = {};
  CITIES.forEach((c) => {
    const cars = carsOf(c);
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${c.name}</div>
        <div class="city-stats">
          <span class="city-stat"><span class="city-dot" style="background:${c.color}"></span><span class="city-stat-text">${nf(c.admitted)} принятых · ${cars} ${plural(cars, 'вагон', 'вагона', 'вагонов')}</span></span>
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
    cityEls[c.key] = toggleBtn;
  });

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    render();
  });

  // The counter counts along with the cars, so paint() keeps it in sync.
  let lastCars = null, lastPeople = null;
  function updateScore() {
    let cars = 0, people = 0;
    CITIES.forEach((c) => {
      const n = shown[c.key] || 0;
      cars += n;
      people += (n / carsOf(c)) * c.admitted;
    });
    cars = Math.round(cars);
    people = Math.round(people);
    if (cars === lastCars && people === lastPeople) return;
    lastCars = cars;
    lastPeople = people;
    countEl.textContent = nf(cars);
    peopleEl.textContent = nf(people);
  }

  function render(instant) {
    CITIES.forEach((c) => {
      cityEls[c.key].classList.toggle('on', !!state.active[c.key]);
      cityEls[c.key].style.background = state.active[c.key] ? c.color : '';
    });
    animateTo(targets(), instant);
    if (frame === null) paint();     // keep things right while off screen
  }

  render(true);
  paint();
}
