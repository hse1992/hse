// Three cubesats of HSE going round a turning Earth — the one dark card on
// the page.
//
// The picture keeps to the real proportions: a low orbit runs a few hundred
// kilometres over a globe 6371 km across, so the ring all but touches the
// planet. Only the satellites themselves are drawn larger than life — to
// scale they would be smaller than a pixel.

import { mountCanvas } from '../lib/ui.js';
import { loadMark } from '../lib/hse-mark.js';
import { CITIES } from '../data/hse.js';
import { LAND } from '../data/earth.js';
import { ORBIT_KM, INCLINE, SATELLITES } from '../data/satellites.js';

// ---------- The objects ----------
// What the satellites are — names, dates, the height and the lie of the orbit
// — comes from data/satellites.js, which the finale reads as well: it prints
// those figures along the edge of the picture taken here, and a figure kept in
// two places comes apart sooner or later. What belongs to the drawing rather
// than to the satellites stays here.
const EARTH_KM = 6371;   // the planet they go round

// Where the four campuses stand on the globe, degrees north and east. On a
// planet this size they come out a finger apart — which is the point: the
// whole university fits into one corner of one continent, and its satellites
// go round all of it.
const CITY_AT = {
  msk: [55.75, 37.62],
  spb: [59.94, 30.31],
  nn: [56.33, 44.00],
  perm: [58.01, 56.25]
};

// The middle of the four: the marks all stand the way the ground lies there,
// so that they stay parallel to one another.
const MIDDLE = Object.values(CITY_AT).reduce(
  (m, at, i, all) => [m[0] + at[0] / all.length, m[1] + at[1] / all.length], [0, 0]);

// Where each orbit crosses the equator — a matter of the drawing, not of the
// satellites: far enough apart that the three rings can be told from one
// another. In the order they went up.
const NODES = [-64, 2, 66];
const SATS = SATELLITES.map((sat, i) => ({ name: sat.name, node: NODES[i] }));

// What the last two beats say — the satellite hangs over the campuses under
// this line, and takes its picture under the same one.
const SEEN_FROM_ORBIT = 'Вышка такая большая, что ее можно увидеть только со спутника';

// One line per beat, and a quieter one under it.
const STORY = [
  {
    // The card above has just said it all — the Earth arrives without a word.
    line: '',
    sub: ''
  },
  {
    // The name and the date are the data's; how the launch site is said —
    // «снова», «уже с» — belongs to the sentence and stays here.
    line: `${SATELLITES[0].name} — запуск ${SATELLITES[0].launched}, ${SATELLITES[0].from}`,
    sub: 'Вес 3,5 кг, камера с линзами Френеля'
  },
  {
    line: `${SATELLITES[1].name} — запуск ${SATELLITES[1].launched}, снова ${SATELLITES[1].from}`,
    sub: 'Следил за Арктикой и слушал суда на Северном морском пути'
  },
  {
    line: `${SATELLITES[2].name} — запуск ${SATELLITES[2].launched}, уже с Восточного`,
    sub: 'Снимает Землю и ловит сигналы судов'
  },
  {
    line: 'Первые два завершили свои миссии и сошли с орбиты',
    sub: 'Третий на орбите до сих пор'
  },
  {
    line: SEEN_FROM_ORBIT,
    sub: ''
  },
  {
    // The line stays put while the picture is taken: there is nothing to read
    // in the time that takes, and a line that changed would only flicker.
    line: SEEN_FROM_ORBIT,
    sub: ''
  }
];

// The beat the first two come down on: after the empty Earth and one beat
// for each satellite. And the one after it, where the third turns its camera
// down to the Earth — the picture it takes is the flash the next block
// arrives in (meta.flash).
const BURN = SATS.length + 1;
const HOLD = BURN + 1;
const SHOT = HOLD + 1;

export const meta = {
  id: 'space',
  // The block opens on one sentence alone, and the card of the section comes
  // in over it a beat later — see the lead-in screen in lib/page.js.
  lead: {
    // The phrase goes and the card comes in its place in the one movement:
    // a beat with the card standing alone in the middle would show nothing
    // the beat before and the beat after do not.
    together: true,
    // Up rather than aside: the phrase is about reaching the orbit, so it
    // leaves the way the block goes — and the card rises from below with the
    // planet instead of sliding in from the side.
    exit: 'up',
    // Two lines by design, and the break is chosen rather than left to the
    // width of the window. Set inline, not from the stylesheet of the module:
    // the shell measures the lead-in to decide whether it fits, and it does
    // that before the block is built. Left to the stylesheet, the two lines
    // are measured as one long one, judged not to fit, and the whole screen
    // is set a quarter smaller than every other lead-in on the page.
    // The second line is picked out the way the page picks out what a screen
    // turns on: corporate blue behind it, the card colour on top. It hugs its
    // own words rather than running the width of the screen, hence fit-content.
    value: '<span style="display: block; white-space: normal">Вышка настолько большая,'
      + '<span style="display: block; width: fit-content; margin-top: 0.12em;'
      + ' padding: 0.06em 0.26em; border-radius: 0.22em;'
      + ' background: var(--hse-blue); color: var(--card)">что достает даже до орбиты</span>'
      + '</span>',
    text: ''
  },
  title: 'Вышка — просто космос!',
  // Phrasing content: the shell puts it inside a <p>.
  subtitle: 'Запустили уже <span class="space-mark">три своих спутника</span>',
  intro: true,
  // The empty Earth arrives with the block, then one satellite a beat, a
  // beat for the one still flying, and the last one for the picture it takes.
  steps: 7,
  opensOnStep: true,
  // The block ends on a photograph about to be taken, and the next one comes
  // in the flash of it — the shell draws the flash, see «Вспышка на стыке».
  flash: true
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
  // The last beat, all of it: the globe turns the campuses towards us while
  // the satellite comes round to the point of its orbit right over them, then
  // it turns its camera down, and then it takes the picture. One movement of
  // the wheel, one thing happening — and the flash of that picture is the
  // next beat, drawn by the shell (meta.flash).
  // Kept short: the flash of the picture follows in the same beat, so this
  // and the curtain after it are one stretch of time for the reader.
  const AIM_MS = 1800;
  const AIM_COME = 0.55;        // coming round is over by here
  const AIM_TURN = 0.85;        // and the camera is down by here
  // The point of the orbit right over the campuses lies well to the east of
  // the middle of the disc, and four marks standing there are seen almost
  // edge on. So the globe is turned a little past it: the campuses come round
  // towards the reader and can be made out, while the satellite still looks
  // down on them from inside the width of its own frame.
  const FACE = 18;              // degrees of that extra turn

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

      /* The heading does not fly in from the side. The shell walks a title
         card in from the right while the lead-in leaves, but here the two
         belong together: the heading comes up from below in the same movement
         as the planet under it, and arrives at its own size, in its own place.
         Hence the transform is taken over whole — the card's sideways travel
         and its scaling are both left out, so the width it is laid out at
         goes back to plain 100%. */
      @media (min-width: 861px) {
        .viz-intro.space-section .viz-header {
          width: 100%;
          transform: translateY(calc((1 - var(--intro-body, 1)) * 100vh));
          opacity: var(--intro-body, 1);
        }
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

      /* The globe can be held and turned with the mouse. */
      .space-card canvas {
        cursor: grab;
      }

      .space-card canvas.is-dragging {
        cursor: grabbing;
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

      .space-run { display: none; }

      @media (max-width: 860px) {
        .space-note-line { font-size: 1.125rem; }
        .space-note-sub { font-size: 0.9375rem; }

        /* Room for the longest of the lines, held from the start. The line
           and the globe under it are pinned to the top of a phone while the
           story goes by, and a line that grew by a row would push the globe
           down and pull it back up again mid-story. */
        .space-note { min-height: 104px; }

        /* On a phone the page scrolls instead of stepping, and the globe with
           its line is pinned to the top there. This is the travel that goes
           under them: a stretch for the empty Earth, one for each satellite
           going up, one for the two that came down, one for the last one
           turning its camera on the campuses, one for the picture. Without it
           the phone was handed all three at once and none of those lines was
           ever read. */
        .space-run {
          display: block;
          flex: none;
          height: 280dvh;
        }
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
    <div class="space-run" data-el="run" aria-hidden="true"></div>
  `;

  // The section itself, so the block can say how its own heading arrives.
  const host = root.closest('.viz-section');
  if (host) host.classList.add('space-section');

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const noteEl = $('note');
  const subEl = $('sub');
  // What the picture holds, for whoever is read to rather than shown: the
  // line under it tells the story beat by beat, so this says only the things
  // that are nowhere in words — the planet, the rings round it, and the marks
  // standing where the university does.
  const { canvas, ctx } = mountCanvas($('wrap'), () => paint(),
    'Земля из космоса, вокруг нее орбиты вышкинских спутников, '
    + 'а на ней значки Вышки в четырех городах');

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
    hse: token('--hse-blue'),
    burn: token('--space-burn')
  };

  // The mark of the university, for the four places it stands in. It is read
  // from the file, so it arrives a moment after everything else — until then
  // the globe simply goes without it.
  let mark = null;
  loadMark().then((got) => { mark = got; paint(); });

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
  //
  // The lean stays above 18 degrees: below that the edge of the northern ice
  // cap slips behind the limb, and a ring round the pole is the one shape
  // the clipping below cannot close — it floods the top of the globe white.
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

    // One copy, and only one. A ring that reaches round the world — Eurasia
    // does, from the date line to the date line — used to be tried a turn
    // earlier and a turn later as well, in case part of it showed from the
    // other side. But a turn of longitude is the same place on the globe, and
    // everything below reads longitude through a sine or a cosine, so those
    // copies came out exactly on top of this one. Drawn twice, they told the
    // fill that a lake inside the ring was land after all — and the Caspian
    // filled in with the rest of Eurasia while the Earth turned.
    const moved = home ? pts.map((p) => [p[0] + home, p[1]]) : pts;
    const cut = clipToFace(moved);
    return cut.length > 2 ? [cut] : [];
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

    // And the four campuses on it, stuck to the surface like transfers: each
    // one is drawn in the frame of the ground it lies on, so it turns with
    // the globe, flattens towards the edge and goes round with everything
    // else. The mark keeps the colours it wears everywhere on the page.
    if (mark) {
      const arc = Math.max(8, R * 0.06) / 2 / R;   // its radius, in surface radians
      const D = 0.4;                               // degrees, to read the lie of the ground
      // Which way east and north run on the screen — read once, in the middle
      // of the four, and used for all of them. The lie of the ground is a
      // little different in every place, and marks that each stood by their
      // own would read as a scatter; sharing it keeps their left edges
      // parallel, and they still lean and flatten together as the globe turns.
      const psi0 = MIDDLE[1] - spin;
      const p0 = put(MIDDLE[0], psi0, R);
      const e0 = put(MIDDLE[0], psi0 + D, R);
      const n0 = put(MIDDLE[0] + D, psi0, R);
      const kx = arc / (Math.cos(MIDDLE[0] * RAD) * D * RAD) / mark.r;
      const ky = arc / (D * RAD) / mark.r;
      // North is up on the ground and down in the file, hence the minus.
      const lie = [(e0.x - p0.x) * kx, (e0.y - p0.y) * kx,
                   -(n0.x - p0.x) * ky, -(n0.y - p0.y) * ky];

      CITIES.forEach((city) => {
        const at = CITY_AT[city.key];
        if (!at) return;
        const p = put(at[0], at[1] - spin, R);
        if (p.z <= 0) return;
        ctx.save();
        // Nothing pops in at the edge: a mark coming round fades in over the
        // last of its way.
        ctx.globalAlpha = Math.min(1, p.z / 0.14);
        ctx.transform(lie[0], lie[1], lie[2], lie[3], p.x, p.y);
        ctx.translate(-mark.cx, -mark.cy);
        ctx.fillStyle = C.hse;
        ctx.fill(mark.disc);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill(mark.mark);
        ctx.restore();
      });
    }

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
  function onOrbit(sat, u, r = RO) {
    const phi = Math.asin(sinI * Math.sin(u)) / RAD;
    const psi = sat.node + Math.atan2(cosI * Math.sin(u), Math.cos(u)) / RAD;
    return put(phi, psi, r);
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
  function drawBody(x, y, angle, alpha, lens = 0) {
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
    // The camera, in the end of the body that turns to the ground.
    if (lens > 0) {
      ctx.globalAlpha = alpha * lens;
      ctx.fillStyle = C.hse;
      ctx.beginPath();
      ctx.arc(5.4 * S, 0, 1.9 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // What the camera takes in: a narrow wedge from the lens down to the ground
  // right under it, and the patch of ground it falls on. Pale and low — a line
  // of sight, not a beam; the white of the picture itself belongs to the
  // flash. The patch lies flat on the planet, so it is squashed the way the
  // ground there is turned from us.
  function drawView(p, g, angle, a) {
    const lx = p.x + Math.cos(angle) * 5.4 * S, ly = p.y + Math.sin(angle) * 5.4 * S;
    // Wide enough to take in all four campuses at once — that is the picture
    // the whole block has been going towards.
    const half = Math.max(7 * S, R * 0.17);
    const dx = g.x - CX, dy = g.y - CY;
    const out = Math.hypot(dx, dy) || 1;
    const ux = dx / out, uy = dy / out;                  // away from the middle of the disc
    const tx = -uy, ty = ux;                             // along the limb
    const ra = half * Math.max(0.2, g.z), rb = half;     // the patch, squashed
    ctx.save();
    ctx.fillStyle = C.sat;
    // The wedge stands on that patch: its sides are the tangents from the lens
    // to the ellipse, so the light never reaches past the ground it lights.
    // Tangents are found in the space where the ellipse is a unit circle —
    // scaling is affine, so a tangent there is a tangent here.
    const ex = (lx - g.x), ey = (ly - g.y);
    const px = (ex * ux + ey * uy) / ra, py = (ex * tx + ey * ty) / rb;
    const far = Math.hypot(px, py);
    if (far > 1.02) {
      const mid = Math.atan2(py, px), spread = Math.acos(1 / far);
      ctx.globalAlpha = 0.3 * a;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      for (const side of [-1, 1]) {
        const w = mid + side * spread;
        const along = Math.cos(w) * ra, across = Math.sin(w) * rb;
        ctx.lineTo(g.x + ux * along + tx * across, g.y + uy * along + ty * across);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.5 * a;
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.beginPath();
    ctx.ellipse(0, 0, ra, rb, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A glint on the lens once it has settled: one small spark that comes up
  // and eases down to a steady point, the camera ready — the only light the
  // block itself makes.
  function drawGlint(p, angle, t) {
    const lx = p.x + Math.cos(angle) * 5.4 * S, ly = p.y + Math.sin(angle) * 5.4 * S;
    const k = Math.max(0, t) / 600;
    const size = (k < 1 ? 2 + 6 * Math.sin(Math.PI * k) : 2) * S;
    ctx.save();
    ctx.globalAlpha = k < 1 ? 0.6 + 0.4 * Math.sin(Math.PI * k) : 0.7;
    ctx.strokeStyle = C.sat;
    ctx.fillStyle = C.sat;
    ctx.lineWidth = Math.max(0.7, 0.8 * S);
    ctx.beginPath();
    ctx.moveTo(lx - size, ly); ctx.lineTo(lx + size, ly);
    ctx.moveTo(lx, ly - size); ctx.lineTo(lx, ly + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(lx, ly, 1.1 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
      // Flying, a cubesat points the way it goes. Taking a picture, it turns
      // the end with the camera in it down, to the middle of the planet.
      let angle = Math.atan2(next.y - p.y, next.x - p.x);
      let aimed = 0;
      // What the camera looks at. Flying, that is the ground right under it:
      // the same place on the orbit, brought down to the surface. Seen from
      // the front it can sit almost behind the satellite; then the camera
      // simply faces into the picture, the way the middle of the planet lies.
      // Taking its picture, it looks at the campuses instead — the globe is
      // turned a little past the point right over them so that the four marks
      // face the reader, and a camera that went on staring straight down would
      // leave them outside its own frame. A satellite that can be pointed is
      // how this is done for real, and the lean of the frame shows it.
      const under = sat.aim ? put(MIDDLE[0], MIDDLE[1] - spin, R)
        : onOrbit(sat, sat.u, R);
      if (sat.aim) {
        const q = (clock - sat.aim.t0 - AIM_MS * (AIM_COME - 0.05))
          / (AIM_MS * (AIM_TURN - AIM_COME + 0.05));
        aimed = q <= 0 ? 0 : q >= 1 ? 1 : 1 - Math.pow(1 - q, 3);
        const far = Math.hypot(under.x - p.x, under.y - p.y) > 3;
        let turn = (far ? Math.atan2(under.y - p.y, under.x - p.x)
          : Math.atan2(CY - p.y, CX - p.x)) - angle;
        turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
        angle += turn * aimed;
      }
      drawOrbit(sat, (1 - dying) * (sat.died === null ? 1 : 0.5));
      if (dying > 0) drawFlare(p.x, p.y, dying);
      // The frame brightens as the picture is taken.
      const taking = sat.shot === null ? 0 : Math.max(0, 1 - (clock - sat.shot) / 500);
      if (aimed > 0 && !hidden(p)) drawView(p, under, angle, aimed * (1 + taking));
      drawBody(p.x, p.y, angle, away * (1 - dying), aimed);
      if (sat.shot !== null && !hidden(p)) drawGlint(p, angle, clock - sat.shot);
      if (!dying) drawLabel(sat, p.x, p.y, hidden(p) ? 0.45 : 1);
    });
  }

  // ---------- Time ----------
  let clock = 0;
  let spin = 45;              // European Russia faces us to start with
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
    // While the reader holds the globe it stays where the hand puts it; let
    // go with a flick and it carries on that way, slowing into its own turn.
    if (frozen && !steer && !drag) {
      // Held over the campuses: no turn of its own. A flick of the hand still
      // carries and dies out, and then it stands still again.
      spin += fling * dt;
      fling *= Math.exp(-dt / 450);
      if (Math.abs(fling) < 1e-4) fling = 0;
    } else if (steer && !drag) {
      // Turned round to bring the campuses under the satellite, then left to
      // its own turn again.
      const p = Math.min(1, (clock - steer.t0) / (AIM_MS * AIM_COME));
      spin = steer.from + (steer.to - steer.from) * (1 - Math.pow(1 - p, 3));
      if (p >= 1) steer = null;
    } else if (!drag) {
      // `fling` is how fast the hand was changing the turn, sign and all, so
      // it carries on the same way: added, not taken away like the day's turn.
      spin += fling * dt - (dt / (LAP_MS * DAY_LAPS)) * 360;
      fling *= Math.exp(-dt / 450);
      if (Math.abs(fling) < 1e-4) fling = 0;
    }
    SATS.forEach((sat) => {
      if (sat.born === null) return;
      if (sat.aim) {
        // Round to the point over the campuses, and there it stops dead: the
        // globe stops with it, and the reader is left a still picture to read
        // the line over for as long as they like.
        const a = sat.aim;
        const p = Math.min(1, (clock - a.t0) / (AIM_MS * AIM_COME));
        sat.u = a.from + (a.to - a.from) * (1 - Math.pow(1 - p, 3));
        return;
      }
      const p = (clock - sat.born) / ARRIVE_MS;
      sat.u += (dt / LAP_MS) * Math.PI * 2 * rush(p);
    });
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

  // ---------- Turning it by hand ----------
  // Held with the left button, the globe turns about its own axis with the
  // mouse, and about nothing else: it is the Earth, not a ball, and it keeps
  // the lean it has in every picture of it. The orbits are not part of the
  // planet and stay where they are. The mouse only: on a touch screen the
  // same gesture scrolls the page, and taking it away would strand the
  // reader on this block.
  let drag = null;
  let steer = null;             // a turn the story asks for, see step()
  let frozen = false;           // ... and the stop it asks for after that
  let fling = 0;                // change of the turn per ms a flick leaves behind

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    e.preventDefault();
    drag = { x: e.clientX, t: performance.now(), v: 0 };
    fling = 0;
    steer = null;               // the hand wins over the story
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    // A point under the cursor moves with it: one radius of the globe
    // dragged is one radian of turn.
    const perPx = 180 / Math.PI / Math.max(1, R);
    const dx = e.clientX - drag.x;
    const now = performance.now();
    spin -= dx * perPx;
    const v = (-dx * perPx) / Math.max(1, now - drag.t);
    drag.v = drag.v * 0.6 + v * 0.4;
    drag.x = e.clientX;
    drag.t = now;
    if (raf === null) paint();
  });

  const letGo = (e) => {
    if (!drag) return;
    // A hand held still before letting go leaves nothing behind.
    const idle = performance.now() - drag.t;
    // Capped, so that even a hard flick carries the globe on by a sixth of a
    // turn or so rather than spinning the campuses out of sight.
    fling = still || idle > 80 ? 0 : Math.max(-0.15, Math.min(0.15, drag.v));
    drag = null;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);

  // Nothing turns while the block is off the screen.
  let near = false;
  const watch = new IntersectionObserver((rows) => {
    near = rows.some((row) => row.isIntersecting);
    run(near && started);
  }, { rootMargin: '200px 0px' });
  watch.observe(root.closest('.viz-section') || root);
  document.addEventListener('visibilitychange', () => run(near && started && !document.hidden));

  // Where a satellite stands when it is right over the campuses: the point of
  // its orbit at their latitude, on the half of the pass that goes north, and
  // the turn of the globe that brings them under it.
  const overhead = (sat) => {
    const u = Math.asin(Math.max(-1, Math.min(1, Math.sin(MIDDLE[0] * RAD) / sinI)));
    const psi = sat.node + Math.atan2(cosI * Math.sin(u), Math.cos(u)) / RAD;
    return { u, spin: MIDDLE[1] - psi + FACE };
  };

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
    sat.aim = null;
    sat.shot = null;
    sat.start = nearestU(sat);
    sat.u = sat.start;
    sat.uIn = sat.start;
  });

  let started = false;
  let shown = -1;

  function say(i) {
    noteEl.innerHTML = STORY[i].line;
    subEl.textContent = STORY[i].sub;
  }

  // The page opens this block: the reader has just come to it, by beats or
  // straight from the bar, and whatever has been going on here while they were
  // elsewhere starts over. The block is put together long before they get to
  // it, and the Earth has been turning all that while — set back, it meets them
  // with the side of it the university is on.
  function open() {
    spin = 45;
    steer = null;
    // A flick of the hand carries the globe on and dies out in half a second —
    // but only while the block is on the screen, and nothing turns here while
    // it is not. Left in, it would be waiting to go off when the reader came
    // back, and the globe would set off from under their hand.
    fling = 0;
    frozen = false;
    shown = -1;
    SATS.forEach((sat) => {
      sat.born = null;
      sat.died = null;
      sat.aim = null;
      sat.shot = null;
      sat.u = sat.start;
      sat.uIn = sat.start;
    });
    // On a phone the story is told by the scroll, and the reader can come back
    // to the middle of it: the run says where they are, and the block is put
    // back to that, not to the beginning of the story.
    if (narrow.matches) follow(true);
    paint();
  }

  function step(i) {
    const jumped = i !== shown + 1 && shown !== -1;
    const instant = still || shown === -1 || jumped;
    const last = i >= BURN;
    const count = Math.min(i, SATS.length);

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
      const dies = last && k < 2;
      if (dies && sat.died === null) sat.died = instant ? clock - BURN_MS : clock;
      if (!dies) sat.died = null;
      // The one still flying comes round to face us and takes its picture.
      const aims = on && i >= HOLD && k === SATS.length - 1;
      if (aims && !sat.aim) {
        // Wherever the globe and the satellite happen to be, both are brought
        // round: the campuses to face us, the satellite to the point of its
        // orbit right over them.
        const over = overhead(sat);
        const to = over.u + Math.PI * 2 * Math.ceil((sat.u - over.u) / (Math.PI * 2));
        const turn = over.spin + 360 * Math.round((spin - over.spin) / 360);
        if (instant) {
          sat.aim = { from: to, to, t0: clock - AIM_MS, extra: 0 };
          spin = turn;
          steer = null;
        } else {
          sat.aim = { from: sat.u, to, t0: clock, extra: 0 };
          steer = { from: spin, to: turn, t0: clock };
        }
      }
      if (!aims) { sat.aim = null; if (i < HOLD) steer = null; }
      // The picture is taken on the beat after that, and the flash it goes off
      // in belongs to the same beat — the shell draws that part.
      const shoots = aims && i >= SHOT;
      if (shoots && sat.shot === null) sat.shot = instant ? clock - 600 : clock;
      if (!shoots) sat.shot = null;
    });

    // From the beat it comes round over the campuses, the globe stops turning
    // on its own: the reader needs the picture still to read the line over it.
    frozen = i >= HOLD;

    shown = i;
    say(i);
    if (!started) { started = true; run(near); }
    if (still) paint();
  }

  // ---------- The story on a phone ----------
  // There the page is not read in beats: nothing calls step() but the shell,
  // once, with the last of them — so the block stood there with all three
  // satellites up and not one line of the story was ever read. The travel is
  // in the markup (see .space-run), and this walks it: every stretch of it is
  // one more step. Scrolling back takes the satellites down again, the way
  // going back a beat does.
  const runEl = $('run');
  const colEl = root.querySelector('.col-right');
  let told = -1;
  const LAST = meta.steps - 1;

  function follow(force) {
    // The picture is pinned to the top of the screen while the run goes by
    // under it — but only until the end of the run comes up to meet it, and
    // the last screenful of travel is the picture leaving. The story is told
    // over what is left, so that the picture it is taking is still there when
    // it takes it.
    const span = runEl.offsetHeight - colEl.offsetHeight;
    if (span <= 0) return;
    const gone = -runEl.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, gone / span));
    // The last stretch belongs to the picture being taken, and so does
    // everything past the end of the travel.
    const i = Math.min(LAST, Math.floor(p * (LAST + 1)));
    if (i === told && !force) return;
    told = i;
    step(i);
  }

  if (narrow.matches) {
    window.addEventListener('scroll', () => follow(), { passive: true });
    window.addEventListener('resize', () => follow());
    follow(true);
  }

  paint();

  return {
    // On a phone the run tells the story and the shell does not: its one call,
    // with the last step, would be the end of it before it had begun.
    step: narrow.matches ? () => {} : step,
    open,
    // A satellite drawing its own orbit takes longer than a beat, the two that
    // come down take their time burning up, and the last one takes its time
    // turning to the ground.
    span: (i) => {
      if (still || narrow.matches) return 0;
      // The two flares run 900ms; the rest is for the line under them. It was
      // 2200 while that line counted its laps up — with the counting gone,
      // holding the wheel that long would be holding it on a still picture.
      if (i === BURN) return 1400;
      if (i === HOLD) return AIM_MS;
      if (i === SHOT) return 600;
      return ARRIVE_MS;
    }
  };
}
