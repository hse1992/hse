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
  { name: 'Москва', half: 14, labels: 3, pts: [[-600, 300], [-200, 280], [120, 350], [400, 450], [640, 540], [900, 570], [1160, 510], [1400, 560], [1680, 660], [2120, 700]] }
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

// Landmarks: real buildings of the university, each by the river of its city,
// in place of ordinary buildings. Outlines are traced from map pictures in
// assets and are in the units of those pictures, turned by `turn`; `width` is
// the smallest and largest width the landmark may take on this map, heights
// are in map units. A part is a piece of the roof in a colour of its own.
// `lots` are the sizes, in blocks across and down, of the ground it may take:
// the streets inside such a lot are dropped. `bank` keeps it to one side of
// its river, and `middle` picks a lot where it comes out among the biggest,
// nearest the middle of the map and with no other river closer than its own.
const LANDMARKS = [
  {
    // «Канатный цех», the campus in St Petersburg, after assets/kanat.png: a
    // long body with a wide head, turned the way it stands, and the round
    // water tower at the bottom right corner of the body.
    kind: 'rope', river: 'Нева', lots: [[1, 2], [2, 1], [2, 2]], tone: 3, H: 14, width: [100, 112],
    turn: (-25 * Math.PI) / 180,
    rings: [[[0, 0], [287, 0], [287, 740], [91, 740], [91, 219], [0, 219]]],
    tower: { at: [262, 718], r: 72, H: 44 }
  },
  {
    // Покровский бульвар, 11, the campus in Moscow, after the red outline on
    // assets/Durasov.png: the long wedge along the road, building 11с6 on the
    // east, the stepped wing on the boulevard with its small courtyard, and the
    // buildings down to Воронцово поле. The part shaded yellow on the picture
    // is yellow here too.
    kind: 'pokrovka', river: 'Москва', bank: 'north', lots: [[2, 2], [2, 1], [1, 2]], middle: true,
    tone: 0, H: 14, width: [240, 320], turn: 0,
    rings: [
      [[402, 20], [858, 285], [852, 323], [1000, 323], [1005, 500], [950, 515], [942, 502], [862, 523],
        [875, 378], [800, 377], [540, 300], [455, 630], [262, 635], [249, 598], [307, 420], [367, 432],
        [372, 402], [290, 380], [301, 340], [294, 330], [309, 290], [327, 286], [332, 247], [415, 272],
        [417, 232], [350, 215]],
      [[360, 305], [400, 312], [385, 377], [347, 362]]
    ],
    parts: [{
      tone: 4,
      ring: [[332, 252], [412, 275], [402, 312], [360, 305], [347, 362], [385, 377], [377, 398], [290, 380],
        [301, 340], [294, 330], [309, 290], [327, 286]]
    }]
  }
];

const ROOF = 0.6;                 // how far up a roof is drawn, per unit of height
const SHADOW = [0.55, 0.3];       // where the shadow falls, per unit of height
const SIDEWALK = 7;               // from the edge of a road to a wall
const PLAZA = { w: 130, h: 72 };
const SIGN_GROUND = { w: 96, h: 58 };   // the least of it, which picks the corner   // the square a station sign stands on
const LANE = 5.2;                 // bus lane, off the middle of the road
const BUS = { l: 24, w: 7.6 };    // narrow enough for two lanes to pass clear on a turn
const SIZE = 1.15;                // all building footprints, scaled at once
const BUS_SPEED = 58;             // map units a second
const DWELL = 1.4;                // seconds at a stop
const LETTER = 26;                // height of the slogan letters, map units

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

// Every place a closed track passes within r of a point, as distances along it:
// a route that crosses its own path goes through the same crossroads twice.
function passesNear(tr, x, y, r) {
  const groups = [];
  const n = tr.pts.length;
  let open = null;
  for (let i = 0; i < n; i++) {
    const a = tr.pts[i], b = tr.pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
    if (d < r) {
      const at = tr.cum[i] + (tr.cum[i + 1] - tr.cum[i]) * t;
      if (!open) groups.push(open = { d, at, first: i, last: i });
      else if (d < open.d) Object.assign(open, { d, at });
      open.last = i;
    } else open = null;
  }
  // A pass that runs over the start of the track is one pass, not two.
  if (groups.length > 1 && groups[0].first === 0 && groups[groups.length - 1].last === n - 1) {
    const tail = groups.pop();
    if (tail.d < groups[0].d) Object.assign(groups[0], { d: tail.d, at: tail.at });
  }
  return groups.map((g) => g.at);
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
      if (Math.abs(pt.a) > 0.6 || pt.x < 30 || pt.x > CORE.w - 30 || pt.y - LETTER < 20 || pt.y > CORE.h - 30) { fits = false; break; }
      if (prev !== null) score += Math.abs(pt.a - prev) * 200;
      prev = pt.a;
      for (const h of [0, LETTER / 2]) {
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
      const under = letters.some((l) => [0, LETTER / 2, LETTER].some((h) =>
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
  const square = (cx, cy, dx, dy, size) => {
    const x0 = dx > 0 ? cx : cx - size.w, y0 = dy > 0 ? cy : cy - size.h;
    return { x0, y0, x1: x0 + size.w, y1: y0 + size.h };
  };
  for (const st of stations) {
    let best = null;
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const cx = st.x + dx * (wx[st.i] / 2 + 3), cy = st.y + dy * (wy[st.j] / 2 + 3);
      // The corner is picked by the least ground the sign needs; the square
      // then grows there to make room for the name under the sign.
      const least = square(cx, cy, dx, dy, SIGN_GROUND);
      const dry = clearIn(least.x0, least.y0, least.x1, least.y1);
      if (dry < 10) continue;
      if (!best || dry < best.dry) best = { dx, dy, cx, cy, dry };
    }
    const wide = square(best.cx, best.cy, best.dx, best.dy, PLAZA);
    const plaza = clearIn(wide.x0, wide.y0, wide.x1, wide.y1) >= 4 ? wide : square(best.cx, best.cy, best.dx, best.dy, SIGN_GROUND);
    Object.assign(st, best, { plaza });
  }

  // Blocks between the streets. Those inside the town take buildings, a few
  // become parks, and the ones outside it are woods.
  const blocks = [];
  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < ny - 1; j++) {
      const b = {
        x0: xs[i] + wx[i] / 2, x1: xs[i + 1] - wx[i + 1] / 2,
        y0: ys[j] + wy[j] / 2, y1: ys[j + 1] - wy[j + 1] / 2,
        i, j, park: false, room: null
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
  // Landmarks go first, each onto free ground by its river that has room for
  // it, so the ordinary buildings fill in around them.
  const GAP = 10;
  const blockAt = new Map(blocks.map((b) => [`${b.i},${b.j}`, b]));
  for (const spec of LANDMARKS) {
    const river = rivers.find((r) => r.name === spec.river);
    const nearest = (x, y) => river.line.reduce((m, [px, py]) => {
      const d = Math.hypot(px - x, py - y);
      return d < m.d ? { d, px, py } : m;
    }, { d: Infinity, px: 0, py: 0 });
    const spin = ([x, y]) => [x * Math.cos(spec.turn) - y * Math.sin(spec.turn), x * Math.sin(spec.turn) + y * Math.cos(spec.turn)];
    const rings = spec.rings.map((ring) => ring.map(spin));
    const parts = (spec.parts || []).map((part) => ({ tone: part.tone, ring: part.ring.map(spin) }));
    const all = rings.flat();
    const minX = Math.min(...all.map((pt) => pt[0])), minY = Math.min(...all.map((pt) => pt[1]));
    const spanW = Math.max(...all.map((pt) => pt[0])) - minX, spanH = Math.max(...all.map((pt) => pt[1])) - minY;
    const towerAt = spec.tower && spin(spec.tower.at);
    const extra = spec.tower ? spec.tower.r : 0;
    const top = spec.H * ROOF;
    // Points over the whole outline, in picture units: along every edge and
    // across the inside.
    const inside = (px, py) => {
      let hit = false;
      const ring = rings[0];
      for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
        const [xa, ya] = ring[a], [xb, yb] = ring[b];
        if ((ya > py) !== (yb > py) && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) hit = !hit;
      }
      return hit;
    };
    const probes = [];
    for (const ring of rings) {
      ring.forEach(([xa, ya], a) => {
        const [xb, yb] = ring[(a + 1) % ring.length];
        const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya) / 20));
        for (let k = 0; k < n; k++) probes.push([xa + ((xb - xa) * k) / n, ya + ((yb - ya) * k) / n]);
      });
    }
    for (let py = minY; py <= minY + spanH; py += 30) {
      for (let px = minX; px <= minX + spanW; px += 30) if (inside(px, py)) probes.push([px, py]);
    }
    const dry = (x, y, f) => probes.every(([px, py]) => clearAt(x + (px - minX) * f, y + (py - minY) * f) >= 5);

    const choices = [];
    for (const first of blocks) {
      for (const [di, dj] of spec.lots || [[1, 1]]) {
        const group = [];
        for (let a = 0; a < di; a++) for (let c = 0; c < dj; c++) group.push(blockAt.get(`${first.i + a},${first.j + c}`));
        if (group.some((b) => !b || !b.room || placed.get(b).length)) continue;
        const room = {
          x0: Math.min(...group.map((b) => b.room.x0)), x1: Math.max(...group.map((b) => b.room.x1)),
          y0: Math.min(...group.map((b) => b.room.y0)), y1: Math.max(...group.map((b) => b.room.y1))
        };
        const inner = [];
        for (let a = 1; a < di; a++) for (let c = 0; c < dj; c++) inner.push(`v${first.i + a},${first.j + c}`);
        for (let a = 0; a < di; a++) for (let c = 1; c < dj; c++) inner.push(`h${first.i + a},${first.j + c}`);

        // A tower stands out past the edge of the building, so it counts too.
        const f = Math.min(spec.width[1] / spanW, (room.x1 - room.x0) / (spanW + extra), (room.y1 - room.y0 - top) / spanH);
        if (f * spanW < spec.width[0]) continue;
        const w = spanW * f, h = spanH * f;
        const x = (room.x0 + room.x1 - w - extra * f) / 2, y = (room.y0 + top + room.y1 - h) / 2;
        const round = spec.tower && { cx: (towerAt[0] - minX) * f, cy: (towerAt[1] - minY) * f, r: spec.tower.r * f, H: spec.tower.H };
        const box = { x0: x, y0: y - top, x1: x + w, y1: y + h };
        if (round) {
          box.y0 = Math.min(box.y0, y + round.cy - round.r - round.H * ROOF);
          box.x1 = Math.max(box.x1, x + round.cx + round.r);
          box.y1 = Math.max(box.y1, y + round.cy + round.r);
        }
        const at = nearest((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
        if (spec.bank === 'north' && (box.y0 + box.y1) / 2 > at.py) continue;
        if (spec.bank === 'south' && (box.y0 + box.y1) / 2 < at.py) continue;
        if (spec.middle) {
          const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
          const own = Math.min(...river.line.map(([px, py]) => Math.hypot(px - cx, py - cy)));
          const others = rivers.filter((r) => r !== river)
            .map((r) => Math.min(...r.line.map(([px, py]) => Math.hypot(px - cx, py - cy))));
          if (own > 260 || others.some((d) => d <= own + 20)) continue;
        }
        if (!dry(x, y, f)) continue;
        if (round && clearAt(x + round.cx, y + round.cy) < round.r + 5) continue;
        // A station's square may take an empty corner of the lot, not the building.
        if (stations.some(({ plaza: q }) => probes.some(([px, py]) => {
          const X = x + (px - minX) * f, Y = y + (py - minY) * f;
          return X > q.x0 - 8 && X < q.x1 + 8 && Y > q.y0 - 8 && Y < q.y1 + 8;
        }))) continue;
        if (letters.some((l) => l.x > box.x0 - 18 && l.x < box.x1 + 18 && l.y > box.y0 - 14 && l.y < box.y1 + 14)) continue;
        const mid = Math.hypot((box.x0 + box.x1) / 2 - CORE.w / 2, (box.y0 + box.y1) / 2 - CORE.h / 2);
        choices.push({ group, inner, f, w, h, x, y, round, box, near: at.d, mid });
      }
    }
    if (spec.middle) {
      // Among the lots where it comes out nearly as big as it can, the one
      // nearest the middle of the map.
      const best = Math.max(0, ...choices.map((c) => c.f));
      const big = choices.filter((c) => c.f >= best * 0.85);
      choices.length = 0;
      choices.push(...big.sort((a, b) => a.mid - b.mid));
    } else choices.sort((a, b) => a.near - b.near);
    const pick = choices[0];
    if (!pick) { console.warn(`town: no room for ${spec.kind} by the ${spec.river}`); continue; }

    // The lot becomes one block: its inner streets go, the first block takes
    // the whole ground and the others are no longer drawn.
    const { group, inner, f, w, h, x, y, round, box } = pick;
    for (const key of inner) streets.delete(key);
    const [head, ...rest] = group;
    Object.assign(head, {
      x0: Math.min(...group.map((b) => b.x0)), x1: Math.max(...group.map((b) => b.x1)),
      y0: Math.min(...group.map((b) => b.y0)), y1: Math.max(...group.map((b) => b.y1))
    });
    for (const b of rest) b.merged = true;
    const keep = { x0: box.x0 - GAP, y0: box.y0 - GAP, x1: box.x1 + GAP, y1: box.y1 + GAP };
    const whole = { x0: head.x0, y0: head.y0, x1: head.x1, y1: head.y1 };
    group.forEach((b, n) => placed.get(b).push(n === 0 && group.length === 1 ? keep : whole));
    const local = ([px, py]) => [(px - minX) * f, (py - minY) * f];
    buildings.push({
      kind: spec.kind, w, h, H: spec.H, x, y, box, tone: spec.tone, tower: round,
      rings: rings.map((ring) => ring.map(local)),
      parts: parts.map((part) => ({ tone: part.tone, rings: [part.ring.map(local)] }))
    });
  }

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
    let stops = served.map((s) => nearestOn(path, s.x, s.y) - 40);
    if (stops.length === 1) stops.push(stops[0] + path.len / 2);
    if (!stops.length) stops = [path.len * 0.25, path.len * 0.75];
    stops = stops.map((s) => ((s % path.len) + path.len) % path.len).sort((p, q) => p - q);
    // The crossroads on the way, each pass through one of them on its own.
    const crossings = [];
    for (const key of new Set(nodes.map(([i, j]) => `${i},${j}`))) {
      const [i, j] = key.split(',').map(Number);
      for (const center of passesNear(path, xs[i], ys[j], 14)) crossings.push({ key, center });
    }
    routes.push({ path, stops, crossings });
  });

  const buses = [];
  for (const route of routes) {
    const n = Math.max(2, Math.round(route.path.len / 520));
    for (let k = 0; k < n; k++) buses.push({ route, s: (route.path.len * k) / n + 13, speed: BUS_SPEED, wait: 0, stuck: 0, pass: 0, claims: new Set() });
  }

  // Greenery between the buildings: a few clumps of trees in about half of the
  // blocks, on ground no building, shadow, square or letter takes.
  const clearForTree = (x, y, r, block) => {
    if (x - r < block.x0 + 5 || x + r > block.x1 - 5 || y - r < block.y0 + 5 || y + r > block.y1 - 5) return false;
    if (clearAt(x, y) < r + 3) return false;
    for (const b of buildings) {
      const q = b.box, sx = b.H * SHADOW[0], sy = b.H * SHADOW[1];
      if (x + r > q.x0 - 4 && x - r < q.x1 + sx + 4 && y + r > q.y0 - 4 && y - r < q.y1 + sy + 4) return false;
    }
    if (stations.some(({ plaza: q }) => x + r > q.x0 - 3 && x - r < q.x1 + 3 && y + r > q.y0 - 3 && y - r < q.y1 + 3)) return false;
    if (letters.some((l) => Math.hypot(l.x - x, l.y - LETTER / 2 - y) < LETTER)) return false;
    return !trees.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r - 1.5);
  };
  for (const block of blocks) {
    if (!block.room || block.merged || rand() > 0.6) continue;
    const clumps = 1 + Math.floor(rand() * 3);
    for (let c = 0; c < clumps; c++) {
      // A clump starts on a free spot and grows round it.
      for (let attempt = 0; attempt < 25; attempt++) {
        const cx = between(block.x0 + 10, block.x1 - 10), cy = between(block.y0 + 10, block.y1 - 10);
        const r0 = between(4, 6);
        if (!clearForTree(cx, cy, r0, block)) continue;
        trees.push({ x: cx, y: cy, r: r0, dark: rand() < 0.4 });
        const more = 2 + Math.floor(rand() * 5);
        for (let m = 0; m < more; m++) {
          const a = rand() * Math.PI * 2, d = between(6, 13);
          const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, r = between(3, 5.5);
          if (clearForTree(x, y, r, block)) trees.push({ x, y, r, dark: rand() < 0.4 });
        }
        break;
      }
    }
  }

  // No bus starts on top of another: one that would is moved back along its
  // route until it is clear.
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let a = 0; a < buses.length; a++) {
      for (let b = a + 1; b < buses.length; b++) {
        const A = busBody(buses[a].route, buses[a].s), B = busBody(buses[b].route, buses[b].s);
        const sameCrossing = buses[a].route.crossings.some((c) => inCrossing(buses[a], c)
          && buses[b].route.crossings.some((d) => d.key === c.key && inCrossing(buses[b], d)));
        if (segSegDist(A.seg, B.seg) >= BUS.w + 0.5 && !sameCrossing) continue;
        const len = buses[b].route.path.len;
        buses[b].s = (buses[b].s - 8 + len) % len;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return { rows: ys, rivers, streets: [...streets.values()], letters, blocks, stations, buildings, drawOrder, trees, metro, routes, buses };
}

// ---------- Traffic ----------

// Shortest distance between two segments, zero where they cross.
function segSegDist(a, b) {
  const [ax, ay, bx, by] = a, [cx, cy, dx, dy] = b;
  const side = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px) > 0;
  if (side(ax, ay, bx, by, cx, cy) !== side(ax, ay, bx, by, dx, dy)
    && side(cx, cy, dx, dy, ax, ay) !== side(cx, cy, dx, dy, bx, by)) return 0;
  return Math.min(segDist(ax, ay, cx, cy, dx, dy), segDist(bx, by, cx, cy, dx, dy),
    segDist(cx, cy, ax, ay, bx, by), segDist(dx, dy, ax, ay, bx, by));
}

// The body of a bus at distance s along its route, as the line down its
// middle short of the rounded ends: two bodies touch when these lines come
// closer than the width of a bus.
function busBody(route, s) {
  const p = pose(route.path, s);
  const half = BUS.l / 2 - BUS.w / 2;
  const cx = Math.cos(p.a) * half, cy = Math.sin(p.a) * half;
  return { x: p.x, y: p.y, a: p.a, seg: [p.x - cx, p.y - cy, p.x + cx, p.y + cy] };
}

// Buses heading the same way follow one another; buses heading different ways
// meet only at crossroads, and a crossroads is taken by one bus at a time.
const ZONE = 20;                  // half the length of road a crossroads takes up
const SIGHT = 44;                 // how far ahead a bus looks
const TOUCH = BUS.w + 0.3;        // two bodies closer than this touch

// Signed distance along a closed route, the short way round.
function along(route, from, to) {
  const len = route.path.len;
  const d = (((to - from) % len) + len) % len;
  return d > len / 2 ? d - len : d;
}
// Whether any part of a bus is inside a crossroads on its route.
function inCrossing(bus, c) {
  return Math.abs(along(bus.route, c.center, bus.s)) < ZONE + BUS.l / 2;
}
// How far the front of a bus is from driving into a crossroads.
function toCrossing(bus, c) {
  const len = bus.route.path.len;
  return (((c.center - ZONE - (bus.s + BUS.l / 2)) % len) + len) % len;
}

// How far a bus may go before it runs into the back of a bus in front of it
// going the same way: its body is moved ahead a little at a time.
function followGap(bus, bodies) {
  const me = bodies.get(bus);
  const ahead = [];
  for (const [other, body] of bodies) {
    if (other === bus || Math.cos(body.a - me.a) < 0.7) continue;
    const dx = body.x - me.x, dy = body.y - me.y;
    if (dx * Math.cos(me.a) + dy * Math.sin(me.a) <= 0 || Math.hypot(dx, dy) > BUS.l + SIGHT) continue;
    ahead.push(body);
  }
  for (let d = 2; ahead.length && d <= SIGHT; d += 2) {
    const next = busBody(bus.route, bus.s + d).seg;
    if (ahead.some((body) => segSegDist(next, body.seg) < TOUCH)) return d - 2;
  }
  return Infinity;
}

// One step of every bus: to the next stop, up to the bus in front of it, or up
// to a crossroads it may not take yet.
function drive(buses, dt) {
  const bodies = new Map(buses.map((bus) => [bus, busBody(bus.route, bus.s)]));
  const inside = new Map();
  for (const bus of buses) {
    for (const c of bus.route.crossings) {
      if (!inCrossing(bus, c)) continue;
      if (!inside.has(c.key)) inside.set(c.key, new Set());
      inside.get(c.key).add(bus);
    }
  }
  // A bus keeps a crossroads it has taken until it has driven out of it.
  const holder = new Map();
  for (const bus of buses) {
    for (const key of [...bus.claims]) {
      const kept = bus.route.crossings.some((c) => c.key === key && (inCrossing(bus, c) || toCrossing(bus, c) <= SIGHT + 2));
      if (kept) holder.set(key, bus); else bus.claims.delete(key);
    }
  }

  buses.forEach((bus) => {
    const { path, stops } = bus.route;
    if (bus.pass > 0) bus.pass -= dt;
    if (bus.wait > 0) {
      bus.wait -= dt;
      if (bus.wait <= 0) bus.s += 0.5;
      return;
    }

    let gap = followGap(bus, bodies);

    // The next crossroads: the first bus in line takes it when nobody else is
    // in it or has taken it, and there is room for it on the other side.
    let next = null, reach = Infinity;
    for (const c of bus.route.crossings) {
      if (inCrossing(bus, c)) continue;
      const d = toCrossing(bus, c);
      if (d < reach) { reach = d; next = c; }
    }
    if (next && reach <= SIGHT && !bus.claims.has(next.key)) {
      const busy = [...(inside.get(next.key) || [])].some((o) => o !== bus);
      const held = holder.has(next.key) && holder.get(next.key) !== bus;
      const exit = busBody(bus.route, next.center + ZONE + BUS.l / 2 + 2).seg;
      const jammed = [...bodies].some(([o, body]) => o !== bus && segSegDist(exit, body.seg) < TOUCH);
      if (!busy && !held && !jammed && gap >= reach) {
        bus.claims.add(next.key);
        holder.set(next.key, bus);
      } else gap = Math.min(gap, Math.max(0, reach - 1));
    }
    // The last resort against a knot nobody can undo: a bus that has waited
    // far too long squeezes past.
    if (bus.pass > 0) gap = Infinity;

    let ahead = Infinity;
    for (const st of stops) {
      let d = st - bus.s;
      if (d < -0.01) d += path.len;
      ahead = Math.min(ahead, d);
    }
    // Slow down for a stop, for the bus in front or for a crossroads, then pull away.
    const room = Math.max(0, gap - 1);
    const target = Math.min(BUS_SPEED * Math.min(1, 0.18 + ahead / 60), room * 2.5);
    bus.speed += (target - bus.speed) * Math.min(1, dt * 2.5);
    const ds = Math.min(Math.max(0, bus.speed) * dt, room);

    if (gap < Infinity && ds < BUS_SPEED * 0.05 * dt) {
      bus.stuck += dt;
      if (bus.stuck > 8) { bus.pass = 1.2; bus.stuck = 0; }
    } else bus.stuck = 0;

    if (ds >= ahead) { bus.s += ahead; bus.wait = DWELL; bus.speed = 0; }
    else bus.s += ds;
    bus.s %= path.len;
  });
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
    slogan: tok('--city-slogan'), sloganSide: tok('--city-slogan-side'),
    busBody: tok('--ebus-body'), busRoof: tok('--ebus-wave'), busGlass: tok('--ebus-glass'), busLight: tok('--ebus-light')
  };
  const TONES = [
    { roof: tok('--city-roof-cool'), wall: tok('--city-wall-cool') },
    { roof: tok('--city-roof-light'), wall: tok('--city-wall-light') },
    { roof: tok('--city-roof-warm'), wall: tok('--city-wall-warm') },
    { roof: tok('--city-roof-rope'), wall: tok('--city-wall-rope') },
    { roof: tok('--city-roof-yellow'), wall: tok('--city-wall-yellow') }
  ];
  const FONT = '"HSE Sans", -apple-system, Helvetica, sans-serif';

  // Paths, built once in map units.
  const ringsPath = (rings) => {
    const path = new Path2D();
    for (const ring of rings) {
      path.moveTo(ring[0][0], ring[0][1]);
      for (let i = 1; i < ring.length; i++) path.lineTo(ring[i][0], ring[i][1]);
      path.closePath();
    }
    return path;
  };
  for (const b of town.buildings) {
    b.path = ringsPath(b.rings);
    for (const part of b.parts || []) part.path = ringsPath(part.rings);
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
    // The town fits the card, and the top edge of the map runs along the
    // middle of a street rather than through a block, so nothing along it looks
    // cut off. If that street lies higher than there is room for, the map
    // steps back a little so the town still shows to its last buildings.
    let k = Math.min(w / (CORE.w + 24), h / (CORE.h + 24));
    const lowest = CORE.h - 8;
    const top = town.rows.filter((y) => y <= 12).pop();
    let oy = (h - CORE.h * k) / 2;
    if (top !== undefined) {
      if (top + h / k < lowest) k = h / (lowest - top);
      oy = -top * k;
    }
    Object.assign(view, { W: w, H: h, dpr, k, ox: (w - CORE.w * k) / 2, oy });
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
      if (b.merged) continue;
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

    // Buildings: every shadow on the ground first, then the walls and roofs
    // back to front.
    g.fillStyle = C.shadow;
    for (const b of town.buildings) {
      at(g, b.x + b.H * SHADOW[0], b.y + b.H * SHADOW[1]);
      g.fill(b.path, 'evenodd');
      if (b.tower) {
        const t = b.tower;
        at(g, b.x + t.H * SHADOW[0], b.y + t.H * SHADOW[1]);
        g.beginPath();
        g.arc(t.cx, t.cy, t.r, 0, Math.PI * 2);
        g.fill();
      }
    }
    for (const b of town.drawOrder) paintBuilding(g, b, TONES[b.tone].roof, TONES[b.tone].wall);

    // The slogan: each letter right on the bank, its dark top edge, then its face.
    const u = LETTER / 10;
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    g.miterLimit = 2;
    for (const l of town.letters) {
      const { w, lines } = GLYPHS[l.ch];
      at(g, l.x, l.y);
      g.rotate(l.a);
      g.translate((-w * u) / 2, -LETTER);
      g.scale(u, u);
      g.lineWidth = STROKE;
      g.strokeStyle = C.sloganSide;
      g.translate(0, -0.45);
      strokeGlyph(g, lines);
      g.translate(0, 0.45);
      g.strokeStyle = C.slogan;
      strokeGlyph(g, lines);
    }

    // The metro line last of all, over rivers, streets and buildings, so it
    // runs unbroken from one end of the town to the other.
    at(g, 0, 0);
    g.lineCap = 'butt';
    g.setLineDash([16, 10]);
    g.lineWidth = 4;
    g.strokeStyle = C.metroLine;
    g.stroke(metroPath);
    g.setLineDash([]);
  }

  function paintBuilding(g, b, roof, wall) {
    const step = 0.8 / (view.k * view.dpr);
    const top = b.H * ROOF;
    const stack = (path, color) => {
      g.fillStyle = color;
      for (let z = 0; z <= top; z += step) {
        at(g, b.x, b.y - Math.min(z, top));
        g.fill(path, 'evenodd');
      }
    };
    // Walls of the whole building, then of the parts over them: where a part
    // meets the rest of the building, the roof covers its walls again.
    stack(b.path, wall);
    const parts = (b.parts || []).map((part) => ({ path: part.path, ...TONES[part.tone] }));
    for (const part of parts) stack(part.path, part.wall);
    at(g, b.x, b.y - top);
    g.fillStyle = roof;
    g.fill(b.path, 'evenodd');
    g.lineWidth = 0.7;
    g.strokeStyle = wall;
    g.stroke(b.path);
    for (const part of parts) {
      g.fillStyle = part.roof;
      g.fill(part.path);
      g.strokeStyle = part.wall;
      g.stroke(part.path);
    }

    // A round tower rising over the building, like the water tower of the Rope Works.
    if (b.tower) {
      const t = b.tower, rise = t.H * ROOF;
      const disc = new Path2D();
      disc.arc(t.cx, t.cy, t.r, 0, Math.PI * 2);
      g.fillStyle = wall;
      for (let z = 0; z < rise; z += step) {
        at(g, b.x, b.y - z);
        g.fill(disc);
      }
      at(g, b.x, b.y - rise);
      g.fill(disc);
      g.fillStyle = roof;
      g.fill(disc);
      g.lineWidth = 0.7;
      g.strokeStyle = wall;
      g.stroke(disc);
    }
  }

  // River names along the water and the stations, in screen pixels.
  function paintLabels() {
    const g = labelLayer.getContext('2d');
    const { dpr, k, ox, oy, W, H } = view;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, labelLayer.width, labelLayer.height);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const toScreen = ([x, y]) => [ox + x * k, oy + y * k];
    const marks = town.stations.map(({ plaza: q }) => toScreen([(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2]));
    const taken = [...marks];
    for (const l of town.letters) {
      const h = LETTER / 2;
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
    // Bridges in pixels: a river name keeps off them.
    const spans = [];
    for (const st of town.streets) {
      const ux = (st.bx - st.ax) / st.len, uy = (st.by - st.ay) / st.len;
      for (const [a, b] of st.bridges) {
        const [ax, ay] = toScreen([st.ax + ux * a, st.ay + uy * a]);
        const [bx, by] = toScreen([st.ax + ux * b, st.ay + uy * b]);
        spans.push({ ax, ay, bx, by, half: ((st.width + 7) / 2) * k });
      }
    }
    for (const r of town.rivers) {
      const text = `река ${r.name}`;
      const chars = [...text];
      const widths = chars.map((ch) => g.measureText(ch).width);
      const length = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
      const tr = track(r.line.map(toScreen), false);
      const inView = (p) => p.x >= bounds.x0 && p.x <= bounds.x1 && p.y >= bounds.y0 && p.y <= bounds.y1;
      // The part of the river on the screen is cut into as many stretches as
      // the river has names, and each stretch gets the calmest spot of its own.
      let from = -1, to = -1;
      for (let s = 0; s <= tr.len; s += 5) if (inView(pose(tr, s))) { if (from < 0) from = s; to = s; }
      if (from < 0) continue;
      const copies = r.labels || 1;
      for (let n = 0; n < copies; n++) {
        const lo = from + ((to - from) * n) / copies, hi = from + ((to - from) * (n + 1)) / copies;
        const aim = (lo + hi) / 2;
        let bestS = -1, bestScore = Infinity;
        for (let s = Math.max(lo, length / 2 + 6); s < Math.min(hi, tr.len - length / 2 - 6); s += 5) {
          let turn = 0, prev = null, inside = true;
          for (let q = 0; q <= 8; q++) {
            const p = pose(tr, s - length / 2 + (length * q) / 8);
            if (!inView(p)) { inside = false; break; }
            if (prev !== null) {
              let d = Math.abs(p.a - prev);
              if (d > Math.PI) d = Math.PI * 2 - d;
              turn += d;
            }
            prev = p.a;
          }
          if (!inside) continue;
          let onBridge = false;
          for (let d = -length / 2 - 6; d <= length / 2 + 6 && !onBridge; d += 3) {
            const p = pose(tr, s + d);
            onBridge = spans.some((b) => segDist(p.x, p.y, b.ax, b.ay, b.bx, b.by) < b.half + size * 0.6);
          }
          if (onBridge) continue;
          // Never over a station, the slogan or another name: no name is
          // better than a name on top of them.
          const c = pose(tr, s);
          if (taken.some(([x, y]) => Math.hypot(x - c.x, y - c.y) < length * 0.6 + 24)) continue;
          const score = turn * 10 + Math.abs(s - aim) / (hi - lo);
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
    }

    // Stations: the sign of the metro right over the middle of the name, the
    // two of them in the middle of the station's square.
    const signH = k > 0.5 ? 22 : 17;
    const nameSize = k > 0.5 ? 13 : 11.5;
    const between = 4;
    g.font = `700 ${nameSize}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.lineJoin = 'round';
    town.stations.forEach((st, i) => {
      const [x, y] = marks[i];
      const top = y - (signH + between + nameSize) / 2;
      const img = signs.get(st.icon);
      if (img && img.complete && img.naturalWidth) {
        const f = signH / img.naturalHeight;
        const w = img.naturalWidth * f;
        g.drawImage(img, x - w / 2, top, w, signH);
      }
      const ty = top + signH + between;
      g.lineWidth = 4;
      g.strokeStyle = C.halo;
      g.strokeText(STATION_NAME, x, ty);
      g.fillStyle = C.text;
      g.fillText(STATION_NAME, x, ty);
    });
  }

  // ---------- Buses ----------
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


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
    if (!still) drive(town.buses, dt);
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
