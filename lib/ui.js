// Small markup helpers for pieces that repeat across visualisations.

// Watches an element for a change of size and answers on the next frame.
//
// A callback that measures and then writes — lines up two columns, shrinks an
// icon to fit — changes the layout it was called about, and the browser
// notices while it is still delivering the round of notifications it started.
// It does not break anything; it says so out loud, with «ResizeObserver loop
// completed with undelivered notifications» thrown at the window, and a page
// that cries wolf nineteen times in a reading is a page whose console nobody
// reads. Answering on the next frame instead puts the writing outside that
// round, and the message goes away because the reason for it does.
export function onResize(el, fn) {
  let queued = false;
  new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  }).observe(el);
}

// Sets up a canvas that fills its .canvas-wrap parent and repaints on resize.
// Returns { canvas, ctx, resize } — call resize() once after the first paint
// setup if the module needs to force a redraw.
//
// `alt` is what the picture says, for a reader who cannot see it. A canvas is
// a blank to a screen reader: without a word it is announced as nothing at
// all, and the block loses its picture entirely. With one it is read as the
// image it is. A canvas that only decorates something already said in words —
// the little train beside the legend — passes nothing and is hidden instead,
// which is the honest answer for it.
export function mountCanvas(wrap, paint, alt) {
  const canvas = document.createElement('canvas');
  if (alt) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', alt);
  } else {
    canvas.setAttribute('aria-hidden', 'true');
  }
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  // On the next frame, like everything else that answers a change of size:
  // a paint is free to write a figure beside the picture it draws, and that
  // is a change of layout inside the round of notifications it was called in
  // — see onResize below for what the browser makes of that.
  onResize(wrap, paint);
  window.addEventListener('resize', paint);
  return { canvas, ctx };
}

// Where a switch looks for its name: the row it stands in says what it
// switches, and these are the parts of that row worth reading out.
const NAMED = '.city-name, .kind-label, .toggle-label, [data-switch-name]';
const ROWS = '.city-card, .kind-row, .metro-switch, .area-switch, .toggle-row';

// Every block builds its switches from the same markup — a button with
// role="switch" and a knob inside it — and whether one is on is the `on` class
// the module puts on it. On its own such a button says neither what it
// switches nor what state it is in: a screen reader found twenty-three
// nameless switches on the page and could not tell which were on. Both answers
// are already in the markup — the name in the row the switch sits in, the
// state in that class — so they are read off here, once, instead of being
// written out beside every place a module touches them. A block that wants to
// say it better sets its own aria-label and this leaves it alone.
export function nameSwitches(root) {
  const switches = [...root.querySelectorAll('[role="switch"]')];
  if (!switches.length) return;

  const tell = (el) => el.setAttribute('aria-checked', el.classList.contains('on') ? 'true' : 'false');

  switches.forEach((el) => {
    if (!el.hasAttribute('aria-label')) {
      const row = el.closest(ROWS) || el.parentElement;
      const named = row ? [...row.querySelectorAll(NAMED)].map((n) => n.textContent.trim()).filter(Boolean) : [];
      const label = named.length ? named.join(', ')
        : (row ? row.textContent.replace(/\s+/g, ' ').trim() : '');
      if (label) el.setAttribute('aria-label', label);
    }
    tell(el);
  });

  // The class is set wherever the module happens to set it; the state follows
  // it rather than being repeated at every one of those places.
  const watch = new MutationObserver((rows) => rows.forEach((row) => tell(row.target)));
  switches.forEach((el) => watch.observe(el, { attributes: true, attributeFilter: ['class'] }));
}

// How far away the next stretch of a scroll-told story is, in pixels — the
// answer a block gives the «Далее» button of the shell (see lib/stepper.js).
//
// A story read by scrolling is cut into equal stretches of travel: `gone` is
// how much of that travel is behind, `span` how much there is of it, `parts`
// how many stretches the story is told in, and `share` how much of the travel
// the story takes at all — a block that hands itself over to the reader keeps
// the last of it for that. Nought means there is nothing ahead: the block has
// not taken the screen yet, or its story is told.
export function stepAhead(gone, span, parts, share = 1) {
  // Доля пикселя назад — это все еще ноль, а не «блок еще не на экране». Ход
  // приводит страницу ровно к верху блока, и getBoundingClientRect дает там
  // то 0, то −0,09. На минусе ответ был «впереди ничего», каркас не видел ни
  // одной остановки и уезжал на целый экран — вся история блока проносилась
  // за одно движение. Отсюда допуск в пиксель и зажим.
  if (!(span > 0) || !(parts > 0) || gone < -1) return 0;
  const walked = Math.max(0, gone);
  if (walked >= span * share) return 0;
  const stretch = (span * share) / parts;
  // A pixel past the line rather than onto it: landing exactly on a boundary
  // leaves which side of it the block is on to the rounding.
  return Math.ceil((Math.floor(walked / stretch) + 1) * stretch - walked) + 1;
}
