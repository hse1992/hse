// Trains long enough to carry everyone the university admits in a year.
// They snake down the screen from the top left corner and disappear into the
// tunnel at the bottom right, only to come out of the first one again.

import { CITIES, ADMITTED } from '../data/hse.js';
import { nf, plural } from '../lib/format.js';
import { mountCanvas } from '../lib/ui.js';
import { loadMark } from '../lib/hse-mark.js';

// Facts about the transport itself — they live here, not in data/hse.js, which
// only knows about the university. 165 people is a packed metro car at rush
// hour, eight cars make one train; an electric bus holds 85.
const PER_CAR = 165;
const TRAIN = 8;
const PER_BUS = 85;

// Every city takes a whole number of cars and buses: nobody rides half of one.
const carsOf = (c) => Math.ceil(c.admitted / PER_CAR);
const busesOf = (c) => Math.ceil(c.admitted / PER_BUS);
const CARS_TOTAL = CITIES.reduce((n, c) => n + carsOf(c), 0);
const BUSES_TOTAL = CITIES.reduce((n, c) => n + busesOf(c), 0);
const TRAINS = Math.floor(CARS_TOTAL / TRAIN);

// The two ways to carry the same people. `of` is how many vehicles a city
// needs, the rest is what the cards and the legend say about them.
const MODES = [
  {
    key: 'bus',
    label: 'На электробусе',
    of: busesOf,
    stop: 'остановка',
    title: 'Электробусов',
    noun: ['электробус', 'электробуса', 'электробусов'],
    legend: `Это электробус. Он вмещает ${PER_BUS} ${plural(PER_BUS, 'вышкинца', 'вышкинца', 'вышкинцев')}`
  },
  {
    key: 'metro',
    label: 'На метро',
    of: carsOf,
    stop: 'станция',
    title: 'Вагонов метро',
    noun: ['вагон', 'вагона', 'вагонов'],
    legend: `1 поезд — ${TRAIN} вагонов, в каждом вагоне ${PER_CAR} человек`
  }
];

// The train is drawn from its last car forward, so the city drawn first ends
// up at the rear: Moscow brings up the rear and Perm leads.
const TAIL_FIRST = CITIES.slice();

const HOLDS = `Он вмещает ${PER_BUS} ${plural(PER_BUS, 'вышкинца', 'вышкинца', 'вышкинцев')}`;

// The electric bus drawn after assets/electrobus.jpeg, with the caption painted
// along its side. It is needed twice — in the title card and in the legend of
// the picture — and the clip path inside it has to be named anew each time, or
// the second bus would be cut by the shape of the first.
function busPicture(id, cls, attrs = '') {
  const body = 'M116 30a22 22 0 0 1 22-22h396a22 22 0 0 1 22 22v78'
    + 'a8 8 0 0 1-8 8H124a8 8 0 0 1-8-8z';
  return `
    <svg class="${cls}" ${attrs} viewBox="110 0 452 132"
         role="img" aria-label="Это электробус. ${HOLDS}">
      <!-- the scallops are painted on the body, so they are cut by it -->
      <clipPath id="${id}"><path d="${body}"></path></clipPath>
      <!-- body: flat roof, both ends of the same shape, four lengths
           to one height as on the photograph -->
      <path d="${body}" fill="var(--ebus-body)"></path>
      <path d="M112 22q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0v-16H112z" fill="var(--ebus-wave)" clip-path="url(#${id})"></path>
      <!-- windows, the two doors and the windscreen at the front -->
      <g fill="var(--ebus-glass)">
        <rect x="128" y="26" width="60" height="40" rx="7"></rect>
        <rect x="194" y="26" width="60" height="40" rx="7"></rect>
        <rect x="326" y="26" width="60" height="40" rx="7"></rect>
        <rect x="458" y="26" width="60" height="40" rx="7"></rect>
        <rect x="260" y="26" width="60" height="62" rx="7"></rect>
        <rect x="392" y="26" width="60" height="62" rx="7"></rect>
        <rect x="536" y="26" width="20" height="48" rx="6" clip-path="url(#${id})"></rect>
      </g>
      <!-- lights -->
      <rect x="540" y="92" width="14" height="12" rx="3" fill="var(--ebus-light)"></rect>
      <rect x="120" y="92" width="14" height="12" rx="3" fill="var(--ebus-stop)"></rect>
      <!-- the caption, painted right across the middle of the side -->
      <g text-anchor="middle" fill="#FFFFFF">
        <text x="330" y="60" font-size="34" font-weight="700">Это электробус.</text>
        <text x="330" y="86" font-size="20" font-weight="600">${HOLDS}</text>
      </g>
      <!-- wheels: whole, standing a fifth of themselves below the body -->
      <g>
        <circle cx="196" cy="106" r="17" fill="var(--bus-wheel)"></circle>
        <circle cx="196" cy="106" r="6.5" fill="var(--ebus-hub)"></circle>
        <circle cx="470" cy="106" r="17" fill="var(--bus-wheel)"></circle>
        <circle cx="470" cy="106" r="6.5" fill="var(--ebus-hub)"></circle>
      </g>
    </svg>`;
}

// The three sentences of the subtitle, told one by one. The reader gets the
// number of first-years first, then what it takes to carry them by bus, then
// the same by metro — each with the thing itself and how many of them.
const SAID = [
  `За одну приемную кампанию Вышка зачислила ${nf(ADMITTED)} ${plural(ADMITTED, 'первокурсника', 'первокурсника', 'первокурсников')}.`,
  `Чтобы увезти их всех разом, нужно ${nf(BUSES_TOTAL)} ${plural(BUSES_TOTAL, 'электробус', 'электробуса', 'электробусов')}.`,
  `А на метро — ${nf(CARS_TOTAL)} ${plural(CARS_TOTAL, 'вагон', 'вагона', 'вагонов')}, то есть ${TRAINS} ${plural(TRAINS, 'полный поезд', 'полных поезда', 'полных поездов')}`
];

export const meta = {
  id: 'metro',
  // The title card of the section fills in as the reader scrolls: first the
  // heading with one sentence, then a sentence and a picture at a time.
  introStages: 3,
  // The word before the name depends on what the reader is riding, so the
  // module changes it when the mode is switched.
  // The name of the station is the station board itself — the same one in
  // both modes.
  title: 'Следующая <span data-el="stop">остановка</span> '
    + '<img class="metro-tablo" src="assets/tablo-vyshkinskaya.svg" alt="Вышкинская">',
  // Everything below the first line belongs to the title card: the pictures
  // and the multipliers fold away as the card settles, and what is left reads
  // as the plain subtitle of the section. All of it is phrasing content — the
  // page shell puts the subtitle inside a <p>.
  subtitle: `
    <span class="metro-brief">
      <span class="metro-brief-line">${SAID[0]}</span>
      <span class="metro-brief-line intro-stage" data-stage="1">
        <span>${SAID[1]}</span>
        <span class="metro-brief-fig metro-brief-fig-bus">
          ${busPicture('ebus-brief', 'metro-brief-bus')}
          <span class="metro-brief-times">&times;&nbsp;${nf(BUSES_TOTAL)}</span>
        </span>
      </span>
      <span class="metro-brief-line intro-stage" data-stage="2">
        <span>${SAID[2]}</span>
        <span class="metro-brief-fig metro-brief-fig-train">
          <!-- the styles of the module arrive with the module, a moment after
               the shell has drawn the heading, and the file is 5446 px wide:
               this keeps it in the page for that moment -->
          <img class="metro-brief-train" style="max-width: 100%"
               src="assets/metro-train.png" alt="" aria-hidden="true">
          <span class="metro-brief-times">&times;&nbsp;${TRAINS}</span>
        </span>
      </span>
    </span>`
};

export function init(root) {
  'use strict';

  // Canvas has no CSS variables — same values as the tokens of the same name.
  const RAIL = '#C9CFD8';
  const SLEEPER = '#DCE0E6';
  const CAR_STRIPE = 'rgba(255, 255, 255, 0.5)';
  const WHEEL = '#2A2E35';
  const ROAD_FILL = '#F1F3F6';
  const ROAD_EDGE = '#AEB6C2';
  const ROAD_LINE = '#C2C9D3';
  const SIGN_BLUE = '#1668E0';
  const SIGN_EDGE = '#1A1D22';
  const TUNNEL = '#464C56';
  const COUPLING = '#8B929C';
  const HSE_BLUE = '#102D69';

  const M = 22;                 // margin around the track
  const GAP = 0.26;             // coupling between cars, in car lengths
  const TRAIN_GAP = 4;          // gap between trains, same units
  const SHARE = 0.51;           // how much of the track all the trains take
  const MIN_CAR = 11;           // below this the stripes stop reading, px
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

      /* The name of the station in the title of the section — the board of a
         carriage, with the name lit on it. The heading is drawn by the page
         shell, but the title belongs to this module, so the picture is styled
         here. Width, not height, sets the size: the board is 5,6 times as wide
         as it is tall, so on a narrow screen it shrinks whole instead of
         running past the edge.
         The numbers make the lit word sit in the line as if it were typed. In
         the file the board is 1108 by 198, and the lamps of the word run from
         52,2 to 145,8 down it — 93,6 tall. At 8,46em wide one unit of the file
         is 0,00764em, so the word comes out 0,715em tall, the cap height of
         the heading. Its feet stand 0,4em above the bottom edge of the board,
         so dropping the board by that much puts them on the baseline. */
      .metro-tablo {
        display: inline-block;
        width: min(100%, 8.46em);
        height: auto;
        vertical-align: -0.4em;
      }

      /* The subtitle of the section, which doubles as the title card. The card
         is what the reader meets first: the heading with one sentence, then a
         sentence and a picture at a time as they scroll. The shell squeezes
         each .intro-stage shut until its turn comes; everything here is about
         what happens afterwards, when the card settles into a plain subtitle.

         --intro-body is how far it has settled, 0 on the card and 1 in place.
         The pictures fold away over that stretch and the blank lines between
         the sentences close up, so what is left is an ordinary paragraph. The
         fold runs three times as fast as the card: the heading is still on its
         way down when the card is already a paragraph, and the two do not have
         to cross each other on the screen. */
      .metro-brief {
        --fold: clamp(0, 1 - var(--intro-body, 1) * 3, 1);
        display: flex;
        flex-direction: column;
        gap: calc(var(--fold) * 1.8em);       /* two blank lines between them */
      }

      /* A plain block, not a column: the shell squeezes a stage shut by its
         height, and the parts of a flex column would be squeezed along with
         it — the block would then have nothing left to report as the height it
         wants to grow to. */
      .metro-brief-line {
        display: block;
      }

      /* The picture of a stage, with its multiplier beside it. Its height is
         written down rather than measured, so that folding it away is a matter
         of one number going to zero; the picture inside keeps to that height
         and shrinks with it instead of being cut off. */
      .metro-brief-fig {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: calc(var(--fold) * 0.5em);
        height: calc(var(--fold) * var(--fig-h));
        opacity: var(--fold);
        overflow: hidden;
      }

      .metro-brief-fig-bus { --fig-h: 48px; }
      .metro-brief-fig-train { --fig-h: 40px; }

      /* The bus keeps to the height of the row and takes the width that goes
         with it, but it gives that width up when the screen is too narrow for
         it and the multiplier both — the drawing then fits itself into what is
         left instead of running off the edge. */
      .metro-brief-bus {
        flex: 0 1 auto;
        min-width: 0;
        height: 100%;
        width: auto;
      }

      /* The train is 31 lengths to one height, so it takes the whole width it
         is given and object-fit finds the height that fits. */
      .metro-brief-train {
        flex: 1;
        min-width: 0;
        height: 100%;
        object-fit: contain;
        object-position: left center;
      }

      .metro-brief-times {
        flex: none;
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--text);
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      /* On a phone the card is read on a screen it has to fit into whole, so
         the pictures give up the height they can spare. */
      @media (max-width: 860px) {
        .metro-brief-fig { gap: 10px; }
        .metro-brief-fig-bus { --fig-h: 24px; }
        .metro-brief-fig-train { --fig-h: 24px; }
        .metro-brief-times { font-size: 1.0625rem; }
      }

      /* The legend sample is a whole train, so it replaces the single bar of
         .canvas-legend-swatch with eight little cars. */
      .metro-legend-train {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        flex: none;
      }

      /* Same car as on the track: a body in the colour of the row with a
         lighter stripe down the middle of the roof. */
      .metro-legend-train i {
        width: 11px;                 /* same 2,4 : 1 as a car on the track */
        height: 5px;
        border-radius: 1px;
        background:
          linear-gradient(
            to bottom,
            transparent 0 34%,
            var(--metro-car-stripe) 34% 66%,
            transparent 66% 100%
          ),
          currentColor;
      }

      /* A whole train across the picture, under the legend of the metro mode. */
      .metro-train {
        display: block;
        width: 100%;
        height: auto;
        margin: 4px 0 22px;          /* the air that separates it from the roads */
      }

      /* The legend of the bus mode is the bus itself, drawn after the photo in
         assets/electrobus.jpeg, with the caption painted on its side. It keeps
         to the middle of the picture below it, whatever the width of the
         screen, while the little bus from the animation stays in the corner
         and an arrow runs between them. */
      .metro-bus-legend {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 92px;
        /* line up with the picture, not the padding, and keep the same air
           above the animation as the metro mode has */
        margin: 0 -4px 16px;
      }

      .metro-legend-sample {
        position: absolute;
        left: 0;
        top: 4px;
      }

      .metro-legend-arrow {
        position: absolute;
        left: 0;
        top: 0;
        overflow: visible;
      }

      .metro-legend-bus {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 0;
        height: 100%;
        width: auto;
      }

      @media (max-width: 860px) {
        .metro-bus-legend { height: 66px; }
      }

      /* The switch between the two modes stands above both columns, so the
         city cards and the score card start at the same height. */
      .metro-inner {
        flex: 1;
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .metro-cols {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 16px;
        align-items: stretch;
      }

      .metro-switch {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 2px 0;
      }

      .metro-switch-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--check-inactive-label);
        cursor: pointer;
        user-select: none;
        transition: color 160ms ease;
      }

      .metro-switch-label.on {
        color: var(--text);
        font-weight: 600;
      }

      @media (max-width: 860px) {
        .metro-score-value { font-size: 2.5rem; }
        .metro-score-note { font-size: 0.875rem; }

        /* On phones the wrappers dissolve and the section itself lays out the
           picture, the switch and the cities. */
        .metro-inner,
        .metro-cols { display: contents; }
      }
    </style>

    <div class="metro-inner">
      <div class="metro-switch" data-el="modeSwitch">
        <span class="metro-switch-label" data-value="${MODES[0].key}">${MODES[0].label}</span>
        <button type="button" class="toggle" role="switch"><span class="toggle-knob"></span></button>
        <span class="metro-switch-label" data-value="${MODES[1].key}">${MODES[1].label}</span>
      </div>

      <div class="metro-cols">
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
            <div class="metro-score">
              <span class="metro-score-value" data-el="count"></span>
              <span class="metro-score-note">на <span data-el="people"></span> принятых студентов</span>
            </div>
          </div>

          <div class="canvas-card">
            <div class="canvas-legend">
              <span class="metro-legend-train" data-el="legendTrain" aria-hidden="true">${'<i></i>'.repeat(TRAIN)}</span>
              <div class="metro-bus-legend" data-el="busLegend">
                <!-- the same bus as the ones driving on the roads below, seen
                     from above: the module sizes it to what they measure there -->
                <svg class="metro-legend-sample" data-el="legendSample" viewBox="0 0 56 26.8" aria-hidden="true">
                  <g fill="var(--bus-wheel)">
                    <rect x="7.6" y="0" width="9.5" height="6.8" rx="2"></rect>
                    <rect x="39" y="0" width="9.5" height="6.8" rx="2"></rect>
                    <rect x="7.6" y="20" width="9.5" height="6.8" rx="2"></rect>
                    <rect x="39" y="20" width="9.5" height="6.8" rx="2"></rect>
                  </g>
                  <rect x="0" y="3.4" width="56" height="20" rx="6" fill="currentColor"></rect>
                </svg>
                <!-- the arrow from one to the other, drawn by the module: how
                     far they stand apart depends on the width of the screen -->
                <svg class="metro-legend-arrow" data-el="legendArrow" aria-hidden="true">
                  <path data-el="arrowLine" fill="none" stroke="var(--ebus-arrow)" stroke-width="1.6"></path>
                  <path data-el="arrowHead" fill="var(--ebus-arrow)"></path>
                </svg>

                ${busPicture('ebus-legend', 'metro-legend-bus', 'data-el="legendBus"')}
              </div>
              <span data-el="legendText"></span>
            </div>
            <img class="metro-train" data-el="trainPhoto" src="assets/metro-train.png"
                 alt="" aria-hidden="true">
            <div class="canvas-wrap" data-el="canvasWrap"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = {
    mode: MODES[0].key,
    active: { msk: true, spb: true, nn: true, perm: true }
  };

  const mode = () => MODES.find((m) => m.key === state.mode);

  // Vehicles currently on the screen, per city. Fractional while a city is
  // coming or going: the last one grows out of nothing and pushes the rest.
  const shown = {};
  let tween = null;                 // { from, to, t0 }

  const targets = () => {
    const out = {};
    CITIES.forEach((c) => { out[c.key] = state.active[c.key] ? mode().of(c) : 0; });
    return out;
  };

  // how: 'instant' — no animation at all (the first paint); 'fill' — grow from
  // an empty screen, used when the vehicles themselves change and the previous
  // count means nothing; otherwise the count moves from where it was.
  function animateTo(target, how) {
    if (how === 'instant') {
      Object.assign(shown, target);
      tween = null;
      return;
    }
    const from = {};
    CITIES.forEach((c) => { from[c.key] = how === 'fill' ? 0 : (shown[c.key] || 0); });
    tween = { from, to: target, t0: performance.now() };
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
      const carW = Math.min(car * 0.42, dy * 0.4);
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

    // The polyline shifted along its normal by `d` — the two rails are the
    // same line, moved aside.
    const offset = (d) => {
      const path = new Path2D();
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y;
        const m = Math.hypot(dx, dy) || 1;
        const x = p.x - (dy / m) * d, y = p.y + (dx / m) * d;
        if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
      });
      return path;
    };

    // Two rails. They stick out a little from under the cars, which are narrow
    // at this scale.
    const gauge = Math.max(1.1, L.carW * 0.55);
    const rails = [gauge, -gauge].map(offset);

    // Sleepers under the rails: short ticks across the track, evenly spaced
    // along the whole snake.
    const sleepers = new Path2D();
    const step = Math.max(5, L.car * 0.55);
    const half = gauge + Math.max(1, L.carW * 0.3);
    let next = step / 2;
    for (let i = 1; i < pts.length && next < len; i++) {
      while (cum[i] >= next && next < len) {
        const a = pts[i - 1], b = pts[i];
        const f = (next - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
        const dx = b.x - a.x, dy = b.y - a.y;
        const m = Math.hypot(dx, dy) || 1;
        const nx = (-dy / m) * half, ny = (dx / m) * half;
        const x = a.x + dx * f, y = a.y + dy * f;
        sleepers.moveTo(x - nx, y - ny);
        sleepers.lineTo(x + nx, y + ny);
        next += step;
      }
    }

    return {
      pts, cum, len, rails, sleepers,
      car: L.car, carW: L.carW, straight: L.straight, dy: L.dy
    };
  }

  let track = null, flock = null, trackKey = '';
  let mark = null;                  // the HSE mark, once it is loaded
  // When the current mode started: switching modes runs its animation from
  // the beginning rather than dropping the reader into the middle of it.
  let epoch = performance.now();

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

  // A car seen from above, drawn after assets/metro-car-top.svg: a rounded
  // body in the colour of the city, with a lighter stripe along the roof.
  // A car is rigid, so on a turn it sits on the chord between its ends instead
  // of bending with the rails.
  function drawCar(s0, s1, color) {
    const w = track.carW;
    pieces(s0, s1).forEach(([s, e]) => {
      const a = at(s), b = at(e);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.2) return;

      ctx.save();
      ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.rotate(Math.atan2(dy, dx));

      ctx.fillStyle = color;
      ctx.beginPath();
      const r = Math.min(w * 0.16, len / 2);
      if (ctx.roundRect) ctx.roundRect(-len / 2, -w / 2, len, w, r);
      else ctx.rect(-len / 2, -w / 2, len, w);
      ctx.fill();

      // One stripe down the middle of the roof, from end to end.
      const stripeW = Math.max(1, w * 0.32);
      ctx.fillStyle = CAR_STRIPE;
      ctx.fillRect(-len / 2, -stripeW / 2, len, stripeW);
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

  // ---------- The buses ----------
  // A road of many lanes, buses driving left to right along it. A lane holds
  // the same number of buses as any other and loops into itself: the loop is a
  // screen plus one bus, so a bus leaves the screen at one edge and comes back
  // at the other one, never in the middle. Lanes are built for the whole
  // university — a bus keeps its size whatever is selected.
  const BUS_RATIO = 2.8;        // length : width of a bus seen from above
  const SEC_ACROSS = 13;        // how long a bus takes to cross the screen
  const SNUG = 0.72;            // how much of its cell a bus takes up
  const BLOCK = 0.5;            // the column is at most half the road long

  function signFontSize(w) {
    return Math.max(9, Math.min(15, w / 58));
  }

  // Every city gets a road of its own, wide enough for all of its buses, and
  // a sign with its name at the end of it. The roads are built for the whole
  // university, so they stay put — only the buses on them come and go.
  function buildFlock(w, h) {
    // The roads run the whole width of the picture; the signs stand at the
    // end of them, on the road itself.
    const font = signFontSize(w);
    const roadW = w;

    // Every road carries its sign above it, so each one needs a strip of
    // ground of its own on top. The sign stands closer to its own road than
    // to the one above, so it is clear whose name it is.
    const signH = font * 2, below = font * 0.35, above = font * 1.3;
    const strip = signH + below + above;
    const forSigns = strip * CITIES.length;

    const lanesFor = (perRow) => CITIES.map((c) => Math.max(1, Math.ceil(busesOf(c) / perRow)));

    let best = null;
    for (let perRow = 4; perRow <= 26; perRow++) {
      const lanes = lanesFor(perRow);
      const total = lanes.reduce((a, b) => a + b, 0);
      // Two things keep a bus small: a column takes half of its road across,
      // and all the roads with their signs have to fit down the picture.
      const byWidth = (BLOCK * SNUG * roadW) / (perRow * BUS_RATIO);
      const byHeight = (SNUG * (h - 2 * M - forSigns)) / total;
      const busW = Math.min(byWidth, byHeight);
      if (!best || busW > best.busW) best = { perRow, lanes, total, busW };
    }

    const busW = best.busW, busL = busW * BUS_RATIO;
    const rowH = busW / SNUG;
    const height = best.total * rowH + forSigns;

    let cursor = (h - height) / 2;
    const roads = CITIES.map((c, ci) => {
      const road = { city: c, lanes: best.lanes[ci], top: cursor + strip };
      cursor = road.top + road.lanes * rowH;
      return road;
    });

    const slot = busL / SNUG;
    return {
      perRow: best.perRow, roads, roadW, rowH, busL, busW, slot, font,
      // The loop is long enough for the whole column to leave the road on the
      // right before its first bus comes back on the left. The half a slot is
      // the shift of every other lane: without it the last bus of a shifted
      // lane runs past the loop and pops up at the wrong end.
      loop: roadW + busL + (best.perRow - 0.5) * slot
    };
  }

  // One road: asphalt, a solid line along each side, a dashed one between the
  // lanes, and the sign with the name of the city at the end of it. The
  // markings stand still — only the buses move.
  function paintRoad(road) {
    const { rowH, busL, busW, roadW } = flock;
    const height = road.lanes * rowH;
    const line = (y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(roadW, y);
      ctx.stroke();
    };

    ctx.fillStyle = ROAD_FILL;
    ctx.fillRect(0, road.top, roadW, height);

    ctx.lineCap = 'butt';
    ctx.strokeStyle = ROAD_EDGE;
    ctx.lineWidth = Math.max(1.2, busW * 0.12);
    line(road.top);
    line(road.top + height);

    ctx.strokeStyle = ROAD_LINE;
    ctx.lineWidth = Math.max(0.8, busW * 0.08);
    ctx.setLineDash([busL * 0.3, busL * 0.42]);
    for (let i = 1; i < road.lanes; i++) line(road.top + i * rowH);
    ctx.setLineDash([]);
  }

  // The sign every road ends with — a white plate with a blue field and the
  // name of the city on it, after the one in assets/roadsign.jpg.
  function paintSign(road, w) {
    const font = flock.font;
    const name = road.city.name.toUpperCase();
    ctx.font = `700 ${font}px 'HSE Sans', sans-serif`;
    const plateH = font * 2, plateW = ctx.measureText(name).width + font * 1.6;
    // Standing on the ground above the road, at the end of it.
    const x = w - plateW - font * 0.4;
    const y = road.top - font * 0.35 - plateH;
    const pad = Math.max(1.2, font * 0.16);

    const plate = (px, py, pw, ph, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, r); else ctx.rect(px, py, pw, ph);
    };

    plate(x, y, plateW, plateH, plateH * 0.22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = SIGN_EDGE;
    ctx.lineWidth = Math.max(0.6, font * 0.06);
    ctx.stroke();

    plate(x + pad, y + pad, plateW - 2 * pad, plateH - 2 * pad, (plateH - 2 * pad) * 0.2);
    ctx.fillStyle = SIGN_BLUE;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x + plateW / 2, y + plateH / 2 + font * 0.06);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // A bus from above: a rounded body in the colour of the city with four black
  // wheels peeking out from under it. `part` grows the last one into place.
  function drawBus(x, y, color, part) {
    const L = flock.busL * part, W = flock.busW * part;
    if (L < 0.5) return;

    ctx.fillStyle = WHEEL;
    const ww = L * 0.17, wh = Math.max(1, W * 0.34);
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sy) => {
        ctx.beginPath();
        const rx = x + sx * L * 0.28 - ww / 2;
        const ry = y + sy * (W / 2) - wh / 2;
        if (ctx.roundRect) ctx.roundRect(rx, ry, ww, wh, Math.min(1.5, wh / 2));
        else ctx.rect(rx, ry, ww, wh);
        ctx.fill();
      });
    });

    ctx.fillStyle = color;
    ctx.beginPath();
    const r = Math.min(W * 0.3, L / 2);
    if (ctx.roundRect) ctx.roundRect(x - L / 2, y - W / 2, L, W, r);
    else ctx.rect(x - L / 2, y - W / 2, L, W);
    ctx.fill();
  }

  function paintBuses(t, w) {
    const { roads, roadW, rowH, perRow, slot, busL, loop } = flock;
    const drift = still ? 0 : ((t - epoch) / 1000) * (roadW / SEC_ACROSS);
    // A column starts its ride outside the picture on the left, with the
    // first bus at the edge: from there it drives the whole road. The hair
    // taken off keeps the last bus from wrapping round to the other end.
    const start = roadW + busL - 0.01;

    roads.forEach((road) => paintRoad(road));

    roads.forEach((road) => {
      const color = road.city.color;
      let i = 0;
      for (let left = shown[road.city.key] || 0; left > 0.02; left -= 1, i += 1) {
        const lane = Math.min(road.lanes - 1, Math.floor(i / perRow));
        // Every other lane is shifted by half a slot, so the traffic does not
        // line up into walls of buses.
        const phase = (lane % 2) * slot * 0.5;
        const back = (((i % perRow) * slot + phase + start - drift) % loop + loop) % loop;
        const y = road.top + (lane + 0.5) * rowH;
        drawBus(roadW + busL / 2 - back, y, color, Math.min(1, left));
      }
    });

    roads.forEach((road) => paintSign(road, w));
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
    if (key !== trackKey) {
      track = buildTrack(cssW, cssH);
      flock = buildFlock(cssW, cssH);
      trackKey = key;
      syncLegendSample();
    }

    if (state.mode === 'bus') { paintBuses(t, cssW); return; }

    // track: sleepers first, rails over them
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = SLEEPER;
    ctx.lineWidth = Math.max(0.75, track.carW * 0.13);
    ctx.stroke(track.sleepers);
    ctx.strokeStyle = RAIL;
    ctx.lineWidth = Math.max(0.9, track.carW * 0.16);
    track.rails.forEach((rail) => ctx.stroke(rail));

    // trains: the whole chain of cars, city after city, cut into eights.
    // Cars of one train are coupled; between trains there is just a gap.
    // Laid out back to front, so that Perm leads and Moscow brings up the rear.
    // The city in front rides a whole train: the cars it does not fill go
    // grey and empty at the head of the column.
    const chain = [];
    TAIL_FIRST.forEach((c) => {
      for (let left = shown[c.key] || 0; left > 0.02; left -= 1) {
        chain.push({ color: c.color, part: Math.min(1, left) });
      }
    });

    const gap = track.car * GAP, trainGap = track.car * TRAIN_GAP;
    let s = still ? 0 : ((t - epoch) / 1000) * (track.straight / SEC_PER_ROW);
    let prev = null;                 // back of the car in front, if coupled
    chain.forEach((car, i) => {
      const end = s + track.car * car.part;
      if (prev !== null) drawCoupling(prev, s);
      drawCar(s, end, car.color);
      s = end + gap;
      prev = end;
      // Trains are counted from the head, so a train short of eight cars
      // would be the last one — with the grey cars there is none.
      const ahead = chain.length - 1 - i;
      if (ahead > 0 && ahead % TRAIN === 0) { s += trainGap * car.part; prev = null; }
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
  const scoreTitleEl = $('scoreTitle');
  // The heading is drawn by the page shell, but its text belongs to the
  // module — this is the one word of it that changes with the mode.
  const header = root.parentElement;
  const stopEl = header && header.querySelector('[data-el="stop"]');
  const legendTrainEl = $('legendTrain');
  const legendBusEl = $('legendBus');
  const legendTextEl = $('legendText');
  const trainPhotoEl = $('trainPhoto');

  // The little bus of the legend is exactly as long as the ones on the roads,
  // and the arrow between it and the picture is drawn every time either of
  // them moves — the picture keeps to the middle, so the gap changes with the
  // width of the screen.
  const busLegendEl = $('busLegend');
  const legendSampleEl = $('legendSample');
  const arrowLineEl = $('arrowLine');
  const arrowHeadEl = $('arrowHead');

  // The samples in the legend are painted in the colour of the first city.
  legendTrainEl.style.color = CITIES[0].color;
  legendSampleEl.style.color = CITIES[0].color;

  function syncLegendSample() {
    if (!flock) return;
    const box = busLegendEl.getBoundingClientRect();
    if (!box.width) return;

    legendSampleEl.style.width = `${flock.busL}px`;

    const from = legendSampleEl.getBoundingClientRect();
    const to = legendBusEl.getBoundingClientRect();
    const x1 = from.right - box.left + 16, y1 = from.top - box.top + from.height / 2;
    const x2 = to.left - box.left - 18, y2 = to.top - box.top + to.height * 0.42;
    // A curve that leaves sideways and arrives pointing at the picture.
    const cx1 = x1 + (x2 - x1) * 0.55, cy1 = y1;
    const cx2 = x2 - (x2 - x1) * 0.1, cy2 = y2 - (y2 - y1) * 0.55;

    arrowLineEl.setAttribute('d', `M${x1} ${y1}C${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`);

    const dx = x2 - cx2, dy = y2 - cy2, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;              // where the arrow points
    const bx = x2 - ux * 9, by = y2 - uy * 9;        // base of the head
    const px = -uy * 4.2, py = ux * 4.2;             // across it
    arrowHeadEl.setAttribute(
      'd', `M${x2} ${y2}L${bx + px} ${by + py}L${bx - px} ${by - py}z`
    );

    $('legendArrow').setAttribute('width', box.width);
    $('legendArrow').setAttribute('height', box.height);
    $('legendArrow').setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  }

  // The picture of the bus moves with the width of the card, so its arrow is
  // redrawn whenever the legend changes size — that also covers the moment the
  // mode is switched and the layout has not settled yet.
  new ResizeObserver(() => syncLegendSample()).observe(busLegendEl);

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

  // The switch works like the one on the areas: the knob sits on the side of
  // the mode that is shown, and the labels are clickable too.
  const modeSwitch = $('modeSwitch');
  const modeToggle = modeSwitch.querySelector('.toggle');
  const modeLabels = modeSwitch.querySelectorAll('.metro-switch-label');
  const pickMode = (key) => {
    if (key === state.mode) return;
    state.mode = key;
    epoch = performance.now();     // the new mode starts its ride from scratch
    render('fill');
  };
  modeToggle.addEventListener('click', () => {
    pickMode(state.mode === MODES[0].key ? MODES[1].key : MODES[0].key);
  });
  modeLabels.forEach((label) => {
    label.addEventListener('click', () => pickMode(label.dataset.value));
  });

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    render();
  });

  // The counter counts along with the vehicles, so paint() keeps it in sync.
  let lastCount = null, lastPeople = null;
  function updateScore() {
    const of = mode().of;
    let count = 0, people = 0;
    CITIES.forEach((c) => {
      const n = shown[c.key] || 0;
      count += n;
      people += (n / of(c)) * c.admitted;
    });
    count = Math.round(count);
    people = Math.round(people);
    if (count === lastCount && people === lastPeople) return;
    lastCount = count;
    lastPeople = people;
    countEl.textContent = nf(count);
    peopleEl.textContent = nf(people);
  }

  function render(how) {
    const m = mode();

    modeToggle.classList.toggle('on', state.mode === MODES[1].key);
    modeLabels.forEach((label) => {
      label.classList.toggle('on', label.dataset.value === state.mode);
    });

    if (stopEl) stopEl.textContent = m.stop;
    scoreTitleEl.textContent = m.title;
    // In the bus mode the caption is written on the bus itself.
    legendTextEl.textContent = state.mode === 'bus' ? '' : m.legend;
    legendTextEl.style.display = state.mode === 'bus' ? 'none' : '';
    trainPhotoEl.style.display = state.mode === 'metro' ? '' : 'none';
    legendTrainEl.style.display = state.mode === 'metro' ? '' : 'none';
    busLegendEl.style.display = state.mode === 'bus' ? '' : 'none';
    if (state.mode === 'bus') syncLegendSample();

    CITIES.forEach((c) => {
      const on = !!state.active[c.key];
      const n = m.of(c);
      cityEls[c.key].toggle.classList.toggle('on', on);
      cityEls[c.key].toggle.style.background = on ? c.color : '';
      cityEls[c.key].text.textContent = `${nf(c.admitted)} принятых, ${n} ${plural(n, ...m.noun)}`;
    });

    animateTo(targets(), how);
    if (frame === null) paint();     // keep things right while off screen
  }

  render('instant');
  paint();
}
