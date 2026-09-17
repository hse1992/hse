// Every HSE programme taken one after another — how long a single student
// would sit through all of them.

import { CITIES } from '../data/hse.js';
import { HISTORY } from '../data/history.js';
import { nf, plural } from '../lib/format.js';

// Facts about the curriculum itself — they live here, not in data/hse.js,
// which only knows about the people. A bachelor's or a specialist's degree
// takes four years, a master's two.
const PROGRAMS = {
  msk: { bachelor: 80, master: 154 },
  spb: { bachelor: 21, master: 27 },
  nn: { bachelor: 17, master: 14 },
  perm: { bachelor: 9, master: 7 }
};

// The two levels the checkboxes switch on and off. `shade` is the colour a
// city lends to this level — the main one for the longer degree, the lighter
// one for the shorter, same as on the stadium.
const LEVELS = [
  { key: 'bachelor', label: 'Бакалавриат и специалитет', short: 'бакалавриат', of: 'бакалавриата и специалитета', years: 4, shade: (c) => c.color },
  { key: 'master', label: 'Магистратура', short: 'магистратура', of: 'магистратуры', years: 2, shade: (c) => c.colorLight }
];

// Специалитет lives in Moscow only, so only its card spells the level out
// in full — the other three would just wrap the line for nothing.
const SPECIALIST = ['msk'];

const countOf = (city, level) => PROGRAMS[city.key][level.key];
const PROGRAMS_TOTAL = CITIES.reduce(
  (n, c) => n + LEVELS.reduce((m, l) => m + countOf(c, l), 0), 0
);
const YEARS_TOTAL = CITIES.reduce(
  (n, c) => n + LEVELS.reduce((m, l) => m + countOf(c, l) * l.years, 0), 0
);

// The year the answer is counted back from. Pinned rather than taken from the
// clock: every year the reader can land on has a historical event attached to
// it in data/history.js, and a moving "now" would shift them all.
const NOW = 2026;

// The scale under the picture: from the earliest year the section can reach
// (all the programmes at once) to today, with a tick every half century.
const START = NOW - YEARS_TOTAL;
const FOUNDED = 1992;              // the year the university itself started
const TICK = 50;
const TODAY_YEAR = new Date().getFullYear();

// Half-century ticks on round years, every second one taller. The lead-in
// screen shows the same scale, so they are laid out once and drawn twice —
// as markup there, as elements in the block itself.
const TICKS = [];
for (let y = Math.ceil(START / TICK) * TICK; y < NOW; y += TICK) {
  TICKS.push({ major: y % 100 === 0, at: ((y - START) / YEARS_TOTAL) * 100 });
}

// The figure each beat of the lead-in turns on, picked out in the corporate
// blue — same as on the screens before this one. Painted inline: the shell
// draws the screen before the styles of the module arrive.
const mark = (text) =>
  `<span class="study-lead-mark" style="background: var(--hse-blue); color: var(--card)">${text}</span>`;

// Two colours of the brand book, one to a level: the cyan and the violet.
// Neither is the corporate blue — that one is on the patch in the line above
// the squares, and a field of it under the same line would read as one thing
// with it. They come inline with the markup — the shell draws the screen
// before the styles of the module arrive — but the tokens themselves are in
// the head from the first frame, so the names hold.
const DOT = 'var(--brand-cyan)';
const DOT_LIGHT = 'var(--brand-violet)';

// One square per programme, and they arrive a level at a time: first the
// longer degree, then the shorter one under it. The campuses have their own
// colours later on — here it is the levels that are told apart.
// Each wave says what it is: the first over its squares, the second under
// them, so the caption is on the outside of the field and the two blocks of
// squares meet in the middle as one.
const dotsOf = (level, stage, above) => {
  const n = CITIES.reduce((sum, c) => sum + countOf(c, level), 0);
  const dot = `<span class="study-lead-dot" style="background:${level.key === 'bachelor' ? DOT : DOT_LIGHT}"></span>`;
  const legend = `<span class="study-lead-legend">${nf(n)} ${plural(n, 'программа', 'программы', 'программ')} ${level.of}</span>`;
  return `<span class="study-lead-wave intro-stage" data-stage="${stage}">`
    + (above ? legend : '')
    + `<span class="study-lead-dots">${dot.repeat(n)}</span>`
    + (above ? '' : legend)
    + '</span>';
};

// What was happening in the world when a student taking every programme one
// after another would have had to start — the far end of the scale.
const FIRST = HISTORY[START];

// The picture the second beat stands on: the year the studies would have to
// start in, and what was happening in the world then. The scale under it is
// the block's own business — here it would only be one thing too many.
const LEAD_CARD = `
  <span class="study-art"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${FIRST.art}</svg></span>
  <span class="study-lead-col">
    <span class="study-since">Начинать пришлось бы</span>
    <span class="study-lead-year"><span class="study-lead-year-unit">в</span><b>${START}</b><span class="study-lead-year-unit">году</span></span>
    <span class="study-event">Тогда ${FIRST.text}</span>
  </span>
`;

export const meta = {
  id: 'study',
  // Hands the reader over from the buildings: what they are all for, said at
  // once and shown at once — a square for every programme. The squares give
  // way to how long it would take to sit through them one after another, and
  // that to the year such a student would have had to start in. The last line
  // runs into the heading.
  lead: {
    // The screen grows by a whole block at a time, so it holds the middle of
    // the screen rather than the top edge of the title card to come.
    fit: 'center',
    value: `Все эти здания нужны для того, чтобы студенты могли обучаться ${mark(`по ${nf(PROGRAMS_TOTAL)} образовательным программам`)}`,
    text: '<span class="study-lead-swap">'
      + '<span class="study-lead-beat"><span class="study-lead-gone">'
      +   `${dotsOf(LEVELS[0], 1, true)}${dotsOf(LEVELS[1], 2, false)}`
      + '</span></span>'
      // The answer, and then what it means, each on a beat of its own: first
      // the figure alone, with the sentence it answers under it — the number
      // is what the screen turns on, so it is read before the words.
      + '<span class="study-lead-beat intro-stage" data-stage="3"><span class="study-lead-answer">'
      +   `<span class="study-lead-years">${nf(YEARS_TOTAL)}`
      +     `<span class="study-lead-years-unit">${plural(YEARS_TOTAL, 'год', 'года', 'лет')}</span>`
      +   '</span>'
      +   '<span class="study-lead-say">потребуется, чтобы последовательно обучиться на каждой из них</span>'
      + '</span></span>'
      // The figure gives way to the year it lands on, in the same place: one
      // thought turning into the next, not two standing side by side.
      + '<span class="study-lead-beat intro-stage" data-stage="4"><span class="study-lead-then">'
      +   `<span class="study-lead-card">${LEAD_CARD}</span>`
      + '</span></span></span>'
      + '<span class="study-lead-outro intro-stage" data-stage="5">В общем нужно…</span>'
  },
  title: 'Учиться, учиться и еще раз учиться',
  // The heading arrives on its own — the reader has just been told all this on
  // the screen before it. The subtitle comes with the block underneath, on the
  // same fade: --intro-body is how far that block has arrived.
  subtitle: `<span class="study-sub" style="opacity: var(--intro-body, 1)">Вышка обучает по ${nf(PROGRAMS_TOTAL)} образовательным программам</span>`,
  // Opens with that screen and then with the title card, like the sections
  // before it.
  intro: true
};

export function init(root) {
  'use strict';

  // ---------- Markup ----------
  // The stage with the big number is specific to this visualisation, so its
  // styles live here and not in layout.css.
  root.innerHTML = `
    <style>
      .study-stage {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px;
        text-align: center;
      }

      .study-years {
        display: flex;
        align-items: baseline;
        gap: 0.18em;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 700;
        font-size: clamp(3rem, 11vw, 8.5rem);
        font-variant-numeric: tabular-nums;
        color: var(--hse-blue);
      }

      .study-years-unit {
        font-size: 0.36em;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-secondary);
      }

      /* Three lines are always reserved: the text is two or three lines long
         depending on the number in it, and without the floor everything below
         would jump on every switch. */
      .study-caption {
        max-width: 30ch;
        font-size: 0.9375rem;
        line-height: 1.35;
        min-height: 4.05em;
        color: var(--text-secondary);
      }

      /* The date the studies would have to start at, with a picture of what
         was happening then. A card of its own, so it reads as a separate
         thought and not as a third line of the caption. */
      .study-history {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-top: 26px;
        padding: 18px 26px 18px 20px;
        border-radius: var(--r-canvas-card);
        background: var(--bg);
        max-width: 540px;
        text-align: left;
        opacity: 0;
        transition: opacity 260ms ease;
      }

      .study-history.in { opacity: 1; }

      .study-art {
        flex: none;
        width: 88px;
        height: 88px;
      }

      .study-art svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .study-history-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .study-since {
        font-size: 1.125rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text);
      }

      .study-since b {
        font-weight: 700;
        color: var(--hse-blue);
      }

      .study-event {
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      /* The same span of time as a line: 1114 on the left, today on the
         right, and a pointer that slides to the year in question. */
      .study-timeline {
        width: 100%;
        max-width: 540px;
        margin-top: 24px;
        padding: 0 24px;
      }

      .study-track {
        position: relative;
        height: 42px;
      }

      .study-line {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 10px;
        height: 2px;
        border-radius: 1px;
        background: var(--empty);
      }

      .study-tick {
        position: absolute;
        bottom: 12px;
        width: 1px;
        height: 5px;
        background: var(--empty);
      }

      .study-tick.major {
        height: 9px;
        background: var(--legend-swatch);
      }

      /* Sits on the line and is moved along it frame by frame, together with
         the count — hence no transition of its own. */
      .study-mark {
        position: absolute;
        bottom: 6px;
        left: 0;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
      }

      .study-mark-label {
        font-size: 0.75rem;
        font-weight: 700;
        line-height: 1;
        color: var(--hse-blue);
        font-variant-numeric: tabular-nums;
        transition: opacity 160ms ease;
      }

      .study-mark-pin {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--hse-blue);
        box-shadow: 0 0 0 3px var(--card);
      }

      /* The footnote at the very bottom of the card, in the same voice as the
         line about the event. */
      .study-note {
        flex: none;
        padding: 6px 12px 4px;
        text-align: center;
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      .study-ends {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 2px;
        font-size: 0.75rem;
        color: var(--text-caption);
        font-variant-numeric: tabular-nums;
      }

      /* ---------- The lead-in screen ---------- */

      /* The squares and the beat that follows them stand in one box, one over
         the other: the squares leave as the next arrives, so it takes their
         place instead of being pushed down by them. The one that grows into
         place needs a box of its own. */
      .study-lead-swap {
        display: grid;
        margin-top: 0.45em;
      }

      .study-lead-beat {
        grid-area: 1 / 1;
        align-self: start;
      }

      /* The three share the box, so they must not be seen through each other:
         one is gone by the time the beat after it has come two fifths of the
         way, and that one only starts showing at half. The page shell owns the
         opacity of a part while it grows — hence all of them from the inside,
         by how far their beat has come. */
      .study-lead-gone {
        display: block;
        opacity: calc(1 - var(--lead-stage-3, 0) * 2.5);
      }

      /* The turn of the screen, and it is given room: the answer should not
         read as the next line of the heading. Like the squares before it, the
         figure both comes and goes — the year takes its place. */
      .study-lead-answer {
        display: block;
        margin-top: 1.8em;
        opacity: min(calc(var(--lead-stage-3, 1) * 2 - 1),
                     calc(1 - var(--lead-stage-4, 0) * 2.5));
      }

      /* What the figure answers, set small under it — the number is the thing
         to be read here, the sentence only says what it counts. */
      .study-lead-say {
        display: block;
        margin-top: 0.4em;
        text-align: center;
        font-size: calc(1rem * var(--intro-k, 1.55));
        color: var(--text-secondary);
      }

      /* The year the figure lands on, in the place the figure has just left. */
      .study-lead-then {
        display: block;
        margin-top: 1.8em;
        opacity: calc(var(--lead-stage-4, 1) * 2 - 1);
      }

      /* The same figure the block itself opens with, so the screen and the
         block read as one thought. Its unit stands beside it, smaller and
         quieter, exactly as it does there. */
      .study-lead-years {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 0.18em;
        line-height: 1;
        letter-spacing: -0.04em;
        font-weight: 700;
        font-size: min(calc(3.25rem * var(--intro-k, 1.55)), 9vh);
        font-variant-numeric: tabular-nums;
        color: var(--hse-blue);
      }

      .study-lead-years-unit {
        font-size: 0.36em;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-secondary);
      }

      /* The year is the second figure of the screen, so it is set as a figure
         and not as a word in the middle of a sentence — the line that leads to
         it stands over it, and «году» beside it, the way the unit of the big
         number does. */
      .study-lead-year {
        display: flex;
        align-items: baseline;
        gap: 0.2em;
        line-height: 1.05;
        font-size: min(calc(3.25rem * var(--intro-k, 1.55)), 9vh);
        font-weight: 700;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
        color: var(--hse-blue);
      }

      /* The card is the whole of its beat, so it needs no room of its own on
         top of the room the beat already has. */
      .study-lead-then .study-lead-card {
        margin-top: 0;
      }

      .study-lead-year-unit {
        font-size: 0.44em;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-secondary);
      }

      /* The line that runs into the heading itself, so it is set larger than
         the screen around it — and scaled with it, like everything else here.
         It stands under the swap box, not in it: by then the number and the
         year are what it is said about, and they stay. */
      .study-lead-outro {
        display: block;
        margin-top: 0.7em;
        /* Under the middle of what it is said about: the figure, the line
           beneath it and the card all stand centred, and the heading is the
           only thing on this screen set from the left edge. */
        text-align: center;
        font-size: calc(1.25rem * var(--intro-k, 1.55));
        color: var(--text);
      }

      /* Every programme as a square, a level to a wave. The waves meet with
         exactly the gap the squares have between them, so the two of them read
         as one field with a lighter half. Spans, not divs — the shell puts the
         screen inside a <p>. */
      .study-lead-wave {
        display: block;
      }

      .study-lead-wave:first-child {
        margin-top: 0.6em;
      }

      .study-lead-wave + .study-lead-wave {
        margin-top: 5px;
      }

      .study-lead-legend {
        display: block;
        font-size: calc(0.8125rem * var(--intro-k, 1.55));
        line-height: 1.3;
        color: var(--text-secondary);
      }

      .study-lead-legend:first-child { margin-bottom: 0.5em; }
      .study-lead-legend:last-child { margin-top: 0.6em; }

      .study-lead-dots {
        display: grid;
        grid-template-columns: repeat(32, 1fr);
        gap: 5px;
        max-width: 880px;
      }

      .study-lead-dot {
        aspect-ratio: 1;
        border-radius: 3px;
      }

      /* The year the beat before last stands on, in the middle of the screen.
         Set at the size of the screen around it, and its figure as big as the
         one it follows: the two beats are one thought, and a card set at its
         own size read as an afterthought next to the number. */
      .study-lead-card {
        display: flex;
        align-items: center;
        gap: clamp(20px, 4vh, 40px);
        max-width: 900px;
        margin: 0.7em auto 0;
        padding: clamp(26px, 5.6vh, 56px);
        border-radius: var(--r-canvas-card);
        background: var(--card);
        box-shadow: var(--card-shadow);
      }

      .study-lead-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
      }

      .study-lead-card .study-art {
        width: min(190px, 21vh);
        height: min(190px, 21vh);
      }
      .study-lead-card .study-since { font-size: min(calc(1rem * var(--intro-k, 1.55)), 2.8vh); color: var(--text-secondary); }
      .study-lead-card .study-event { font-size: min(calc(1rem * var(--intro-k, 1.55)), 2.8vh); }

      /* The line of the screen carries a patch that runs over more than one
         line, and the headline leading of the shell would have the patches
         overlap. Scoped to this section — it is this screen that needs the
         air, not every lead-in on the page. */
      #study .viz-lead-value {
        line-height: 1.28;
      }

      /* The patch on a figure of the screen. Colour comes inline with the
         markup; what is left here is the shape of it. */
      .study-lead-mark {
        padding: 0.06em 0.3em;
        border-radius: 0.2em;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }

      @media (max-width: 860px) {
        .study-years { font-size: clamp(2.5rem, 15vw, 4.5rem); }
        .study-caption { font-size: 0.875rem; }
        .study-history { gap: 12px; margin-top: 14px; padding: 12px 16px; }
        .study-art { width: 64px; height: 64px; }
        .study-since { font-size: 1rem; }
        .study-event { font-size: 0.875rem; }
        .study-timeline { margin-top: 14px; padding: 0 20px; }
        .study-track { height: 34px; }
        .study-note { font-size: 0.875rem; }

        /* Fewer squares to a row: at this width 28 of them would be specks. */
        /* The line above them is long, and on a phone the two together have
           only one screen: the squares keep the size they can. */
        .study-lead-dots { grid-template-columns: repeat(23, 1fr); gap: 3px; }
        .study-lead-dot { border-radius: 2px; }
        /* On a phone the screen has one column and no room to spare: the
           figure still leads, but by less. */
        .study-lead-answer,
        .study-lead-then { margin-top: 0.7em; }
        .study-lead-say { font-size: 0.9375rem; }
        .study-lead-years { font-size: 3rem; }
        .study-lead-year { font-size: 1.875rem; }
        .study-lead-card { gap: 14px; margin-top: 0.6em; padding: 22px 18px; }
        .study-lead-card .study-art { width: 80px; height: 80px; }
        .study-lead-card .study-since { font-size: 0.9375rem; }
        .study-lead-card .study-event { font-size: 0.9375rem; }
        .study-lead-outro { font-size: 1.375rem; }

        /* The picture has no fixed height of its own, unlike the canvases in
           the other sections: a long event text must not be cut off. */
        #study .canvas-card { height: auto; min-height: 40dvh; }
      }
    </style>

    <div class="col-left">
      <div class="kind-row" data-el="kindRow"></div>
      <div class="city-list" data-el="cityList"></div>
      <div class="actions">
        <button type="button" class="btn" data-el="clearAll">Снять все</button>
        <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
      </div>
    </div>

    <div class="col-right">
      <div class="meter-card">
        <div class="meter-header">
          <div class="meter-title">Образовательных программ</div>
          <div class="meter-value"><strong data-el="programs"></strong> из ${nf(PROGRAMS_TOTAL)}</div>
        </div>
        <div class="meter-bar" data-el="bar"></div>
      </div>

      <div class="canvas-card">
        <div class="study-stage">
          <div class="study-years">
            <span data-el="years">0</span>
            <span class="study-years-unit" data-el="yearsWord">лет</span>
          </div>
          <div class="study-caption" data-el="caption"></div>
          <div class="study-history" data-el="history" aria-hidden="true">
            <span class="study-art" data-el="art" aria-hidden="true"></span>
            <span class="study-history-text">
              <span class="study-since" data-el="since"></span>
              <span class="study-event" data-el="event"></span>
            </span>
          </div>

          <div class="study-timeline">
            <div class="study-track" data-el="track">
              <div class="study-line"></div>
              <div class="study-mark" data-el="mark">
                <span class="study-mark-label" data-el="markYear"></span>
                <span class="study-mark-pin"></span>
              </div>
            </div>
            <div class="study-ends">
              <span>${START}</span>
              <span>${TODAY_YEAR}</span>
            </div>
          </div>
        </div>

        <div class="study-note" data-el="note"></div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = {
    active: { msk: true, spb: true, nn: true, perm: true },
    levels: { bachelor: true, master: true }
  };

  const selected = (city, level) =>
    state.active[city.key] && state.levels[level.key] ? countOf(city, level) : 0;

  const totals = () => {
    let programs = 0, years = 0;
    CITIES.forEach((c) => LEVELS.forEach((l) => {
      const n = selected(c, l);
      programs += n;
      years += n * l.years;
    }));
    return { programs, years };
  };

  // ---------- Counting animation ----------
  // Both numbers run to their new value together, on the same curve as the
  // rest of the page.
  const shown = { programs: 0, years: 0 };
  let tween = null;
  let frame = null;

  function animateTo(target, instant) {
    if (instant) {
      Object.assign(shown, target);
      tween = null;
      paint();
      paintHistory();
      return;
    }
    // The year runs together with the count, so the picture waits for both.
    historyEl.classList.remove('in');
    tween = { from: { ...shown }, to: target, t0: performance.now() };
    if (frame === null) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = null;
    if (!tween) return;
    const raw = Math.min(1, Math.max(0, (now - tween.t0) / 620));
    const p = 1 - Math.pow(1 - raw, 3);
    Object.keys(shown).forEach((key) => {
      shown[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * p;
    });
    if (raw >= 1) tween = null; else frame = requestAnimationFrame(tick);
    paint();
    if (tween === null) paintHistory();
  }

  const yearsEl = $('years');
  const yearsWordEl = $('yearsWord');
  const programsEl = $('programs');
  const captionEl = $('caption');
  const historyEl = $('history');
  const artEl = $('art');
  const sinceEl = $('since');
  const eventEl = $('event');
  const markEl = $('mark');
  const markYearEl = $('markYear');
  const noteEl = $('note');

  function paint() {
    const years = Math.round(shown.years);
    const programs = Math.round(shown.programs);

    yearsEl.textContent = nf(years);
    yearsWordEl.textContent = plural(years, 'год', 'года', 'лет');
    programsEl.textContent = nf(programs);

    captionEl.textContent = programs
      ? `непрерывной учебы, чтобы пройти ${nf(programs)} ${plural(programs, 'выбранную программу', 'выбранные программы', 'выбранных программ')} одну за другой`
      : 'Выбери города и уровни обучения';

    // The pointer follows the count itself, not the rounded number, so it
    // slides smoothly while the years run.
    const pos = (1 - shown.years / YEARS_TOTAL) * 100;
    markEl.style.left = `${pos}%`;
    markYearEl.textContent = NOW - years;
    // At the very ends the label would just repeat the caption under the line.
    markYearEl.style.opacity = pos < 4 || pos > 96 ? '0' : '1';

    // How far that year is from the university itself.
    const from = NOW - years;
    const gap = Math.abs(from - FOUNDED);
    const word = plural(gap, 'год', 'года', 'лет');
    noteEl.textContent = from === FOUNDED ? 'Вышка как раз появилась'
      : from < FOUNDED ? `До создания Вышки еще ${gap} ${word}`
      : `Вышке уже ${gap} ${word}`;
  }

  // The same span of time, counted backwards — a number of years is easier to
  // feel as a date, and even easier with something that happened in it.
  // Updated once the count has settled, not on every frame of it.
  function paintHistory() {
    const years = Math.round(shown.years);
    const from = NOW - years;
    const event = HISTORY[from];
    // With nothing selected there is no year to show, but the block keeps its
    // place: otherwise the scale under it would jump up.
    if (years < 5 || !event) {
      historyEl.classList.remove('in');
      historyEl.setAttribute('aria-hidden', 'true');
      return;
    }
    historyEl.setAttribute('aria-hidden', 'false');
    artEl.innerHTML = `<svg viewBox="0 0 64 64" focusable="false">${event.art}</svg>`;
    sinceEl.innerHTML = `Начинать пришлось бы в <b>${from}</b> году`;
    eventEl.textContent = `Тогда ${event.text}`;
    historyEl.classList.add('in');
  }

  // ---------- DOM rendering ----------
  const kindRow = $('kindRow');
  const cityList = $('cityList');
  const bar = $('bar');

  const kindEls = {};
  LEVELS.forEach((level) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'kind-item';
    item.innerHTML = `
      <span class="kind-box"><span class="kind-check"></span></span>
      <span class="kind-label">${level.label}</span>
    `;
    item.addEventListener('click', () => {
      state.levels[level.key] = !state.levels[level.key];
      render();
    });
    kindRow.appendChild(item);
    kindEls[level.key] = item;
  });

  const cityEls = {};
  CITIES.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${c.name}</div>
        <div class="city-stats">
          ${LEVELS.map((l) => `
            <span class="city-stat" data-level="${l.key}">
              <span class="city-dot" style="background:${l.shade(c)}"></span>
              <span class="city-stat-text"></span>
            </span>
          `).join('')}
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
    cityEls[c.key] = {
      toggle: toggleBtn,
      rows: LEVELS.map((l) => card.querySelector(`.city-stat[data-level="${l.key}"]`))
    };
  });

  const track = $('track');
  TICKS.forEach((t) => {
    const tick = document.createElement('div');
    tick.className = 'study-tick' + (t.major ? ' major' : '');
    tick.style.left = `${t.at}%`;
    track.insertBefore(tick, markEl);
  });

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    LEVELS.forEach((l) => { state.levels[l.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    LEVELS.forEach((l) => { state.levels[l.key] = true; });
    render();
  });

  // The bar is one segment per city per level, in the order of the cards.
  const barSegs = [];
  CITIES.forEach((c) => LEVELS.forEach((l) => {
    const seg = document.createElement('div');
    seg.className = 'meter-bar-seg';
    seg.style.background = l.shade(c);
    bar.appendChild(seg);
    barSegs.push({ city: c, level: l, el: seg });
  }));

  function render(instant) {
    LEVELS.forEach((l) => {
      kindEls[l.key].classList.toggle('active', !!state.levels[l.key]);
    });

    CITIES.forEach((c) => {
      const els = cityEls[c.key];
      const on = !!state.active[c.key];
      els.toggle.classList.toggle('on', on);
      els.toggle.style.background = on ? c.color : '';
      LEVELS.forEach((l, i) => {
        const row = els.rows[i];
        row.style.display = state.levels[l.key] ? '' : 'none';
        const n = countOf(c, l);
        const level = l.key === 'bachelor' && SPECIALIST.includes(c.key)
          ? l.label.toLowerCase()
          : l.short;
        row.querySelector('.city-stat-text').textContent =
          `${n} ${plural(n, 'программа', 'программы', 'программ')}, ${level}`;
      });
    });

    barSegs.forEach(({ city, level, el }) => {
      const n = selected(city, level);
      el.style.width = `${(n / PROGRAMS_TOTAL) * 100}%`;
    });

    animateTo(totals(), instant);
  }

  // ---------- Column alignment ----------
  // Only the left column starts with the filter row, so without this the meter
  // card sits higher than the first city card.
  const colLeft = root.querySelector('.col-left');
  const colRight = root.querySelector('.col-right');
  const stacked = window.matchMedia('(max-width: 860px)');

  function alignColumns() {
    if (stacked.matches) {
      colRight.style.paddingTop = '';   // one column: nothing to line up with
      return;
    }
    const gap = parseFloat(getComputedStyle(colLeft).rowGap) || 0;
    colRight.style.paddingTop = `${kindRow.offsetHeight + gap}px`;
  }

  new ResizeObserver(alignColumns).observe(kindRow);
  stacked.addEventListener('change', alignColumns);

  render(true);
  alignColumns();
}
