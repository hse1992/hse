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

// The year the answer is counted back from — today's, off the clock. The
// whole section is «so many years back from now», so it moves with the
// calendar: on the first of January the scale ends with the new year and
// every year it names moves with it.
const NOW = new Date().getFullYear();

// The scale under the picture: from the earliest year the section can reach
// (all the programmes at once) to today, with a tick every half century.
const START = NOW - YEARS_TOTAL;
const FOUNDED = 1992;              // the year the university itself started
const TICK = 50;

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

// The far end of the scale the reader puts a mark on. A thousand years: round,
// so it reads as «up to a thousand» rather than as a hint, and the answer sits
// almost at the end of it — which is the picture the screen is after.
const GUESS_MAX = 1000;

// The ruler under the bar, the same one the question about countries has: a
// mark every hundred years, and every one of them says which. A bar with
// nothing but its ends named gives the eye nothing to measure against.
// Built here and not in init(): the screen is drawn several beats before the
// block, and a scale that arrives later would arrive after the question.
const RULER = (() => {
  const TICK = 100;
  const FIGURE = 100;
  let out = '';
  for (let v = 0; v <= GUESS_MAX; v += TICK) {
    // The last figure carries the unit and is that much wider, so the one
    // before it stays a bare mark rather than crowding into it.
    const big = v % FIGURE === 0 && v !== GUESS_MAX - FIGURE;
    const where = v === 0 ? ' is-first' : v === GUESS_MAX ? ' is-last' : '';
    out += `<span class="study-guess-tick${big ? ' is-big' : ''}${where}"`
      + ` style="left: ${(v / GUESS_MAX) * 100}%">`
      + (big ? `<span>${nf(v)}${v === GUESS_MAX ? ' лет' : ''}</span>` : '')
      + '</span>';
  }
  return `<span class="study-guess-ruler" aria-hidden="true">${out}</span>`;
})();

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

// What was happening in the world in the year the studies would have to start
// in. The events are pinned to their own years, and the year asked about moves
// with the calendar, so an exact answer is only there while the two agree —
// otherwise the closest event stands in, and the line says which year it comes
// from instead of «тогда». The gap is a year for every year since the events
// were written down, so what the card shows stays true to the day.
const YEARS_KNOWN = Object.keys(HISTORY).map(Number).sort((a, b) => a - b);

const eventOf = (year) => {
  const at = YEARS_KNOWN.reduce(
    (best, y) => (best === null || Math.abs(y - year) < Math.abs(best - year) ? y : best),
    null
  );
  return at === null ? null : { year: at, ...HISTORY[at] };
};

// How the card tells the event: «Тогда …» only when the event really is from
// that year, and how far off it is otherwise. A second date next to the big
// one would read as a contradiction — the distance between them does not.
const toldAs = (event, year) => {
  const gap = Math.abs(event.year - year);
  if (!gap) return `Тогда ${event.text}`;
  // «За 1 год» nobody says — a single year goes without the figure.
  const span = gap === 1 ? 'год' : `${nf(gap)} ${plural(gap, 'год', 'года', 'лет')}`;
  return event.year < year
    ? `За ${span} до этого ${event.text}`
    : `Через ${span} после этого ${event.text}`;
};

// The far end of the scale — all the programmes at once.
const FIRST = eventOf(START);

// The picture the second beat stands on: the year the studies would have to
// start in, and what was happening in the world then. The scale under it is
// the block's own business — here it would only be one thing too many.
const LEAD_CARD = `
  <span class="study-art"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${FIRST.art}</svg></span>
  <span class="study-lead-col">
    <span class="study-since">Начинать пришлось бы</span>
    <span class="study-lead-year"><span class="study-lead-year-unit">в</span><b>${START}</b><span class="study-lead-year-unit">году</span></span>
    <span class="study-event">${toldAs(FIRST, START)}</span>
  </span>
`;

// The screen is drawn by the shell several beats before the block is built,
// and a module's stylesheet arrives with the block — so the styles of the
// screen travel with the screen itself. Left in the block, the squares would
// be a run of inline spans, the beats could not take the place of one another
// and the parts of the screen would have no height for the shell to open them
// by. The card of the block is built out of the same parts, so their rules
// are here too — one copy, and it stands for both.
const LEAD_STYLE = `<style>
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

  /* ---------- The lead-in screen ---------- */

  /* The squares and the beat that follows them stand in one box, one over
     the other: the squares leave as the next arrives, so it takes their
     place instead of being pushed down by them. The one that grows into
     place needs a box of its own. */
  .study-lead-swap {
    display: grid;
    margin-top: 0.45em;
  }

  /* The layers sit at the foot of the box, not at its head: the box is as
     tall as the squares all the way through, and a beat pinned to the top of
     it would stand a long way above the scale it belongs with. */
  .study-lead-beat {
    grid-area: 1 / 1;
    align-self: end;
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

  /* The question stands in the same place and is given the same room as the
     answer that replaces it, so nothing moves between the two beats. */
  .study-lead-ask {
    display: block;
    margin-top: 1.8em;
    opacity: min(calc(var(--lead-stage-3, 1) * 2 - 1),
                 calc(1 - var(--lead-stage-4, 0) * 2.5));
  }

  /* The turn of the screen, and it is given room: the answer should not
     read as the next line of the heading. Like the question before it, the
     figure both comes and goes — the year takes its place. */
  .study-lead-answer {
    display: block;
    margin-top: 1.8em;
    opacity: min(calc(var(--lead-stage-4, 1) * 2 - 1),
                 calc(1 - var(--lead-stage-5, 0) * 2.5));
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
    opacity: calc(var(--lead-stage-5, 1) * 2 - 1);
  }

  /* ---------- The mark the reader puts down ---------- */

  /* The scale comes with the question and stays through the answer: the mark
     and the true figure are read against each other. It goes only when the
     year takes the screen — by then it has said everything it had to. */
  .study-lead-guess {
    display: block;
    margin-top: 1.1em;
  }

  .study-lead-guess-in {
    display: block;
    opacity: calc(1 - var(--lead-stage-5, 0) * 2.5);
  }

  /* The bar is the slider: its hit area reaches above and below, so the mark
     can be put down by a click anywhere along it. */
  .study-scale {
    display: block;
    position: relative;
    max-width: 720px;
    margin: 0 auto;
    padding: 14px 0 4px;
    cursor: pointer;
    touch-action: none;
  }

  .study-scale:focus-visible {
    outline: 2px solid var(--hse-blue);
    outline-offset: 6px;
    border-radius: 4px;
  }

  /* The screen itself stands on the page ground, so the bar cannot be that
     same grey — it would not be seen at all. */
  .study-scale-bar {
    display: block;
    position: relative;
    height: 10px;
    border-radius: 5px;
    background: var(--brand-grey-light);
  }

  /* The true figure fills the bar up to itself, the way the answer about
     countries does: two marks side by side would leave the reader working out
     which of them is theirs. It grows with the beat that brings the answer. */
  .study-scale-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    border-radius: 5px;
    background: var(--hse-blue);
  }

  /* The reader's own mark: a line across the bar, dark enough to be read both
     on the empty bar and on the filled one. */
  .study-scale-mark {
    position: absolute;
    left: 0;
    top: 50%;
    width: 5px;
    height: 30px;
    border-radius: 3px;
    background: var(--text);
    opacity: 0;
    transform: translate(-50%, -50%);
    transition: left 160ms ease;
  }

  .study-scale-mark.is-set { opacity: 1; }

  /* The ruler under the bar — the same one the question about countries has,
     so the two questions of the page are read the same way. It starts clear
     of the marks: they hang below the bar and must not be read through it. */
  .study-guess-ruler {
    display: block;
    position: relative;
    height: calc(1.6em * var(--intro-k, 1.55));
    margin-top: 16px;
  }

  .study-guess-tick {
    position: absolute;
    top: 0;
    width: 1px;
    height: 5px;
    margin-left: -0.5px;
    background: var(--btn-border);
  }

  .study-guess-tick.is-big {
    height: 9px;
    background: var(--text-caption);
  }

  .study-guess-tick span {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: calc(0.6875rem * var(--intro-k, 1.55));
    line-height: 1;
    color: var(--text-caption);
    font-variant-numeric: tabular-nums;
  }

  /* The figures at the ends would hang over the edge of the screen if they
     were centred on their mark like the rest. */
  .study-guess-tick.is-first span {
    left: 0;
    transform: none;
  }

  .study-guess-tick.is-last span {
    left: auto;
    right: 0;
    transform: none;
  }

  /* One line under the bar: what the mark says now, and what it said once the
     answer is out. */
  .study-lead-verdict {
    display: block;
    margin-top: 0.5em;
    text-align: center;
    font-size: calc(1rem * var(--intro-k, 1.55));
    color: var(--text-secondary);
  }

  .study-lead-verdict b {
    font-weight: 700;
    color: var(--text);
  }

  /* The same button the other question of the page sends its guess with —
     filled, in the corporate blue — but set against this screen, which is
     blown up as a whole. */
  .study-lead-check {
    display: block;
    margin: 0.8em auto 0;
    padding: 0.62em 2em;
    font-size: calc(0.9375rem * var(--intro-k, 1.55));
    font-weight: 600;
    color: var(--card);
    background: var(--hse-blue);
    border-color: var(--hse-blue);
  }

  .study-lead-check:hover {
    color: var(--card);
    background: var(--link-hover);
    border-color: var(--link-hover);
  }

  .study-lead-check:disabled {
    opacity: 0.35;
    cursor: default;
    background: var(--hse-blue);
    border-color: var(--hse-blue);
  }

  .study-lead-check[hidden] {
    display: none;
  }

  /* Asked to go on without a mark: the bar says where the reader is expected. */
  .study-scale.is-nudged .study-scale-bar {
    animation: study-nudge 620ms cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  @keyframes study-nudge {
    0%, 100% { background: var(--brand-grey-light); }
    30% { background: var(--brand-cyan); }
  }


  @media (prefers-reduced-motion: reduce) {
    .study-scale.is-nudged .study-scale-bar { animation: none; }
    .study-scale-mark,
    .study-scale-fill { transition: none; }
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
    .study-art { width: 64px; height: 64px; }
    .study-since { font-size: 1rem; }
    .study-event { font-size: 0.875rem; }
    /* Fewer squares to a row: at this width 28 of them would be specks. */
    /* The line above them is long, and on a phone the two together have
       only one screen: the squares keep the size they can. */
    .study-lead-dots { grid-template-columns: repeat(23, 1fr); gap: 3px; }
    .study-lead-dot { border-radius: 2px; }
    /* On a phone the screen has one column and no room to spare: the
       figure still leads, but by less. */
    .study-lead-ask,
    .study-lead-answer,
    .study-lead-then { margin-top: 0.7em; }
    .study-scale { padding: 10px 0 2px; }
    .study-scale-bar { height: 8px; }
    .study-scale-mark { width: 4px; height: 26px; }
    .study-guess-ruler { height: 1.6em; margin-top: 12px; }
    .study-guess-tick span { font-size: 0.6875rem; top: 10px; }
    .study-lead-verdict { font-size: 0.9375rem; }
    .study-lead-check { font-size: 0.875rem; padding: 0.6em 1.6em; }
    .study-lead-say { font-size: 0.9375rem; }
    .study-lead-years { font-size: 3rem; }
    .study-lead-year { font-size: 1.875rem; }
    .study-lead-card { gap: 14px; margin-top: 0.6em; padding: 22px 18px; }
    .study-lead-card .study-art { width: 80px; height: 80px; }
    .study-lead-card .study-since { font-size: 0.9375rem; }
    .study-lead-card .study-event { font-size: 0.9375rem; }
    .study-lead-outro { font-size: 1.375rem; }
  }
</style>`;

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
    text: LEAD_STYLE
      + '<span class="study-lead-swap">'
      + '<span class="study-lead-beat"><span class="study-lead-gone">'
      +   `${dotsOf(LEVELS[0], 1, true)}${dotsOf(LEVELS[1], 2, false)}`
      + '</span></span>'
      // The question stands where the answer will: a figure of its own, still
      // unknown, and one line asking for it. The scale to put a mark on is
      // under the screen — see below.
      + '<span class="study-lead-beat intro-stage" data-stage="3"><span class="study-lead-ask">'
      +   '<span class="study-lead-years"><span data-el="guessValue">?</span>'
      +     '<span class="study-lead-years-unit" data-el="guessUnit">лет</span>'
      +   '</span>'
      +   '<span class="study-lead-say">уйдет, чтобы пройти их все одну за другой. '
      +     '<span data-el="askTail">Как думаешь, сколько?</span></span>'
      + '</span></span>'
      // The answer, in the place the question held: the figure first — it is
      // what the screen turns on — and the sentence it answers under it.
      + '<span class="study-lead-beat intro-stage" data-stage="4"><span class="study-lead-answer">'
      +   `<span class="study-lead-years">${nf(YEARS_TOTAL)}`
      +     `<span class="study-lead-years-unit">${plural(YEARS_TOTAL, 'год', 'года', 'лет')}</span>`
      +   '</span>'
      +   '<span class="study-lead-say">потребуется, чтобы последовательно обучиться на каждой из них</span>'
      + '</span></span>'
      // The figure gives way to the year it lands on, in the same place: one
      // thought turning into the next, not two standing side by side.
      + '<span class="study-lead-beat intro-stage" data-stage="5"><span class="study-lead-then">'
      +   `<span class="study-lead-card">${LEAD_CARD}</span>`
      + '</span></span></span>'
      // The scale stands under the screen rather than inside the swap: the
      // mark the reader put down stays where it was while the answer lands
      // beside it, and the two are read against each other.
      + '<span class="study-lead-guess intro-stage" data-stage="3"><span class="study-lead-guess-in">'
      +   `<span class="study-scale" data-el="scale" role="slider" tabindex="0" aria-label="Сколько лет, по-твоему" aria-valuemin="0" aria-valuemax="${GUESS_MAX}">`
      +     '<span class="study-scale-bar">'
      +       '<span class="study-scale-fill" data-el="fill"></span>'
      +       '<span class="study-scale-mark" data-el="markGuess"></span>'
      +     '</span>'
      +     RULER
      +   '</span>'
      +   '<span class="study-lead-verdict" data-el="verdict">Нажми на полосу или потяни метку</span>'
      +   '<button type="button" class="btn study-lead-check" data-el="check" disabled>Ответить</button>'
      + '</span></span>'
      + '<span class="study-lead-outro intro-stage" data-stage="6">В общем нужно…</span>'
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

      .study-history-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
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

      @media (max-width: 860px) {
        .study-years { font-size: clamp(2.5rem, 15vw, 4.5rem); }
        .study-caption { font-size: 0.875rem; }
        .study-history { gap: 12px; margin-top: 14px; padding: 12px 16px; }
        .study-timeline { margin-top: 14px; padding: 0 20px; }
        .study-track { height: 34px; }
        .study-note { font-size: 0.875rem; }

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
              <span>${NOW}</span>
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
    const event = eventOf(from);
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
    eventEl.textContent = toldAs(event, from);
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

  // ---------- The guess on the lead-in screen ----------
  // Before the screen says how many years it would take, it asks. The mark,
  // the scale and the button are drawn by the shell as part of the lead-in,
  // outside this block — so they are found through the section.
  const section = root.closest('.viz-section');
  const atLead = (name) => section && section.querySelector(`[data-el="${name}"]`);
  const scaleEl = atLead('scale');
  const barEl = scaleEl && scaleEl.querySelector('.study-scale-bar');
  const markGuessEl = atLead('markGuess');
  const fillEl = atLead('fill');
  const guessValueEl = atLead('guessValue');
  const guessUnitEl = atLead('guessUnit');
  const verdictEl = atLead('verdict');
  const checkEl = atLead('check');
  const askTailEl = atLead('askTail');
  const guessBoxEl = section && section.querySelector('.study-lead-guess');

  // A screen with no scale on it is a screen the shell has not drawn — there
  // is nothing to ask and nothing to wait for.
  if (!scaleEl) return {};

  const years = (n) => plural(n, 'год', 'года', 'лет');
  const along = (v) => `${(v / GUESS_MAX) * 100}%`;

  let guess = null;        // the reader's mark, or null while there is none
  let told = false;        // the answer is out

  // Beat by beat the page is read only on a wide screen. Elsewhere it simply
  // scrolls, there is no next beat to ask for, and the answer comes on its own.
  const stepped = () => document.documentElement.classList.contains('is-stepped');

  // What the mark turned out to be worth. A large miss is easier to feel as a
  // multiple than as a difference, so it is said that way — and nearly
  // everyone guesses low.
  function verdict(v) {
    const diff = YEARS_TOTAL - v;
    if (diff === 0) return 'В точку!';
    if (Math.abs(diff) <= Math.round(YEARS_TOTAL * 0.1)) return 'Почти в точку';
    if (!v) return `Ни года? А их ${nf(YEARS_TOTAL)}`;
    if (diff > 0) {
      const ratio = YEARS_TOTAL / v;
      if (ratio >= 1.75) {
        const k = Math.round(ratio);
        const almost = ratio < k - 0.1 ? 'Почти в' : 'В';
        return `${almost} ${nf(k)} ${plural(k, 'раз', 'раза', 'раз')} больше, чем казалось`;
      }
      return `На ${nf(diff)} ${years(diff)} больше, чем казалось`;
    }
    return `На ${nf(-diff)} ${years(-diff)} меньше, чем казалось`;
  }

  function paintGuess() {
    guessValueEl.textContent = guess === null ? '?' : nf(guess);
    guessUnitEl.textContent = years(guess === null ? 0 : guess);
    // With a mark in place the line already says a number, and asking «how
    // many, do you think» after it would be asking about what it just said.
    if (askTailEl) askTailEl.textContent = guess === null ? 'Как думаешь, сколько?' : 'Проверим?';
    if (told) {
      verdictEl.innerHTML = guess === null
        ? ''
        : `<b>${verdict(guess)}</b> — твоя догадка ${nf(guess)}`;
    } else if (!scaleEl.classList.contains('is-nudged')) {
      verdictEl.textContent = guess === null
        ? 'Нажми на полосу или потяни метку'
        : `Твоя догадка — ${nf(guess)} ${years(guess)}`;
    }
    // Where the page waits for a mark, the button waits with it; where it
    // scrolls on regardless, there is no beat to ask for and no button.
    checkEl.disabled = guess === null;
    checkEl.hidden = told || !stepped();
  }

  function setGuess(v) {
    if (v === guess || told) return;
    guess = v;
    markGuessEl.style.left = along(v);
    markGuessEl.classList.add('is-set');
    scaleEl.setAttribute('aria-valuenow', v);
    scaleEl.setAttribute('aria-valuetext', `${nf(v)} ${years(v)}`);
    scaleEl.classList.remove('is-nudged');
    paintGuess();
  }

  // Down to a single year: the answer is 912, and a mark that can only be put
  // down in tens could never land on it. The bar is wide enough for that — a
  // pixel of it is less than a year and a half.
  const STEP = 1;
  const valueAt = (x) => {
    const box = barEl.getBoundingClientRect();
    const part = Math.min(1, Math.max(0, (x - box.left) / box.width));
    return Math.round(part * GUESS_MAX);
  };

  // Taken by a click and by dragging, never by the wheel: on a wide screen the
  // wheel belongs to the story.
  scaleEl.addEventListener('pointerdown', (e) => {
    if (told) return;
    e.preventDefault();
    scaleEl.setPointerCapture(e.pointerId);
    setGuess(valueAt(e.clientX));
  });
  scaleEl.addEventListener('pointermove', (e) => {
    if (!told && scaleEl.hasPointerCapture(e.pointerId)) setGuess(valueAt(e.clientX));
  });
  scaleEl.addEventListener('keydown', (e) => {
    if (told) return;
    const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    const from = guess === null ? 0 : guess;
    // A year at a time, ten with Shift: a thousand of them by arrow alone
    // would be a long walk.
    const step = e.shiftKey ? 10 : STEP;
    setGuess(Math.min(GUESS_MAX, Math.max(0, from + by * step)));
  });

  // The button sends the mark: the page is asked for its next beat, and that
  // beat is the one that brings the answer.
  checkEl.addEventListener('click', () => {
    root.dispatchEvent(new CustomEvent('story:next', { bubbles: true }));
  });

  // Asked to go on without a mark: the page stays where it is, and the bar
  // says where the reader is expected.
  function nudge() {
    scaleEl.classList.remove('is-nudged');
    void scaleEl.offsetWidth;            // the same animation again, from its start
    scaleEl.classList.add('is-nudged');
    verdictEl.textContent = 'Сначала поставь метку на полосе';
    scaleEl.focus({ preventScroll: true });
  }

  // The shell owns the beats of the screen and says how far each has come
  // through --lead-stage-N. The line under the bar follows the beat that
  // brings the answer — and goes back to naming the mark if the reader steps
  // back to the question.
  // The scale keeps its room from the first beat of the screen, empty until
  // its turn. The screen holds the middle of the window, so anything arriving
  // under it pushes everything above it up — and the line the reader has just
  // read would move under their eyes. min-height beats the height the shell
  // squeezes the part with, so the part still fades in, it just no longer
  // grows. Measured, because how tall it comes out depends on the window.
  const outroEl = section.querySelector('.study-lead-outro');
  const reserve = (el) => {
    if (!el) return;
    el.style.minHeight = '';
    el.style.minHeight = `${el.scrollHeight}px`;
  };
  const reserveParts = () => { reserve(guessBoxEl); reserve(outroEl); };
  reserveParts();
  window.addEventListener('resize', reserveParts);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserveParts);

  fillEl.style.width = `calc(${along(YEARS_TOTAL)} * var(--lead-stage-4, 0))`;
  const followAnswer = () => {
    const at = parseFloat(section.style.getPropertyValue('--lead-stage-4')) || 0;
    if ((at > 0.5) === told) return;
    told = at > 0.5;
    paintGuess();
  };
  new MutationObserver(followAnswer)
    .observe(section, { attributes: true, attributeFilter: ['style'] });

  paintGuess();

  // Only the beat that opens the answer waits, and only until there is a mark.
  return {
    holdIntro: (stage, { quiet = false } = {}) => {
      if (stage !== 4 || guess !== null) return false;
      if (!quiet) nudge();
      return true;
    }
  };
}
