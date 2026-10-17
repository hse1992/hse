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
// A step can ask for longer than that — a turn in the story worth dwelling on,
// where the picture has further to travel than usual. Only as far as this: past
// it the reader is waiting for the page rather than watching it.
const LONGEST_MS = 2500;
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
// Nothing a block does may stop the page from being read.
//
// A beat is played by calling into a module, and the page waits for that call
// to say it has finished before it listens to the wheel again. So an exception
// thrown anywhere in there — a picture that cannot be painted, a step that
// trips over a missing element — would leave the page waiting for ever: no
// beat, no scrolling, no keys, nothing but a reload. One broken block would
// take the whole story down with it, and the reader would have no way of
// telling that from a page that simply stopped.
//
// So every call into a module goes through here. What throws is reported once,
// for whoever is looking at the console, and the page carries on: the picture
// may be wrong from then on, but the reading is not over.
function tried(what, fn, fallback) {
  try {
    return fn();
  } catch (err) {
    console.error(`Такт «${what}» упал, страница читается дальше`, err);
    if (fallback) fallback();
    return undefined;
  }
}

// no frames, and counting from the start would skip the beat to its end.
function play(ms, fn, done) {
  let last = performance.now();
  let spent = 0;
  const tick = (now) => {
    const dt = now - last;
    last = now;
    spent += dt > 250 ? 16 : dt;
    const p = Math.min(1, spent / ms);
    // A frame that throws ends the beat rather than the rAF loop: stopping the
    // loop here is exactly what would hang the page.
    let alive = true;
    tried('кадр', () => fn(p), () => { alive = false; });
    if (!alive) { if (done) done(); return; }
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
// первокурсников», «77 649 мест» becomes «63 000+ студентов». Seven blocks read
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

// The page opens on a title screen that ends with «Осторожно, двери
// закрываются!» — so the first beat closes them. Two leaves of a metro car
// meet over the whole screen, the page steps to the first block behind them,
// and they open on «Следующая остановка — Вышкинская». For that moment the
// page is not a page but a train.
const DOORS_SHUT = 620;      // the leaves coming together
const DOORS_HOLD = 280;      // shut, with the page moving behind them
const DOORS_OPEN = 760;      // and opening on the block

function doorsCurtain() {
  const wrap = document.createElement('div');
  wrap.className = 'page-doors';
  wrap.setAttribute('aria-hidden', 'true');
  const leaf = (side) => `<div class="page-door page-door-${side}">`
    + '<div class="page-door-window">'
    +   '<span class="page-door-sign">Не прислоняться</span>'
    + '</div>'
    + '<div class="page-door-stripe page-door-stripe-up"></div>'
    + '<div class="page-door-stripe page-door-stripe-down"></div>'
    + '</div>';
  wrap.innerHTML = leaf('left') + leaf('right');
  document.body.appendChild(wrap);
  const [left, right] = wrap.children;

  // 0 — wide open, 1 — shut.
  const put = (p) => {
    const away = (100 * (1 - p)).toFixed(2);
    left.style.transform = `translateX(-${away}%)`;
    right.style.transform = `translateX(${away}%)`;
  };
  put(0);
  return { put, remove: () => wrap.remove() };
}

// The other end of the story has a curtain too. The satellite still in orbit
// photographs the Earth, and the block it closes can end on that picture being
// taken: the screen goes white in the flash, the page steps on behind it, and
// what comes out of the white is the next block — the way a photograph comes
// up. One flash and no more: a light that blinks is not a camera. It comes up
// fast and goes down slowly, the way the eye takes a flash in.
const FLASH_UP = 180;        // the light coming up
const FLASH_HOLD = 160;      // all white, with the page moving behind it
const FLASH_DOWN = 1100;     // and the next block coming up out of it

function flashCurtain() {
  const veil = document.createElement('div');
  veil.className = 'page-flash';
  veil.setAttribute('aria-hidden', 'true');
  document.body.appendChild(veil);
  // 0 — nothing, 1 — all white.
  const put = (p) => { veil.style.opacity = p.toFixed(3); };
  put(0);
  return { put, remove: () => veil.remove() };
}

// A photograph does not come up the way a door opens. Easing out, the white
// would drop away at once and leave only a faint haze to clear; the picture
// has to take its time at first and come through as it goes — slow, then
// quicker, then settling.
const develop = (p) => p * p * (3 - 2 * p);

// A block can arrive through a curtain rather than by the page travelling to
// it: the curtain closes over the screen, the page steps to the block behind
// it, and it opens on the block. Which one is set per block in index.html.
// `joins` says the curtain belongs to the beat before it rather than to a beat
// of its own: the block ends on something that asks for it — a photograph being
// taken — and waiting for another movement of the wheel would break the one
// movement in two. The doors are the opposite case: the title screen says
// «Осторожно, двери закрываются!» and the reader closes them themselves.
const CURTAINS = {
  doors: { make: doorsCurtain, close: DOORS_SHUT, hold: DOORS_HOLD, open: DOORS_OPEN, opening: settle },
  flash: { make: flashCurtain, close: FLASH_UP, hold: FLASH_HOLD, open: FLASH_DOWN, opening: develop, joins: true }
};

// Collects the beats of one section: settling it onto the screen, its title
// card (which may arrive in parts), and the steps of its scene.
//
// A beat knows three things about itself: how to play (`run`), how to play
// backwards (`back`) and how to be simply in its finished state (`settle`,
// for when the reader arrives from another section and there is nothing to
// animate). Both the card and a scene step are a function of one number, so
// putting either of them back where it was is exact, not an approximation.
function beatsOf(entry, before = null) {
  const { section, opening, steps, setStep, build, open, opensOnStep, hold, holdIntro,
    span, curtain } = entry;
  const list = [];

  // The block has just been put together and the section is on its way in:
  // this is the moment the card can be measured for real — and the moment the
  // picture inside it goes back to its beginning. Behind a curtain this
  // happens with the curtain shut, so the first train pulls in just as the
  // doors open on it.
  const enter = () => {
    build();
    // A block that opens already showing its first step is put into it here:
    // that picture is what the section arrives with, and the beat that fades
    // the block in is the one that brings it.
    if (opensOnStep && steps) setStep(0);
    if (open) tried('открытие блока', open);
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
      // Behind a curtain the page does not travel, it steps: there is nothing
      // to see between the two screens while it is closed.
      const drawn = CURTAINS[curtain];
      if (drawn && !REDUCED.matches) {
        const cover = drawn.make();
        play(drawn.close, (p) => cover.put(settle(p)), () => {
          enter();
          window.scrollTo(0, section.offsetTop);
          setTimeout(() => {
            play(drawn.open, (p) => cover.put(1 - drawn.opening(p)), () => {
              cover.remove();
              done();
            });
          }, drawn.hold);
        });
        return;
      }
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
      // A part of the lead-in screen can wait for the reader, the way a step of
      // a scene can: a screen that asks something must not answer it on the
      // next movement of the wheel before the reader has said anything. Only
      // the parts, and by the number the module marked them with — beat 0 opens
      // data-stage="1". What the screen does after that, and the rest of the
      // opening, is nobody's to hold.
      const stage = i < (opening.leadParts || 0) ? i + 1 : 0;
      // The block itself is under the card until the last of these beats, and
      // that is the beat the reader first sees it on — so it is there, and not
      // at the arrival, that whatever it has going starts from its beginning.
      const reveals = open && i === opening.beats.length - 1;
      list.push({
        section,
        hold: stage && holdIntro ? (options) => holdIntro(stage, options) : null,
        run: (done) => {
          if (opening.remeasure) opening.remeasure();
          if (reveals) tried('открытие блока', open);
          play(BEAT_MS, (p) => opening.runBeat(i, p), done);
        },
        back: (done) => play(BEAT_MS, (p) => opening.runBeat(i, 1 - p), done),
        settle: () => {
          if (reveals) tried('открытие блока', open);
          opening.runBeat(i, 1);
        }
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
  //    A step that plays something longer than a beat says so itself, through
  //    `span`: the page then waits for it instead of taking the next movement
  //    of the wheel over the top of it.
  const spanOf = (i) => {
    const asked = span ? span(i) : 0;
    return Math.min(Math.max(asked || BEAT_MS, BEAT_MS), LONGEST_MS);
  };

  for (let i = opensOnStep ? 1 : 0; i < steps; i++) {
    list.push({
      section,
      hold: hold ? (options) => hold(i, options) : null,
      run: (done) => { setStep(i); play(spanOf(i), () => {}, done); },
      back: (done) => { setStep(Math.max(0, i - 1)); play(spanOf(i - 1), () => {}, done); },
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
      if (!entry) return;
      // Coming onto the screen starts whatever the block has going of its own
      // from the beginning — scrolling back to a block is opening it again.
      // Asked before the block is built, so that a block arriving for the first
      // time is simply new rather than new and then put back.
      if (entry.open) tried('открытие блока', entry.open);
      if (!entry.built) {
        entry.built = true;
        tried('сборка блока', () => {
          entry.build();
          // A scene is a story told in steps, and steps need a screen that
          // holds still. Here it shows what it comes to in the end — the module
          // says so itself by taking the last step.
          if (entry.steps) entry.setStep(entry.steps - 1);
          if (entry.opening) entry.opening.follow();
        });
      }
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

  // ---------- «Далее» ----------
  // A story told by scrolling is told in stretches of a couple of hundred
  // pixels, and a flick of the thumb is seven hundred: three or four states go
  // past in one movement, each of them starting an animation the next one cuts
  // off. So a block that has a story left to tell offers a button in the
  // corner the thumb reaches, and a press moves the page by exactly one state.
  // It does not take the scroll away — the reader can go on flicking — it only
  // makes one state per touch possible for anyone who wants it.
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'page-next';
  next.hidden = true;
  next.innerHTML = 'Дальше <span aria-hidden="true">↓</span>';
  document.body.appendChild(next);
  // The page is moved by hand rather than by `behavior: 'smooth'`, and moved
  // by asking the block again on every frame how much is left. A block changes
  // its own height when it hands itself over to the reader — the figures fold
  // up, the controls open — and the browser answers that by shifting the
  // scroll under us to hold the picture still. A glide told «two hundred
  // pixels from here» is cancelled by that shift; one told «until the next
  // state» simply arrives.
  let gliding = 0;
  let togo = 0;
  const left = () => {
    const here = entries[place().index];
    return here && here.ahead ? here.ahead() : 0;
  };
  const glide = () => {
    if (togo <= 0 || performance.now() - gliding > 900) { gliding = 0; togo = 0; return; }
    const by = Math.max(6, Math.min(togo, 22));
    window.scrollBy(0, by);
    // What was asked for, not what the page gave: when the block folds up on
    // arriving, the browser shifts the scroll back to hold the picture still,
    // and counting the difference would turn one state into three.
    togo -= by;
    requestAnimationFrame(glide);
  };
  // The press is the whole gesture: pressed again before the page has arrived,
  // it would stack scrolls and fly past two states at once.
  next.addEventListener('click', () => {
    if (gliding) return;
    togo = left();
    if (togo <= 0) return;
    gliding = performance.now();
    requestAnimationFrame(glide);
  });

  const hint = document.querySelector('.scroll-hint');

  let queued = false;
  const paint = () => {
    queued = false;
    // A block is only painted while it is anywhere near the screen — but the
    // last painting before it leaves must be the settled one, or it is left
    // mid-flight for the rest of the page. The title card of the flags block
    // stayed parked a screen to the right that way, and the document grew to
    // twice its width around it. So a block that has just gone out of range is
    // painted once more, and only then left alone.
    entries.forEach((e) => {
      if (!e.opening) return;
      const close = near(e.section);
      if (close || e.wasNear) e.opening.follow();
      e.wasNear = close;
    });
    const at = place();
    if (onProgress) onProgress(window.scrollY / height(), at);
    // Shown only where there is a next state to go to. The nudge at the foot
    // of the screen says the same thing in words, so the two never stand
    // together.
    const here = entries[at.index];
    const gap = here && here.ahead ? here.ahead() : 0;
    next.hidden = !(gap > 0);
    if (hint) hint.classList.toggle('is-covered', gap > 0);
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

  // And back to the title screen, the way the bar offers everywhere else.
  const rewind = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return { free: true, toBlock, rewind };
}

// `entries` describe the sections in order. Each is
// { section, opening, steps, setStep, build } — see beatsOf.
export function mountStepper(entries, { onProgress, finale, signal } = {}) {
  entries.forEach((e) => markFigure(e.section));

  // Where a curtain joins, the block before it does not stop to be admired:
  // the picture is taken and the page is already going. The beat that plays
  // the last step of that block runs the arrival of the next one after it,
  // and the two are one movement of the wheel — the satellite shoots, the
  // screen goes white, the finale comes up out of the white. Going back is
  // unchanged: the page returns to the block before, without the curtain.
  // One beat, two blocks: it starts in the one being left and ends in the one
  // being arrived at. Which block a beat belongs to is read off `section` every
  // time the bar is told where the reader is, so the joined beat simply changes
  // its own: the picture is taken while it still belongs to the block before,
  // and it becomes the next block's at the moment the curtain closes — which is
  // the moment the reader leaves. Everything else — going back, jumping to a
  // block — follows from that and needs no special case.
  const join = (last, arrival) => {
    const beat = {
      title: last.title,
      top: last.top,
      section: last.section,
      hold: last.hold,
      // Where the beat stands before it has handed over, and where after: the
      // bar reads these every time it is told where the reader is.
      before: () => {
        beat.title = last.title;
        beat.top = last.top;
        beat.section = last.section;
      },
      after: () => {
        beat.title = false;
        beat.top = arrival.top;
        beat.section = arrival.section;
      },
      run: (done) => {
        // Played again after going back, it starts where it started the first time.
        if (beat.section !== last.section || beat.title !== last.title) {
          beat.before();
          report();
        }
        last.run(() => {
          beat.after();
          report();
          arrival.run(done);
        });
      },
      back: last.back
        ? (done) => { beat.before(); last.back(done); }
        : null,
      settle: () => {
        if (last.settle) last.settle();
        if (arrival.settle) arrival.settle();
        beat.after();
      }
    };
    return beat;
  };

  const lists = entries.map((e, i) => beatsOf(e, entries[i - 1] || null));
  lists.forEach((list, i) => {
    const after = lists[i + 1];
    const curtain = after && CURTAINS[entries[i + 1].curtain];
    // More than one beat of its own: the block has to keep a beat that is
    // still its, or it would drop off the bar altogether.
    if (!after || !curtain || !curtain.joins || REDUCED.matches || list.length < 2) return;
    list[list.length - 1] = join(list[list.length - 1], after.shift());
  });
  const beats = lists.flat();

  // The page opens on one movement of the wheel, not two. The light of a
  // closing door comes up at the top of the title screen with the warning
  // under it, blinks long enough to be read as a warning — and the doors it
  // warns about shut on the same movement, with the page stepping to the first
  // block behind them. Announcing the doors and closing them are one thing
  // happening, and the reader asked for it once.
  // The light on its own, before the leaves move. The lens blinks on a cycle
  // of 900мс, so this is a blink and a half — long enough to read as blinking
  // rather than as one flash, and it ends while the lens is lit, so the doors
  // start moving under a red light rather than a dark one.
  const LAMP_MS = 1200;
  const lit = (on) => signal && signal.classList.toggle('is-here', on);
  if (signal && beats.length) {
    const lamp = {
      title: true,
      top: () => 0,
      run: (done) => { lit(true); play(LAMP_MS, () => {}, done); },
      // Back on the title screen the light has not been lit yet: the beat is
      // taken back whole, warning and all.
      back: (done) => { lit(false); glide(0, done); },
      settle: () => lit(false)
    };
    beats[0] = join(lamp, beats[0]);
  }

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
    entries.forEach((e) => tried('сборка блока', () => {
      e.build();
      if (e.opening) e.opening.run(1);
      if (e.steps) e.setStep(e.steps - 1);
    }));
    lit(true);
    if (onProgress) onProgress(1);
    return { free: true };
  }

  // A phone is read with the thumb, and a block does not fit its screen: laid
  // out in one column, every one of them is a screen and a half tall. Beats
  // would have to hide half of what they show, so here the page is a page —
  // it scrolls, and the story is told by that scrolling instead. The title
  // cards still play: each follows its own place on the screen.
  // Nothing is played beat by beat here — and the doors the lamp belongs to are
  // not played either: on a phone there is no curtain to close. Lit, it blinked
  // on for as long as the reader stayed on the title screen and warned them
  // about doors that were never going to shut, from above the headline. So here
  // it stays dark and the styles take it off the screen altogether.
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
    // The beat of the title screen is before the story starts...
    if (beat.title) return -1;
    // ...and the credits at the end belong to no block: it is simply over.
    return beat.section ? order.indexOf(beat.section) : order.length - 1;
  };

  const place = () => {
    const count = order.length;
    const seen = blockOf(reached);          // the furthest block ever opened
    if (at < 0) return { index: -1, part: 0, count, seen };
    const beat = beats[at];
    // Still on the title screen: the story has not started.
    if (beat.title) return { index: -1, part: 0, count, seen };
    if (!beat.section) return { index: count - 1, part: 1, count, seen };
    const mine = beats.filter((b) => b.section === beat.section);
    return {
      index: order.indexOf(beat.section),
      part: (mine.indexOf(beat) + 1) / mine.length,
      // How many beats this block is worth, so the bar can show the reader how
      // much of it is left — not just which block they are in.
      beats: mine.length,
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

  // Every section of the page is in the document from the start, one under
  // another, and the reader is shown one of them at a time. That is fine for
  // the eye and wrong for the keyboard: Tab would walk out of the screen into
  // the controls of blocks that have been read or have not been reached, and
  // the browser would scroll the page to whatever it focused — against the
  // beat that put the page where it is. A screen reader would wander the same
  // way. So everything except the section on the screen is shut off; `inert`
  // takes it out of the tab order and out of the accessibility tree at once.
  //
  // Only in the stepped reading: below 860px and with «less movement» the page
  // is an ordinary page, everything on it is on the screen sooner or later,
  // and shutting parts of it off would take them away from the keyboard for
  // good.
  //
  // The sections are not the whole page: the title screen above them and the
  // credits below them hold links of their own, and they are off the screen
  // just as surely. Left open, the first Tab of a reader in the middle of the
  // story landed on the link in the title and the browser scrolled the page up
  // to show it — away from the beat the page was on, with nothing to bring it
  // back. So they are shut off too, each one open only where it belongs: the
  // title before the story starts, the credits after it ends.
  const header = document.querySelector('.page-header');
  const only = (current) => {
    entries.forEach((e) => {
      e.section.toggleAttribute('inert', e.section !== current);
    });
    if (header) header.toggleAttribute('inert', at >= 0);
    if (finale) finale.toggleAttribute('inert', at < beats.length - 1);
  };

  // A block that has something of its own going — a train running, a globe
  // turning — starts it from the beginning whenever it comes onto the screen,
  // so that whoever opens it sees the same first picture: the one the block
  // was written around. Said here because every way of getting to a block
  // passes through here: the beat that brings it, a step back into it from the
  // block after, a jump from the bar. The beat that brings a section in says
  // it again when the section is actually placed — behind a curtain that is a
  // second later — so a block is told to open more than once, and being told
  // twice has to mean exactly what being told once means.
  let onScreen = -2;
  const reopen = () => {
    const here = blockOf(at);
    if (here === onScreen) return;
    onScreen = here;
    const entry = here >= 0 ? entries[here] : null;
    if (entry && entry.open) tried('открытие блока', entry.open);
  };

  const report = () => {
    reopen();
    // The light is lit by the beat that opens the page and goes out with it.
    // Wherever the reader ends up before that beat — stepping back, or sent
    // home from the bar — the title screen is the one they first saw, dark.
    if (at < 0) lit(false);
    const beat = at >= 0 ? beats[at] : null;
    // The title screen belongs to no section; the credits at the end are not a
    // section either, and there the last block is still what the reader sees.
    const last = entries[entries.length - 1];
    only(!beat || beat.title ? null : (beat.section || (last && last.section)));
    if (onProgress) onProgress((at + 1) / beats.length, { ...place(), waiting });
  };

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
    // Made ready ahead of time and out of sight: a block that cannot be built
    // must not take the page down with it, and the reader is not even looking
    // at it yet.
    tried('сборка блока', () => {
      entry.build();
      if (entry.opensOnStep && entry.steps) entry.setStep(0);
      if (entry.opening) entry.opening.remeasure();
      // A full-screen picture is a lump of its own — see backdropOf.
      if (entry.lay) entry.lay();
    });
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
    // A beat that throws before it has started playing never calls `done`, and
    // the page would wait for it for ever — so the fall counts as the end of it.
    tried('вперед', () => beats[at].run(done), done);
  };

  // Going to a block, rather than to the next picture: everything before it is
  // put into the state it was left in, everything after it back to the way it
  // opens, and the page travels there in one movement. Any block can be gone
  // to, read or not: a reader who knows they want the one about the buildings
  // should not have to sit through five blocks to reach it. Everything on the
  // way is put into the state it ends in — blocks are built here if they have
  // never been opened — so arriving at a block from the front and from the
  // middle of the story look the same.
  const toBlock = (i) => {
    if (busy || i < 0 || i >= starts.length) return;
    const target = starts[i];
    if (target < 0 || target === at) return;
    chill();
    busy = true;
    // One block that cannot put itself back does not stop the jump: the rest
    // still go where they belong, and the reader still arrives.
    entries.forEach((e) => tried('сброс блока', () => {
      if (e.opening) e.opening.run(0);
      if (e.steps) e.setStep(0);
    }));
    for (let k = 0; k <= target; k++) {
      if (beats[k].settle) tried('подготовка такта', () => beats[k].settle());
    }
    at = target;
    // Jumping ahead counts as having been there: what the reader skipped is
    // behind them now, and going back a beat at a time has to work from here.
    if (at > reached) reached = at;
    report();
    glide(beats[target].section.offsetTop, done);
  };

  // A block at a time in either direction. Past the last block there is
  // nothing to jump to, so the page simply takes the next beat and the key
  // never does nothing.
  const nextBlock = () => {
    const i = blockOf(at) + 1;
    if (i < starts.length) toBlock(i);
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
    // the reader is allowed all the way back to it. The first beat is the
    // title screen's own: taking it back is the light going out rather than
    // the page moving anywhere.
    if (at < 0) {
      if (undoing.back) { tried('назад', () => undoing.back(done), done); return; }
      glide(0, done);
      return;
    }
    const target = beats[at];
    if (undoing.back && undoing.section === target.section) {
      tried('назад', () => undoing.back(done), done);
    } else {
      // The travelling is the page's own and cannot fail; only putting the
      // section back into the state it was left in can.
      if (target.settle) tried('подготовка такта', () => target.settle());
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
    entries.forEach((e) => tried('сброс блока', () => {
      if (e.opening) e.opening.run(0);
      if (e.steps) e.setStep(0);
    }));
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
    const el = e.target instanceof Element ? e.target : null;
    const control = el && el.closest('[role="slider"]:not([aria-disabled="true"])');
    if (control && e.key.startsWith('Arrow')) return;
    // A control the reader has reached with Tab answers for itself. Space and
    // Enter are what presses a button, and the page took them for its own — so
    // a tumbler could be focused and never switched, and the story walked on
    // instead. The wheel and the arrows still belong to the page: they turn it
    // wherever the focus happens to be.
    if ((e.key === ' ' || e.key === 'Enter')
      && el && el.closest('button, a[href], input, select, textarea, [contenteditable=""], [contenteditable="true"]')) return;
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

  // A section is exactly one screen tall, so changing the size of the window
  // moves every one of them — while the page stays scrolled to the number it
  // was at. The reader ends up between two blocks, with the bar still naming
  // the one they were reading. Nobody resizes a window on purpose mid-read,
  // but a toolbar folding away, devtools opening or a laptop waking on another
  // monitor all do it for them. So the page goes back to the beat it is on.
  // Not while one is playing: that beat is moving the page itself.
  let settling = 0;
  const hereTop = () => {
    if (at < 0) return 0;
    const beat = beats[at];
    if (beat.top) return beat.top();
    return beat.section ? beat.section.offsetTop : window.scrollY;
  };
  window.addEventListener('resize', () => {
    clearTimeout(settling);
    settling = setTimeout(() => { if (!busy) window.scrollTo(0, hereTop()); }, 120);
  });

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
  return { forward, back, toBlock, rewind };
}
