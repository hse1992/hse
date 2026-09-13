// The university as a town: every building of it on one map, with the rivers
// of its four campuses, three stations of its own and electric buses between.

import { mountCanvas } from '../lib/ui.js';

// Facts about the town itself — they live here, not in data/hse.js.
const BUILDINGS = 196;
const STATION_NAME = 'Вышкинская';

// The map is drawn in its own units. The town proper is CORE wide and tall and
// always fits the card; around it lies a belt of roads and woods, so a card of
// any shape shows a map to its very edges.
const CORE = { w: 1500, h: 940 };
const EXT = { x0: -560, y0: -460, x1: 2080, y1: 1400 };

// Rivers after the campus cities, widest first. They never meet: each crosses
// the map on its own.
const RIVERS = [
  { name: 'Волга', half: 34, pts: [[720, -500], [690, -180], [620, 0], [470, 60], [330, 130], [250, 230], [100, 200], [-100, 140], [-600, 100]] },
  { name: 'Кама', half: 27, pts: [[860, -500], [880, -220], [840, 0], [920, 110], [1080, 160], [1300, 175], [1520, 160], [2120, 230]] },
  { name: 'Нева', half: 21, pts: [[-600, 780], [-150, 800], [150, 760], [330, 820], [420, 940], [520, 1060], [600, 1440]] },
  { name: 'Москва', half: 14, pts: [[-600, 300], [-200, 280], [120, 350], [400, 450], [640, 540], [900, 570], [1160, 510], [1400, 560], [1680, 660], [2120, 700]] }
];

// The three stations, each by its river and with the sign of the metro of
// that river's city. A station goes to the nearest crossroads to `at` that is
// dry and open on all four sides.
const STATIONS = [
  { at: [1000, 430], icon: 'assets/metro-m.svg' },    // by the Moskva
  { at: [330, 690], icon: 'assets/metrospb.png' },    // by the Neva
  { at: [470, 190], icon: 'assets/MetroNN.svg' }      // by the Volga
];

// «Счастье не за горами», the letters on the embankment of the Kama in Perm,
// after assets/happiness.jpeg: a narrow heavy grotesque in capitals, square
// ends, rounded outer corners on the bowls, counters closed down to slits.
// Each letter is strokes on a grid 10 high; a point [x, y, r] rounds its
// corner by r.
const SLOGAN = 'СЧАСТЬЕ НЕ ЗА ГОРАМИ';
const STROKE = 2.2;
const IN = STROKE / 2;
const TRACKING = 0.9;             // gap between letters, in grid units
const glyph = (w, lines) => ({ w, lines: lines(w - IN, w) });
const GLYPHS = {
  'С': glyph(4.6, (R) => [[[R, 3.3], [R, IN, 1.2], [IN, IN, 1.2], [IN, 10 - IN, 1.2], [R, 10 - IN, 1.2], [R, 6.7]]]),
  'Ч': glyph(4.6, (R) => [[[IN, 0], [IN, 5.2, 1.2], [R, 5.2]], [[R, 0], [R, 10]]]),
  'А': glyph(5.6, (R, w) => [[[IN + 0.1, 10], [1.9, IN], [w - 1.9, IN], [R - 0.1, 10]], [[1.3, 6.6], [w - 1.3, 6.6]]]),
  'Т': glyph(4.8, (R, w) => [[[0, IN], [w, IN]], [[w / 2, 0], [w / 2, 10]]]),
  'Ь': glyph(4.6, (R) => [[[IN, 0], [IN, 10 - IN], [R, 10 - IN, 1.2], [R, 4.4, 1.2], [IN, 4.4]]]),
  'Е': glyph(4.0, (R, w) => [[[w, IN], [IN, IN], [IN, 10 - IN], [w, 10 - IN]], [[IN, 5], [w - 0.5, 5]]]),
  'Н': glyph(4.6, (R) => [[[IN, 0], [IN, 10]], [[R, 0], [R, 10]], [[IN, 5], [R, 5]]]),
  'З': glyph(4.6, (R) => [[[IN, 3.3], [IN, IN, 1.2], [R, IN, 1.2], [R, 10 - IN, 1.2], [IN, 10 - IN, 1.2], [IN, 6.7]], [[1.7, 5], [R, 5]]]),
  'Г': glyph(4.0, (R, w) => [[[IN, 10], [IN, IN], [w, IN]]]),
  'О': glyph(4.8, (R) => [[[IN, 5], [IN, IN, 1.2], [R, IN, 1.2], [R, 10 - IN, 1.2], [IN, 10 - IN, 1.2], [IN, 4.9]]]),
  'Р': glyph(4.6, (R) => [[[IN, 10], [IN, IN], [R, IN, 1.2], [R, 5.6, 1.2], [IN, 5.6]]]),
  'М': glyph(6.6, (R, w) => [[[IN, 10], [IN, IN], [w / 2, 7.4], [R, IN], [R, 10]]]),
  'И': glyph(4.8, (R) => [[[IN, 0], [IN, 10]], [[R, 0], [R, 10]], [[IN + 0.3, 8.6], [R - 0.3, 1.4]]]),
  ' ': { w: 1.6, lines: [] }
};

// Building kinds and how often each comes up.
const KINDS = {
  box: 16,
  slab: 9,
  ell: 12,
  u: 8,
  tee: 6,
  aitch: 4,
  court: 7,
  octa: 3,
  trap: 4,
  tower: 10,
  stagger: 5,
  comb: 4,
  chamfer: 4
};

const ROOF = 0.6;                 // how far up a roof is drawn, per unit of height
const SHADOW = [0.55, 0.3];       // where the shadow falls, per unit of height
const SIDEWALK = 7;               // from the edge of a road to a wall
const PLAZA = { w: 96, h: 58 };   // the square a station sign stands on
const LANE = 4.6;                 // bus lane, off the middle of the road
const BUS = { l: 24, w: 8.5 };
const SIZE = 1.15;                // all building footprints, scaled at once
const BUS_SPEED = 58;             // map units a second
const DWELL = 1.4;                // seconds at a stop
const LETTER = 26;                // height of the slogan letters, map units
const LEGS = 3;                   // the letters stand on legs above the bank

export const meta = {
  id: 'town',
  title: 'Практически целый город',
  subtitle: 'Если собрать все здания Вышки в одном месте, у нее будут свои реки, свое метро и свои электробусы'
};

// ---------- Geometry helpers ----------

// Seeded random numbers: the town is the same on every visit.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Catmull-Rom through the control points.
function smooth(pts, per) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n - 1)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

// A polyline with its running length, for walking along it.
function track(pts, closed) {
  const cum = [0];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { pts, cum, len: cum[cum.length - 1], closed };
}

// Point and heading at distance s along a track.
function pose(tr, s) {
  if (tr.closed) s = ((s % tr.len) + tr.len) % tr.len;
  else s = Math.max(0, Math.min(tr.len, s));
  let lo = 0, hi = tr.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tr.cum[mid] <= s) lo = mid; else hi = mid;
  }
  const a = tr.pts[lo], b = tr.pts[(lo + 1) % tr.pts.length];
  const seg = tr.cum[lo + 1] - tr.cum[lo] || 1;
  const t = (s - tr.cum[lo]) / seg;
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// Distance along a closed track to the point on it nearest to (x, y).
function nearestOn(tr, x, y) {
  let best = Infinity, at = 0;
  const n = tr.pts.length;
  for (let i = 0; i < n; i++) {
    const a = tr.pts[i], b = tr.pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
    if (d < best) { best = d; at = tr.cum[i] + (tr.cum[i + 1] - tr.cum[i]) * t; }
  }
  return at;
}

// Corners of a polygon rounded off, so a bus turns instead of spinning.
function rounded(corners, r) {
  const out = [];
  const n = corners.length;
  for (let k = 0; k < n; k++) {
    const p = corners[(k + n - 1) % n], c = corners[k], q = corners[(k + 1) % n];
    const li = Math.hypot(c[0] - p[0], c[1] - p[1]), lo = Math.hypot(q[0] - c[0], q[1] - c[1]);
    const pin = [c[0] - (c[0] - p[0]) / li * r, c[1] - (c[1] - p[1]) / li * r];
    const pout = [c[0] + (q[0] - c[0]) / lo * r, c[1] + (q[1] - c[1]) / lo * r];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6, u = 1 - t;
      out.push([u * u * pin[0] + 2 * u * t * c[0] + t * t * pout[0], u * u * pin[1] + 2 * u * t * c[1] + t * t * pout[1]]);
    }
  }
  return out;
}

// Distance from a point to a segment.
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}

// Strokes one letter of GLYPHS in its own grid units.
function strokeGlyph(g, lines) {
  for (const line of lines) {
    g.beginPath();
    g.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length - 1; i++) {
      const [x, y, r] = line[i];
      if (r) g.arcTo(x, y, line[i + 1][0], line[i + 1][1], r);
      else g.lineTo(x, y);
    }
    const end = line[line.length - 1];
    g.lineTo(end[0], end[1]);
    g.stroke();
  }
}

const circle = (cx, cy, r, n, turn = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

// ---------- Buildings ----------

// One building of the given kind: its outline rings (filled even-odd, so a
// courtyard is a hole), its footprint and its height, all in map units.
function makeBuilding(kind, rand) {
  const between = (a, b) => a + rand() * (b - a);
  let w, h, H, rings;
  switch (kind) {
    case 'box':
      w = between(22, 46); h = between(18, 38); H = between(5, 11);
      rings = [[[0, 0], [w, 0], [w, h], [0, h]]];
      break;
    case 'slab':
      w = between(58, 92); h = between(13, 19); H = between(6, 10);
      rings = [[[0, 0], [w, 0], [w, h], [0, h]]];
      break;
    case 'ell': {
      w = between(36, 58); h = between(32, 52); H = between(5, 10);
      const t = between(12, 17);
      rings = [[[0, 0], [t, 0], [t, h - t], [w, h - t], [w, h], [0, h]]];
      break;
    }
    case 'u': {
      w = between(44, 66); h = between(34, 48); H = between(5, 9);
      const t = between(12, 15);
      rings = [[[0, 0], [t, 0], [t, h - t], [w - t, h - t], [w - t, 0], [w, 0], [w, h], [0, h]]];
      break;
    }
    case 'tee': {
      w = between(40, 60); h = between(34, 48); H = between(6, 11);
      const t = between(12, 17), a = (w - t) / 2, b = (w + t) / 2;
      rings = [[[0, 0], [w, 0], [w, t], [b, t], [b, h], [a, h], [a, t], [0, t]]];
      break;
    }
    case 'aitch': {
      w = between(40, 58); h = between(40, 54); H = between(5, 9);
      const t = between(12, 15), a = (h - t) / 2, b = (h + t) / 2;
      rings = [[[0, 0], [t, 0], [t, a], [w - t, a], [w - t, 0], [w, 0], [w, h], [w - t, h], [w - t, b], [t, b], [t, h], [0, h]]];
      break;
    }
    case 'court': {
      w = between(46, 70); h = between(42, 62); H = between(6, 10);
      const t = between(11, 14);
      rings = [[[0, 0], [w, 0], [w, h], [0, h]], [[t, t], [w - t, t], [w - t, h - t], [t, h - t]]];
      break;
    }
    case 'octa': {
      w = h = between(26, 42); H = between(7, 14);
      rings = [circle(w / 2, w / 2, w / 2, 8, Math.PI / 8)];
      break;
    }
    case 'trap': {
      w = between(34, 54); h = between(22, 34); H = between(5, 10);
      const c = w * between(0.14, 0.24);
      rings = [[[0, h], [w, h], [w - c, 0], [c, 0]]];
      break;
    }
    case 'stagger': {
      // two blocks set off from each other
      w = between(44, 64); h = between(36, 52); H = between(6, 11);
      const p = w * 0.62, q = h * 0.38, r = w * 0.38, t = h * 0.62;
      rings = [[[0, 0], [p, 0], [p, q], [w, q], [w, h], [r, h], [r, t], [0, t]]];
      break;
    }
    case 'comb': {
      w = between(50, 70); h = between(34, 46); H = between(5, 9);
      const t = between(11, 13), m = (w - t) / 2;
      rings = [[[0, 0], [t, 0], [t, h - t], [m, h - t], [m, 0], [m + t, 0], [m + t, h - t], [w - t, h - t], [w - t, 0], [w, 0], [w, h], [0, h]]];
      break;
    }
    case 'chamfer': {
      w = between(30, 50); h = between(26, 42); H = between(7, 13);
      const c = Math.min(w, h) * between(0.16, 0.24);
      rings = [[[c, 0], [w - c, 0], [w, c], [w, h - c], [w - c, h], [c, h], [0, h - c], [0, c]]];
      break;
    }
    default: // tower
      w = between(14, 22); h = w * between(0.9, 1.2); H = between(16, 24);
      rings = [[[0, 0], [w, 0], [w, h], [0, h]]];
  }

  // Any side may face the street: mirror and turn at random.
  const fx = rand() < 0.5, fy = rand() < 0.5, turn = rand() < 0.5;
  rings = rings.map((ring) => ring.map(([x, y]) => {
    if (fx) x = w - x;
    if (fy) y = h - y;
    return turn ? [y * SIZE, x * SIZE] : [x * SIZE, y * SIZE];
  }));
  if (turn) [w, h] = [h, w];
  return { kind, w: w * SIZE, h: h * SIZE, H, rings };
}

// ---------- The town ----------

function buildTown() {
  const rand = seeded(1992);
  const between = (a, b) => a + rand() * (b - a);

  // Rivers, and how far every spot of the map is from water: negative in it.
  const rivers = RIVERS.map((r) => ({ ...r, line: smooth(r.pts, 12) }));
  const CELL = 5, REACH = 70;
  const cols = Math.ceil((EXT.x1 - EXT.x0) / CELL) + 1;
  const rows = Math.ceil((EXT.y1 - EXT.y0) / CELL) + 1;
  const field = new Float32Array(cols * rows).fill(999);
  for (const r of rivers) {
    for (let i = 0; i < r.line.length - 1; i++) {
      const [ax, ay] = r.line[i], [bx, by] = r.line[i + 1];
      const pad = r.half + REACH;
      const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad - EXT.x0) / CELL));
      const c1 = Math.min(cols - 1, Math.ceil((Math.max(ax, bx) + pad - EXT.x0) / CELL));
      const r0 = Math.max(0, Math.floor((Math.min(ay, by) - pad - EXT.y0) / CELL));
      const r1 = Math.min(rows - 1, Math.ceil((Math.max(ay, by) + pad - EXT.y0) / CELL));
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
      for (let rr = r0; rr <= r1; rr++) {
        const py = EXT.y0 + rr * CELL;
        for (let cc = c0; cc <= c1; cc++) {
          const px = EXT.x0 + cc * CELL;
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
          const d = Math.hypot(px - ax - t * dx, py - ay - t * dy) - r.half;
          const idx = rr * cols + cc;
          if (d < field[idx]) field[idx] = d;
        }
      }
    }
  }
  const clearAt = (x, y) => {
    const c = Math.round((x - EXT.x0) / CELL), r = Math.round((y - EXT.y0) / CELL);
    return c < 0 || r < 0 || c >= cols || r >= rows ? 999 : field[r * cols + c];
  };
  const clearIn = (x0, y0, x1, y1) => {
    let m = 999;
    const c0 = Math.max(0, Math.floor((x0 - EXT.x0) / CELL)), c1 = Math.min(cols - 1, Math.ceil((x1 - EXT.x0) / CELL));
    const r0 = Math.max(0, Math.floor((y0 - EXT.y0) / CELL)), r1 = Math.min(rows - 1, Math.ceil((y1 - EXT.y0) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) m = Math.min(m, field[r * cols + c]);
    return m;
  };

  // Streets: an uneven grid, a third of them avenues.
  const xs = [], wx = [], ys = [], wy = [];
  for (let x = EXT.x0 + 30; x < EXT.x1 - 30; x += between(130, 178)) { xs.push(x); wx.push(rand() < 0.3 ? 26 : 18); }
  for (let y = EXT.y0 + 30; y < EXT.y1 - 30; y += between(120, 165)) { ys.push(y); wy.push(rand() < 0.3 ? 26 : 18); }
  const nx = xs.length, ny = ys.length;

  // A stretch of street between two crossroads survives if it stays dry or
  // crosses water cleanly — then it gets a bridge. One that runs along a river
  // is dropped.
  const dry = (i, j) => clearAt(xs[i], ys[j]) > 18;
  function street(ax, ay, bx, by, width) {
    const len = Math.hypot(bx - ax, by - ay), n = Math.ceil(len / 3);
    const runs = [];
    let start = -1;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const wet = clearAt(ax + (bx - ax) * t, ay + (by - ay) * t) < width / 2 + 1;
      if (wet && start < 0) start = k;
      if (!wet && start >= 0) { runs.push([start, k - 1]); start = -1; }
    }
    if (start >= 0) runs.push([start, n]);
    if (runs.length > 2 || runs.some(([a, b]) => a === 0 || b === n)) return null;
    const bridges = runs.map(([a, b]) => [(a / n) * len - 9, (b / n) * len + 9]);
    if (bridges.some(([a, b]) => b - a > 150)) return null;
    return { ax, ay, bx, by, width, len, bridges };
  }
  const streets = new Map();
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (i < nx - 1 && dry(i, j) && dry(i + 1, j)) {
        const s = street(xs[i], ys[j], xs[i + 1], ys[j], wy[j]);
        if (s) streets.set(`h${i},${j}`, s);
      }
      if (j < ny - 1 && dry(i, j) && dry(i, j + 1)) {
        const s = street(xs[i], ys[j], xs[i], ys[j + 1], wx[i]);
        if (s) streets.set(`v${i},${j}`, s);
      }
    }
  }

  // The slogan stands on the south bank of the Kama with the river behind it,
  // as on the embankment in Perm: on the straightest stretch in view, where
  // it takes the fewest streets away. Streets it touches give way to it.
  const kama = rivers.find((r) => r.name === 'Кама');
  const bank = track(kama.line.map((pt, i, L) => {
    const a = L[Math.max(i - 1, 0)], b = L[Math.min(i + 1, L.length - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [pt[0] - (dy / d) * (kama.half + 3), pt[1] + (dx / d) * (kama.half + 3)];
  }), false);
  const chars = [...SLOGAN];
  const scale = LETTER / 10;
  const length = (chars.reduce((n, ch) => n + GLYPHS[ch].w, 0) + TRACKING * (chars.length - 1)) * scale;
  let from = -1, fromScore = Infinity;
  for (let s0 = 0; s0 + length < bank.len; s0 += 8) {
    let score = 0, prev = null, fits = true;
    for (let q = 0; q <= length && fits; q += 8) {
      const pt = pose(bank, s0 + q);
      if (Math.abs(pt.a) > 0.6 || pt.x < 30 || pt.x > CORE.w - 30 || pt.y - LEGS - LETTER < 20 || pt.y > CORE.h - 30) { fits = false; break; }
      if (prev !== null) score += Math.abs(pt.a - prev) * 200;
      prev = pt.a;
      for (const h of [0, LEGS + LETTER / 2]) {
        const x = pt.x + Math.sin(pt.a) * h, y = pt.y - Math.cos(pt.a) * h;
        for (const st of streets.values()) if (segDist(x, y, st.ax, st.ay, st.bx, st.by) < st.width / 2 + 6) score += 3;
      }
    }
    if (fits && score < fromScore) { fromScore = score; from = s0; }
  }
  const letters = [];
  if (from < 0) console.warn('town: no room for the slogan on the Kama');
  if (from >= 0) {
    let x = 0;
    for (const ch of chars) {
      const w = GLYPHS[ch].w;
      if (ch !== ' ') {
        const pt = pose(bank, from + (x + w / 2) * scale);
        letters.push({ ch, x: pt.x, y: pt.y, a: pt.a });
      }
      x += w + TRACKING;
    }
    for (const [key, st] of streets) {
      const under = letters.some((l) => [0, LEGS + LETTER / 2, LEGS + LETTER].some((h) =>
        segDist(l.x + Math.sin(l.a) * h, l.y - Math.cos(l.a) * h, st.ax, st.ay, st.bx, st.by) < st.width / 2 + 8));
      if (under) streets.delete(key);
    }
  }

  // Stations on crossroads open on all four sides.
  const open = (i, j) => i > 0 && j > 0 && streets.has(`h${i},${j}`) && streets.has(`h${i - 1},${j}`)
    && streets.has(`v${i},${j}`) && streets.has(`v${i},${j - 1}`);
  const stations = STATIONS.map(({ at: [tx, ty], icon }) => {
    let best = null, bd = Infinity;
    for (let i = 1; i < nx - 1; i++) {
      for (let j = 1; j < ny - 1; j++) {
        const x = xs[i], y = ys[j];
        if (x < 120 || x > CORE.w - 120 || y < 110 || y > CORE.h - 110) continue;
        if (!open(i, j) || clearAt(x, y) < 60) continue;
        const d = Math.hypot(x - tx, y - ty);
        if (d < bd) { bd = d; best = { i, j, x, y, icon }; }
      }
    }
    return best;
  }).filter(Boolean);

  // A station's sign does not stand on the crossroads itself but on a small
  // square in the corner of one of its four blocks — the one nearest the
  // river. The square is kept free of buildings.
  for (const st of stations) {
    let best = null;
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const cx = st.x + dx * (wx[st.i] / 2 + 3), cy = st.y + dy * (wy[st.j] / 2 + 3);
      const x0 = dx > 0 ? cx : cx - PLAZA.w, y0 = dy > 0 ? cy : cy - PLAZA.h;
      const plaza = { x0, y0, x1: x0 + PLAZA.w, y1: y0 + PLAZA.h };
      const dry = clearIn(plaza.x0, plaza.y0, plaza.x1, plaza.y1);
      if (dry < 10) continue;
      if (!best || dry < best.dry) best = { dx, dy, cx, cy, plaza, dry };
    }
    Object.assign(st, best);
  }

  // Blocks between the streets. Those inside the town take buildings, a few
  // become parks, and the ones outside it are woods.
  const blocks = [];
  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < ny - 1; j++) {
      const b = {
        x0: xs[i] + wx[i] / 2, x1: xs[i + 1] - wx[i + 1] / 2,
        y0: ys[j] + wy[j] / 2, y1: ys[j + 1] - wy[j + 1] / 2,
        park: false, room: null
      };
      const M = 16;
      const room = {
        x0: Math.max(b.x0 + SIDEWALK, M), x1: Math.min(b.x1 - SIDEWALK, CORE.w - M),
        y0: Math.max(b.y0 + SIDEWALK, M), y1: Math.min(b.y1 - SIDEWALK, CORE.h - M)
      };
      if (room.x1 - room.x0 > 30 && room.y1 - room.y0 > 30) {
        const nearStation = stations.some((s) => s.x > b.x0 - 60 && s.x < b.x1 + 60 && s.y > b.y0 - 60 && s.y < b.y1 + 60);
        if (!nearStation && rand() < 0.1) b.park = true;
        else b.room = room;
      }
      blocks.push(b);
    }
  }

  // Buildings, packed block by block until there are exactly BUILDINGS of them.
  const kinds = Object.keys(KINDS);
  const total = kinds.reduce((n, k) => n + KINDS[k], 0);
  const pickKind = () => {
    let r = rand() * total;
    for (const k of kinds) if ((r -= KINDS[k]) < 0) return k;
    return 'box';
  };
  const rooms = blocks.filter((b) => b.room);
  const areas = rooms.map((b) => (b.room.x1 - b.room.x0) * (b.room.y1 - b.room.y0));
  const areaSum = areas.reduce((a, b) => a + b, 0);
  const placed = new Map(rooms.map((b) => [b, []]));
  const buildings = [];
  const PAD = 7;
  for (let attempt = 0; attempt < 60000 && buildings.length < BUILDINGS; attempt++) {
    let r = rand() * areaSum, bi = 0;
    while ((r -= areas[bi]) > 0 && bi < rooms.length - 1) bi++;
    const block = rooms[bi], room = block.room;
    const b = makeBuilding(pickKind(), rand);
    const top = b.H * ROOF;
    const spanX = room.x1 - room.x0 - b.w, spanY = room.y1 - room.y0 - b.h - top;
    if (spanX < 0 || spanY < 0) continue;
    // Most buildings keep to the street line; the rest stand inside the block.
    let x = room.x0 + rand() * spanX, y = room.y0 + top + rand() * spanY;
    const snap = rand();
    if (snap < 0.3) x = rand() < 0.5 ? room.x0 : room.x0 + spanX;
    else if (snap < 0.6) y = rand() < 0.5 ? room.y0 + top : room.y0 + top + spanY;
    const box = { x0: x, y0: y - top, x1: x + b.w, y1: y + b.h };
    if (clearIn(box.x0, box.y0, box.x1, box.y1) < 6) continue;
    if (letters.some((l) => l.x > box.x0 - 18 && l.x < box.x1 + 18 && l.y > box.y0 - 14 && l.y < box.y1 + 14)) continue;
    if (stations.some(({ plaza: q }) => box.x0 < q.x1 + 8 && box.x1 > q.x0 - 8 && box.y0 < q.y1 + 8 && box.y1 > q.y0 - 8)) continue;
    const mine = placed.get(block);
    if (mine.some((o) => box.x0 < o.x1 + PAD && box.x1 > o.x0 - PAD && box.y0 < o.y1 + PAD && box.y1 > o.y0 - PAD)) continue;
    mine.push(box);
    const t = rand();
    Object.assign(b, { x, y, box, tone: t < 0.45 ? 0 : t < 0.8 ? 1 : 2 });
    buildings.push(b);
  }
  if (buildings.length !== BUILDINGS) console.warn(`town: ${buildings.length} buildings placed of ${BUILDINGS}`);
  // Drawn back to front.
  const drawOrder = [...buildings].sort((a, b) => a.box.y1 - b.box.y1);

  // Trees: thick in parks, thinner in the woods around the town.
  const trees = [];
  for (const b of blocks) {
    const inside = b.x1 > 0 && b.x0 < CORE.w && b.y1 > 0 && b.y0 < CORE.h;
    if (b.room && inside) continue;
    const step = b.park ? 13 : 24;
    for (let y = b.y0 + 8; y < b.y1 - 6; y += step) {
      for (let x = b.x0 + 8; x < b.x1 - 6; x += step) {
        if (!b.park && rand() < 0.45) continue;
        const px = x + between(-4, 4), py = y + between(-4, 4), r = between(3.5, 6.5);
        if (!b.park && px > -10 && px < CORE.w + 10 && py > -10 && py < CORE.h + 10) continue;
        if (clearAt(px, py) < r + 3) continue;
        trees.push({ x: px, y: py, r, dark: rand() < 0.35 });
      }
    }
  }

  // The metro line runs under the town through all three stations.
  const byX = [...stations].sort((a, b) => a.x - b.x);
  const metro = byX.length ? smooth([
    [byX[0].x - 900, byX[0].y + 260], ...byX.map((s) => [(s.plaza.x0 + s.plaza.x1) / 2, (s.plaza.y0 + s.plaza.y1) / 2]), [byX[byX.length - 1].x + 900, byX[byX.length - 1].y - 200]
  ], 16) : [];

  // Bus routes. Each is a loop between two ends: the shortest way there and
  // the shortest way back along other streets, so buses cross the rivers by
  // the bridges. Every pair of stations is linked, then a few more ends out
  // in the quarters without a station.
  const near = (x, y) => Math.max(-40, Math.min(CORE.w + 40, x)) === x && Math.max(-40, Math.min(CORE.h + 40, y)) === y;
  const links = (i, j) => [[`h${i},${j}`, i + 1, j], [`h${i - 1},${j}`, i - 1, j], [`v${i},${j}`, i, j + 1], [`v${i},${j - 1}`, i, j - 1]]
    .filter(([key, a, b]) => streets.has(key) && near(xs[a], ys[b]));
  const nodeAt = ([tx, ty]) => {
    let best = null, bd = Infinity;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      if (!near(xs[i], ys[j]) || links(i, j).length < 3) continue;
      const d = Math.hypot(xs[i] - tx, ys[j] - ty);
      if (d < bd) { bd = d; best = [i, j]; }
    }
    return best;
  };
  function shortest(from, to, cost) {
    const N = nx * ny, id = (i, j) => j * nx + i;
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    dist[id(...from)] = 0;
    for (;;) {
      let u = -1;
      for (let v = 0; v < N; v++) if (!done[v] && dist[v] < Infinity && (u < 0 || dist[v] < dist[u])) u = v;
      if (u < 0) return null;
      if (u === id(...to)) break;
      done[u] = 1;
      const i = u % nx, j = (u - i) / nx;
      for (const [key, a, b] of links(i, j)) {
        const v = id(a, b), d = dist[u] + cost(key);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      }
    }
    const nodes = [];
    for (let v = id(...to); v >= 0; v = prev[v]) nodes.unshift([v % nx, Math.floor(v / nx)]);
    return nodes;
  }
  const keyOf = ([i, j], [a, b]) => (j === b ? `h${Math.min(i, a)},${j}` : `v${i},${Math.min(j, b)}`);

  const busy = new Set();
  const ends = [
    ...[[0, 1], [1, 2], [0, 2]].filter(([a, b]) => stations[a] && stations[b])
      .map(([a, b]) => [[stations[a].i, stations[a].j], [stations[b].i, stations[b].j]]),
    ...[[[60, 80], [420, 900]], [[1440, 80], [960, 420]], [[60, 620], [760, 640]], [[860, 920], [1440, 480]]]
      .map(([a, b]) => [nodeAt(a), nodeAt(b)])
  ];

  const routes = [];
  ends.forEach(([a, b]) => {
    if (!a || !b || (a[0] === b[0] && a[1] === b[1])) return;
    const base = (key) => streets.get(key).len * (busy.has(key) ? 2.5 : 1);
    const there = shortest(a, b, base);
    if (!there) return;
    const used = new Set();
    for (let k = 1; k < there.length; k++) used.add(keyOf(there[k - 1], there[k]));
    const back = shortest(b, a, (key) => base(key) * (used.has(key) ? 40 : 1));
    if (!back) return;
    const nodes = [...there.slice(0, -1), ...back.slice(0, -1)];
    const n = nodes.length;
    const pts = nodes.map(([i, j]) => [xs[i], ys[j]]);
    // Corners only, each moved into the right-hand lane of both its streets.
    const corners = [];
    let uturn = false;
    for (let k = 0; k < n; k++) {
      const p = pts[(k + n - 1) % n], c = pts[k], q = pts[(k + 1) % n];
      const ix = Math.sign(c[0] - p[0]), iy = Math.sign(c[1] - p[1]);
      const ox = Math.sign(q[0] - c[0]), oy = Math.sign(q[1] - c[1]);
      if (ix === ox && iy === oy) continue;
      if (ix === -ox && iy === -oy) { uturn = true; break; }
      corners.push([c[0] + (-iy - oy) * LANE, c[1] + (ix + ox) * LANE]);
    }
    if (uturn || corners.length < 4) return;
    for (let k = 1; k < n; k++) busy.add(keyOf(nodes[k - 1], nodes[k]));
    busy.add(keyOf(nodes[n - 1], nodes[0]));
    const path = track(rounded(corners, 10), true);
    const served = stations.filter((s) => nodes.some(([i, j]) => i === s.i && j === s.j));
    let stops = served.map((s) => nearestOn(path, s.x, s.y) - 30);
    if (stops.length === 1) stops.push(stops[0] + path.len / 2);
    if (!stops.length) stops = [path.len * 0.25, path.len * 0.75];
    stops = stops.map((s) => ((s % path.len) + path.len) % path.len).sort((p, q) => p - q);
    routes.push({ path, stops });
  });

  const buses = [];
  for (const route of routes) {
    const n = Math.max(2, Math.round(route.path.len / 520));
    for (let k = 0; k < n; k++) buses.push({ route, s: (route.path.len * k) / n + 13, speed: BUS_SPEED, wait: 0 });
  }

  return { rivers, streets: [...streets.values()], letters, blocks, stations, buildings, drawOrder, trees, metro, routes, buses };
}

// ---------- Module ----------

export function init(root) {
  'use strict';

  const town = buildTown();

  // Canvas has no CSS variables: read the tokens once.
  const css = getComputedStyle(root);
  const tok = (name) => css.getPropertyValue(name).trim();
  const C = {
    land: tok('--city-land'), block: tok('--city-block'), park: tok('--city-park'),
    tree: tok('--city-tree'), treeDark: tok('--city-tree-dark'),
    road: tok('--city-road'), roadEdge: tok('--city-road-edge'), bridge: tok('--city-bridge'),
    water: tok('--city-water'), waterEdge: tok('--city-water-edge'), waterLabel: tok('--city-water-label'),
    plaza: tok('--city-plaza'), metroLine: tok('--city-metro-line'),
    shadow: tok('--city-shadow'), halo: tok('--city-halo'), text: tok('--text'),
    card: tok('--card'),
    slogan: tok('--city-slogan'), sloganSide: tok('--city-slogan-side'),
    busBody: tok('--ebus-body'), busRoof: tok('--ebus-wave'), busGlass: tok('--ebus-glass'), busLight: tok('--ebus-light')
  };
  const TONES = [
    { roof: tok('--city-roof-cool'), wall: tok('--city-wall-cool') },
    { roof: tok('--city-roof-light'), wall: tok('--city-wall-light') },
    { roof: tok('--city-roof-warm'), wall: tok('--city-wall-warm') }
  ];
  const FONT = '"HSE Sans", -apple-system, Helvetica, sans-serif';

  // Paths, built once in map units.
  for (const b of town.buildings) {
    b.path = new Path2D();
    for (const ring of b.rings) {
      b.path.moveTo(ring[0][0], ring[0][1]);
      for (let i = 1; i < ring.length; i++) b.path.lineTo(ring[i][0], ring[i][1]);
      b.path.closePath();
    }
  }
  const linePath = (pts, closed) => {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    if (closed) p.closePath();
    return p;
  };
  for (const r of town.rivers) r.path = linePath(r.line);
  const metroPath = linePath(town.metro);

  // ---------- Markup ----------
  // The town alone, in the middle of the section and in the proportions of
  // the map, so it shows the town and not the woods around it.
  root.innerHTML = `
    <style>
      .town-stage {
        flex: 1;
        min-width: 0;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        container-type: size;
      }
      .town-map {
        flex: none;
        width: min(100cqw, 100cqh * 1.6);
        height: min(100cqh, 100cqw / 1.6);
      }
      @media (max-width: 860px) {
        .town-stage { container-type: normal; }
        .town-map { width: 100%; height: auto; aspect-ratio: 1.6; }
      }
    </style>
    <div class="town-stage">
      <div class="canvas-card town-map">
        <div class="canvas-wrap" data-el="wrap"></div>
      </div>
    </div>
  `;

  const wrap = root.querySelector('[data-el="wrap"]');

  // Station signs: the metro letter of each river's city. The names are
  // painted again once a sign has loaded.
  const signs = new Map();
  for (const st of town.stations) {
    if (signs.has(st.icon)) continue;
    const img = new Image();
    img.src = st.icon;
    img.decode().then(() => { if (view.W) { paintLabels(); requestDraw(); } }, () => {});
    signs.set(st.icon, img);
  }

  // ---------- Canvas ----------
  const staticLayer = document.createElement('canvas');
  const labelLayer = document.createElement('canvas');
  const view = { W: 0, H: 0, dpr: 1, k: 1, ox: 0, oy: 0 };
  const { canvas, ctx } = mountCanvas(wrap, resize);

  // Transform that draws map units at (x, y) of the map.
  const at = (g, x, y) => {
    const s = view.dpr * view.k;
    g.setTransform(s, 0, 0, s, view.dpr * (view.ox + x * view.k), view.dpr * (view.oy + y * view.k));
  };

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.min(w / (CORE.w + 24), h / (CORE.h + 24));
    Object.assign(view, { W: w, H: h, dpr, k, ox: (w - CORE.w * k) / 2, oy: (h - CORE.h * k) / 2 });
    for (const c of [canvas, staticLayer, labelLayer]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    paintStatic();
    paintLabels();
    requestDraw();
  }

  function paintStatic() {
    const g = staticLayer.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = C.land;
    g.fillRect(0, 0, staticLayer.width, staticLayer.height);
    at(g, 0, 0);

    // Blocks and parks.
    const blocks = new Path2D(), parks = new Path2D();
    for (const b of town.blocks) {
      (b.park ? parks : blocks).roundRect(b.x0 + 2, b.y0 + 2, b.x1 - b.x0 - 4, b.y1 - b.y0 - 4, 6);
    }
    g.fillStyle = C.block;
    g.fill(blocks);
    g.fillStyle = C.park;
    g.fill(parks);
    for (const dark of [false, true]) {
      const p = new Path2D();
      for (const t of town.trees) if (t.dark === dark) { p.moveTo(t.x + t.r, t.y); p.arc(t.x, t.y, t.r, 0, Math.PI * 2); }
      g.fillStyle = dark ? C.treeDark : C.tree;
      g.fill(p);
    }

    // The metro line, under everything that stands on the ground.
    g.setLineDash([16, 10]);
    g.lineWidth = 4;
    g.strokeStyle = C.metroLine;
    g.stroke(metroPath);
    g.setLineDash([]);

    // Water: all the banks first, so a tributary opens into the river.
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const r of town.rivers) { g.lineWidth = r.half * 2 + 4; g.strokeStyle = C.waterEdge; g.stroke(r.path); }
    for (const r of town.rivers) { g.lineWidth = r.half * 2; g.strokeStyle = C.water; g.stroke(r.path); }

    // Squares for the station signs.
    g.fillStyle = C.plaza;
    for (const { plaza: q } of town.stations) { g.beginPath(); g.roundRect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0, 6); g.fill(); }

    // Bridges, then streets: every edge before any fill, so crossings merge.
    g.lineCap = 'butt';
    g.strokeStyle = C.bridge;
    for (const s of town.streets) {
      const ux = (s.bx - s.ax) / s.len, uy = (s.by - s.ay) / s.len;
      for (const [a, b] of s.bridges) {
        g.lineWidth = s.width + 7;
        g.beginPath();
        g.moveTo(s.ax + ux * a, s.ay + uy * a);
        g.lineTo(s.ax + ux * b, s.ay + uy * b);
        g.stroke();
      }
    }
    g.lineCap = 'square';
    for (const pass of ['edge', 'fill']) {
      for (const width of [18, 26]) {
        const p = new Path2D();
        for (const s of town.streets) if (s.width === width) { p.moveTo(s.ax, s.ay); p.lineTo(s.bx, s.by); }
        g.lineWidth = pass === 'edge' ? width + 2.5 : width;
        g.strokeStyle = pass === 'edge' ? C.roadEdge : C.road;
        g.stroke(p);
      }
    }

    // Bus stops: a small shelter on the kerb.
    g.fillStyle = C.busBody;
    for (const route of town.routes) {
      for (const stop of route.stops) {
        const p = pose(route.path, stop);
        const off = LANE + 8;
        g.save();
        g.translate(p.x - Math.sin(p.a) * off, p.y + Math.cos(p.a) * off);
        g.rotate(p.a);
        g.beginPath();
        g.roundRect(-5, -1.6, 10, 3.2, 1.2);
        g.fill();
        g.restore();
      }
    }

    // Buildings: every shadow on the ground first, then the walls and roofs
    // back to front.
    g.fillStyle = C.shadow;
    for (const b of town.buildings) {
      at(g, b.x + b.H * SHADOW[0], b.y + b.H * SHADOW[1]);
      g.fill(b.path, 'evenodd');
    }
    for (const b of town.drawOrder) paintBuilding(g, b, TONES[b.tone].roof, TONES[b.tone].wall);

    // The slogan: each letter on two legs, its dark top edge, then its face.
    const u = LETTER / 10;
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    g.miterLimit = 2;
    for (const l of town.letters) {
      const { w, lines } = GLYPHS[l.ch];
      at(g, l.x, l.y);
      g.rotate(l.a);
      g.fillStyle = C.sloganSide;
      g.fillRect(-w * u * 0.3 - 0.6, -LEGS - 1, 1.2, LEGS + 1);
      g.fillRect(w * u * 0.3 - 0.6, -LEGS - 1, 1.2, LEGS + 1);
      g.translate((-w * u) / 2, -LEGS - LETTER);
      g.scale(u, u);
      g.lineWidth = STROKE;
      g.strokeStyle = C.sloganSide;
      g.translate(0, -0.45);
      strokeGlyph(g, lines);
      g.translate(0, 0.45);
      g.strokeStyle = C.slogan;
      strokeGlyph(g, lines);
    }
  }

  function paintBuilding(g, b, roof, wall) {
    const step = 0.8 / (view.k * view.dpr);
    const top = b.H * ROOF;
    g.fillStyle = wall;
    for (let z = 0; z < top; z += step) {
      at(g, b.x, b.y - z);
      g.fill(b.path, 'evenodd');
    }
    at(g, b.x, b.y - top);
    g.fill(b.path, 'evenodd');
    g.fillStyle = roof;
    g.fill(b.path, 'evenodd');
    g.lineWidth = 0.7;
    g.strokeStyle = wall;
    g.stroke(b.path);
  }

  // River names along the water and the stations, in screen pixels.
  function paintLabels() {
    const g = labelLayer.getContext('2d');
    const { dpr, k, ox, oy, W, H } = view;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, labelLayer.width, labelLayer.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const toScreen = ([x, y]) => [ox + x * k, oy + y * k];
    const R = k > 0.5 ? 13 : 10;
    const marks = town.stations.map((st) => {
      const [x, y] = toScreen([st.cx, st.cy]);
      return [x + st.dx * (R + 4), y + st.dy * (R + 4)];
    });
    const taken = [...marks];
    for (const l of town.letters) {
      const h = LEGS + LETTER / 2;
      taken.push(toScreen([l.x + Math.sin(l.a) * h, l.y - Math.cos(l.a) * h]));
    }

    // River names: the calmest stretch of each river inside the town.
    const size = k > 0.5 ? 12.5 : 11;
    g.font = `600 ${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const spacing = 0.6;
    const bounds = {
      x0: Math.max(ox, 0) + 20, x1: Math.min(ox + CORE.w * k, W) - 20,
      y0: Math.max(oy, 0) + 20, y1: Math.min(oy + CORE.h * k, H) - 20
    };
    for (const r of town.rivers) {
      const text = `река ${r.name}`;
      const chars = [...text];
      const widths = chars.map((ch) => g.measureText(ch).width);
      const length = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
      const tr = track(r.line.map(toScreen), false);
      let bestS = -1, bestScore = Infinity;
      for (let s = length / 2 + 6; s < tr.len - length / 2 - 6; s += 5) {
        let turn = 0, prev = null, inside = true;
        for (let q = 0; q <= 8; q++) {
          const p = pose(tr, s - length / 2 + (length * q) / 8);
          if (p.x < bounds.x0 || p.x > bounds.x1 || p.y < bounds.y0 || p.y > bounds.y1) { inside = false; break; }
          if (prev !== null) {
            let d = Math.abs(p.a - prev);
            if (d > Math.PI) d = Math.PI * 2 - d;
            turn += d;
          }
          prev = p.a;
        }
        if (!inside) continue;
        // Never over a station or the slogan: no name is better than a name on top of them.
        const c = pose(tr, s);
        if (taken.some(([x, y]) => Math.hypot(x - c.x, y - c.y) < length * 0.6 + 24)) continue;
        const score = turn * 10 + Math.abs(s / tr.len - 0.5);
        if (score < bestScore) { bestScore = score; bestS = s; }
      }
      if (bestS < 0) continue;
      // Read left to right whichever way the river flows.
      const mid = pose(tr, bestS);
      const flip = Math.cos(mid.a) < 0;
      let s = flip ? bestS + length / 2 : bestS - length / 2;
      g.fillStyle = C.waterLabel;
      chars.forEach((ch, i) => {
        const half = widths[i] / 2;
        const p = pose(tr, flip ? s - half : s + half);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(flip ? p.a + Math.PI : p.a);
        g.fillText(ch, 0, 0.5);
        g.restore();
        s += flip ? -(widths[i] + spacing) : widths[i] + spacing;
      });
      taken.push([mid.x, mid.y]);
    }

    // Stations: the sign of the metro on a white disc and the name beside it,
    // both kept inside the block — away from the two roads of the corner.
    g.font = `700 ${k > 0.5 ? 13 : 11.5}px ${FONT}`;
    g.lineJoin = 'round';
    town.stations.forEach((st, i) => {
      const [x, y] = marks[i];
      g.beginPath();
      g.arc(x, y, R, 0, Math.PI * 2);
      g.fillStyle = C.card;
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = C.roadEdge;
      g.stroke();
      const img = signs.get(st.icon);
      if (img && img.complete && img.naturalWidth) {
        const f = Math.min((R * 1.4) / img.naturalWidth, (R * 1.4) / img.naturalHeight);
        const w = img.naturalWidth * f, h = img.naturalHeight * f;
        g.drawImage(img, x - w / 2, y - h / 2, w, h);
      }

      g.textAlign = st.dx > 0 ? 'left' : 'right';
      g.textBaseline = st.dy > 0 ? 'top' : 'bottom';
      const tx = x - st.dx * R, ty = y + st.dy * (R + 5);
      g.lineWidth = 4;
      g.strokeStyle = C.halo;
      g.strokeText(STATION_NAME, tx, ty);
      g.fillStyle = C.text;
      g.fillText(STATION_NAME, tx, ty);
    });
  }

  // ---------- Buses ----------
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function drive(dt) {
    for (const bus of town.buses) {
      const { path, stops } = bus.route;
      if (bus.wait > 0) {
        bus.wait -= dt;
        if (bus.wait <= 0) bus.s += 0.5;
        continue;
      }
      let ahead = Infinity;
      for (const st of stops) {
        let d = st - bus.s;
        if (d < -0.01) d += path.len;
        ahead = Math.min(ahead, d);
      }
      // Slow down for a stop, then pull away from it.
      const target = BUS_SPEED * Math.min(1, 0.18 + ahead / 60);
      bus.speed += (target - bus.speed) * Math.min(1, dt * 2.5);
      const ds = bus.speed * dt;
      if (ds >= ahead) { bus.s += ahead; bus.wait = DWELL; bus.speed = 0; }
      else bus.s += ds;
      bus.s %= path.len;
    }
  }

  function paintBus(g, bus) {
    const p = pose(bus.route.path, bus.s);
    const { l, w } = BUS;
    at(g, p.x, p.y);
    g.rotate(p.a);
    g.fillStyle = C.shadow;
    g.beginPath();
    g.roundRect(-l / 2 + 1.2, -w / 2 + 1.4, l, w, 2.4);
    g.fill();
    g.fillStyle = C.busBody;
    g.beginPath();
    g.roundRect(-l / 2, -w / 2, l, w, 2.4);
    g.fill();
    g.fillStyle = C.busRoof;
    g.beginPath();
    g.roundRect(-l / 2 + 4, -w / 2 + 1.8, l - 9.5, w - 3.6, 1);
    g.fill();
    g.fillStyle = C.busGlass;
    g.beginPath();
    g.roundRect(l / 2 - 3.4, -w / 2 + 0.9, 2.4, w - 1.8, 0.8);
    g.fill();
    g.fillRect(-l / 2 + 0.8, -w / 2 + 1.5, 1.2, w - 3);
    g.fillStyle = C.busLight;
    g.fillRect(l / 2 - 0.8, -w / 2 + 0.5, 0.8, 1.4);
    g.fillRect(l / 2 - 0.8, w / 2 - 1.9, 0.8, 1.4);
  }

  // ---------- Frame ----------
  function draw() {
    if (!view.W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(staticLayer, 0, 0);
    for (const bus of town.buses) paintBus(ctx, bus);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(labelLayer, 0, 0);
  }

  let running = false, last = 0, onScreen = false;
  function frame(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (!still) drive(dt);
    draw();
    if (onScreen && !still) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  function requestDraw() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) requestDraw();
  }).observe(root);

  // The web font may arrive after the first paint of the names.
  if (document.fonts) document.fonts.ready.then(() => { if (view.W) { paintLabels(); requestDraw(); } });

  return {};
}
