// The page as a sequence of beats.
//
// Scrolling does not scrub anything and does not carry the reader past what
// they have not seen yet: one movement of the wheel — or one swipe, or one
// press of the space bar — plays the next beat and nothing more. While a beat
// is playing, input is ignored; when it lands, the page waits for the reader
// again. Sections are settled onto the screen the same way: a beat of their
// own carries the page from one to the next.

import { nf } from './format.js';

const BEAT_MS = 700;         // how long one beat plays
const SETTLE_MS = 520;       // moving the page from one section to the next

// A trackpad keeps sending events for a second or so after the fingers have
// left it, and a mouse wheel sends a burst per notch. Anything arriving within
// this of the previous event is the same movement, still going — only the
// first event of a movement counts as «next».
const GESTURE_GAP = 200;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

// Below this the page is read by scrolling instead of beat by beat — the same
// width at which the layout folds into one column. See mountScrolled.
const NARROW = window.matchMedia('(max-width: 860px)');

// Runs fn(p) from 0 to 1 over ms, then done(). Time is counted frame to frame,
// and a gap longer than a stutter is dropped — a tab nobody is looking at gets
// no frames, and counting from the start would skip the beat to its end.
function play(ms, fn, done) {
  let last = performance.now();
  let spent = 0;
  const tick = (now) => {
    const dt = now - last;
    last = now;
    spent += dt > 250 ? 16 : dt;
    const p = Math.min(1, spent / ms);
    fn(p);
    if (p < 1) requestAnimationFrame(tick);
    else if (done) done();
  };
  requestAnimationFrame(tick);
}

// Eases the same way everything else on the page does.
const settle = (p) => 1 - Math.pow(1 - p, 3);

// Carries the window to `y` over SETTLE_MS.
function glide(y, done) {
  const from = window.scrollY;
  const span = y - from;
  if (Math.abs(span) < 2 || REDUCED.matches) {
    window.scrollTo(0, y);
    if (done) done();
    return;
  }
  play(SETTLE_MS, (p) => window.scrollTo(0, from + span * settle(p)), done);
}

// The figure a block ends on does not disappear with it: it lifts off, travels
// with the page and lands in the lead-in of the next block, running from its
// own value to the new one on the way — «21 955 принятых» becomes «~22 000
// первокурсников», «77 687 мест» becomes «63 000+ студентов». Seven blocks read
// as one thread instead of seven pages.
//
// A block says which of its elements holds that figure: `meta.handoff` names a
// data-el. The landing place needs no marking — a lead-in is one figure and one
// line by contract, so its first number is the figure.
const FIGURE = /[~≈]?\d(?:[\d\s  ]*\d)?\+?/;

// Wraps the first number of a lead-in in a span of its own, once, so that it
// can be measured and hidden while its copy is on the way.
function markFigure(section) {
  const value = section.querySelector('.viz-lead-value');
  if (!value || value.querySelector('.viz-handoff')) return;
  const walk = document.createTreeWalker(value, NodeFilter.SHOW_TEXT);
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const hit = FIGURE.exec(node.textContent);
    if (!hit) continue;
    const rest = node.splitText(hit.index);
    rest.splitText(hit[0].length);
    const span = document.createElement('span');
    span.className = 'viz-handoff';
    rest.replaceWith(span);
    span.appendChild(rest);
    return;
  }
}

const numberOf = (text) => parseInt(text.replace(/\D/g, ''), 10);

const rgb = (css) => (css.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
const mix = (a, b, p) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(',')})`;

// Flies a copy of `from` to where `to` will be once the page has travelled by
// `travel` pixels, over the same time and on the same curve as the page itself.
function handoff(from, to, travel) {
  const src = from.getBoundingClientRect();
  const on = src.width > 0 && src.bottom > 0 && src.top < window.innerHeight;
  if (!on || REDUCED.matches) return;

  const a = getComputedStyle(from);
  const b = getComputedStyle(to);
  const fromValue = numberOf(from.textContent);
  const toValue = numberOf(to.textContent);
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue)) return;

  // The signs around the new figure — «~», «+» — fly with it from the start:
  // turning up only once it has landed, they would read as a jolt.
  const [, before = '', after = ''] = to.textContent.match(/^(\D*)[\d\s  ]*?\d(\D*)$/) || [];
  const copy = document.createElement('div');
  copy.className = 'page-handoff';
  const lead = document.createElement('span');
  const digits = document.createTextNode(nf(fromValue));
  lead.textContent = before;
  copy.append(lead, digits, after);
  Object.assign(copy.style, {
    fontFamily: a.fontFamily,
    fontSize: a.fontSize,
    fontWeight: a.fontWeight,
    letterSpacing: a.letterSpacing,
    color: a.color
  });
  document.body.appendChild(copy);

  // Where the copy sits untouched, so the start and the end can be matched to
  // the real figures exactly — centre to centre, left edge to left edge. At the
  // start it is the digits that sit on the old figure: a sign in front of them
  // hangs out to the left.
  const home = copy.getBoundingClientRect();
  const dst = to.getBoundingClientRect();
  const scale = parseFloat(b.fontSize) / parseFloat(a.fontSize);
  const x0 = src.left - home.left - lead.getBoundingClientRect().width;
  const y0 = src.top + src.height / 2 - (home.top + home.height / 2);
  const x1 = dst.left - home.left;
  const y1 = dst.top - travel + dst.height / 2 - (home.top + (home.height * scale) / 2);
  const c0 = rgb(a.color);
  const c1 = rgb(b.color);

  from.style.visibility = 'hidden';
  to.style.visibility = 'hidden';

  play(SETTLE_MS, (p) => {
    const e = settle(p);
    const k = 1 + (scale - 1) * e;
    copy.style.transform = `translate(${(x0 + (x1 - x0) * e).toFixed(1)}px, ${(y0 + (y1 - y0) * e).toFixed(1)}px) scale(${k.toFixed(4)})`;
    copy.style.color = mix(c0, c1, e);
    // The weight cannot be tweened — the family has no weights in between — so
    // it changes over halfway, where the figure is moving fastest.
    if (e > 0.5) copy.style.fontWeight = b.fontWeight;
    digits.textContent = nf(p < 1 ? Math.round(fromValue + (toValue - fromValue) * e) : toValue);
  }, () => {
    from.style.visibility = '';
    to.style.visibility = '';
    copy.remove();
  });
}

// A block can hand over a picture as well as a figure, and the next lead-in is
// then asked over it: the stadium the reader has just filled grows to the whole
// screen, and the question about the students on it stands on top.
//
// The block before gives it from its api as `carry`: the canvas the picture is
// in now (`from`), where in that canvas the picture sits (`box()`), and a way to
// paint it the way it is handed over into any canvas (`paint(target)`, which
// answers with the box it has drawn in). The picture is laid ahead of time
// across the screen under the lead-in — which stands at the top for it, see
// `lifted` in lib/page.js — and fades as the lead-in leaves, see --lead-away.
const UNDER = 8;             // between the last line of the lead-in and the picture, px

//
// The picture stands on a card, the same white card it sat on in its own
// block: sized to the picture rather than to the screen, with a wide margin of
// white round it, and in the middle of the screen.
const BACKDROP_SHARE = 0.72;   // the picture, of the height under the lead-in
const CARD_PAD = 44;           // white round the picture, px

function backdropOf(section, picture) {
  let frame = section.querySelector(':scope > .viz-backdrop');
  const lead = section.querySelector('.viz-lead');
  const room = section.getBoundingClientRect();
  const column = section.querySelector('.viz-container').getBoundingClientRect();
  const top = Math.round(lead.getBoundingClientRect().bottom - room.top + UNDER);
  const free = room.height - top - parseFloat(getComputedStyle(section).paddingBottom);
  const shape = picture.box();
  const ratio = shape.w > 0 && shape.h > 0 ? shape.w / shape.h : 1.2;
  // The picture keeps its size; the white grows round it, as far as there is
  // room for it under the lead-in and across the column.
  const inner = Math.round(free * BACKDROP_SHARE);
  let height = Math.min(Math.round(free), inner + 2 * CARD_PAD);
  let width = Math.round(inner * ratio + 2 * CARD_PAD);
  if (width > column.width) {
    width = Math.round(column.width);
    height = Math.round((width - 2 * CARD_PAD) / ratio + 2 * CARD_PAD);
  }
  const left = Math.round((room.width - width) / 2);
  const size = `${window.innerWidth}×${window.innerHeight}×${top}×${left}×${width}×${height}`;
  if (frame && frame.dataset.size === size) return frame.picture;
  if (!frame) {
    frame = document.createElement('div');
    frame.className = 'viz-backdrop';
    frame.setAttribute('aria-hidden', 'true');
    const canvas = document.createElement('canvas');
    frame.appendChild(canvas);
    frame.picture = canvas;
    canvas.frame = frame;
    section.prepend(frame);
    window.addEventListener('resize', () => {
      delete frame.dataset.size;
      backdropOf(section, picture);
    });
  }
  frame.dataset.size = size;
  Object.assign(frame.style, {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    padding: `${CARD_PAD}px`
  });
  const canvas = frame.picture;
  canvas.box = picture.paint(canvas);
  return canvas;
}

// Grows the picture from where it is to where the backdrop will be once the
// page has travelled by `travel` pixels, over the same time and on the same
// curve as the page. Two copies make the move — the picture as it stands and
// the picture as it is handed over — and the second fades in over the first, so
// whatever changes colour on the way does it in flight.
function carry(picture, backdrop, travel) {
  const src = picture.from.getBoundingClientRect();
  const on = src.width > 0 && src.bottom > 0 && src.top < window.innerHeight;
  if (!on || REDUCED.matches || !backdrop.box) return;

  const home = backdrop.getBoundingClientRect();
  const a = picture.box();
  const b = backdrop.box;
  // The picture on the screen: where it is now and where it lands.
  const start = { x: src.left + a.x, y: src.top + a.y, w: a.w };
  const end = { x: home.left + b.x, y: home.top - travel + b.y, w: b.w };

  const layer = (image, left, top, width, height) => {
    const copy = document.createElement('canvas');
    copy.className = 'page-carry';
    copy.width = image.width;
    copy.height = image.height;
    Object.assign(copy.style, {
      left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`
    });
    copy.getContext('2d').drawImage(image, 0, 0);
    document.body.appendChild(copy);
    return copy;
  };
  // The card goes with the picture: from the card it sat on in its own block
  // to the one it stands on under the lead-in. Laid first, so it stays under.
  const cardFrom = picture.from.closest('.canvas-card') || picture.from;
  const c0 = cardFrom.getBoundingClientRect();
  const c1 = backdrop.frame.getBoundingClientRect();
  const card = document.createElement('div');
  card.className = 'page-carry page-carry-card';
  document.body.appendChild(card);
  const placeCard = (e) => {
    const lerp = (a, b) => (a + (b - a) * e).toFixed(1);
    Object.assign(card.style, {
      left: `${lerp(c0.left, c1.left)}px`,
      top: `${lerp(c0.top, c1.top - travel)}px`,
      width: `${lerp(c0.width, c1.width)}px`,
      height: `${lerp(c0.height, c1.height)}px`
    });
  };
  placeCard(0);

  const was = layer(picture.from, src.left, src.top, src.width, src.height);
  const will = layer(backdrop, home.left, home.top - travel, home.width, home.height);
  will.style.opacity = '0';

  // Puts a layer so that the picture in it — at `inner` inside the layer —
  // covers `box` on the screen.
  const place = (el, left, top, inner, box) => {
    const k = box.w / inner.w;
    el.style.transform = `translate(${(box.x - left - k * inner.x).toFixed(1)}px, `
      + `${(box.y - top - k * inner.y).toFixed(1)}px) scale(${k.toFixed(4)})`;
  };

  cardFrom.style.visibility = 'hidden';
  backdrop.frame.style.visibility = 'hidden';

  play(SETTLE_MS, (p) => {
    const e = settle(p);
    const box = {
      x: start.x + (end.x - start.x) * e,
      y: start.y + (end.y - start.y) * e,
      w: start.w + (end.w - start.w) * e
    };
    placeCard(e);
    place(was, src.left, src.top, a, box);
    place(will, home.left, home.top - travel, b, box);
    will.style.opacity = Math.min(1, e * 1.5).toFixed(3);
  }, () => {
    cardFrom.style.visibility = '';
    backdrop.frame.style.visibility = '';
    card.remove();
    was.remove();
    will.remove();
  });
}

// Collects the beats of one section: settling it onto the screen, its title
// card (which may arrive in parts), and the steps of its scene.
//
// A beat knows three things about itself: how to play (`run`), how to play
// backwards (`back`) and how to be simply in its finished state (`settle`,
// for when the reader arrives from another section and there is nothing to
// animate). Both the card and a scene step are a function of one number, so
// putting either of them back where it was is exact, not an approximation.
function beatsOf(entry, before = null) {
  const { section, opening, steps, setStep, build, opensOnStep, hold } = entry;
  const list = [];

  // The block has just been put together and the section is on its way in:
  // this is the moment the card can be measured for real.
  const enter = () => {
    build();
    // A block that opens already showing its first step is put into it here:
    // that picture is what the section arrives with, and the beat that fades
    // the block in is the one that brings it.
    if (opensOnStep && steps) setStep(0);
    if (opening) { opening.remeasure(); opening.runBeat(0, 0); }
  };

  // 1. Bring the section onto the screen, and build it while it travels. The
  //    figure the block before ended on travels with it — forward only: going
  //    back, the reader is returning to a picture, not being told something.
  //    A picture the block before hands over is laid under the lead-in — ahead
  //    of time, when the block is made ready, so the beat only has to move it.
  const picture = () => (before && before.carry && section.querySelector('.viz-lead')
    ? before.carry()
    : null);
  entry.lay = () => {
    const given = picture();
    return given ? backdropOf(section, given) : null;
  };

  list.push({
    section,
    run: (done) => {
      const from = before && before.handoff
        && before.section.querySelector(`.viz-body [data-el="${before.handoff}"]`);
      enter();
      const travel = section.offsetTop - window.scrollY;
      const backdrop = entry.lay();
      // Laid first, so the figure flies over the picture rather than under it.
      if (backdrop) carry(picture(), backdrop, travel);
      const to = section.querySelector('.viz-lead-value .viz-handoff');
      if (from && to) handoff(from, to, travel);
      glide(section.offsetTop, done);
    },
    settle: () => { enter(); entry.lay(); }
  });

  // 2. The opening, one beat per thing that happens in it: a part of the
  //    lead-in arriving, the lead-in sliding aside, a part of the card, the
  //    card settling. The stretches where it only waits are not beats at all.
  if (opening) {
    opening.beats.forEach((_, i) => {
      list.push({
        section,
        run: (done) => {
          if (opening.remeasure) opening.remeasure();
          play(BEAT_MS, (p) => opening.runBeat(i, p), done);
        },
        back: (done) => play(BEAT_MS, (p) => opening.runBeat(i, 1 - p), done),
        settle: () => opening.runBeat(i, 1)
      });
    });
  }

  // 3. The scene, one step per beat. The module animates the step itself; the
  //    beat is over when that animation has had its time. Taking a step back
  //    is the same call with the step before it — the module animates that
  //    just as willingly.
  //    A block that arrives on its first step has shown it already, so its
  //    beats start with the one after — otherwise the first movement of the
  //    wheel would land on a picture that is on the screen anyway.
  //    A step can also ask the reader for something before it will start — a
  //    guess, say — through `hold`: asked when the reader wants to go on, it
  //    answers whether the page has to wait, and shows them why if so.
  for (let i = opensOnStep ? 1 : 0; i < steps; i++) {
    list.push({
      section,
      hold: hold ? (options) => hold(i, options) : null,
      run: (done) => { setStep(i); play(BEAT_MS, () => {}, done); },
      back: (done) => { setStep(Math.max(0, i - 1)); play(BEAT_MS, () => {}, done); },
      settle: () => setStep(i)
    });
  }

  return list;
}

// The page on a narrow screen: an ordinary scrolling page.
//
// Nothing is hijacked and nothing is pinned whole — a block laid out in one
// column is a screen and a half tall, and holding it still would hide half of
// it. What the beats did, the scrolling does: a block is put together as the
// reader comes to it, its title card follows its own position on the screen,
// and a scene shows the state it ends in, with its controls left to the reader.
function mountScrolled(entries, onProgress) {
  const near = (section, reach = 1.5) => {
    const box = section.getBoundingClientRect();
    return box.bottom > -window.innerHeight && box.top < window.innerHeight * reach;
  };

  // Built on the way in, like everywhere else: whatever a block animates on
  // start then plays in front of the reader rather than behind their back.
  const watch = new IntersectionObserver((rows) => {
    rows.forEach((row) => {
      if (!row.isIntersecting) return;
      const entry = entries.find((e) => e.section === row.target);
      if (!entry || entry.built) return;
      entry.built = true;
      entry.build();
      // A scene is a story told in steps, and steps need a screen that holds
      // still. Here it shows what it comes to in the end — the module says so
      // itself by taking the last step.
      if (entry.steps) entry.setStep(entry.steps - 1);
      if (entry.opening) entry.opening.follow();
    });
  }, { rootMargin: '400px 0px' });
  entries.forEach((e) => watch.observe(e.section));

  // Which block the reader is looking at, and how far through it they are:
  // measured against a line a little above the middle of the screen, which is
  // where the eye sits while reading.
  const place = () => {
    const view = window.scrollY + window.innerHeight * 0.45;
    let index = -1;
    let part = 0;
    entries.forEach((e, i) => {
      if (view < e.section.offsetTop) return;
      index = i;
      part = Math.min(1, (view - e.section.offsetTop) / Math.max(1, e.section.offsetHeight));
    });
    return { index, part, count: entries.length, seen: entries.length - 1 };
  };

  const height = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

  let queued = false;
  const paint = () => {
    queued = false;
    entries.forEach((e) => { if (e.opening && near(e.section)) e.opening.follow(); });
    if (onProgress) onProgress(window.scrollY / height(), place());
  };

  // Every card is painted once at the start, even the ones far below: until a
  // card has been through this it is placed by the rules of a wide screen, and
  // a lead-in screen — fixed to the window here — would hang over the title.
  entries.forEach((e) => { if (e.opening) e.opening.follow(); });
  paint();

  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    entries.forEach((e) => { if (e.opening) e.opening.follow(); });
    onScroll();
  });

  // The blocks of the progress bar still lead somewhere: here it is simply a
  // scroll to the top of that block.
  const toBlock = (i) => {
    const entry = entries[i];
    if (entry) window.scrollTo({ top: entry.section.offsetTop, behavior: 'smooth' });
  };

  return { free: true, toBlock };
}

// `entries` describe the sections in order. Each is
// { section, opening, steps, setStep, build } — see beatsOf.
export function mountStepper(entries, { onProgress, finale } = {}) {
  entries.forEach((e) => markFigure(e.section));
  const beats = entries.flatMap((e, i) => beatsOf(e, entries[i - 1] || null));

  // The story ends with the credits. They are not a section and have no screen
  // of their own: the page lifts just far enough to bring them into view under
  // the last block.
  const bottom = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  if (finale) beats.push({ top: bottom, run: (done) => glide(bottom(), done) });
  let at = -1;                 // the last beat played
  let reached = -1;            // and the furthest one ever played
  let busy = false;
  let lastInput = 0;           // when the current movement last said anything
  let peak = 0;                // the hardest it has pushed
  let quietest = Infinity;     // and how gently it has got since that peak
  let lastBeat = 0;            // when the page last moved on its own account

  // Nothing to watch: everything is put in its finished state at once, and the
  // page is left to scroll normally.
  if (REDUCED.matches) {
    entries.forEach((e) => {
      e.build();
      if (e.opening) e.opening.run(1);
      if (e.steps) e.setStep(e.steps - 1);
    });
    if (onProgress) onProgress(1);
    return { free: true };
  }

  // A phone is read with the thumb, and a block does not fit its screen: laid
  // out in one column, every one of them is a screen and a half tall. Beats
  // would have to hide half of what they show, so here the page is a page —
  // it scrolls, and the story is told by that scrolling instead. The title
  // cards still play: each follows its own place on the screen.
  if (NARROW.matches) return mountScrolled(entries, onProgress);

  // A tablet turned on its side crosses that width, and the two ways of reading
  // cannot be swapped under the reader's feet: the page starts over in the
  // other one. Rare enough to be worth the simplicity.
  NARROW.addEventListener('change', () => location.reload());

  document.documentElement.classList.add('is-stepped');

  // A reload would otherwise drop the reader back where they were scrolled to,
  // while the story itself starts from the beginning — a page standing in the
  // middle of a section that has not been told yet.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  // Pictures and fonts land after this, and the browser can nudge the page
  // again while it settles.
  window.addEventListener('load', () => { if (at < 0) window.scrollTo(0, 0); });

  // Where the reader is, told as the story is built rather than as a fraction:
  // which block they are in and how far through it. The progress bar shows the
  // page as its blocks, so «three of seven, halfway» is readable at a glance —
  // one long line says only «somewhere in the middle».
  const order = entries.map((e) => e.section);
  // The beat each block starts with — the one that brings it onto the screen.
  const starts = order.map((s) => beats.findIndex((b) => b.section === s));
  const blockOf = (i) => {
    if (i < 0) return -1;
    const beat = beats[i];
    // The credits at the end belong to no block: the story is simply over.
    return beat.section ? order.indexOf(beat.section) : order.length - 1;
  };

  const place = () => {
    const count = order.length;
    const seen = blockOf(reached);          // the furthest block ever opened
    if (at < 0) return { index: -1, part: 0, count, seen };
    const beat = beats[at];
    if (!beat.section) return { index: count - 1, part: 1, count, seen };
    const mine = beats.filter((b) => b.section === beat.section);
    return {
      index: order.indexOf(beat.section),
      part: (mine.indexOf(beat) + 1) / mine.length,
      count,
      seen
    };
  };

  // Whether the next step is waiting for the reader to do something first — a
  // guess, say. Asked quietly: the block only answers and shows nothing, so it
  // can be asked at any moment, not just when the reader tries to go on.
  const waiting = () => {
    const next = beats[at + 1];
    return !!(next && next.hold && next.hold({ quiet: true }));
  };

  const report = () => onProgress
    && onProgress((at + 1) / beats.length, { ...place(), waiting });

  // Putting a block together costs between eight and seventy milliseconds, and
  // the beat that brings it on is the worst moment to spend them: the page is
  // travelling and the reader is watching it move. So the next block is made
  // ready while they are still reading this one — the page stands still then,
  // waiting for a movement, and the work goes unnoticed.
  //
  // Everything the arrival would have done is done here: the block itself, the
  // step it opens on, and the measuring of its card. What is left for the beat
  // is putting the card in its first frame, which is free.
  const idle = (fn) => (window.requestIdleCallback
    ? requestIdleCallback(fn, { timeout: 1500 })
    : setTimeout(fn, 300));

  const prepare = (entry) => {
    if (!entry || entry.ready) return;
    entry.ready = true;
    entry.build();
    if (entry.opensOnStep && entry.steps) entry.setStep(0);
    if (entry.opening) entry.opening.remeasure();
    // A full-screen picture is a lump of its own — see backdropOf.
    if (entry.lay) entry.lay();
  };

  // The browser hands out idle time between frames too, and a block is a
  // single lump of work that cannot be cut in half — let go mid-beat it eats
  // seven frames of the animation. So it is put off again whenever a beat
  // starts, and taken up when the page comes to rest.
  let warming = 0;
  const warm = () => {
    const next = blockOf(at) + 1;
    if (next >= entries.length || entries[next].ready) return;
    warming = idle(() => { warming = 0; prepare(entries[next]); });
  };

  const chill = () => {
    if (warming && window.cancelIdleCallback) cancelIdleCallback(warming);
    warming = 0;
  };

  const done = () => { busy = false; warm(); };

  const forward = () => {
    if (at >= beats.length - 1) return;
    // While a beat plays the page takes no orders. Anything arriving then is
    // the same movement still going — a trackpad keeps sending for a second
    // after the fingers have left it — and nothing is remembered for later:
    // a beat the reader did not ask for twice is worse than one they have to
    // ask for again.
    if (busy) return;
    // The next step may be waiting for the reader to do something first. It
    // says so itself and shows them what — the page just does not move.
    const next = beats[at + 1];
    if (next.hold && next.hold()) return false;
    chill();
    busy = true;
    at += 1;
    if (at > reached) reached = at;      // the story has never been further
    report();
    beats[at].run(done);
  };

  // Going to a block, rather than to the next picture: everything before it is
  // put into the state it was left in, everything after it back to the way it
  // opens, and the page travels there in one movement. The reader is not
  // carried past what they have not seen — a block they have never opened
  // cannot be jumped to, only read up to.
  const toBlock = (i) => {
    if (busy || i < 0 || i >= starts.length) return;
    const target = starts[i];
    if (target < 0 || target > reached || target === at) return;
    chill();
    busy = true;
    entries.forEach((e) => {
      if (e.opening) e.opening.run(0);
      if (e.steps) e.setStep(0);
    });
    for (let k = 0; k <= target; k++) if (beats[k].settle) beats[k].settle();
    at = target;
    report();
    glide(beats[target].section.offsetTop, done);
  };

  // A block at a time in either direction — but forward only into what has
  // already been read. Where there is nothing to jump to, the page simply
  // takes the next beat, so the key never does nothing.
  const nextBlock = () => {
    const i = blockOf(at) + 1;
    if (i < starts.length && starts[i] <= reached) toBlock(i);
    else forward();
  };

  const prevBlock = () => {
    const here = blockOf(at);
    // Standing at the very start of a block, «back» means the one before it.
    const i = at === starts[here] ? here - 1 : here;
    if (i < 0) rewind();
    else toBlock(i);
  };

  // Going back takes the last beat back the way it came: the same movement,
  // played in reverse. Only when it steps out of a section — where there is no
  // single animation to reverse — does the page travel instead, with the
  // section it returns to put straight away into the state it was left in.
  const back = () => {
    if (at < 0) return;
    if (busy) return;
    chill();
    const undoing = beats[at];
    at -= 1;
    report();
    busy = true;
    // Before the first beat there is the title screen the page opened on, and
    // the reader is allowed all the way back to it.
    if (at < 0) { glide(0, done); return; }
    const target = beats[at];
    if (undoing.back && undoing.section === target.section) {
      undoing.back(done);
    } else {
      if (target.settle) target.settle();
      glide(target.top ? target.top() : target.section.offsetTop, done);
    }
  };

  // Only the first event of a movement acts. Every event pushes the mark
  // forward, so the tail of a flick — and anything arriving while a beat plays
  // — keeps the movement alive instead of queueing up more beats behind it.
  const onWheel = (e) => {
    e.preventDefault();
    const force = Math.abs(e.deltaY);
    if (force < 2) return;
    const now = performance.now();

    // Two things tell a new movement from the tail of the last one. A pause is
    // the plain case. The other is a shove: once a movement has passed its
    // peak it only ever fades, so a push several times harder than the gentlest
    // it has got since then is a hand starting again — that is what a second
    // swipe looks like when it lands before the previous flick has died away.
    //
    // Only the fading half counts. A swipe first speeds up, and measuring the
    // gentlest against that run-up would make the swipe shove itself: one
    // movement, two beats.
    const paused = now - lastInput > GESTURE_GAP;
    // A momentum tail is not smooth: it dips and bumps on the way down, and a
    // bump three times the dip is nothing like a hand. A new swipe opens with
    // a push of its own size — that is what is looked for here.
    const shove = force > Math.max(quietest * 4, 30);
    lastInput = now;

    if (!paused && !shove) {
      if (force >= peak) peak = force;            // still speeding up
      else quietest = Math.min(quietest, force);  // past the peak, fading
      return;
    }

    // Two beats cannot follow each other closer than a beat lasts, whoever
    // asked for them: one movement of the hand is one beat, and a tail that
    // fooled the test above cannot make it two.
    if (now - lastBeat < BEAT_MS) {
      if (force >= peak) peak = force;
      else quietest = Math.min(quietest, force);
      return;
    }

    peak = force;
    quietest = Infinity;
    // A step that is still waiting for the reader played nothing, so it does
    // not count as a beat: once they have done what it asked, the very next
    // movement goes on, rather than one that comes a beat later.
    if ((e.deltaY > 0 ? forward : back)() !== false) lastBeat = now;
  };

  // One swipe is one beat: the finger has to come off and go on again.
  let touchY = 0;
  let swiped = false;
  const onTouchStart = (e) => { touchY = e.touches[0].clientY; swiped = false; };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (swiped) return;
    const dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 40) return;
    swiped = true;
    lastInput = performance.now();
    lastBeat = lastInput;
    (dy > 0 ? forward : back)();
  };

  // Home goes back to the title screen in one move: every section is put back
  // to the state it opens in, so reading forward again plays out exactly as it
  // did the first time.
  const rewind = () => {
    if (at < 0 || busy) return;
    chill();
    busy = true;
    entries.forEach((e) => {
      if (e.opening) e.opening.run(0);
      if (e.steps) e.setStep(0);
    });
    at = -1;
    report();
    glide(0, done);
  };

  // Three sizes of step: a beat on the arrows, a whole block on PageUp and
  // PageDown, the title screen on Home.
  const KEYS_FORWARD = [' ', 'ArrowDown', 'ArrowRight', 'Enter'];
  const KEYS_BACK = ['ArrowUp', 'ArrowLeft'];
  const onKey = (e) => {
    // A slider the reader is moving from the keyboard keeps the arrows for
    // itself; space and Enter still carry the story on.
    const control = e.target instanceof Element
      && e.target.closest('[role="slider"]:not([aria-disabled="true"])');
    if (control && e.key.startsWith('Arrow')) return;
    if (e.repeat) { e.preventDefault(); return; }   // holding a key is one press
    if (KEYS_FORWARD.includes(e.key)) { e.preventDefault(); forward(); }
    else if (KEYS_BACK.includes(e.key)) { e.preventDefault(); back(); }
    else if (e.key === 'PageDown') { e.preventDefault(); nextBlock(); }
    else if (e.key === 'PageUp') { e.preventDefault(); prevBlock(); }
    else if (e.key === 'Home') { e.preventDefault(); rewind(); }
  };

  // Capture, not bubble: a list with its own scrollbar would otherwise take
  // the movement for itself and the page would stand still until the reader
  // tapped somewhere neutral first.
  const grab = { passive: false, capture: true };
  document.addEventListener('wheel', onWheel, grab);
  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onTouchMove, grab);
  document.addEventListener('keydown', onKey, true);

  // A block can ask for the next beat itself — a button that sends an answer,
  // say. It counts as the reader asking: a step that waits still has its say.
  document.addEventListener('story:next', () => forward());

  // Belt and braces: anything sent straight at the window never passes through
  // the document, and a second call on the same event is harmless — the
  // gesture check swallows it.
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  report();
  // The title screen is the longest pause the page ever gets — the reader is
  // reading it. The first block is made ready in it.
  warm();
  return { forward, back, toBlock };
}
