// The whole university as one field of dots — and one of the dots is the
// reader's. Nothing new is counted here: every figure the page has already met
// comes back in the same measure, a dot apiece.

import { CITIES, LYCEUM, LYCEUM_COLOR, FOREIGN, STUDENTS, STAFF, HSE_TOTAL, ADMITTED } from '../data/hse.js';
import { COUNTRIES } from '../data/countries.js';
import { nf, pct, plural } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';

// The cities in the genitive, for the line about the reader — the data keeps
// only the plain name.
const OF_CITY = {
  msk: 'Москвы',
  spb: 'Санкт-Петербурга',
  nn: 'Нижнего Новгорода',
  perm: 'Перми'
};

export const meta = {
  id: 'you',
  // Hands the reader over from the centuries of study: the same people, only
  // now they are going to be counted one by one.
  lead: {
    value: `И все это — ${nf(HSE_TOTAL)} человек`,
    text: 'Мы мерили их стадионом, вагонами, зданиями и веками. Остался последний счет — поштучно'
  },
  title: 'Найдите себя',
  subtitle: 'Одна точка — один человек. Найдем ту, которая ваша',
  intro: true,
  // The field, four stories retold on it, the field again, the reader, and the
  // way back out.
  steps: 8
};

export function init(root) {
  'use strict';

  const N = HSE_TOTAL;
  const DIM = 0.15;                    // what the rest of the field fades to
  const TAU = Math.PI * 2;
  const YOU = 6;                       // the step where the reader shows up
  const END = meta.steps - 1;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const BLUE = token('--hse-blue') || '#102D69';
  const CARD = token('--card') || '#FFFFFF';

  const ROLES = [
    { key: 'student', label: 'Студент', campus: true },
    { key: 'staff', label: 'Сотрудник', campus: true },
    { key: 'lyceum', label: 'Лицеист' },
    { key: 'applicant', label: 'Абитуриент' },
    { key: 'outside', label: 'Я не из Вышки' }
  ];
  const roleOf = (key) => ROLES.find((r) => r.key === key);

  // Dark text on a light background — the lighter shades of the campuses and
  // the yellow of the lyceum would lose white letters.
  const ink = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const l = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    return l > 0.62 ? 'var(--text)' : '#FFFFFF';
  };
  const mark = (text, color) =>
    `<span class="you-mark" style="background:${color};color:${ink(color)}">${text}</span>`;

  // ---------- The field ----------
  // Every person gets an index, and the indexes go campus by campus, so the
  // field reads as bands. Inside a campus the students come first — and the
  // stories the page has told about them are laid out at the head of that
  // block, one after another, never overlapping: a dot belongs to at most one
  // of them, which is what lets them be drawn as plain alpha on top.
  const palette = [];
  const pal = (color) => {
    let i = palette.indexOf(color);
    if (i < 0) { i = palette.length; palette.push(color); }
    return i;
  };

  const colorOf = new Uint8Array(N);
  const SETS = { admitted: [], foreign: [], lyceum: [], staff: [] };
  const blocks = {};

  // The foreign students are quoted for the university as a whole, so they are
  // spread across the campuses in proportion to their size; the rounding
  // remainder goes to the largest one.
  const abroad = CITIES.map((c) => Math.round(FOREIGN * c.students / STUDENTS));
  abroad[0] += FOREIGN - abroad.reduce((n, x) => n + x, 0);

  let at = 0;
  const fill = (n, ci) => {
    const from = at;
    for (let i = 0; i < n; i++) colorOf[at++] = ci;
    return [from, at];
  };

  CITIES.forEach((c, i) => {
    const students = fill(c.students, pal(c.color));
    SETS.admitted.push([students[0], students[0] + c.admitted]);
    SETS.foreign.push([students[0] + c.admitted, students[0] + c.admitted + abroad[i]]);
    const staff = fill(c.staff, pal(c.colorLight));
    SETS.staff.push(staff);
    blocks[c.key] = { students, staff };
  });
  const lyceum = fill(LYCEUM, pal(LYCEUM_COLOR));
  SETS.lyceum.push(lyceum);

  // ---------- Markup ----------
  root.classList.add('you-body');
  root.innerHTML = `
    <style>
      /* The line above the field: what is lit up right now, in the same shape
         the whole page uses for its figures. */
      .you-figure {
        flex: none;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .you-figure-head {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0 12px;
      }

      .you-figure-label,
      .you-figure-people {
        font-size: 1.0625rem;
        color: var(--text-secondary);
      }

      .you-figure-people {
        font-variant-numeric: tabular-nums;
      }

      .you-figure-value {
        font-size: 4rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .you-figure-note {
        margin-top: 8px;
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text);
      }

      /* Cloned decoration keeps the padding on both halves if the phrase
         breaks across lines. */
      .you-mark {
        padding: 0.08em 0.3em;
        border-radius: 0.24em;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      .you-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .you-group[hidden] {
        display: none;
      }

      .you-ask {
        font-size: 0.9375rem;
        font-weight: 600;
        letter-spacing: -0.01em;
      }

      .you-hint {
        font-size: 0.8125rem;
        line-height: 1.35;
        color: var(--text-secondary);
      }

      /* One answer, not a set of them: the box is round, so the row reads as
         a choice rather than as the checkboxes the other sections use. */
      .you-body .kind-item .kind-box {
        border-radius: 50%;
      }

      .you-legend {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .you-legend i {
        display: block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .you-body .canvas-legend {
        flex-wrap: wrap;
        gap: 4px 12px;
      }

      /* Handing over. The column of controls opens from zero width, so the
         canvas beside it loses room gradually and the field settles into its
         place instead of jumping there. */
      .you-body .col-left {
        transition: width 520ms ease, opacity 320ms ease;
      }

      .you-body.is-telling {
        gap: 0;
      }

      .you-body.is-telling .col-left {
        width: 0;
        opacity: 0;
        overflow: hidden;
      }

      @media (prefers-reduced-motion: reduce) {
        .you-body .col-left { transition: none; }
      }

      @media (max-width: 860px) {
        /* A field this fine needs height: at 40dvh the dots stop being dots. */
        .you-body .canvas-card {
          height: 58dvh;
        }

        .you-figure-value { font-size: 2.5rem; }
        .you-figure-note { font-size: 1.125rem; margin-top: 6px; }
        .you-figure-label,
        .you-figure-people { font-size: 0.9375rem; }
      }
    </style>

    <div class="col-left">
      <div class="you-group">
        <div class="you-ask">Кто вы?</div>
        <div class="kind-row" data-el="roleRow"></div>
      </div>
      <div class="you-group" data-el="cityGroup">
        <div class="you-ask">Ваш кампус</div>
        <div class="kind-row" data-el="cityRow"></div>
      </div>
      <div class="you-hint">Выберите — и точка найдется сама</div>
    </div>

    <div class="col-right">
      <div class="you-figure">
        <div class="you-figure-head">
          <span class="you-figure-label" data-el="label"></span>
          <span class="you-figure-value" data-el="value"></span>
          <span class="you-figure-people" data-el="people"></span>
        </div>
        <div class="you-figure-note" data-el="note"></div>
      </div>

      <div class="canvas-card">
        <div class="canvas-legend" data-el="legend"></div>
        <div class="canvas-wrap" data-el="canvasWrap"></div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  $('legend').innerHTML = CITIES
    .map((c) => `<span class="you-legend"><i style="background:${c.color}"></i>${c.name}</span>`)
    .join('')
    + `<span class="you-legend"><i style="background:${LYCEUM_COLOR}"></i>Лицей</span>`
    + '<span class="you-legend">оттенок светлее — сотрудники</span>';

  // ---------- Geometry ----------
  let W = 0, H = 0, cols = 1, rows = 1, cell = 1, dotR = 1, x0 = 0, y0 = 0, bottom = 0, dpr = 1;

  // As square a packing as the box allows: the field is one block of people,
  // not a strip.
  function fit(height) {
    const c = Math.max(1, Math.round(Math.sqrt(N * W / height)));
    const r = Math.ceil(N / c);
    return { c, r, cell: Math.min(W / c, height / r) };
  }

  function layout() {
    // A reader who is not in the university stands just under the field, so a
    // strip along the bottom is always left free for them.
    const room = Math.max(fit(H).cell * 7, 36);
    const f = fit(H - room);
    cols = f.c;
    rows = f.r;
    cell = f.cell;
    // The dot keeps a gap around it whatever the size of the box: on a phone a
    // cell is barely two device pixels, and a dot any larger than this would
    // run into its neighbours and turn the field into flat stripes.
    dotR = Math.max(0.45, cell * 0.4);
    x0 = (W - cols * cell) / 2;
    y0 = Math.max(0, (H - room - rows * cell) / 2);
    bottom = y0 + rows * cell;
  }

  const xOf = (i) => x0 + (i % cols) * cell + cell / 2;
  const yOf = (i) => y0 + Math.floor(i / cols) * cell + cell / 2;

  // A person is a round dot — but at a couple of pixels across a circle and a
  // square are the same thing, and the square is far cheaper to draw, and
  // there are 77 687 of them. `scale` is what the camera does to the dot, so
  // the shape follows how big it actually lands on the screen.
  const dot = (path, x, y, r, scale = 1) => {
    if (r * scale < 1.4) { path.rect(x - r, y - r, r * 2, r * 2); return; }
    path.moveTo(x + r, y);
    path.arc(x, y, r, 0, TAU);
  };

  // The whole field, painted once into a bitmap: at rest the canvas is one
  // drawImage instead of 77 687 dots.
  const field = document.createElement('canvas');
  const fctx = field.getContext('2d');

  function buildField() {
    field.width = Math.round(W * dpr);
    field.height = Math.round(H * dpr);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, W, H);
    const paths = palette.map(() => new Path2D());
    for (let i = 0; i < N; i++) dot(paths[colorOf[i]], xOf(i), yOf(i), dotR);
    palette.forEach((color, i) => { fctx.fillStyle = color; fctx.fill(paths[i]); });
  }

  // ---------- The reader's dot ----------
  const state = { role: 'student', city: 'msk' };
  const inField = () => state.role !== 'applicant' && state.role !== 'outside';

  function youIndex() {
    if (state.role === 'lyceum') return (lyceum[0] + lyceum[1]) >> 1;
    const b = blocks[state.city];
    const range = state.role === 'staff' ? b.staff : b.students;
    return (range[0] + range[1]) >> 1;
  }

  // Someone who is not in the university yet stands just off the field: right
  // where the next dot would go, only further down, so the edge of the mass is
  // visible above them.
  function youPoint() {
    if (inField()) {
      const i = youIndex();
      return { x: xOf(i), y: yOf(i), color: palette[colorOf[i]] };
    }
    const gap = state.role === 'applicant'
      ? Math.max(cell * 2, 11)
      : Math.max(cell * 3.5, 16);
    return { x: xOf(N), y: bottom + gap, color: BLUE };
  }

  // Where the field ends, for the camera — the dot outside it counts as part
  // of the picture, otherwise the camera would refuse to look at it.
  function contentBox() {
    const below = inField() ? 0 : Math.max(cell * 5, 30);
    return { x1: x0, y1: y0, x2: x0 + cols * cell, y2: bottom + below };
  }

  // ---------- Camera ----------
  const view = { z: 1, fx: 0, fy: 0 };
  const marker = { x: 0, y: 0, color: BLUE, a: 0 };

  // Close enough that the dots read as dots: about two dozen of them across.
  // A reader standing outside the field is shown from a little further back,
  // so the edge of the mass is in the frame next to them.
  const zoomLevel = () => clamp(cols / (inField() ? 26 : 40), 3, 20);

  function focusFor(z, p) {
    const b = contentBox();
    const halfW = W / (2 * z), halfH = H / (2 * z);
    return {
      x: b.x2 - b.x1 > halfW * 2 ? clamp(p.x, b.x1 + halfW, b.x2 - halfW) : (b.x1 + b.x2) / 2,
      y: b.y2 - b.y1 > halfH * 2 ? clamp(p.y, b.y1 + halfH, b.y2 - halfH) : (b.y1 + b.y2) / 2
    };
  }

  const atRest = () => view.z <= 1.002
    && Math.abs(view.fx - W / 2) < 0.6 && Math.abs(view.fy - H / 2) < 0.6;

  // ---------- Animation ----------
  // One clock for everything on the canvas: the fade between the stories, the
  // camera, the marker. A tween of the same kind replaces the one before it.
  let tweens = [];
  let frame = null;

  const pulsing = () => marker.a > 0.01 && !still;

  function loop(now) {
    frame = null;
    tweens = tweens.filter((t) => {
      const raw = Math.min(1, (now - t.t0) / t.dur);
      t.run(ease(raw));
      return raw < 1;
    });
    paint(now);
    if (tweens.length || pulsing()) frame = requestAnimationFrame(loop);
  }

  const kick = () => { if (frame === null) frame = requestAnimationFrame(loop); };

  function run(kind, dur, fn) {
    tweens = tweens.filter((t) => t.kind !== kind);
    if (still) { fn(1); kick(); return; }
    tweens.push({ kind, dur, t0: performance.now(), run: fn });
    kick();
  }

  // How lit the field is right now: `base` is everyone, `sets` are the groups
  // that stand out of it. Drawing a group over the dimmed field at
  // (target - base) / (1 - base) lands it exactly on its own target.
  const cur = { base: 1, sets: {} };
  let lit = null;

  function light(tag) {
    if (tag === lit) return;
    const from = { base: cur.base, sets: { ...cur.sets } };
    const to = { base: tag ? DIM : 1, sets: tag ? { [tag]: 1 } : {} };
    const keys = [...new Set([...Object.keys(from.sets), ...Object.keys(to.sets)])];
    lit = tag;
    run('light', 620, (e) => {
      cur.base = from.base + (to.base - from.base) * e;
      const sets = {};
      keys.forEach((k) => {
        const a = k in from.sets ? from.sets[k] : from.base;
        const b = k in to.sets ? to.sets[k] : to.base;
        sets[k] = a + (b - a) * e;
      });
      cur.sets = sets;
    });
  }

  function showMarker(to) {
    const from = marker.a;
    run('marker', 420, (e) => { marker.a = from + (to - from) * e; });
  }

  // The camera and the marker travel together: `dip` pulls the zoom back on
  // the way, so a jump across the field reads as a move and not as a cut.
  function moveTo(z, dur, dip = 0) {
    const from = { z: view.z, fx: view.fx, fy: view.fy, mx: marker.x, my: marker.y };
    marker.color = youPoint().color;
    // Where it is going is worked out on every frame, not once: the column of
    // controls opens while this runs, the field is laid out again in the room
    // that is left, and the dot the camera was sent to has moved by then.
    run('camera', dur, (e) => {
      const p = youPoint();
      // Someone inside the field is looked at straight on; someone outside it
      // is looked at from just under the edge of the mass, which then fills the
      // top half of the frame.
      const aim = inField() ? p : { x: p.x, y: bottom - (H / (2 * z)) * 0.1 };
      const target = z <= 1 ? { x: W / 2, y: H / 2 } : focusFor(z, aim);
      view.fx = from.fx + (target.x - from.fx) * e;
      view.fy = from.fy + (target.y - from.fy) * e;
      const z0 = from.z + (z - from.z) * e;
      view.z = dip ? z0 * (1 - dip * Math.sin(Math.PI * e)) : z0;
      marker.x = from.mx + (p.x - from.mx) * e;
      marker.y = from.my + (p.y - from.my) * e;
    });
  }

  // ---------- Painting ----------
  const { canvas, ctx } = mountCanvas($('canvasWrap'), () => paint());

  function bounds() {
    const halfW = W / (2 * view.z), halfH = H / (2 * view.z);
    return {
      c0: Math.max(0, Math.floor((view.fx - halfW - x0) / cell) - 1),
      c1: Math.min(cols - 1, Math.ceil((view.fx + halfW - x0) / cell) + 1),
      r0: Math.max(0, Math.floor((view.fy - halfH - y0) / cell) - 1),
      r1: Math.min(rows - 1, Math.ceil((view.fy + halfH - y0) / cell) + 1)
    };
  }

  // Draws a set of index ranges at one alpha, skipping whatever the camera
  // cannot see — zoomed in, that is a few hundred dots out of 77 687.
  function drawRanges(ranges, alpha, culled) {
    const b = culled ? bounds() : null;
    const lo = b ? b.r0 * cols : 0;
    const hi = b ? Math.min(N, (b.r1 + 1) * cols) : N;
    const paths = palette.map(() => new Path2D());
    ranges.forEach(([from, to]) => {
      for (let i = Math.max(from, lo), end = Math.min(to, hi); i < end; i++) {
        if (b) {
          const col = i % cols;
          if (col < b.c0 || col > b.c1) continue;
        }
        dot(paths[colorOf[i]], xOf(i), yOf(i), dotR, view.z);
      }
    });
    ctx.globalAlpha = alpha;
    palette.forEach((color, i) => { ctx.fillStyle = color; ctx.fill(paths[i]); });
    ctx.globalAlpha = 1;
  }

  function drawMarker(now) {
    if (marker.a <= 0.01) return;
    const z = view.z;
    const r = Math.max(dotR * 2, 2.4 / z);
    const ring = Math.max(dotR * 3.2, 9 / z);
    const beat = still ? 0 : (1 - Math.cos(now / 620)) / 2;

    ctx.globalAlpha = marker.a;

    // A clearing in the mass, so the dot can be found even at full zoom out.
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, ring * 1.7, 0, TAU);
    ctx.fillStyle = CARD;
    ctx.globalAlpha = marker.a * 0.92;
    ctx.fill();
    ctx.globalAlpha = marker.a;

    ctx.beginPath();
    ctx.arc(marker.x, marker.y, r, 0, TAU);
    ctx.fillStyle = marker.color;
    ctx.fill();

    ctx.lineWidth = 1.6 / z;
    ctx.strokeStyle = BLUE;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, ring, 0, TAU);
    ctx.stroke();

    if (beat > 0) {
      ctx.globalAlpha = marker.a * (1 - beat) * 0.8;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, ring * (1 + beat * 0.9), 0, TAU);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function paint(now = performance.now()) {
    const cw = canvas.clientWidth || 900;
    const ch = canvas.clientHeight || 600;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (cw !== W || ch !== H || ratio !== dpr) {
      W = cw; H = ch; dpr = ratio;
      layout();
      buildField();
      // The camera was aimed at the old field; aim it at the new one.
      const p = youPoint();
      const f = view.z > 1.002 ? focusFor(view.z, p) : { x: W / 2, y: H / 2 };
      view.fx = f.x; view.fy = f.y;
      if (!tweens.some((t) => t.kind === 'camera')) { marker.x = p.x; marker.y = p.y; }
    }

    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const rest = atRest();
    if (rest) {
      ctx.globalAlpha = cur.base;
      ctx.drawImage(field, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(view.z, view.z);
    ctx.translate(-view.fx, -view.fy);

    if (!rest) drawRanges([[0, N]], cur.base, true);

    if (cur.base < 0.999) {
      Object.keys(cur.sets).forEach((tag) => {
        const a = (cur.sets[tag] - cur.base) / (1 - cur.base);
        if (a > 0.002) drawRanges(SETS[tag], Math.min(1, a), !rest);
      });
    }

    drawMarker(now);
    ctx.restore();
  }

  // ---------- What the line above the field says ----------
  const many = (n) => plural(n, 'человек', 'человека', 'человек');

  const STORY = [
    {
      tag: null,
      label: 'Вся Вышка целиком',
      value: nf(N),
      people: many(N),
      note: 'Каждая точка — человек, цвет точки — кампус'
    },
    {
      tag: 'admitted',
      label: 'Поступили в этом году',
      value: nf(ADMITTED),
      people: many(ADMITTED),
      note: 'Те самые, которым не хватило одного поезда метро'
    },
    {
      tag: 'foreign',
      label: 'Приехали из-за рубежа',
      value: `${nf(FOREIGN)}+`,
      people: plural(FOREIGN, 'студент', 'студента', 'студентов'),
      note: `Те, из-за кого у нас в гостях ${COUNTRIES.length} ${plural(COUNTRIES.length, 'флаг', 'флага', 'флагов')}`
    },
    {
      tag: 'lyceum',
      label: 'Учатся в лицее',
      value: nf(LYCEUM),
      people: many(LYCEUM),
      note: 'Те, кто первыми заходил на стадион'
    },
    {
      tag: 'staff',
      label: 'Преподают и работают',
      value: nf(STAFF),
      people: many(STAFF),
      note: 'Те, кто ведет все эти программы во всех этих зданиях'
    },
    {
      tag: null,
      label: 'И все это — одни и те же',
      value: nf(N),
      people: many(N),
      note: 'Вся страница уместилась в одно поле. Осталась одна точка — ваша'
    }
  ];

  function answer() {
    if (state.role === 'applicant') {
      return {
        label: 'Ваша точка',
        value: `${nf(N + 1)}-я`,
        people: '— пока за краем поля',
        note: 'Поступите — и поле станет ровно на одну точку больше'
      };
    }
    if (state.role === 'outside') {
      return {
        label: 'Ваша точка',
        value: 'рядом',
        people: '— снаружи, но вплотную',
        note: 'Вы не из Вышки, но всю ее целиком уже увидели'
      };
    }
    const city = CITIES.find((c) => c.key === state.city);
    const group = state.role === 'lyceum'
      ? { n: LYCEUM, text: 'лицеистов', color: LYCEUM_COLOR }
      : state.role === 'staff'
        ? { n: city.staff, text: `сотрудников ${OF_CITY[city.key]}`, color: city.colorLight }
        : { n: city.students, text: `студентов ${OF_CITY[city.key]}`, color: city.color };
    return {
      label: 'Ваша точка',
      value: `1 из ${nf(N)}`,
      people: `— это ${pct(1, N, 4)} Вышки`,
      note: `И 1 из ${nf(group.n)} ${mark(group.text, group.color)}`
    };
  }

  function finale() {
    const last = state.role === 'applicant'
      ? 'И скоро одной из этих точек станете вы'
      : state.role === 'outside'
        ? 'И теперь вы видели их всех сразу'
        : 'И одна из этих точек — ваша';
    return { label: 'Вышка — это', value: nf(N), people: many(N), note: last };
  }

  // ---------- Controls ----------
  const roleEls = {};
  const cityEls = {};
  let phase = 0;
  let userDrives = false;

  function control(row, label, onPick) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kind-item';
    item.innerHTML = '<span class="kind-box"><span class="kind-check"></span></span>'
      + `<span class="kind-label">${label}</span>`;
    item.addEventListener('click', onPick);
    row.appendChild(item);
    return item;
  }

  ROLES.forEach((r) => {
    roleEls[r.key] = control($('roleRow'), r.label, () => pick('role', r.key));
  });
  CITIES.forEach((c) => {
    cityEls[c.key] = control($('cityRow'), c.name, () => pick('city', c.key));
  });

  function pick(kind, key) {
    if (state[kind] === key) return;
    userDrives = true;
    state[kind] = key;
    render();
    // Zoomed in, the camera walks over to the new dot with a dip on the way;
    // zoomed out, only the marker moves.
    moveTo(view.z > 1.5 ? zoomLevel() : 1, 700, view.z > 1.5 ? 0.55 : 0);
  }

  function render() {
    const role = roleOf(state.role);
    ROLES.forEach((r) => roleEls[r.key].classList.toggle('active', r.key === state.role));
    $('cityGroup').hidden = !role.campus;
    CITIES.forEach((c) => {
      const on = c.key === state.city;
      const el = cityEls[c.key];
      el.classList.toggle('active', on);
      const box = el.querySelector('.kind-box');
      box.style.background = on ? c.color : '';
      box.style.borderColor = on ? c.color : '';
    });

    const f = phase >= YOU
      ? (phase === END ? finale() : answer())
      : STORY[phase];
    $('label').textContent = f.label;
    $('value').textContent = f.value;
    $('people').textContent = f.people;
    $('note').innerHTML = f.note;
  }

  // ---------- Scene ----------
  // The field first, then every story of the page retold on it, then the
  // reader — and back out, with the last line over the whole field.
  function step(i) {
    phase = i;
    const telling = i < YOU;
    root.classList.toggle('is-telling', telling);

    if (telling) {
      userDrives = false;                // scrolled back into the story
      light(STORY[i].tag);
      showMarker(0);
      moveTo(1, 620);
    } else {
      light(null);
      showMarker(1);
      if (!userDrives && i === YOU) { state.role = 'student'; state.city = 'msk'; }
      moveTo(i === YOU ? zoomLevel() : 1, i === YOU ? 950 : 780);
    }

    render();
  }

  render();
  paint();

  return { step };
}
