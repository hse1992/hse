// Luzhniki stands filled with HSE people, one stripe per 100 seats.

import { CITIES, LYCEUM, LYCEUM_COLOR } from '../data/hse.js';
import { nf, pct, plural } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';

// Seats in the arena — the figure the subtitle and the meter both quote.
const TOTAL = 81000;

export const meta = {
  id: 'stadium',
  title: 'В Лужниках все свои',
  subtitle: `Лужники — самая крупная арена России, вмещающая ${nf(TOTAL)} человек. Вышка такая большая, что может заполнить ее практически полностью`,
  // Opens with the heading alone, then the empty arena fills up campus by
  // campus; the last step hands the stadium over to the reader.
  intro: true,
  steps: 7
};

export function init(root) {
  'use strict';

  // ---------- Data ----------
  const STRIPES = 800;
  const PER = TOTAL / STRIPES;
  const EMPTY = '#D3D7DE';

  const KIND_DEFS = [
    { key: 'students', label: 'Студенты' },
    { key: 'staff', label: 'Сотрудники' },
    { key: 'lyceum', label: 'Лицей', accent: LYCEUM_COLOR, lyceum: true }
  ];

  // ---------- Markup ----------
  // While the scene is running the controls step aside: there is only the
  // arena, the share of it that is full, and a line saying who just came in.
  root.classList.add('stadium-body');
  root.innerHTML = `
    <style>
      .stadium-figure {
        display: none;
        flex-direction: column;
        gap: 4px;
      }

      .stadium-figure-value {
        font-size: 4rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .stadium-figure-note {
        font-size: 1.0625rem;
        color: var(--text-secondary);
      }

      .stadium-body.is-telling .stadium-figure { display: flex; }
      .stadium-body.is-telling .col-left,
      .stadium-body.is-telling .meter-card { display: none; }

      /* Handing over: the controls arrive rather than blink into place. */
      .stadium-body:not(.is-telling) .col-left,
      .stadium-body:not(.is-telling) .meter-card {
        animation: stadium-arrive 320ms ease both;
      }

      @keyframes stadium-arrive {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .stadium-body:not(.is-telling) .col-left,
        .stadium-body:not(.is-telling) .meter-card { animation: none; }
      }
    </style>

    <div class="col-left">
      <div class="kind-row" data-el="kindRow"></div>
      <div class="city-list" data-el="cityList"></div>
      <div class="actions">
        <button type="button" class="btn" data-el="clearAll">Убрать всех</button>
        <button type="button" class="btn" data-el="restoreAll">Вернуть всех</button>
      </div>
    </div>

    <div class="col-right">
      <div class="stadium-figure">
        <div class="stadium-figure-value" data-el="figureValue"></div>
        <div class="stadium-figure-note" data-el="figureNote"></div>
      </div>

      <div class="meter-card">
        <div class="meter-header">
          <div class="meter-title">Занято мест</div>
          <div class="meter-value"><strong data-el="filled"></strong> из ${nf(TOTAL)} — <span data-el="pct"></span></div>
        </div>
        <div class="meter-bar" data-el="bar"></div>
        <div class="meter-note" data-el="note"></div>
      </div>

      <div class="canvas-card">
        <div class="canvas-legend">
          <span class="canvas-legend-swatch" data-el="legendSwatch"></span>
          <span>100 мест</span>
        </div>
        <div class="canvas-wrap" data-el="canvasWrap"></div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = {
    active: { msk: true, spb: true, nn: true, perm: true },
    kinds: { students: true, staff: true, lyceum: true }
  };

  function segments() {
    const { kinds } = state;
    const out = [];
    CITIES.forEach((c) => {
      if (kinds.students) out.push({ key: c.key, n: c.students, color: c.color });
      if (kinds.staff) out.push({ key: c.key, n: c.staff, color: c.colorLight });
    });
    if (kinds.lyceum) out.push({ key: 'lyceum', n: LYCEUM, color: LYCEUM_COLOR, always: true });
    return out;
  }

  function filledCount() {
    const { active, kinds } = state;
    return CITIES.reduce((sum, c) => sum + (active[c.key] ? (kinds.students ? c.students : 0) + (kinds.staff ? c.staff : 0) : 0), 0)
      + (kinds.lyceum ? LYCEUM : 0);
  }

  // ---------- Stadium geometry (ported closely from the design prototype) ----------
  const TRIBUNES = [
    { id: 'A', f1: 0.09, f2: 0.41 },
    { id: 'B', f1: 0.41, f2: 0.59 },
    { id: 'C', f1: 0.59, f2: 0.91 },
    { id: 'D', f1: 0.91, f2: 1.09 }
  ];
  const TIERS = [
    { rings: 8, r0: 24, step: 18, lw: 9.5, sectors: { A: 13, B: 7, C: 13, D: 7 } },
    { rings: 10, r0: 74, step: 21.5, lw: 11, sectors: { A: 15, B: 9, C: 15, D: 9 } }
  ];
  const PITCH = { rx: 330, ry: 202 };
  const LOGO_DISC = new Path2D('M141.73,0 a141.73,141.73 0 1,0 0.01,0 z');
  const LOGO_MARK = new Path2D('M135.6,133.32c32.26,0,44.81,21.45,44.81,60.69v29.51h-20.69v-63.35h-23.9v63.42h-18.28V53.65h18.78c7.03,0,17.71,1.58,25.25,10.95c3.93,4.73,6.34,11.04,7.19,17.38h-32.94v9.35h33.23c-0.27,6.04-1.49,12.8-7.42,19.97c-5.2,6.51-13.76,12.56-25.83,12.56c-0.06,0-0.13,0-0.2,0V133.32 M206.41,197.55c0-34.86-11.26-58.29-40.45-68.6c9.21-3.77,14.82-9.58,18.49-13.99c7.01-8.06,9.88-17.96,9.88-27.31c0-7.56-2.08-22.65-15.35-33.04c-9.1-7.04-17.16-10.43-36.43-10.43h-9.75c-0.3-0.01-0.6-0.01-0.96-0.01H91.65v189.79h114.76V197.55z');
  const RINGS_TOTAL = TIERS[0].rings + TIERS[1].rings;
  const kOf = (i) => 3.9 - (i / (RINGS_TOTAL - 1)) * 1.5;
  const sePoint = (rx, ry, t, k) => {
    const c = Math.cos(t), s = Math.sin(t), e = 2 / k;
    return [rx * Math.sign(c) * Math.pow(Math.abs(c), e), ry * Math.sign(s) * Math.pow(Math.abs(s), e)];
  };

  function ringTable(rx, ry, k) {
    const N = 900;
    const ls = new Float32Array(N + 1);
    let px = rx, py = 0, per = 0;
    for (let i = 1; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const p = sePoint(rx, ry, t, k);
      per += Math.hypot(p[0] - px, p[1] - py);
      px = p[0]; py = p[1];
      ls[i] = per;
    }
    return { ls, per, N };
  }

  let bowlCache = null;
  function buildBowl() {
    if (bowlCache) return bowlCache;
    const stripes = [];
    const rings = [];
    const edges = [[], []];

    TIERS.forEach((tier, ti) => {
      const base = ti === 0 ? PITCH.rx + tier.r0 : PITCH.rx + TIERS[0].r0 + TIERS[0].rings * TIERS[0].step + 26;
      const baseY = ti === 0 ? PITCH.ry + tier.r0 : PITCH.ry + TIERS[0].r0 + TIERS[0].rings * TIERS[0].step + 26;
      const sectors = [];
      TRIBUNES.forEach((tr) => {
        const n = tier.sectors[tr.id];
        const span = (tr.f2 - tr.f1) / n;
        for (let i = 0; i < n; i++) {
          const a = tr.f1 + i * span, b = a + span;
          sectors.push([a, b]);
          edges[ti].push(((a % 1) + 1) % 1);
        }
      });
      for (let r = 0; r < tier.rings; r++) {
        const rx = base + r * tier.step, ry = baseY + r * tier.step;
        const k = kOf(rings.length);
        const tbl = ringTable(rx, ry, k);
        const f2t = (f) => {
          const fm = ((f % 1) + 1) % 1;
          const target = fm * tbl.per;
          let lo = 0, hi = tbl.N;
          while (lo < hi) {
            const m = (lo + hi) >> 1;
            if (tbl.ls[m] < target) lo = m + 1; else hi = m;
          }
          return (lo / tbl.N) * Math.PI * 2;
        };
        const gapFrac = ((tier.step - tier.lw) / 2 + tier.lw / 2) / tbl.per;
        sectors.forEach((sc) => {
          const fMid = (((sc[0] + sc[1]) / 2) % 1 + 1) % 1;
          stripes.push({ rx, ry, k, t1: f2t(sc[0] + gapFrac), t2: f2t(sc[1] - gapFrac), lw: tier.lw, ring: rings.length, fMid });
        });
        rings.push({ rx, ry, k });
      }
    });

    const COLS = 40, START = 0.09;
    stripes.forEach((s) => {
      const f = ((s.fMid - START) % 1 + 1) % 1;
      s.col = Math.round(f * COLS) % COLS;
      s.order = f;
    });
    stripes.sort((p, q) => (p.col - q.col) || (p.ring - q.ring) || (p.order - q.order));

    // Median stripe — the legend swatch is drawn at exactly this size, so the
    // "100 мест" sample always matches the stripes on the schema.
    const arcLen = (s) => {
      const a = s.t1, b = s.t2 >= s.t1 ? s.t2 : s.t2 + Math.PI * 2;
      let len = 0, prev = sePoint(s.rx, s.ry, a, s.k);
      for (let i = 1; i <= 24; i++) {
        const p = sePoint(s.rx, s.ry, a + (b - a) * (i / 24), s.k);
        len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
      }
      return len;
    };
    const byLen = stripes.map((s) => ({ len: arcLen(s), lw: s.lw })).sort((p, q) => p.len - q.len);
    const legend = byLen[byLen.length >> 1];

    const last = rings[rings.length - 1];
    const outRx = last.rx + TIERS[1].lw, outRy = last.ry + TIERS[1].lw;
    const shellRx = outRx * 1.13 + 12, shellRy = outRy * 1.13 + 12;

    const lowOut = PITCH.rx + TIERS[0].r0 + (TIERS[0].rings - 1) * TIERS[0].step;
    const lowOutY = PITCH.ry + TIERS[0].r0 + (TIERS[0].rings - 1) * TIERS[0].step;
    const kLow = kOf(TIERS[0].rings - 1), kTop = kOf(RINGS_TOTAL - 1);
    const exits = [];
    edges[0].forEach((f) => exits.push({ f, k1: kLow, k2: kLow, r1x: lowOut + 9, r1y: lowOutY + 9, r2x: lowOut + 22, r2y: lowOutY + 22, w: 5 }));
    edges[1].forEach((f) => exits.push({ f, k1: kTop, k2: kTop, r1x: outRx + 6, r1y: outRy + 6, r2x: outRx + 19, r2y: outRy + 19, w: 5 }));

    bowlCache = { stripes, exits, legend, outRx, outRy, shellRx, shellRy, W: shellRx * 2 + 24, H: shellRy * 2 + 24 };
    return bowlCache;
  }

  function colorsFor(active) {
    const arr = new Array(STRIPES).fill(EMPTY);
    let cum = 0, idx = 0;
    segments().forEach((seg) => {
      cum += seg.n;
      const end = Math.min(STRIPES, Math.round(cum / PER));
      const col = (seg.always || active[seg.key]) ? seg.color : EMPTY;
      for (; idx < end; idx++) arr[idx] = col;
    });
    return arr;
  }

  // ---------- Canvas painting ----------
  const legendSwatch = $('legendSwatch');
  const { canvas, ctx } = mountCanvas($('canvasWrap'), paint);
  let currentColors = null;
  let animFrame = null;

  function paint() {
    const B = buildBowl();
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 600;
    const scale = Math.min(cssW / B.W, cssH / B.H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * cssW / 2, dpr * cssH / 2);
    ctx.clearRect(-cssW / (2 * scale), -cssH / (2 * scale), cssW / scale, cssH / scale);

    // Keep the legend sample the same size as a stripe on the schema.
    const legendW = B.legend.len * scale, legendH = B.legend.lw * scale;
    legendSwatch.style.width = `${legendW}px`;
    legendSwatch.style.height = `${legendH}px`;
    legendSwatch.style.borderRadius = `${legendH / 2}px`;

    // outer shell
    ctx.beginPath();
    ctx.ellipse(0, 0, B.shellRx, B.shellRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E7E9ED';
    ctx.fill();

    // pitch
    const px = PITCH.rx + TIERS[0].r0 - 13, py = PITCH.ry + TIERS[0].r0 - 13, pk = kOf(0);
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const p = sePoint(px, py, (i / 240) * Math.PI * 2, pk);
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = '#8CC63F';
    ctx.fill();

    const fw = PITCH.rx * 0.80, fh = PITCH.ry * 0.76;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let i = -8; i < 8; i += 2) ctx.fillRect(i * fw / 8, -PITCH.ry - 12, fw / 8, (PITCH.ry + 12) * 2);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-fw, -fh, fw * 2, fh * 2);
    ctx.beginPath(); ctx.moveTo(0, -fh); ctx.lineTo(0, fh); ctx.stroke();

    const R = fh * 0.34, s = (R * 2) / 283.47;
    ctx.save();
    ctx.scale(s, s);
    ctx.translate(-141.73, -141.73);
    ctx.fillStyle = '#102D69';
    ctx.fill(LOGO_DISC);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(LOGO_MARK);
    ctx.restore();

    ctx.strokeRect(-fw, -fh * 0.42, fw * 0.16, fh * 0.84);
    ctx.strokeRect(fw * 0.84, -fh * 0.42, fw * 0.16, fh * 0.84);

    // stripes
    if (!currentColors) currentColors = colorsFor(state.active);
    const buckets = new Map();
    B.stripes.forEach((s, i) => {
      const c = currentColors[i] || EMPTY;
      if (!buckets.has(c)) buckets.set(c, []);
      buckets.get(c).push(s);
    });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    buckets.forEach((list, color) => {
      ctx.strokeStyle = color;
      list.forEach((s) => {
        ctx.lineWidth = s.lw;
        const a = s.t1, b = s.t2 >= s.t1 ? s.t2 : s.t2 + Math.PI * 2;
        const n = Math.max(3, Math.ceil((b - a) / 0.02));
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const p = sePoint(s.rx, s.ry, a + (b - a) * (i / n), s.k);
          if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        }
        ctx.stroke();
      });
    });

    // vomitories
    ctx.strokeStyle = '#CBD0D8';
    B.exits.forEach((e) => {
      const t = e.f * Math.PI * 2;
      const p1 = sePoint(e.r1x, e.r1y, t, e.k1);
      const p2 = sePoint(e.r2x, e.r2y, t, e.k2);
      ctx.lineWidth = e.w;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    });
  }

  function animateStripesTo(target) {
    const from = currentColors || target;
    const changed = [];
    for (let i = 0; i < STRIPES; i++) if (from[i] !== target[i]) changed.push(i);
    if (!changed.length) { currentColors = target; paint(); return; }
    const hiding = target[changed[0]] === EMPTY;
    const order = hiding ? changed.slice().reverse() : changed;
    const dur = 620, t0 = performance.now();
    if (animFrame) cancelAnimationFrame(animFrame);
    const step = (now) => {
      const raw = Math.min(1, (now - t0) / dur);
      const p = 1 - Math.pow(1 - raw, 3);
      const n = Math.round(p * order.length);
      const cur = from.slice();
      for (let j = 0; j < n; j++) cur[order[j]] = target[order[j]];
      currentColors = cur;
      paint();
      if (raw < 1) animFrame = requestAnimationFrame(step);
      else { currentColors = target; paint(); }
    };
    animFrame = requestAnimationFrame(step);
  }

  // ---------- DOM rendering ----------
  const kindRow = $('kindRow');
  const cityList = $('cityList');
  const bar = $('bar');
  const filledLabelEl = $('filled');
  const pctLabelEl = $('pct');

  const kindEls = {};
  KIND_DEFS.forEach((def) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kind-item' + (def.lyceum ? ' lyceum' : '');
    item.innerHTML = `
      <span class="kind-box"><span class="kind-check"></span></span>
      <span class="kind-label">${def.label}</span>
    `;
    item.addEventListener('click', () => {
      takeOver();
      state.kinds[def.key] = !state.kinds[def.key];
      render();
    });
    kindRow.appendChild(item);
    kindEls[def.key] = item;
  });

  const cityEls = {};
  CITIES.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${c.name}</div>
        <div class="city-stats">
          <span class="city-stat city-stat-students"><span class="city-dot" style="background:${c.color}"></span><span class="city-stat-text"></span></span>
          <span class="city-stat city-stat-staff"><span class="city-dot" style="background:${c.colorLight}"></span><span class="city-stat-text"></span></span>
        </div>
      </div>
      <button type="button" class="toggle" role="switch"><span class="toggle-knob"></span></button>
    `;
    const toggleBtn = card.querySelector('.toggle');
    toggleBtn.addEventListener('click', () => {
      takeOver();
      state.active[c.key] = !state.active[c.key];
      render();
    });
    cityList.appendChild(card);
    cityEls[c.key] = {
      card,
      toggle: toggleBtn,
      studentsRow: card.querySelector('.city-stat-students'),
      studentsText: card.querySelector('.city-stat-students .city-stat-text'),
      staffRow: card.querySelector('.city-stat-staff'),
      staffText: card.querySelector('.city-stat-staff .city-stat-text')
    };
  });

  $('clearAll').addEventListener('click', () => {
    takeOver();
    CITIES.forEach((c) => { state.active[c.key] = false; });
    KIND_DEFS.forEach((k) => { state.kinds[k.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    takeOver();
    CITIES.forEach((c) => { state.active[c.key] = true; });
    KIND_DEFS.forEach((k) => { state.kinds[k.key] = true; });
    render();
  });

  const barSegEls = [];
  function ensureBarSegs(count) {
    while (barSegEls.length < count) {
      const seg = document.createElement('div');
      seg.className = 'meter-bar-seg';
      bar.appendChild(seg);
      barSegEls.push(seg);
    }
    while (barSegEls.length > count) {
      const seg = barSegEls.pop();
      seg.remove();
    }
  }

  function render() {
    // category checkboxes
    KIND_DEFS.forEach((def) => {
      kindEls[def.key].classList.toggle('active', !!state.kinds[def.key]);
    });

    // city cards
    CITIES.forEach((c) => {
      const els = cityEls[c.key];
      const on = !!state.active[c.key];
      els.toggle.classList.toggle('on', on);
      els.toggle.style.background = on ? c.color : '';
      els.studentsRow.style.display = state.kinds.students ? '' : 'none';
      els.staffRow.style.display = state.kinds.staff ? '' : 'none';
      els.studentsText.textContent = `${nf(c.students)} ${plural(c.students, 'студент', 'студента', 'студентов')}`;
      els.staffText.textContent = `${nf(c.staff)} ${plural(c.staff, 'сотрудник', 'сотрудника', 'сотрудников')}`;
    });

    // meter
    const filled = filledCount();
    filledLabelEl.textContent = nf(filled);
    pctLabelEl.textContent = pct(filled, TOTAL);

    const segs = segments();
    ensureBarSegs(segs.length);
    segs.forEach((seg, i) => {
      const on = seg.always || state.active[seg.key];
      const el = barSegEls[i];
      el.style.background = on ? seg.color : 'transparent';
      el.style.width = `${on ? (seg.n / TOTAL) * 100 : 0}%`;
    });

    // stadium
    animateStripesTo(colorsFor(state.active));
  }

  // ---------- Column alignment ----------
  // Only the left column starts with the filter row, so without this the meter
  // card sits higher than the first city card. Measured rather than hard-coded:
  // the row grows with the text size and can wrap on narrow screens.
  const colLeft = root.querySelector('.col-left');
  const colRight = root.querySelector('.col-right');
  const stacked = window.matchMedia('(max-width: 860px)');

  function alignColumns() {
    // One column, or the controls are away telling the story: nothing to line
    // the meter up with.
    if (stacked.matches || root.classList.contains('is-telling')) {
      colRight.style.paddingTop = '';
      return;
    }
    const gap = parseFloat(getComputedStyle(colLeft).rowGap) || 0;
    colRight.style.paddingTop = `${kindRow.offsetHeight + gap}px`;
  }

  new ResizeObserver(alignColumns).observe(kindRow);
  stacked.addEventListener('change', alignColumns);

  // ---------- Scene ----------
  // The arena starts empty and fills up campus by campus, smallest first, so
  // every group visibly adds its own patch of stands. The last step hands the
  // stadium over: the controls arrive and the reader takes it from there.
  const ARRIVALS = [
    { key: 'lyceum', n: LYCEUM, note: `Первыми заходят лицеисты, их ${nf(LYCEUM)}` },
    ...['perm', 'nn', 'spb', 'msk'].map((key) => {
      const c = CITIES.find((x) => x.key === key);
      const n = c.students + c.staff;
      return { key, n, note: `${c.name} — ${nf(n)} ${plural(n, 'человек', 'человека', 'человек')}` };
    })
  ];
  const LAST = meta.steps - 1;             // the live stadium, with controls

  const noteEl = $('note');
  const figureValue = $('figureValue');
  const figureNote = $('figureNote');
  let userDrives = false;

  function takeOver() {
    if (userDrives) return;
    userDrives = true;
    noteEl.textContent = 'Стадион ваш: попробуйте выключить город или категорию';
  }

  function step(i) {
    const telling = i < LAST;
    root.classList.toggle('is-telling', telling);

    if (telling) {
      userDrives = false;                  // scrolled back into the story
      const came = ARRIVALS.slice(0, i);   // step 0 is the empty arena
      CITIES.forEach((c) => { state.active[c.key] = came.some((a) => a.key === c.key); });
      state.kinds.lyceum = came.some((a) => a.key === 'lyceum');
      state.kinds.students = true;
      state.kinds.staff = true;
      figureNote.textContent = i === 0
        ? `Пустая арена — ${nf(TOTAL)} мест`
        : ARRIVALS[i - 1].note;
    } else if (!userDrives) {
      CITIES.forEach((c) => { state.active[c.key] = true; });
      KIND_DEFS.forEach((k) => { state.kinds[k.key] = true; });
      noteEl.textContent = 'Стадион ваш: попробуйте выключить город или категорию';
    }

    render();
    figureValue.textContent = pct(filledCount(), TOTAL);
    alignColumns();
  }

  render();
  paint();
  alignColumns();

  return { step };
}
