// The last screen of the page: every figure it has counted, all at once — and
// then only one of them. Nothing here is drawn; the whole scene is the numbers
// themselves, set in the same face the page uses for all its figures.

import { CITIES, LYCEUM, STAFF, STUDENTS, FOREIGN, HSE_TOTAL, ADMITTED, AREA_TOTAL } from '../data/hse.js';
import { COUNTRIES } from '../data/countries.js';
import { nf } from '../lib/format.js';

// The teaching part of the floor area — data/hse.js keeps it campus by campus.
const AREA_STUDY = CITIES.reduce((n, c) => n + c.areaStudy, 0);

// Figures the page has already shown. Each of them is counted in the section
// that earned it, and a module knows nothing about its neighbours — so they
// are quoted here by hand rather than imported. If a section ever changes its
// answer, its line below has to change with it.
const SEATS = 81000;        // seats in «Лужники» — the stadium
const BUILDINGS = 196;      // buildings — the floor area section
const PROGRAMS = 329;       // programmes — the studies section
const YEARS = 912;          // years of study one after another — the same
const CARS = 134;           // metro cars for this year's intake — the opening

export const meta = {
  id: 'each',
  title: 'Самая главная цифра',
  subtitle: 'На этой странице их было много',
  intro: true,
  // One figure, then three, then all of them; a held breath, the count down to
  // one, the one itself, and the quiet board at the end.
  steps: 8
};

export function init(root) {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REF = 100;                                 // size everything is measured at
  const SMALL = 13;                                // the caption size the count lands on
  const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';   // 1 - (1 - p)³

  const cityOf = (key) => CITIES.find((c) => c.key === key);

  // Every figure of the page, in the order it turns up here: the three the
  // scene opens with, then the rest in the order the page told them, and the
  // whole university last. `w` is how much larger than the others it is set.
  const FIGURES = [
    { key: 'students', value: nf(STUDENTS), text: 'студентов', w: 1.5 },
    { key: 'staff', value: nf(STAFF), text: 'сотрудников', w: 1.05 },
    { key: 'lyceum', value: nf(LYCEUM), text: 'лицеистов', w: 0.75 },
    { key: 'admitted', value: nf(ADMITTED), text: 'поступили в этом году', w: 1.2 },
    { key: 'cars', value: nf(CARS), text: 'вагона метро', w: 0.8 },
    { key: 'seats', value: nf(SEATS), text: 'мест на стадионе', w: 1.3 },
    { key: 'countries', value: nf(COUNTRIES.length), text: 'флагов в гостях', w: 0.9 },
    { key: 'foreign', value: `${nf(FOREIGN)}+`, text: 'приехали из-за рубежа', w: 0.85 },
    { key: 'buildings', value: nf(BUILDINGS), text: 'зданий', w: 1.05 },
    { key: 'area', value: nf(AREA_TOTAL), text: 'м² в них', w: 1.35 },
    { key: 'areaStudy', value: nf(AREA_STUDY), text: 'м² учебных', w: 0.85 },
    { key: 'programs', value: nf(PROGRAMS), text: 'образовательных программ', w: 1.1 },
    { key: 'years', value: nf(YEARS), text: 'лет учебы подряд', w: 1.2 },
    { key: 'msk', value: nf(cityOf('msk').students), text: 'студентов в Москве', w: 1.1 },
    { key: 'spb', value: nf(cityOf('spb').students), text: 'студентов в Санкт-Петербурге', w: 0.75 },
    { key: 'nn', value: nf(cityOf('nn').students), text: 'студентов в Нижнем Новгороде', w: 0.7 },
    { key: 'perm', value: nf(cityOf('perm').students), text: 'студентов в Перми', w: 0.7 },
    { key: 'total', value: nf(HSE_TOTAL), text: 'человек во всей Вышке', w: 1.9 }
  ];

  const STAR = FIGURES.length - 1;                 // the whole university
  const ALL = FIGURES.map((_, i) => i);

  // ---------- Markup ----------
  root.innerHTML = `
    <style>
      /* The stage is one white field with nothing on it but figures, each put
         in its place from JS — hence absolute positioning and no flow at all. */
      .each-stage {
        position: relative;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .each-tile {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        white-space: nowrap;
        opacity: 0;
        will-change: transform, opacity;
      }

      .each-num {
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .each-cap {
        line-height: 1.2;
        color: var(--text-caption);
      }

      /* The count down to one, and the one itself: a bare figure with nothing
         under it. Taken out of the flow rather than hidden, so the tile is
         exactly as tall as the number and stays where it is put. */
      .each-tile.is-bare .each-cap {
        display: none;
      }

      /* The only colour on this screen — and the only one on the page that
         belongs to the university as a whole rather than to a campus. */
      .each-tile.is-hse .each-num {
        color: var(--hse-blue);
      }

      /* The three lines the scene speaks in, all in the same place along the
         bottom edge: they replace each other and nothing has to move. */
      .each-line {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 4px;
        text-align: center;
        opacity: 0;
        transition: opacity 620ms ease;
        pointer-events: none;
      }

      .each-line.is-on {
        opacity: 1;
      }

      .each-turn,
      .each-you {
        font-size: 1.0625rem;
        color: var(--text-secondary);
      }

      .each-last {
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text);
      }

      @media (max-width: 860px) {
        /* One column and no scene here: the board is all there is, so it gets
           the room a canvas would have got. */
        .each-card {
          flex: none;
          height: 66dvh;
          min-height: 320px;
        }

        .each-last { font-size: 1.125rem; }

        .each-turn,
        .each-you { font-size: 0.9375rem; }
      }
    </style>

    <div class="canvas-card each-card">
      <div class="each-stage" data-el="stage">
        <div class="each-line each-turn" data-el="turn">Но среди всех этих цифр есть одна самая главная</div>
        <div class="each-line each-you" data-el="you">Это вы</div>
        <div class="each-line each-last" data-el="last">Потому что в Вышке и для Вышки важен каждый</div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const stage = $('stage');

  const tiles = FIGURES.map((f) => {
    const el = document.createElement('div');
    el.className = 'each-tile';
    el.innerHTML = `<span class="each-num">${f.value}</span><span class="each-cap">${f.text}</span>`;
    stage.appendChild(el);
    return { ...f, el, numEl: el.querySelector('.each-num'), capEl: el.querySelector('.each-cap'), at: null };
  });
  const star = tiles[STAR];

  // ---------- Measuring ----------
  // Every number and caption is read once at a reference size. Type is linear
  // in its size, so from then on the whole scene can be laid out in arithmetic
  // without asking the browser anything again.
  function measure() {
    tiles.forEach((t) => {
      t.numEl.style.fontSize = `${REF}px`;
      t.capEl.style.fontSize = `${REF}px`;
    });
    tiles.forEach((t) => {
      t.m = box(t);
    });
    // The star has a second face — what is left of it at the end.
    star.numEl.textContent = '1';
    star.capEl.textContent = 'вы';
    star.one = box(star);
    star.numEl.textContent = star.value;
    star.capEl.textContent = star.text;
  }

  function box(t) {
    const n = t.numEl.getBoundingClientRect();
    const c = t.capEl.getBoundingClientRect();
    return { numW: n.width, numH: n.height, capW: c.width, capH: c.height };
  }

  // ---------- The lines ----------
  const lines = { turn: $('turn'), you: $('you'), last: $('last') };
  const say = (name) => Object.keys(lines).forEach((k) => lines[k].classList.toggle('is-on', k === name));

  // ---------- Layout ----------
  // A figure is its number with a caption under it; the caption keeps its own
  // small size whatever the number does.
  const capSize = (num) => Math.max(10.5, Math.min(15, num * 0.2));

  function sizeOf(m, F, bare) {
    const cap = bare ? 0 : capSize(F);
    const numW = (m.numW * F) / REF;
    const numH = (m.numH * F) / REF;
    const capW = bare ? 0 : (m.capW * cap) / REF;
    const capH = bare ? 0 : (m.capH * cap) / REF;
    const gap = bare ? 0 : Math.round(F * 0.06);
    return { w: Math.max(numW, capW), h: numH + gap + capH, numH, num: F, cap, gap, bare: !!bare };
  }

  // Packs figures into justified rows, the numbers of one row sitting on one
  // line. Returns null when they do not fit — the search below then tries a
  // smaller size.
  function rows(entries, F, area, force) {
    const gapX = F * 0.55, gapY = F * 0.5;
    const sizes = entries.map((e) => sizeOf(e.m, F * e.w, e.bare));
    const lines = [];
    let line = null;
    for (let i = 0; i < sizes.length; i++) {
      const s = sizes[i];
      if (!force && s.w > area.w) return null;
      if (!line) {
        line = { idx: [i], w: s.w, h: s.h, numH: s.numH };
      } else if (line.w + gapX + s.w > area.w) {
        lines.push(line);
        line = { idx: [i], w: s.w, h: s.h, numH: s.numH };
      } else {
        line.idx.push(i);
        line.w += gapX + s.w;
        line.h = Math.max(line.h, s.h);
        line.numH = Math.max(line.numH, s.numH);
      }
    }
    if (line) lines.push(line);

    const total = lines.reduce((n, l) => n + l.h, 0) + gapY * (lines.length - 1);
    if (!force && total > area.h) return null;

    const out = [];
    let y = area.y + (area.h - total) / 2;
    lines.forEach((l) => {
      // Justified — but a short last line is centred rather than torn apart.
      const n = l.idx.length;
      const extra = n > 1 ? Math.min((area.w - l.w) / (n - 1), gapX * 1.5) : 0;
      const used = l.w + extra * (n - 1);
      let x = area.x + (area.w - used) / 2;
      const baseline = y + l.numH;                 // one line for the whole row
      l.idx.forEach((i) => {
        const s = sizes[i];
        out[i] = { ...s, cx: x + s.w / 2, cy: baseline - s.numH + s.h / 2 };
        x += s.w + extra + gapX;
      });
      y += l.h + gapY;
    });
    return out;
  }

  // As large as the figures will go inside the area, never above `maxFont`.
  function pack(entries, area, maxFont) {
    let lo = 6, hi = maxFont, best = null;
    for (let k = 0; k < 20; k++) {
      const F = (lo + hi) / 2;
      const got = rows(entries, F, area);
      if (got) { best = got; lo = F; } else { hi = F; }
    }
    return best || rows(entries, 6, area, true);
  }

  const inset = (a, kw, kh) => ({
    x: a.x + (a.w * (1 - kw)) / 2,
    y: a.y + (a.h * (1 - kh)) / 2,
    w: a.w * kw,
    h: a.h * kh
  });

  const entry = (t, w, opts = {}) => ({ m: opts.one ? t.one : t.m, w, bare: !!opts.bare });

  let L = null;

  function relayout() {
    const w = stage.clientWidth || 900;
    const h = stage.clientHeight || 500;
    // A strip along the bottom edge belongs to whatever line the scene is
    // speaking, so nothing has to move aside when one of them turns up. It is
    // measured, not guessed: on a narrow screen the last line takes two rows.
    const strip = Math.max(30, lines.last.offsetHeight + 14);
    const area = { x: 0, y: 0, w, h: Math.max(80, h - strip) };

    const board = tiles.map((t) => entry(t, t.w));
    const flat = tiles.map((t, i) => entry(t, 1, { one: i === STAR }));
    const one = entry(star, 1, { one: true, bare: true });
    const hero = Math.min(area.h * 0.78, (area.w * 0.9 * REF) / star.one.numW);

    L = {
      solo: pack([entry(tiles[0], 1)], inset(area, 0.88, 0.62), 340),
      trio: pack([0, 1, 2].map((i) => entry(tiles[i], tiles[i].w)), inset(area, 0.94, 0.5), 220),
      board: pack(board, area, 140),
      alone: pack([entry(star, 1)], inset(area, 0.8, 0.5), 280),
      hero: rows([one], hero, area, true),
      small: rows([one], SMALL, area, true),
      flat: pack(flat, area, 60)
    };
  }

  // ---------- Moving ----------
  // Every change of state is the same move: each figure is told where it ends
  // up and how large it is there, and is then carried over from wherever it
  // was. The type size is set at once and the difference is taken up by a
  // scale, so nothing is animated by reflow and the figures are crisp at rest.
  function apply(targets, { dur = 620, delay = () => 0 } = {}) {
    const d = still ? 0 : dur;
    const fade = Math.min(d, 420);

    tiles.forEach((t, i) => {
      const to = targets[i];
      const wait = still ? 0 : delay(i);
      if (!to || !to.a) {
        t.el.style.transition = `opacity ${fade}ms ease ${wait}ms`;
        t.el.style.opacity = '0';
        if (t.at) t.at = { ...t.at, a: 0 };
        return;
      }
      if (to.face) {
        t.numEl.textContent = to.face === 'one' ? '1' : t.value;
        t.capEl.textContent = to.face === 'one' ? 'вы' : t.text;
      }
      t.numEl.style.fontSize = `${to.num}px`;
      t.capEl.style.fontSize = `${to.cap}px`;
      t.el.style.gap = `${to.gap}px`;
      t.el.classList.toggle('is-bare', !!to.bare);
      t.el.classList.toggle('is-hse', !!to.hse);

      const from = t.at && t.at.a ? t.at : { cx: to.cx, cy: to.cy, num: to.num * 0.86, a: 0 };
      t.el.style.transition = 'none';
      t.el.style.transform = `translate(${from.cx}px, ${from.cy}px) translate(-50%, -50%)`
        + ` scale(${from.num / to.num})`;
      t.el.style.opacity = `${from.a}`;
      t.next = { to, wait };
    });

    // One reflow for all of them, and then everybody sets off together.
    void stage.offsetWidth;

    tiles.forEach((t) => {
      if (!t.next) return;
      const { to, wait } = t.next;
      t.next = null;
      t.el.style.transition = `transform ${d}ms ${EASE} ${wait}ms, opacity ${fade}ms ease ${wait}ms`;
      t.el.style.transform = `translate(${to.cx}px, ${to.cy}px) translate(-50%, -50%) scale(1)`;
      t.el.style.opacity = '1';
      t.at = { ...to, a: 1 };
    });
  }

  // Builds a target for every figure: `keys` says which of them are on screen
  // and in what order they sit in the layout.
  function state(layout, keys, extra = {}) {
    return tiles.map((t, i) => {
      const k = keys.indexOf(i);
      if (k < 0) return { a: 0 };
      return { ...layout[k], a: 1, ...(extra[i] || {}) };
    });
  }

  const alone = (extra = {}) => tiles.map((t, i) => (i === STAR ? { ...L.alone[0], a: 1, ...extra } : { a: 0 }));

  // ---------- The count ----------
  let counting = null;
  const stopCount = () => { if (counting) { cancelAnimationFrame(counting); counting = null; } };

  // 77 687 falling to 1, with an equal share of the time for every digit it
  // loses: the fall slows down of its own accord and the last dozens can be
  // read one by one. The figure shrinks to the size of a caption on the way.
  function count(done) {
    stopCount();
    const from = L.alone[0], to = L.small[0];
    const t0 = performance.now();
    const dur = 3000;
    star.el.classList.add('is-bare');
    star.el.style.transition = 'none';

    if (still) { done(); return; }

    const frame = (now) => {
      const raw = Math.min(1, (now - t0) / dur);
      const u = 1 - Math.pow(1 - raw, 1.6);
      const left = Math.max(1, Math.round(Math.pow(HSE_TOTAL, 1 - u)));
      star.numEl.textContent = nf(left);
      star.numEl.style.fontSize = `${from.num + (to.num - from.num) * u}px`;
      star.el.style.transform =
        `translate(${from.cx + (to.cx - from.cx) * u}px, ${from.cy + (to.cy - from.cy) * u}px)`
        + ' translate(-50%, -50%) scale(1)';
      if (raw < 1) { counting = requestAnimationFrame(frame); return; }
      counting = null;
      done();
    };
    counting = requestAnimationFrame(frame);
  }

  // Lands the star on its small «1», wherever the count happened to get to.
  function landOne() {
    stopCount();
    const to = L.small[0];
    star.numEl.textContent = '1';
    star.capEl.textContent = 'вы';
    star.numEl.style.fontSize = `${to.num}px`;
    star.el.classList.add('is-bare');
    star.el.classList.remove('is-hse');
    star.el.style.transition = 'none';
    star.el.style.transform = `translate(${to.cx}px, ${to.cy}px) translate(-50%, -50%) scale(1)`;
    star.el.style.opacity = '1';
    star.at = { ...to, a: 1 };
  }

  // Back from the end of the scene: the star is the whole university again.
  function restore() {
    star.numEl.textContent = star.value;
    star.capEl.textContent = star.text;
    star.el.classList.remove('is-bare', 'is-hse');
  }

  // ---------- The scene ----------
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, still ? 0 : ms)); };
  const clearLater = () => timers.splice(0).forEach(clearTimeout);

  // Figures leave in a shuffled order — but always the same shuffle, so
  // scrolling back and forth does not deal the screen again.
  const OUT = ALL.filter((i) => i !== STAR)
    .map((i) => ({ i, k: (Math.sin(i * 12.9898) * 43758.5453) % 1 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.i);

  // Both floods run on the same curve: the gaps between arrivals get shorter
  // as they go, so the screen fills up — and empties — quicker and quicker.
  function rush(order, span, hold = 0) {
    const place = new Map(order.map((v, k) => [v, k]));
    const n = Math.max(1, order.length - 1);
    return (i) => {
      const k = place.get(i);
      return k === undefined ? 0 : hold + span * (1 - Math.pow(1 - k / n, 1.8));
    };
  }

  const LATE = ALL.filter((i) => i > 2);           // everything past the opening three

  function play(i) {
    clearLater();
    stopCount();
    if (!L) relayout();
    if (i <= 5) restore();
    say(null);

    // One number, alone, in the middle of the screen.
    if (i === 0) { apply(state(L.solo, [0])); return; }

    // It steps aside and shrinks; two more come and stand next to it.
    if (i === 1) { apply(state(L.trio, [0, 1, 2])); return; }

    // Every figure of the page, one after another, quicker and quicker, until
    // there is nowhere left to put them. The next step only holds still while
    // the question that turns the scene comes up underneath.
    if (i === 2 || i === 3) {
      apply(state(L.board, ALL), { delay: rush(LATE, 1500, 120) });
      if (i === 3) later(() => say('turn'), 900);
      return;
    }

    // They go out one by one, and the largest of them is left on its own.
    if (i === 4) {
      apply(alone(), { dur: 800, delay: (k) => (k === STAR ? 1350 : rush(OUT, 1400)(k)) });
      return;
    }

    // And it falls.
    if (i === 5) {
      apply(alone(), { dur: 0 });
      later(() => count(landOne), 300);
      return;
    }

    // One. It stands there for a moment, and then grows past everything that
    // has been on this screen.
    if (i === 6) {
      apply(tiles.map(() => ({ a: 0 })), { dur: 0 });
      landOne();
      later(() => {
        apply(tiles.map((t, k) => (k === STAR ? { ...L.hero[0], a: 1, hse: true } : { a: 0 })), { dur: 760 });
      }, 900);
      later(() => say('you'), 1600);
      return;
    }

    // Everything comes back, all of it the same size, and the one stands among
    // the rest — no larger than any of them.
    apply(state(L.flat, ALL, { [STAR]: { face: 'one', hse: true } }),
      { dur: 760, delay: rush(ALL.filter((k) => k !== STAR), 700, 140) });
    later(() => say('last'), 800);
  }

  // ---------- Wiring ----------
  let shown = -1;

  measure();
  relayout();

  // Type arrives after the page does; measure again once it is really there.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measure();
      relayout();
      if (shown >= 0) play(shown);
    });
  }

  new ResizeObserver(() => {
    relayout();
    if (shown >= 0) play(shown);
  }).observe(stage);

  return {
    step(i) {
      shown = i;
      play(i);
    }
  };
}
