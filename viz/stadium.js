// Luzhniki stands filled with HSE people, one stripe per 100 seats.

import { CITIES, LYCEUM, LYCEUM_COLOR, ADMITTED } from '../data/hse.js';
import { nf, pct, plural } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';

// Seats in the arena — the figure the subtitle and the meter both quote.
const TOTAL = 81000;

// The screen before this section still speaks of the intake — rounded to the
// nearest thousand, because it is a thought, not a figure to be checked.
const ADMITTED_ROUND = Math.round(ADMITTED / 1000) * 1000;

export const meta = {
  id: 'stadium',
  // Hands the reader over from the trains: a number they have just met, and
  // the question it raises.
  lead: {
    value: `Только первокурсников ~${nf(ADMITTED_ROUND)} человек`,
    text: 'Похоже, чтобы собрать всех людей из Вышки, нужен целый стадион…'
  },
  // The scarf closes the line. Sized by width, like the station board in the
  // metro section: the file is 600 by 164, so it keeps its own proportions and
  // shrinks whole on a narrow screen. The inline width holds until the styles
  // of the module arrive — the shell draws the heading a moment earlier.
  title: 'В «Лужниках» все свои '
    + '<span class="stadium-scarf-slot" style="width: 4.7em">'
    + '<img class="stadium-scarf" src="assets/scarf-hse.svg" alt="" aria-hidden="true">'
    + '</span>',
  // The title card arrives in two goes: the arena first, what we are about to
  // do with it a screen later. Both sentences are phrasing content — the page
  // shell puts the subtitle inside a <p>.
  subtitle: `
    <span class="stadium-brief">
      <span class="stadium-brief-line">«Лужники» — самая крупная арена России, вмещающая ${nf(TOTAL)} человек.</span>
      <span class="stadium-brief-line intro-stage" data-stage="1">Вышка такая большая, что может заполнить ее практически полностью</span>
    </span>
  `,
  // Opens with the heading alone, then the empty arena fills up campus by
  // campus; the last step hands the stadium over to the reader.
  intro: true,
  introStages: 2,
  // Empty arena, five arrivals, then the stadium is handed over to the reader.
  // Every step changes something: a beat that only waits would be a «next»
  // that does nothing. The empty arena comes with the block itself, so the
  // beats start with the first arrival.
  steps: 7,
  opensOnStep: true,
  // The seats taken carry over into the next block's lead-in: everyone on the
  // stadium narrows down to the students among them.
  handoff: 'filled',
  // And the arena itself goes over with them, to stand under that lead-in —
  // see «Handing over» at the end of init.
  carry: true
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
      /* Both sentences of the title card are their own line. While the card is
         out in the middle of the screen a blank line separates them; as it
         settles into the heading the blank line folds away and the two read as
         one plain subtitle. Folds faster than the card lands, hence the ×3. */
      .stadium-brief {
        --fold: clamp(0, 1 - var(--intro-body, 1) * 3, 1);
        display: block;
      }

      .stadium-brief-line {
        display: block;
      }

      .stadium-brief-line + .stadium-brief-line {
        margin-top: calc(var(--fold) * 1.4em);
      }

      /* Always in the flow: it opens and closes by height, so the canvas next
         to it changes size smoothly rather than in one jump. */
      .stadium-figure {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: none;
      }

      /* The label and the share read as one sentence. */
      .stadium-figure-head {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0 12px;
      }

      .stadium-figure-label,
      .stadium-figure-people {
        font-size: 1.0625rem;
        color: var(--text-secondary);
      }

      .stadium-figure-people {
        font-variant-numeric: tabular-nums;
      }

      .stadium-figure-value {
        font-size: 4rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      /* Who is coming in, in their own colour. Cloned decoration keeps the
         padding on both halves if the phrase breaks across lines. */
      .stadium-mark {
        padding: 0.08em 0.3em;
        border-radius: 0.24em;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      .stadium-figure-note {
        margin-top: 8px;
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text);
      }

      /* Handing over. Nothing appears out of nowhere: the column of controls
         opens from zero width and the cards from zero height, so the canvas
         beside them loses room gradually and the arena shrinks into its place
         instead of jumping there. The canvas redraws itself on every frame of
         this — it is subscribed to the size of its box. */
      .stadium-body .col-left,
      .stadium-body .meter-card,
      .stadium-body .stadium-figure {
        transition: width 520ms ease, max-height 520ms ease, opacity 320ms ease;
      }

      /* The scarf in the heading. It sags in the middle, so its box is taller
         than what the eye reads as its body — hence it hangs a little below
         the baseline instead of sitting on it. */
      /* The scarf is taller than the line it sits in, and a picture in the flow
         would push the whole line apart — which would drop the subtitle below
         where the lead-in screen puts its own. So it hangs out of a slot that
         is shorter than the line: the slot holds the width, the scarf overflows
         it without anyone noticing. */
      .stadium-scarf-slot {
        display: inline-block;
        position: relative;
        width: 4.7em;
        height: 0.8em;
        margin-left: 0.14em;
        vertical-align: baseline;
      }

      .stadium-scarf {
        position: absolute;
        left: 0;
        bottom: -0.3em;
        width: 100%;
        height: auto;
      }

      /* With the controls away the right column is the whole width, so the
         lines above the arena start where the heading does. */
      .stadium-body.is-telling {
        gap: 0;
      }

      .stadium-body.is-telling .col-left {
        width: 0;
        opacity: 0;
        overflow: hidden;
      }

      .stadium-body.is-telling .meter-card {
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        opacity: 0;
        overflow: hidden;
      }

      .stadium-body .meter-card {
        max-height: 240px;
      }

      .stadium-body .stadium-figure {
        max-height: 240px;
      }

      .stadium-body:not(.is-telling) .stadium-figure {
        max-height: 0;
        opacity: 0;
        overflow: hidden;
      }

      @media (prefers-reduced-motion: reduce) {
        .stadium-body .col-left,
        .stadium-body .meter-card,
        .stadium-body .stadium-figure { transition: none; }
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
        <div class="stadium-figure-head">
          <span class="stadium-figure-label">Стадион заполнен на</span>
          <span class="stadium-figure-value" data-el="figureValue"></span>
          <span class="stadium-figure-people" data-el="figurePeople"></span>
        </div>
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
    // While the story runs a campus is one colour: it arrives as a whole, and
    // there is nothing on screen yet to say what the second shade would mean.
    // The split into students and staff appears with the controls, next to the
    // legend that explains it.
    const split = !root.classList.contains('is-telling');
    const out = [];
    CITIES.forEach((c) => {
      if (kinds.students) out.push({ key: c.key, n: c.students, color: c.color });
      if (kinds.staff) out.push({ key: c.key, n: c.staff, color: split ? c.colorLight : c.color });
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
  const { canvas } = mountCanvas($('canvasWrap'), paint);
  let currentColors = null;
  let animFrame = null;

  function paint() {
    if (!currentColors) currentColors = colorsFor(state.active);
    const B = buildBowl();
    const scale = drawStadium(canvas, currentColors);

    // Keep the legend sample the same size as a stripe on the schema.
    const legendW = B.legend.len * scale, legendH = B.legend.lw * scale;
    legendSwatch.style.width = `${legendW}px`;
    legendSwatch.style.height = `${legendH}px`;
    legendSwatch.style.borderRadius = `${legendH / 2}px`;
  }

  // Draws the arena into any canvas, fitted into its box and centred; `zoom`
  // grows it past that. Answers how many CSS pixels a unit of the schema is.
  function drawStadium(target, colors, zoom = 1) {
    const ctx = target.getContext('2d');
    const B = buildBowl();
    const cssW = target.clientWidth || 900;
    const cssH = target.clientHeight || 600;
    const scale = Math.min(cssW / B.W, cssH / B.H) * zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    target.width = Math.round(cssW * dpr);
    target.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * cssW / 2, dpr * cssH / 2);
    ctx.clearRect(-cssW / (2 * scale), -cssH / (2 * scale), cssW / scale, cssH / scale);

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
    const buckets = new Map();
    B.stripes.forEach((s, i) => {
      const c = colors[i] || EMPTY;
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
    return scale;
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

  function render(instant) {
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
    const target = colorsFor(state.active);
    if (instant) { currentColors = target; paint(); }
    else animateStripesTo(target);
  }

  // ---------- Column alignment ----------
  // Only the left column starts with the filter row, so without this the meter
  // card sits higher than the first city card. Measured rather than hard-coded:
  // the row grows with the text size and can wrap on narrow screens.
  const colLeft = root.querySelector('.col-left');
  const colRight = root.querySelector('.col-right');
  const stacked = window.matchMedia('(max-width: 860px)');

  const meterCard = root.querySelector('.meter-card');

  // Lines the top of the meter up with the top of the first city card.
  // Measured rather than derived: the left column starts with the filter row
  // and the right one with whatever the scene left behind, and both change
  // height with the text size.
  function alignColumns() {
    // One column, or the controls are away telling the story: nothing to line
    // the meter up with.
    if (stacked.matches || root.classList.contains('is-telling')) {
      colRight.style.paddingTop = '';
      return;
    }
    const card = cityList.querySelector('.city-card');
    if (!card) return;
    colRight.style.paddingTop = '0px';
    const delta = card.getBoundingClientRect().top - meterCard.getBoundingClientRect().top;
    colRight.style.paddingTop = `${Math.max(0, Math.round(delta))}px`;
  }

  new ResizeObserver(alignColumns).observe(kindRow);
  stacked.addEventListener('change', alignColumns);
  // The left column arrives with a transition; measure once it has settled.
  colLeft.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'width') alignColumns();
  });

  // ---------- Scene ----------
  // The arena starts empty and fills up campus by campus, smallest first, so
  // every group visibly adds its own patch of stands. The last step hands the
  // stadium over: the controls arrive and the reader takes it from there.
  const people = (key) => {
    const c = CITIES.find((x) => x.key === key);
    return c.students + c.staff;
  };
  const many = (n) => `${nf(n)} ${plural(n, 'человек', 'человека', 'человек')}`;

  // Who is coming in is painted in their own colour, the same one their seats
  // take on the stands. The lyceum yellow is light, so its text stays dark.
  const colorOf = (key) => (key === 'lyceum'
    ? LYCEUM_COLOR
    : CITIES.find((x) => x.key === key).color);

  const mark = (text, key) => `<span class="stadium-mark" style="background:${colorOf(key)};`
    + `color:${key === 'lyceum' ? 'var(--text)' : '#FFFFFF'}">${text}</span>`;

  const ARRIVALS = [
    { key: 'lyceum', note: `Первыми пропустим ${mark('лицеистов Москвы и Перми,', 'lyceum')} их ${many(LYCEUM)}` },
    { key: 'perm', note: `Дальше студенты и сотрудники ${mark('пермского кампуса', 'perm')} — ${many(people('perm'))}` },
    { key: 'nn', note: `Затем ${mark('нижегородский кампус', 'nn')} — ${many(people('nn'))}` },
    { key: 'spb', note: `Потом ${mark('Питер', 'spb')} — ${many(people('spb'))}` },
    { key: 'msk', note: `И ${mark('Москва', 'msk')} — ${many(people('msk'))}` }
  ];
  // One step past the last arrival: the full arena stays on screen for a while
  // before the controls take over.
  const LAST = meta.steps - 1;             // the live stadium, with controls

  const noteEl = $('note');
  const figureValue = $('figureValue');
  const figurePeople = $('figurePeople');
  const figureNote = $('figureNote');
  let userDrives = false;

  // ---------- Counter ----------
  // The share does not jump to its new value: it runs up to it over the same
  // 620 ms the stands take to change colour, so the number and the picture
  // arrive together.
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let shownFilled = 0;
  let countFrame = null;

  function paintCount(n) {
    figureValue.textContent = pct(n, TOTAL);
    figurePeople.textContent = n > 0 ? `(всего ${many(n)})` : '';
  }

  function countTo(target) {
    if (countFrame) cancelAnimationFrame(countFrame);
    const from = shownFilled;
    if (still || from === target) {
      shownFilled = target;
      paintCount(target);
      return;
    }
    const t0 = performance.now();
    const tick = (now) => {
      const raw = Math.min(1, (now - t0) / 620);
      const p = 1 - Math.pow(1 - raw, 3);
      shownFilled = Math.round(from + (target - from) * p);
      paintCount(shownFilled);
      if (raw < 1) countFrame = requestAnimationFrame(tick);
      else { countFrame = null; shownFilled = target; paintCount(target); }
    };
    countFrame = requestAnimationFrame(tick);
  }

  function takeOver() {
    if (userDrives) return;
    userDrives = true;
    noteEl.textContent = 'Стадион твой: попробуй выключить город или категорию';
  }

  let firstFrame = true;

  function step(i) {
    const telling = i < LAST;
    root.classList.toggle('is-telling', telling);

    if (telling) {
      userDrives = false;                  // scrolled back into the story
      // Step 0 is the empty arena; anything past the last arrival holds the
      // full one, so the reader gets a moment with it before the controls.
      const shown = Math.min(i, ARRIVALS.length);
      const came = ARRIVALS.slice(0, shown);
      CITIES.forEach((c) => { state.active[c.key] = came.some((a) => a.key === c.key); });
      state.kinds.lyceum = came.some((a) => a.key === 'lyceum');
      state.kinds.students = true;
      state.kinds.staff = true;
      figureNote.innerHTML = shown === 0
        ? `Пустая арена — ${nf(TOTAL)} мест`
        : ARRIVALS[shown - 1].note;
    } else if (!userDrives) {
      CITIES.forEach((c) => { state.active[c.key] = true; });
      KIND_DEFS.forEach((k) => { state.kinds[k.key] = true; });
      noteEl.textContent = 'Стадион твой: попробуй выключить город или категорию';
    }

    render(firstFrame);
    countTo(filledCount());
    firstFrame = false;
    alignColumns();
  }

  // The story starts on an empty arena. Built with the default state instead,
  // the block would show a full stadium for the moment between the title card
  // settling and the first beat of the scene.
  step(0);
  paint();

  // ---------- Handing over ----------
  // The page goes on to ask about the students from abroad, and it asks over
  // this arena, grown to the screen under the question. Of everyone on it only
  // the students keep their seats, all in one colour, and those from abroad
  // are picked out among them. Nobody changes seats — they are the ones the
  // reader has just watched fill up — the rest simply go out. The shell carries
  // the picture over; see carry() in lib/stepper.js.
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // Smaller than the room under the question: a picture to glance at while
  // reading it, not one to fill the screen.
  const SMALL = 0.72;

  function studentsOnly() {
    const arr = new Array(STRIPES).fill(EMPTY);
    const student = token('--students');
    const foreign = token('--foreign');
    // The full arena, laid out the way colorsFor lays it: campus by campus,
    // students first, the lyceum last.
    let cum = 0, idx = 0;
    let abroad = 0, picked = 0;
    CITIES.forEach((c) => {
      const seats = [];
      [[c.students, true], [c.staff, false]].forEach(([n, studies]) => {
        cum += n;
        const end = Math.min(STRIPES, Math.round(cum / PER));
        for (; idx < end; idx++) {
          if (!studies) continue;
          arr[idx] = student;
          seats.push(idx);
        }
      });
      // The students from abroad sit together within their own campus, in the
      // middle of its stretch of the stands, so each campus shows its share as
      // one patch. Counted up across the campuses, so the stripes add up to the
      // total however each campus rounds.
      abroad += c.foreign;
      const n = Math.round(abroad / PER) - picked;
      picked += n;
      const from = Math.floor((seats.length - n) / 2);
      seats.slice(from, from + n).forEach((i) => { arr[i] = foreign; });
    });
    return arr;
  }

  // Where the picture sits in a canvas it was drawn into at `scale`.
  const boxIn = (target, scale) => {
    const B = buildBowl();
    const w = B.W * scale, h = B.H * scale;
    return { x: (target.clientWidth - w) / 2, y: (target.clientHeight - h) / 2, w, h };
  };

  const carry = {
    from: canvas,
    box: () => {
      const B = buildBowl();
      return boxIn(canvas, Math.min(canvas.clientWidth / B.W, canvas.clientHeight / B.H));
    },
    paint: (target) => boxIn(target, drawStadium(target, studentsOnly(), SMALL))
  };

  return { step, carry };
}
