// Three cubesats of HSE going round a turning Earth — the one dark card on
// the page.
//
// The picture keeps to the real proportions: a low orbit runs a few hundred
// kilometres over a globe 6371 km across, so the ring all but touches the
// planet. Only the satellites themselves are drawn larger than life — to
// scale they would be smaller than a pixel.

import { nf } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';
import { LAND } from '../data/earth.js';

// ---------- The objects ----------
// Figures about the satellites live here, the way the arena keeps its 81 000
// seats. Dates, launch sites and missions come from the laboratory that built
// them — miem.hse.ru/uvpmiem/lab/ka.
const EARTH_KM = 6371;
const ORBIT_KM = 500;    // the usual height for cubesats of this family
const INCLINE = 97.5;    // sun-synchronous, so the orbit passes over the poles
const LAPS = 16500;      // laps CubeSX-HSE-3 had flown by its third year
const FLOWN_MLN = 720;   // and million kilometres with them — nearly five
                         // times the 149,6 million from here to the Sun

// In the order they went up. `node` is where the orbit crosses the equator,
// far enough apart that the three rings can be told from one another.
const SATS = [
  { name: 'CubeSX-HSE', node: -64 },
  { name: 'CubeSX-HSE-2', node: 2 },
  { name: 'CubeSX-HSE-3', node: 66 }
];

// One line per beat, and a quieter one under it.
const STORY = [
  {
    line: 'Низкая орбита начинается в нескольких сотнях километров над Землей',
    sub: 'По сравнению с самой планетой это вплотную к поверхности'
  },
  {
    line: 'CubeSX-HSE — запуск 22 марта 2021, Байконур',
    sub: 'Вес 3,5 кг, камера с линзами Френеля'
  },
  {
    line: 'CubeSX-HSE-2 — запуск 9 августа 2022, снова Байконур',
    sub: 'Следил за Арктикой и слушал суда на Северном морском пути'
  },
  {
    line: 'CubeSX-HSE-3 — запуск 27 июня 2023, уже с Восточного',
    sub: 'Снимает Землю и ловит сигналы судов. Расчетный срок работы — год'
  },
  {
    line: 'Первые два завершили свои миссии и сошли с орбиты',
    sub: ''   // the last line counts itself up — see tell()
  }
];

// What the reader gets on a narrow screen, where the story is one picture.
const POSTER = {
  line: 'Три спутника Вышки — с 2021 по 2023 год',
  sub: 'Миссии первых двух завершены, третий до сих пор на орбите'
};

export const meta = {
  id: 'space',
  title: 'А еще Вышка — просто космос!',
  // The subtitle is phrasing content — the shell puts it inside a <p>.
  subtitle: 'Вышка запустила уже <span class="space-mark">три своих спутника</span>. '
    + 'Миссии первых двух завершены, а третий до сих пор находится на низкой орбите',
  intro: true,
  // The empty Earth arrives with the block, then one satellite a beat, and
  // the last beat is left to the one still flying.
  steps: 5,
  opensOnStep: true
};

export function init(root) {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 860px)');

  const RAD = Math.PI / 180;
  const LAP_MS = 8000;          // one lap of a satellite
  const DAY_LAPS = 15;          // ... and this many of them to one turn of the Earth
  const ARRIVE_MS = 1700;       // a satellite drawing its own orbit on the way in
  const BURN_MS = 900;          // and the flash it goes out with

  // ---------- Markup ----------
  root.innerHTML = `
    <style>
      /* The only dark card on the page. The sky is painted by the card
         itself, so the canvas has nothing but the things in it to draw and
         the corners stay round. */
      .space-card {
        background: radial-gradient(120% 130% at 50% 34%,
                    var(--space-sky) 0%, var(--space-sky-edge) 100%);
      }

      /* What the block is about, picked out in the heading the way the page
         picks out a figure that matters. The heading is drawn by the shell,
         outside this body — these rules reach it all the same, and by the
         time the card is shown the block has long been built. */
      .space-mark {
        padding: 0.06em 0.26em;
        border-radius: 0.22em;
        background: var(--hse-blue);
        color: var(--card);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      /* Room for two lines is held from the start: the card underneath keeps
         its height, and the globe in it never has to be refitted mid-story. */
      .space-note {
        flex: none;
        min-height: 76px;
      }

      .space-note-line {
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text);
      }

      .space-note-sub {
        margin-top: 4px;
        font-size: 1.0625rem;
        color: var(--text-secondary);
        font-variant-numeric: tabular-nums;
      }

      @media (max-width: 860px) {
        .space-note { min-height: 0; }
        .space-note-line { font-size: 1.125rem; }
        .space-note-sub { font-size: 0.9375rem; }
      }
    </style>

    <div class="col-right">
      <div class="space-note">
        <div class="space-note-line" data-el="note"></div>
        <div class="space-note-sub" data-el="sub"></div>
      </div>
      <div class="canvas-card space-card">
        <div class="canvas-wrap" data-el="wrap"></div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const noteEl = $('note');
  const subEl = $('sub');
  const { canvas, ctx } = mountCanvas($('wrap'), () => paint());

  // Canvas needs plain strings, so the palette is read once from the tokens.
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const C = {
    star: token('--space-star'),
    ocean: token('--space-ocean'),
    land: token('--space-land'),
    ice: token('--space-ice'),
    air: token('--space-air'),
    orbit: token('--space-orbit'),
    orbitBack: token('--space-orbit-back'),
    sat: token('--space-sat'),
    panel: token('--space-sat-panel'),
    label: token('--space-label'),
    burn: token('--space-burn')
  };

  // ---------- The land ----------
  // Antarctica and Greenland go on as ice: at this size white caps read as
  // the poles, and green ones as a mistake.
  const area = (ring) => {
    let s = 0;
    for (let i = 0; i < ring.length; i += 2) {
      const j = (i + 2) % ring.length;
      s += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
    }
    return s / 2;
  };

  const reversed = (ring) => {
    const out = new Float64Array(ring.length);
    for (let i = 0, n = ring.length; i < n; i += 2) {
      out[n - 2 - i] = ring[i];
      out[n - 1 - i] = ring[i + 1];
    }
    return out;
  };

  const PIECES = LAND.map((rings) => {
    let lo = 90, hi = -90;
    for (let i = 1; i < rings[0].length; i += 2) {
      lo = Math.min(lo, rings[0][i]);
      hi = Math.max(hi, rings[0][i]);
    }
    // A lake inside a landmass is a hole, and a hole is only a hole to canvas
    // while it winds the other way round than the shore it sits in.
    const outer = Math.sign(area(rings[0]));
    const kept = rings.map((r, i) => (i && Math.sign(area(r)) === outer ? reversed(r) : r));
    return { rings: kept, ice: hi < -55 || (lo > 58 && hi > 78) };
  });

  // The ice caps are the same from every side, so they are written straight
  // in the coordinates of the view: a ring round the pole along one parallel.
  const capOf = (lat) => {
    const pts = [];
    for (let psi = -180; psi < 180; psi += 4) pts.push([psi, lat]);
    return pts;
  };
  const CAP_N = capOf(72);
  const CAP_S = capOf(-78);

  // ---------- Geometry ----------
  // The globe leans towards us, so the Arctic the satellites watch is in
  // sight rather than edge on at the top; and its axis leans in the picture
  // as well, the way it does in every drawing of the Earth.
  const LAT0 = 22;
  const cosL = Math.cos(LAT0 * RAD), sinL = Math.sin(LAT0 * RAD);
  const TILT = -0.2;
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const sinI = Math.sin(INCLINE * RAD), cosI = Math.cos(INCLINE * RAD);

  let W = 0, H = 0, CX = 0, CY = 0, R = 0, RO = 0, S = 1;
  let stars = null;

  function fit() {
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 520;
    if (w === W && h === H) return;
    W = w; H = h;
    CX = W / 2;
    CY = H / 2;
    R = Math.min(W, H) * 0.4;
    // True to scale the orbit runs eight per cent above the surface — a dozen
    // pixels here. Never closer than room enough to make out what is flying.
    RO = Math.max(R * (1 + ORBIT_KM / EARTH_KM), R + 20);
    S = Math.max(0.68, Math.min(1.25, R / 190));
    makeStars();
  }

  function makeStars() {
    // Always the same sky: the seed is the day the first one went up, so a
    // repaint never reshuffles it.
    let seed = 20210322;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const n = Math.round((W * H) / 8000);
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({ x: rnd() * W, y: rnd() * H, r: 0.4 + rnd() * 1.1, a: 0.2 + rnd() * 0.6 });
    }
  }

  // A point of the sphere: latitude, longitude as seen from here, radius.
  // `z` is what faces us — it is positive on the half of the world we see,
  // and zero exactly along the edge of the disc.
  function put(phi, psi, r) {
    const f = phi * RAD, l = psi * RAD;
    const cf = Math.cos(f), sf = Math.sin(f), cl = Math.cos(l);
    const X = r * cf * Math.sin(l);
    const Y = -r * (cosL * sf - sinL * cf * cl);
    return {
      x: CX + X * cosT - Y * sinT,
      y: CY + X * sinT + Y * cosT,
      z: sinL * sf + cosL * cf * cl
    };
  }

  // The same answer without the rest of the work: which side of the world a
  // point is on.
  function facingUs(phi, psi) {
    const f = phi * RAD, l = psi * RAD;
    return sinL * Math.sin(f) + cosL * Math.cos(f) * Math.cos(l);
  }

  const hidden = (p) => p.z < 0 && Math.hypot(p.x - CX, p.y - CY) < R;

  // ---------- Clipping a ring to the half of the world facing us ----------
  // Nothing here knows about the shape of the edge: a point is in if it faces
  // us, and where a stretch of coast crosses over, the crossing is found by
  // halving the step until it sits on the edge. A point found that way is
  // marked, and two marked points in a row mean the ring went round the back
  // — they are joined along the edge of the disc instead of across it.
  const wrap180 = (d) => d - Math.round(d / 360) * 360;

  function crossing(a, b) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 14; k++) {
      const t = (lo + hi) / 2;
      const psi = a[0] + (b[0] - a[0]) * t;
      const phi = a[1] + (b[1] - a[1]) * t;
      if (facingUs(phi, psi) >= 0) lo = t; else hi = t;
    }
    const t = (lo + hi) / 2;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, true];
  }

  function clipToFace(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const inA = facingUs(a[1], a[0]) >= 0;
      const inB = facingUs(b[1], b[0]) >= 0;
      if (inA) out.push(a);
      if (inA !== inB) out.push(inA ? crossing(a, b) : crossing(b, a));
    }
    return out;
  }

  // Every piece of one ring that shows, given how far the Earth has turned.
  function facing(ring, spin) {
    const n = ring.length / 2;
    const pts = new Array(n);
    // Longitudes relative to the middle of the disc, unwrapped so that a ring
    // crossing the date line stays in one piece, and then carried as a whole
    // to where the middle of it is on the screen.
    let psi = wrap180(ring[0] - spin);
    let lo = psi, hi = psi;
    pts[0] = [psi, ring[1]];
    for (let i = 1; i < n; i++) {
      psi += wrap180(ring[i * 2] - ring[i * 2 - 2]);
      lo = Math.min(lo, psi);
      hi = Math.max(hi, psi);
      pts[i] = [psi, ring[i * 2 + 1]];
    }
    const home = -Math.round((lo + hi) / 2 / 360) * 360;

    const out = [];
    // A ring can reach round the world — Antarctica does — so the turn before
    // and the turn after are tried as well.
    [-360, 0, 360].forEach((off) => {
      const shift = home + off;
      if (lo + shift > 180 || hi + shift < -180) return;
      const moved = shift ? pts.map((p) => [p[0] + shift, p[1]]) : pts;
      const cut = clipToFace(moved);
      if (cut.length > 2) out.push(cut);
    });
    return out;
  }

  // Traces a ring of the sphere, cutting every long edge into shorter ones so
  // that it follows the curve instead of stepping across it. The two ends of
  // a cut are joined along the edge of the disc, a little outside it — what
  // hangs over is taken off by the clip on the globe.
  function trace(pts, r) {
    const path = [];
    const angleOf = (p) => Math.atan2(p.y - CY, p.x - CX);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (a[2] && b[2]) {
        const pa = put(a[1], a[0], r), pb = put(b[1], b[0], r);
        const t0 = angleOf(pa);
        let d = angleOf(pb) - t0;
        d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;      // the short way round
        const n = Math.max(1, Math.ceil(Math.abs(d) / 0.12));
        for (let k = 0; k < n; k++) {
          const t = t0 + d * (k / n);
          path.push({ x: CX + Math.cos(t) * r * 1.3, y: CY + Math.sin(t) * r * 1.3 });
        }
        continue;
      }
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 4));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        path.push(put(a[1] + (b[1] - a[1]) * t, a[0] + (b[0] - a[0]) * t, r));
      }
    }
    path.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.closePath();
  }

  // ---------- Drawing ----------
  let dpr = 1;

  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(W * d), h = Math.round(H * d);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      dpr = d;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawStars() {
    ctx.fillStyle = C.star;
    stars.forEach((s) => {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawGlobe() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = C.ocean;
    ctx.fill();
    ctx.clip();

    ctx.fillStyle = C.ice;
    ctx.beginPath();
    [CAP_N, CAP_S].forEach((cap) => {
      const cut = clipToFace(cap);
      if (cut.length > 2) trace(cut, R);
    });
    ctx.fill();

    PIECES.forEach((piece) => {
      ctx.beginPath();
      let any = false;
      piece.rings.forEach((ring) => {
        facing(ring, spin).forEach((part) => { trace(part, R); any = true; });
      });
      if (!any) return;
      ctx.fillStyle = piece.ice ? C.ice : C.land;
      ctx.fill();
    });

    // A ball, not a disc: the light comes from up and to the left and the
    // edge falls away from it.
    const shade = ctx.createRadialGradient(CX - R * 0.3, CY - R * 0.32, R * 0.1,
                                           CX - R * 0.1, CY - R * 0.1, R * 1.26);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(0.62, 'rgba(0, 0, 0, 0.12)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = shade;
    ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    ctx.restore();

    // And a rim of air around it — a hair's breadth of one, or it would swamp
    // the orbits, which run just as close to the surface.
    const air = ctx.createRadialGradient(CX, CY, R * 0.965, CX, CY, R * 1.035);
    air.addColorStop(0, 'rgba(96, 170, 255, 0)');
    air.addColorStop(0.5, C.air);
    air.addColorStop(1, 'rgba(96, 170, 255, 0)');
    ctx.fillStyle = air;
    ctx.beginPath();
    ctx.arc(CX, CY, R * 1.035, 0, Math.PI * 2);
    ctx.fill();
  }

  // Where a satellite is along its orbit, u counted from the equator.
  function onOrbit(sat, u) {
    const phi = Math.asin(sinI * Math.sin(u)) / RAD;
    const psi = sat.node + Math.atan2(cosI * Math.sin(u), Math.cos(u)) / RAD;
    return put(phi, psi, RO);
  }

  function drawOrbit(sat, alpha) {
    // On the way in the ring is only as long as the satellite has flown.
    const span = Math.min(Math.PI * 2, sat.u - sat.uIn);
    const steps = 160;
    const front = new Path2D(), back = new Path2D();
    let was = null;
    for (let i = 0; i <= steps; i++) {
      const p = onOrbit(sat, sat.u - span * (1 - i / steps));
      const hid = hidden(p);
      const path = hid ? back : front;
      if (hid === was) path.lineTo(p.x, p.y); else path.moveTo(p.x, p.y);
      was = hid;
    }
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = C.orbitBack;
    ctx.stroke(back);
    ctx.strokeStyle = C.orbit;
    ctx.stroke(front);
    ctx.globalAlpha = 1;
  }

  // A cubesat of three blocks with its panels out, turned the way it flies.
  function drawBody(x, y, angle, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.panel;
    ctx.fillRect(-3.4 * S, -11.5 * S, 6.8 * S, 7.4 * S);
    ctx.fillRect(-3.4 * S, 4.1 * S, 6.8 * S, 7.4 * S);
    ctx.strokeStyle = 'rgba(12, 27, 51, 0.5)';
    ctx.lineWidth = Math.max(0.6, 0.8 * S);
    ctx.beginPath();
    ctx.moveTo(-3.4 * S, -7.8 * S); ctx.lineTo(3.4 * S, -7.8 * S);
    ctx.moveTo(-3.4 * S, 7.8 * S); ctx.lineTo(3.4 * S, 7.8 * S);
    ctx.stroke();
    ctx.fillStyle = C.sat;
    ctx.fillRect(-5.4 * S, -3.1 * S, 10.8 * S, 6.2 * S);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 1;
  }

  function drawLabel(sat, x, y, alpha) {
    if (R < 130) return;
    const d = Math.max(1, Math.hypot(x - CX, y - CY));
    const ux = (x - CX) / d, uy = (y - CY) / d;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.label;
    ctx.font = `600 ${Math.round(11 * S + 1)}px 'HSE Sans', sans-serif`;
    ctx.textAlign = ux >= 0 ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    // A name crosses the lit side of the planet as often as the sky, so it
    // carries its own bit of night with it.
    ctx.shadowColor = 'rgba(6, 14, 30, 0.9)';
    ctx.shadowBlur = 5;
    ctx.fillText(sat.name, x + ux * 17 * S, y + uy * 17 * S);
    ctx.fillText(sat.name, x + ux * 17 * S, y + uy * 17 * S);
    ctx.restore();
  }

  function drawFlare(x, y, p) {
    const r = (4 + 26 * p) * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, C.burn);
    g.addColorStop(1, 'rgba(255, 138, 61, 0)');
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function paint() {
    fit();
    resize();
    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawGlobe();

    SATS.forEach((sat) => {
      if (sat.born === null) return;
      const dying = sat.died === null ? 0 : Math.min(1, (clock - sat.died) / BURN_MS);
      if (dying >= 1) return;
      const p = onOrbit(sat, sat.u);
      const next = onOrbit(sat, sat.u + 0.02);
      // Behind the planet it is not taken away, only turned down: half the
      // lap is spent back there, and a satellite that vanished for four
      // seconds at a time would look like a fault.
      const away = hidden(p) ? 0.38 : 1;
      drawOrbit(sat, (1 - dying) * (sat.died === null ? 1 : 0.5));
      if (dying > 0) drawFlare(p.x, p.y, dying);
      drawBody(p.x, p.y, Math.atan2(next.y - p.y, next.x - p.x), away * (1 - dying));
      if (!dying) drawLabel(sat, p.x, p.y, hidden(p) ? 0.45 : 1);
    });
  }

  // ---------- Time ----------
  let clock = 0;
  let spin = 20;              // the Atlantic to start with, so both coasts show
  let raf = null;
  let last = 0;

  // A satellite draws its own orbit as it arrives, so it has a whole lap to
  // fly in the time of one long beat instead of the eight seconds a lap
  // takes. It sets off fast and settles into its own pace by the end of it:
  // the average of this over the arrival is exactly the lap.
  const rush = (p) => (p >= 1 ? 1 : 1 + 11 * (1 - p) * (1 - p));

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    clock += dt;
    spin -= (dt / (LAP_MS * DAY_LAPS)) * 360;
    SATS.forEach((sat) => {
      if (sat.born === null) return;
      const p = (clock - sat.born) / ARRIVE_MS;
      sat.u += (dt / LAP_MS) * Math.PI * 2 * rush(p);
    });
    if (counting) tell();
    paint();
    raf = requestAnimationFrame(frame);
  }

  function run(on) {
    if (still) { paint(); return; }
    if (on && raf === null) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    if (!on && raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  // Nothing turns while the block is off the screen.
  let near = false;
  const watch = new IntersectionObserver((rows) => {
    near = rows.some((row) => row.isIntersecting);
    run(near && started);
  }, { rootMargin: '200px 0px' });
  watch.observe(root.closest('.viz-section') || root);
  document.addEventListener('visibilitychange', () => run(near && started && !document.hidden));

  // ---------- The story ----------
  // Each of them sets off a little before the point of its own orbit that is
  // nearest to us, so the lap it draws on the way in starts in plain sight
  // and crosses the face of the planet rather than the back of it.
  const nearestU = (sat) => {
    let best = 0, top = -2;
    for (let u = 0; u < Math.PI * 2; u += 0.05) {
      const z = onOrbit(sat, u).z;
      if (z > top) { top = z; best = u; }
    }
    return best - 0.9;
  };

  SATS.forEach((sat) => {
    sat.born = null;
    sat.died = null;
    sat.start = nearestU(sat);
    sat.u = sat.start;
    sat.uIn = sat.start;
  });

  let started = false;
  let shown = -1;
  let counting = 0;

  // The closing line counts itself up: the laps and the kilometres arrive
  // together, the way the share does on the stadium.
  function tell() {
    const p = counting ? Math.min(1, (clock - counting) / 1600) : 1;
    const e = 1 - Math.pow(1 - p, 3);
    subEl.textContent = `Третий на орбите до сих пор — ${nf(Math.round(LAPS * e))} витков`
      + ` и ~${nf(Math.round(FLOWN_MLN * e))} млн км, почти пять расстояний до Солнца`;
    if (p >= 1) counting = 0;
  }

  function say(i) {
    counting = 0;
    if (narrow.matches) {
      noteEl.textContent = POSTER.line;
      subEl.textContent = POSTER.sub;
      return;
    }
    noteEl.textContent = STORY[i].line;
    if (i < STORY.length - 1) { subEl.textContent = STORY[i].sub; return; }
    counting = still ? 0 : clock;
    tell();
  }

  function step(i) {
    const jumped = i !== shown + 1 && shown !== -1;
    const instant = still || shown === -1 || jumped;
    // On a narrow screen the whole story is one picture, so all three stay.
    const last = i >= STORY.length - 1;
    const alive = narrow.matches && last;
    const count = narrow.matches ? SATS.length : Math.min(i, SATS.length);

    SATS.forEach((sat, k) => {
      const on = k < count;
      if (on && sat.born === null) {
        // Put there rather than flown in: each of them stands on the side of
        // its orbit that faces us, a little apart from the others, and its
        // ring is there whole from the first frame.
        if (instant) sat.u = sat.start + 0.9 + (k - 1) * 1.1;
        sat.born = instant ? clock - ARRIVE_MS : clock;
        sat.uIn = instant ? sat.u - Math.PI * 2 : sat.u;
      }
      if (!on) { sat.born = null; sat.died = null; }
      // The first two came down; the last beat is where the page says so.
      const dies = last && !alive && k < 2;
      if (dies && sat.died === null) sat.died = instant ? clock - BURN_MS : clock;
      if (!dies) sat.died = null;
    });

    shown = i;
    say(i);
    if (!started) { started = true; run(near); }
    if (still) paint();
  }

  paint();

  return {
    step,
    // A satellite drawing its own orbit takes longer than a beat, and the
    // closing figures count themselves up after that.
    span: (i) => (still || narrow.matches ? 0 : (i === STORY.length - 1 ? 2200 : ARRIVE_MS))
  };
}
