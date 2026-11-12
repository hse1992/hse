// The page as a sequence of beats.
//
// Scrolling does not scrub anything and does not carry the reader past what
// they have not seen yet: one movement of the wheel — or one swipe, or one
// press of the space bar — plays the next beat and nothing more. While a beat
// is playing, input is ignored; when it lands, the page waits for the reader
// again. Sections are settled onto the screen the same way: a beat of their
// own carries the page from one to the next.

import { nf } from './format.js';
import { ДОПУСК } from './page.js';

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

// Полоса внизу экрана, которая блоку не принадлежит. В стилях она записана
// через max() и env(): у айфона со свернутой панелью безопасная зона снизу —
// это как раз та полоса, которой браузер накрывает страницу. Прочитать такую
// запись у документа нельзя, она так и лежит текстом, поэтому меряем ее
// телом: пустая коробка высотой в эту полосу отвечает числом.
let проба = null;
function комната() {
  if (!проба) {
    проба = document.createElement('div');
    проба.setAttribute('aria-hidden', 'true');
    проба.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;'
      + 'height:var(--hint-room,0px);pointer-events:none';
  }
  if (!проба.isConnected) document.body.appendChild(проба);
  return проба.offsetHeight;
}

// A folding phone is opened in the middle of reading, and the width crosses
// that line. The two ways of reading cannot be swapped under the reader's feet
// — the page is read again in the other one — but it has to start where they
// were, not at the title screen. The block they stood in outlives the reload
// here; the machine that comes up next goes to it.
const KEPT = 'нсб-раздел';
const keep = (i) => {
  // Private mode refuses the storage altogether: losing the place is the
  // smaller harm, and it must not take the reload down with it.
  try { sessionStorage.setItem(KEPT, String(i)); } catch (err) { /* не беда */ }
};
const kept = () => {
  try {
    const was = sessionStorage.getItem(KEPT);
    sessionStorage.removeItem(KEPT);
    return was === null ? -1 : Number(was);
  } catch (err) { return -1; }
};

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

// Прыжок по полоске не ждет, пока доиграет такт: читатель попросил другой
// раздел и получает его сразу. Поколение тактов растет, кадры прошлого такта
// перестают рисоваться, а его done уже не отпускает страницу — иначе
// доигравший за спиной такт перекрасил бы блок, в который читатель ушел.
// Цепочки через setTimeout обрываются сами: они висят в done оборванного
// play. Остается то, что такт повесил на страницу руками, — занавес; о нем
// говорят через onCut.
let era = 0;
const снять = [];
const onCut = (fn) => { снять.push(fn); };
const cut = () => {
  era += 1;
  while (снять.length) tried('обрыв такта', снять.pop());
};

// no frames, and counting from the start would skip the beat to its end.
//
// Долгий кадр и спрятанная вкладка — разные вещи, и считать их одинаково
// нельзя. Пока вкладка скрыта, кадров нет вовсе: вернувшийся читатель застал
// бы такт в том же месте, где его бросил, а смотреть на него уже некому —
// такой такт доигрывается сразу. А долгий кадр в открытом окне — это
// настоящая просадка, и записать ее шестнадцатью миллисекундами значит
// растянуть такт ровно на столько, сколько браузер не успел. Поэтому кадр
// засчитывается как есть, но не длиннее трети такта.
let blinked = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) blinked = true;
});

function play(ms, fn, done) {
  const born = era;
  let last = performance.now();
  let spent = 0;
  // Вкладку прятали, пока страница стояла, — к этому такту это отношения не
  // имеет: отметка засчитывается только тому такту, который под ней шел.
  blinked = false;
  const tick = (now) => {
    // Такт оборвали прыжком по полоске: кадров больше нет, и done не зовется
    // — страницу от этого места ведет уже тот, кто оборвал.
    if (born !== era) return;
    const dt = now - last;
    last = now;
    if (blinked) { blinked = false; spent = ms; } else spent += Math.min(dt, ms / 3);
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
// На телефоне под экраном остается одна колонка и ничего больше: картинке
// можно отдать почти всю эту высоту, белого вокруг нее хватит и так.
const BACKDROP_SHARE_NARROW = 0.92;
// White round the picture. On a phone the card is as wide as the column and
// the picture is held back by that width: сорок четыре пикселя полей с каждой
// стороны съедали бы пятую часть арены.
const CARD_PAD = 44;
const CARD_PAD_NARROW = 16;

function backdropOf(section, picture) {
  let frame = section.querySelector(':scope > .viz-backdrop');
  const lead = section.querySelector('.viz-lead');
  const column = section.querySelector('.viz-container').getBoundingClientRect();
  // На телефоне переходный экран прибит к окну, а секция в тысячи пикселей
  // высотой: картинку под экраном меряют по окну и к окну же прибивают —
  // иначе она уедет вместе с секцией, а экран останется.
  const afloat = NARROW.matches;
  const room = afloat
    ? { top: 0, width: window.innerWidth, height: window.innerHeight }
    : section.getBoundingClientRect();
  const hint = комната();
  // Где кончается сам экран. На телефоне его коробка — все окно, а строки
  // стоят по центру: мерить нужно по ним, иначе картинка окажется под нижним
  // краем экрана и схлопнется в ничто.
  const kids = [...lead.children].map((el) => el.getBoundingClientRect());
  const ends = afloat && kids.length
    ? Math.max(...kids.map((r) => r.bottom))
    : lead.getBoundingClientRect().bottom;
  const top = Math.round(ends - room.top + UNDER);
  const free = afloat
    ? room.height - top - hint
    : room.height - top - parseFloat(getComputedStyle(section).paddingBottom);
  const pad = afloat ? CARD_PAD_NARROW : CARD_PAD;
  const shape = picture.box();
  const ratio = shape.w > 0 && shape.h > 0 ? shape.w / shape.h : 1.2;
  // The picture keeps its size; the white grows round it, as far as there is
  // room for it under the lead-in and across the column.
  const inner = Math.round(free * (afloat ? BACKDROP_SHARE_NARROW : BACKDROP_SHARE));
  let height = Math.min(Math.round(free), inner + 2 * pad);
  let width = Math.round(inner * ratio + 2 * pad);
  if (width > column.width) {
    width = Math.round(column.width);
    height = Math.round((width - 2 * pad) / ratio + 2 * pad);
  }
  // Картинка стоит посередине того, что осталось под экраном, а не жмется
  // сразу под строки: на телефоне свободного места под ними больше, чем ей
  // нужно, и прижатая кверху она смотрится оброненной.
  const rest = afloat ? Math.max(0, Math.round((free - height) / 2)) : 0;
  const left = Math.round((room.width - width) / 2);
  const size = `${afloat}×${window.innerWidth}×${window.innerHeight}×${top}×${rest}×${left}×${width}×${height}`;
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
  frame.classList.toggle('is-afloat', afloat);
  Object.assign(frame.style, {
    top: `${top + rest}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    padding: `${pad}px`
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
  // Карточка летит трансформацией, а не четырьмя размерами.
  //
  // Раньше в каждом кадре переписывались left, top, width и height — а это
  // раскладка, и браузер пересчитывал ее тридцать два раза за полет, заодно
  // перерисовывая тень по новому размеру. Коробка стоит на месте назначения
  // с самого начала, а до него доезжает сдвигом и растяжением: это работа
  // композитора, а не раскладки.
  //
  // Скругление растягивается вместе с коробкой, поэтому оно и возвращается
  // назад — делением на то же растяжение. Это перерисовка, но не раскладка,
  // и стоит она несравнимо меньше.
  const dock = { x: c1.left, y: c1.top - travel, w: c1.width, h: c1.height };
  Object.assign(card.style, {
    left: `${dock.x}px`, top: `${dock.y}px`,
    width: `${dock.w}px`, height: `${dock.h}px`
  });
  const radius = getComputedStyle(card).borderTopLeftRadius;
  const placeCard = (e) => {
    const lerp = (a, b) => a + (b - a) * e;
    const kx = dock.w > 0 ? lerp(c0.width, dock.w) / dock.w : 1;
    const ky = dock.h > 0 ? lerp(c0.height, dock.h) / dock.h : 1;
    const dx = lerp(c0.left, dock.x) - dock.x;
    const dy = lerp(c0.top, dock.y) - dock.y;
    card.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) `
      + `scale(${kx.toFixed(4)}, ${ky.toFixed(4)})`;
    card.style.borderRadius = `calc(${radius} / ${kx.toFixed(4)}) / calc(${radius} / ${ky.toFixed(4)})`;
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
// movement in two.
const CURTAINS = {
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
  const { section, opening, steps, setStep, setState, build, open, opensOnStep, hold,
    holdIntro, span, curtain } = entry;
  const list = [];

  // The block has just been put together and the section is on its way in:
  // this is the moment the card can be measured for real — and the moment the
  // picture inside it goes back to its beginning. Behind a curtain this
  // happens with the curtain shut, so the picture is already at its start when
  // the curtain opens on it.
  const enter = () => {
    build();
    // A block that opens already showing its first step is put into it here:
    // that picture is what the section arrives with, and the beat that fades
    // the block in is the one that brings it.
    if (opensOnStep && steps) setState(0);
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
        onCut(() => cover.remove());
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

  // Шаг может сказать, когда он на самом деле доиграл: `step(i)` возвращает
  // обещание, и такт кончается вместе с ним, а не по записанному в `span`
  // числу. Число остается запасным выходом — на случай, если обещание так и
  // не исполнится, — но главным источником правды больше не служит: финал
  // собирает единицу три с половиной секунды, а потолок такта тут 2,5.
  const GUARD_MS = 8000;
  const played = (result, ms, done) => {
    if (!result || typeof result.then !== 'function') { play(ms, () => {}, done); return; }
    // Обрыв такта прыжком по полоске тут значит то же, что и в play():
    // доигравшее за спиной обещание страницу уже не отпускает.
    const born = era;
    let over = false;
    const end = () => {
      if (over) return;
      over = true;
      if (born === era) done();
    };
    const guard = setTimeout(end, Math.max(ms, GUARD_MS));
    const stop = () => { clearTimeout(guard); end(); };
    result.then(stop, stop);
  };

  for (let i = opensOnStep ? 1 : 0; i < steps; i++) {
    list.push({
      section,
      hold: hold ? (options) => hold(i, options) : null,
      run: (done) => played(setStep(i), spanOf(i), done),
      // Назад блок ничего длинного не играет: состояние, в которое читатель
      // возвращается, он уже видел, и ставится оно либо мигом, либо коротким
      // переходом. Ждать тут длительность прихода вперед — это держать
      // страницу секунду-другую на неподвижной картинке.
      back: (done) => played(setStep(Math.max(0, i - 1)), BEAT_MS, done),
      // А это не «сыграй шаг i», а «будь в состоянии i»: читатель пришел
      // сюда из другого места, и смотреть заново то, что он уже видел, он не
      // просил. Блок, который умеет различать эти два случая, говорит об
      // этом своим restore(); у остальных это тот же step().
      settle: () => setState(i)
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
function mountScrolled(entries, onProgress, replay) {
  // Reading by frames belongs to the phone. This way of reading is also the
  // one chosen for «less movement» on a wide screen, and there taking the
  // scroll away from the reader would be the opposite of what they asked for.
  const byTaps = (e) => !!e.taps && NARROW.matches && !REDUCED.matches;

  const near = (section, reach = 1.5) => {
    const box = section.getBoundingClientRect();
    return box.bottom > -window.innerHeight && box.top < window.innerHeight * reach;
  };

  // Собрать блок: разметка, первое состояние истории, место карточки.
  // Падение сюда страницу не роняет — читатель на этот блок еще и не смотрит.
  const make = (entry) => {
    if (!entry || entry.built) return;
    entry.built = true;
    tried('сборка блока', () => {
      entry.build();
      // A scene is a story told in steps, and steps need a screen that
      // holds still. Here it shows what it comes to in the end — the module
      // says so itself by taking the last step. A block read by taps keeps
      // its story: there the screen does hold still, and the story is told
      // frame by frame from the first one.
      if (entry.steps) entry.setState(byTaps(entry) && !entry.told ? 0 : entry.steps - 1);
      if (entry.opening) entry.opening.follow();
    });
  };

  // Следующий блок собирается, пока читатель смотрит текущий — на блок раньше,
  // как на широком экране. Такт, который привозит раздел, — худшее для этого
  // время: страница едет, а сборка стоит от восьми до семидесяти миллисекунд.
  // Флаги с их сотней с лишним картинок и стена профессий в полтысячи узлов
  // столько и стоят, и такт их прихода рвался пополам: блок «долго не
  // появлялся», а потом дергался.
  //
  // Наблюдателя за въездом для этого мало: он срабатывает за 400 пикселей до
  // секции, а такт на телефоне увозит страницу на полтора экрана — то есть
  // сборка приходилась ровно на тот такт, который блок и привозит. Наблюдатель
  // остается: он открывает блок (`open`) и достраивает то, до чего подготовка
  // не дошла.
  // Отложить работу до свободной минуты — и уметь передумать.
  //
  // requestIdleCallback есть не везде, и там, где его нет, та же отсрочка
  // делается таймером. Отменялись же они по-разному: chill() звал
  // cancelIdleCallback, а таймеру это ничего не говорит — он срабатывал
  // посреди такта, ровно в тот момент, ради которого отсрочку и затевали.
  // Поэтому способ отмены запоминается вместе с самой задачей.
  // Отмену держим замыканием — см. такой же idle в mountStepper: ссылка на
  // cancelIdleCallback, вызванная методом объекта, падает «Illegal invocation».
  const idle = (fn) => {
    if (window.requestIdleCallback) {
      const id = requestIdleCallback(fn, { timeout: 1500 });
      return { stop: () => cancelIdleCallback(id) };
    }
    const id = setTimeout(fn, 300);
    return { stop: () => clearTimeout(id) };
  };
  let warming = null;
  const warm = (index) => {
    const next = entries[index + 1];
    if (warming || !next || next.built) return;
    warming = idle(() => {
      warming = null;
      // Спрошено заново: пока задача ждала своей минуты, читатель мог уехать
      // в другой раздел, а блок — собраться по дороге.
      const want = entries[index + 1];
      if (!want || want.built) return;
      make(want);
    });
  };
  // Пока ход играет, сборку не начинаем: блок — это один кусок работы, который
  // не разрезать, и отданный посреди такта он съедает его кадры.
  const chill = () => {
    if (warming) warming.stop();
    warming = null;
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
      make(entry);
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

  // ---------- Чтение кадрами ----------
  // A block that tells its story in frames holds the screen while it tells it:
  // the page stops at its top edge, a touch plays the next frame whole, and
  // when the story is told the page is let go and the reader goes on. It is the
  // same machine the wide screen is read by, with a thumb in place of the
  // wheel — and it is the story as it was written, which scrolling could only
  // approximate: a flick of the thumb is seven hundred pixels and a frame was
  // two hundred, so three of them went past in one movement, each cutting off
  // the one before.
  //
  // The way out is never shut. A pull down on the first frame lets the page go
  // back up, the last frame lets it go on, and the bar at the top still leads
  // anywhere. The page is held by fixing the body rather than by swallowing
  // touches: on a phone a flick that has left the finger cannot be stopped any
  // other way.
  const TAP_PULL = 46;                  // px of drag that counts as one frame
  let caught = null;                    // the block holding the screen
  let frame = 0;                        // which frame it is on
  let playing = false;
  let keptY = 0;

  // Довести придержанную страницу до места: не прыжком, а за четверть
  // секунды. Страница к этому моменту уже у нас в руках — тело прибито, — и
  // двигать ее можно своим ходом, не споря с инерцией пальца.
  let settling = null;
  const settleTo = (want) => {
    if (settling) cancelAnimationFrame(settling);
    const from = keptY, t0 = performance.now();
    if (Math.abs(want - from) < 2) { keptY = want; document.body.style.top = `${-keptY}px`; return; }
    const run = (now) => {
      const raw = Math.min(1, (now - t0) / 260);
      keptY = Math.round(from + (want - from) * (1 - Math.pow(1 - raw, 3)));
      document.body.style.top = `${-keptY}px`;
      settling = raw < 1 ? requestAnimationFrame(run) : null;
    };
    settling = requestAnimationFrame(run);
  };

  const hold = () => {
    keptY = window.scrollY;
    document.documentElement.classList.add('is-holding');
    document.body.style.position = 'fixed';
    document.body.style.top = `${-keptY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  };

  const release = () => {
    if (settling) { cancelAnimationFrame(settling); settling = null; }
    document.documentElement.classList.remove('is-holding');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, keptY);
  };

  const letGo = (ahead) => {
    const e = caught;
    caught = null;
    release();
    if (!e) return;
    // Told once and not caught again: coming back to a block that is behind
    // the reader shows what it came to, the way every other block does.
    if (ahead) e.told = true;
    // Going back, a nudge up so the block does not catch the page again on the
    // very next frame. Going on, the page stays exactly where it was: the
    // block is still on the screen and has only just become the reader's.
    if (!ahead) window.scrollBy(0, -10);
  };

  // Просьба, пришедшая, пока играет кадр, не теряется, а ждет своей очереди:
  // касание, на которое страница не ответила ничем, читается как «подвисло».
  let pending = 0;

  // Сыграть кадр блока, который держит страницу. Называется не play, чтобы не
  // загораживать собой play() модуля — тот играет время, а этот кадры, и
  // вспышка на стыке зовет именно модульный.
  const кадр = (to) => {
    const e = caught;
    if (!e) return;
    if (playing) { pending = to > frame ? 1 : -1; return; }
    if (to < 0 || to > e.steps - 1) { letGo(to > 0); return; }
    // A frame that waits for an answer is not passed by a touch either.
    // Спрашивают о кадре, который собираются играть, а не о том, на котором
    // стоят: `hold(i)` у модуля — это «шаг i ждет читателя», и так его зовет
    // машина тактов на широком экране. Со старым номером вопрос про страны
    // пропускался: придерживает он шаг 1, а спрашивали про 0.
    if (to > frame && e.hold && tried('ожидание ответа', () => e.hold(to))) return;
    frame = to;
    playing = true;
    tried('кадр', () => e.setStep(frame));
    // Страница прибита, прокрутки нет — а значит, и события, по которому
    // перерисовывается полоска сверху. Зовем ее сами: иначе на всем блоке,
    // читаемом кадрами, она стояла бы на том, что было до его прихода.
    onScroll();
    const span = Math.max(BEAT_MS, (e.span && e.span(frame)) || 0);
    setTimeout(() => {
      playing = false;
      const next = pending;
      pending = 0;
      if (next) кадр(frame + next);
    }, span);
    // The last frame is the block handing itself over to the reader, and the
    // page goes with it: holding on after the story is told would leave them
    // pulling at a page that has nothing left to say.
    if (frame >= e.steps - 1) letGo(true);
  };

  // Catching is done at the top edge: the block is already there, its first
  // frame has been put up by the build, and all that is left is to stop the
  // page. Half a screen of it has to be on the screen, so that a block merely
  // passed by on the way to the bar does not catch anybody.
  const maybeCatch = () => {
    entries.forEach((e) => {
      if (!byTaps(e) || !e.steps) return;
      // The block itself, not the section around it: the section begins with
      // the opening — the lead-in screen and the title card — and that is read
      // by scrolling, like everything that is not the story. Caught at the
      // section the page stopped a screen too early, and the frames played
      // behind the lead-in screen where nobody could see them.
      const body = e.section.querySelector('.viz-body');
      const box = (body || e.section).getBoundingClientRect();
      // Where it was the last time anyone looked — kept for every such block
      // on every painting, so that the one being walked up to is known by how
      // it moved, not by where it happens to be.
      const was = e.lastTop;
      e.lastTop = box.top;
      if (caught || e.told || !e.built) return;
      // Ловится блок не ровно на линии, а на подходе к ней: так движение
      // страницы доигрывает вперед, как будто блок сам встает на место, а не
      // отскакивает назад на то, что палец успел пролистать лишнего.
      if (box.top > 140 || box.top < -500 || box.bottom < window.innerHeight * 0.5) return;
      // Only to somebody coming down to it, and coming the usual way. A block
      // that merely turned up at the line — because another one above it
      // changed its own height, and the page settled — has not been walked up
      // to, and taking the page there means taking it from under the switch
      // the reader was just pressing.
      if (was === undefined || was > 600 || was <= box.top) return;
      // Куда довести — считается до того, как страницу придержали: прибитое
      // тело обнуляет прокрутку, и после hold() этот отсчет был бы от нуля.
      const want = window.scrollY + box.top;
      caught = e;
      frame = 0;
      tried('кадр', () => e.setState(0));
      hold();
      settleTo(want);
    });
  };

  // ---------- Страница не прокручивается ----------
  // Читатель ведет ее тактами, а не пальцем: мах отматывал по три кадра и
  // останавливался посреди движения, и угадать, где кончился кадр, было
  // нельзя. Поэтому прокрутка у читателя отобрана целиком — и палец, и
  // колесо, и клавиши, — а вместо нее один ход: такт вперед, такт назад.
  // Страницу двигает только каркас, и всегда до ближайшей границы кадра.
  //
  // Свое остается тому, что само умеет прокручиваться: списку разделов,
  // который открывается касанием полоски, и всему, что блок пометил классом
  // `page-scrolls` — стене профессий, например: сорок четыре карточки не
  // кадр истории, их листают, а не отщелкивают.
  //
  // Все это — про телефон. Широкое окно попадает сюда только при «меньше
  // движения», и там отнимать прокрутку нельзя: читатель просил меньше
  // движения, а не меньше управления.
  const ведем = () => NARROW.matches;
  const свое = (el, dir = 0) => {
    if (!ведем()) return true;
    const box = el && el.closest && el.closest('.page-sheet, .page-scrolls');
    if (!box) return false;
    if (!box.classList.contains('page-scrolls')) return true;
    // Коробка со своей прокруткой держит движение, пока ей есть куда ехать.
    // На своем краю она его отпускает, и дальше ведет каркас: иначе список
    // в целый экран запирал бы читателя — выйти из него было бы нечем.
    const край = dir > 0
      ? box.scrollTop >= box.scrollHeight - box.clientHeight - 1
      : box.scrollTop <= 1;
    return !край;
  };

  let pulled = null;
  let pulledX = null;
  let spent = false;                    // этот палец свой такт уже отыграл
  let legla = 0;                        // когда палец лег на экран
  let крутили = false;                  // ... или он не листал, а вертел картинку
  window.addEventListener('touchstart', (ev) => {
    const один = ev.touches.length === 1;
    pulled = один ? ev.touches[0].clientY : null;
    pulledX = один ? ev.touches[0].clientX : null;
    spent = false;
    крутили = false;
    legla = performance.now();
  }, { passive: true });

  // То, что крутят рукой: шар «Космоса». Пальцу оно достается только поперек
  // экрана — вдоль ведут страницу, и отнимать это у читателя нельзя: блок
  // занимает картинкой полэкрана, и листать было бы нечем. Стук по шару
  // по-прежнему стоит такт. Решает первое же движение, и дальше палец
  // принадлежит тому, кого выбрал: ведущая поперек рука к концу дуги идет
  // вниз, и страница прыгала бы с середины поворота.
  const ВЕРТЯТ = '.page-turns';
  const вертят = (el, dy, dx) => Math.abs(dx) > Math.abs(dy)
    && !!(el && el.closest && el.closest(ВЕРТЯТ));

  // Один палец — один такт. Раньше такт игрался на каждые сорок шесть
  // пикселей движения, и одно движение на полэкрана отматывало три подряд,
  // обрывая анимацию каждого: со стороны это и есть «листается криво».
  window.addEventListener('touchmove', (ev) => {
    const палец = ev.touches[0];
    const dy = pulled === null ? 0 : pulled - палец.clientY;
    const dx = pulledX === null ? 0 : pulledX - палец.clientX;
    if (крутили || вертят(ev.target, dy, dx)) { крутили = true; return; }
    if (свое(ev.target, dy)) return;
    ev.preventDefault();
    if (pulled === null || spent) return;
    if (Math.abs(dy) < TAP_PULL) return;
    spent = true;
    шаг(dy > 0 ? 1 : -1);
  }, { passive: false });

  // То, у чего свое дело: нажать, переключить, потянуть, пролистать. Касание
  // по такому не такт — иначе переключатель менял бы кампус и тут же уводил
  // со страницы, на которой читатель его нажал.
  const РУЧКИ = 'button, a[href], input, select, textarea, label, summary,'
    + ' [role="switch"], [role="slider"], [role="button"], [data-value],'
    + ' [contenteditable=""], [contenteditable="true"],'
    + ' .toggle, .page-progress, .page-sheet, .page-scrolls';
  const ручка = (el) => !!(el && el.closest && el.closest(РУЧКИ));

  // Касание, которое никуда не уехало, — тоже такт. Палец на телефоне ходит
  // по-разному: кто-то ведет страницу махом, кто-то постукивает по экрану, —
  // и мах в сорок пикселей это уже не мах, а стук по экрану, на который
  // страница не отвечала ничем. Теперь любое касание стоит ровно один такт:
  // длина движения не значит ничего, значит только то, что читатель попросил
  // дальше. Куда — говорит направление, если палец успел его показать; стук
  // на месте ведет вперед.
  //
  // Палец, который лег и лежит, — не стук: так держат, чтобы выделить текст
  // или просто подумать над картинкой. Полсекунды неподвижности телефон сам
  // считает долгим нажатием, и такта оно не стоит.
  const ТАП = 10;                       // px: ближе этого — стук, а не мах
  const ДОЛГО = 600;                    // мс: дольше этого палец лежит, а не стучит
  let touched = 0;                      // когда касание в последний раз дало такт
  window.addEventListener('touchend', (ev) => {
    const было = pulled;
    const отыграл = spent;
    const вертел = крутили;
    const держал = performance.now() - legla;
    pulled = null;
    pulledX = null;
    spent = false;
    крутили = false;
    if (отыграл) { touched = performance.now(); return; }
    // Палец, который вертел картинку, страницу не ведет: поворот кончается
    // там, где его отпустили, а не тактом вперед. Поперечное движение до
    // стука не дотягивает только по вертикали, и без этого каждый поворот
    // шара уносил читателя в следующий кадр.
    if (вертел) { touched = performance.now(); return; }
    if (!ведем() || было === null || ev.touches.length) return;
    if (ручка(ev.target)) return;
    const кон = ev.changedTouches[0];
    const dy = кон ? было - кон.clientY : 0;
    if (Math.abs(dy) < ТАП && держал > ДОЛГО) return;
    touched = performance.now();
    шаг(Math.abs(dy) < ТАП || dy > 0 ? 1 : -1);
  }, { passive: true });

  // The trackpad and the wheel, for a narrow window on a desktop.
  let крутил = 0;
  window.addEventListener('wheel', (ev) => {
    if (свое(ev.target, ev.deltaY)) return;
    ev.preventDefault();
    if (Math.abs(ev.deltaY) < 4) return;
    // Инерция трекпада шлет сотню событий на одно движение руки: пока она не
    // выдохлась, новых тактов не просим.
    const now = performance.now();
    if (now - крутил < 320) return;
    крутил = now;
    шаг(ev.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // Клавиши — то же самое: пробел и стрелки ведут по тактам, а не прокручивают.
  window.addEventListener('keydown', (ev) => {
    if (свое(ev.target, 1)) return;
    const el = document.activeElement;
    if ((ev.key === ' ' || ev.key === 'Enter') && el
      && el.closest('button, a[href], input, select, textarea, [contenteditable=""], [contenteditable="true"]')) return;
    const вперед = ev.key === ' ' || ev.key === 'PageDown' || ev.key === 'ArrowDown' || ev.key === 'ArrowRight';
    const назад = ev.key === 'PageUp' || ev.key === 'ArrowUp' || ev.key === 'ArrowLeft';
    if (!вперед && !назад) return;
    if (el && el.closest('[role="slider"]') && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) return;
    // И то, что водит стрелками у себя внутри: стена флагов ходит ими от
    // страны к стране. Объявляет это блок сам, атрибутом `data-arrows`.
    if (el && el.closest('[data-arrows]')) return;
    ev.preventDefault();
    шаг(вперед ? 1 : -1);
  });

  // Мышь в узком окне — то же самое, одним кликом. Касание приходит сюда
  // вторым событием, следом за touchend, и такт за него уже отыгран: иначе
  // один стук по экрану играл бы два.
  window.addEventListener('click', (ev) => {
    if (!ведем() || performance.now() - touched < 700) return;
    // Шар, который тянут курсором, мыши достается целиком: клик приходит и
    // после перетаскивания, и такт за ним уводил бы с блока. Пальцу он
    // по-прежнему стоит такт — тот приходит сюда касанием, а не кликом.
    if (ручка(ev.target) || (ev.target.closest && ev.target.closest(ВЕРТЯТ))) return;
    шаг(1);
  });

  // ---------- Ход ----------
  // The page is moved by hand rather than by `behavior: 'smooth'`, and moved
  // by asking the block again on every frame how much is left. A block changes
  // its own height when it hands itself over to the reader — the figures fold
  // up, the controls open — and the browser answers that by shifting the
  // scroll under us to hold the picture still. A glide told «two hundred
  // pixels from here» is cancelled by that shift; one told «until the next
  // state» simply arrives.
  // Сколько пикселей до следующего такта — чем бы этот такт ни был. Такты
  // лежат в трех местах, и ход знает все три: части открытия (экран с цифрой
  // приходит по кускам, за ним садится титульная карточка), состояния истории
  // внутри блока и начало открытия следующего раздела.
  // Предохранитель: столько экранов — потолок одного хода. Он нужен не для
  // обычного чтения (самый длинный настоящий такт на странице — меньше
  // экрана), а на случай, когда блок почему-то не сказал, где его следующее
  // состояние: без потолка один свайп уносил бы мимо всей его истории. Чем
  // ниже потолок, тем меньше можно проскочить по ошибке.
  const AT_MOST = 1.5;                 // дальше одного такта за раз не ходим, экранов
  const ОСТАТОК = 24;                  // ближе этого граница раздела — уже здесь, px
  const стопы = (dir = 1) => {
    const out = [];
    const y = window.scrollY;
    const here = entries[place().index];
    // Внутри блока — его собственное следующее состояние.
    const ahead = here && here.ahead ? here.ahead() : 0;
    if (ahead > 0 && dir > 0) out.push(ahead);
    // Назад блок спрашивают отдельно. ahead() считает только вперед, и то же
    // число, взятое назад, увело бы ход мимо; а без своего числа назад
    // оставались одни границы разделов, и шаг из вопроса про площадь уносил
    // через всю историю — поля, пятиэтажки и город проносились за одно
    // движение. Блок, который назад отвечать не умеет, листается как и
    // раньше, экраном.
    const behind = here && here.behind ? here.behind() : 0;
    if (behind > 0 && dir < 0) out.push(-behind);
    // Границы разделов и открытий — это уже не состояния блока, а геометрия
    // страницы, и держатся они отдельно: к ним другая мерка, см. ниже.
    const межи = [];
    entries.forEach((e) => {
      const top = y + e.section.getBoundingClientRect().top;
      if (e.opening && e.opening.stops) {
        tried('такты открытия', () => {
          e.opening.stops().forEach((s) => межи.push(top + s - y));
        });
        // Начало блока: там, где открытие кончилось и картинка на экране.
        const body = e.section.querySelector('.viz-body');
        if (body) межи.push(y + body.getBoundingClientRect().top - y);
        return;
      }
      // А у раздела без открытия начало — он сам: заголовок ему не карточка,
      // он приходит вместе с картинкой и над ней же читается. Раньше такой
      // раздел не давал каркасу ни одной границы, и ход к финалу уходил
      // хвостовым шагом «ровно экран» — финал приезжал наполовину, заголовком
      // из-под предыдущего блока.
      межи.push(top - y);
    });
    // И низ того блока, который читатель смотрит сейчас. Блок, который не
    // уместился в экран — переключатели под картинкой на тесном телефоне, —
    // иначе терял свой хвост: ближайшей границей оказывалось начало
    // следующего раздела, ход уходил туда через голову кнопок, и до них было
    // не добраться вовсе. Полоса подсказки внизу блоку не принадлежит, и
    // доводим мы его до ее верхнего края.
    //
    // Спрашивают об этом только у блока, который в экран и правда не влез. У
    // того, что влезает, низ приезжает раньше верха — и между этими двумя
    // остановками оставался такт на три десятка пикселей, на котором ничего
    // не происходило: блок уже был на экране целиком.
    if (here) {
      const тело = here.section.querySelector('.viz-body');
      const комн = window.innerHeight - комната();
      const box = тело && тело.getBoundingClientRect();
      if (box && box.height > комн) межи.push(box.bottom - комн);
    }
    const взять = (list) => list.map((d) => d * dir).filter((d) => d > 2);
    // Две границы в двух десятках пикселей друг от друга — это одно и то же
    // место: низ длинного блока и начало следующего раздела расходятся ровно
    // на поля секции. Берем дальнюю — ближнюю ход по дороге и так пройдет, а
    // врозь они давали такт, который двигал страницу на три десятка пикселей.
    const слить = (list) => list.sort((a, b) => a - b)
      .filter((d, i, all) => i === all.length - 1 || all[i + 1] - d > ОСТАТОК);
    const вехи = слить(взять(межи));
    // Несколько пикселей до границы раздела — это не такт, а остаток
    // прошлого: ход уезжает ровно на столько, сколько попросил, а блок на
    // приходе складывает свои цифры и меняет высоту, и страница под читателем
    // чуть съезжает. Нажатие в такой остаток выглядит сломанной кнопкой.
    // Состояний блока это не касается: там счет ведет сам блок, и маленькое
    // число у него значит, что следующий кадр и правда близко.
    const крупные = [...взять(out), ...вехи.filter((d) => d > ОСТАТОК)];
    const рядом = (крупные.length ? крупные : [...взять(out), ...вехи])
      .sort((a, b) => a - b);
    if (рядом.length) return рядом;
    // Хвост блока, где тактов больше нет: список профессий, лента лет,
    // переключатели. Ход не исчезает — там он просто листает экран, ровно и
    // до края страницы.
    const край = dir > 0
      ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight - y)
      : Math.max(0, y);
    return край > 4 ? [Math.min(край, Math.round(window.innerHeight * 0.82))] : [];
  };

  // Есть ли на экране хоть что-нибудь, ради чего такт делался. Между блоками
  // лежит полоса, на которой читать нечего: прошлый блок уже уехал вверх, а
  // переходный экран следующего раздела еще прячется — он прибит к окну и
  // показывается только с приходом своей секции. Такт, кончившийся там,
  // выглядит сломанной страницей: белый экран и край чужой картинки сверху.
  //
  // Считаем занятое — сколько окна покрывает то, что на нем стоит, — а не
  // смотрим, что лежит ровно на середине. Серединой это мерилось до тех пор,
  // пока не нашелся экран, где смотреть есть на что, а середина пустая:
  // титульная карточка паркуется у верхнего края, и на высоком окне ее нижний
  // край до середины не достает. Такт, который приводил очередную часть
  // карточки, выходил «пустым», ход доигрывал его дальше — и часть пропадала
  // целиком. Так терялся вагон метро: после электробуса страница уезжала
  // сразу к переключателям, через голову поезда.
  //
  // Пятая часть окна — это и есть «есть что смотреть». Полоса между блоками
  // столько не набирает: там либо пусто вовсе, либо сотня пикселей чужого
  // края — кусок соседнего блока, заглянувший снизу, все еще пустой экран.
  // А выше брать нельзя: титульная карточка стадиона занимает на своих
  // тактах чуть меньше трети, и четверть оставляла ей полоску в три десятка
  // пикселей — ровно столько, сколько набегает от другого шрифта или от
  // уехавшей панели браузера.
  const ЗАНЯТО = 0.2;
  const видно = () => {
    const win = window.innerHeight;
    const есть = (el, доля = ЗАНЯТО) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
      const r = el.getBoundingClientRect();
      return Math.min(r.bottom, win) - Math.max(r.top, 0) > win * доля;
    };
    if ([...document.querySelectorAll('.page-header, .page-footer')].some(есть)) return true;
    return entries.some((e) => {
      if (есть(e.section.querySelector('.viz-body')) || есть(e.section.querySelector('.viz-lead'))) return true;
      // Карточка, которая держит экран, — это две строки посреди пустого поля,
      // и пятой части окна они не набирают: заголовок «Вышка — просто космос!»
      // с подзаголовком занимал девяносто пикселей из семисот. Такт, который
      // его приводил, считался пустым, ход доигрывал его сам — и заголовок
      // проскакивал: читатель видел фразу про орбиту, а следом сразу планету.
      // Но карточка посреди экрана — это и есть то, ради чего такт делался,
      // сколько бы места она ни занимала. Севшая в шапку — другое дело: там
      // она край уехавшего блока, и считается как все.
      const k = parseFloat(getComputedStyle(e.section).getPropertyValue('--intro-k'));
      return есть(e.section.querySelector('.viz-header'), k > 1.02 ? 0 : ЗАНЯТО);
    });
  };

  let gliding = 0;
  let total = 0;
  let span = 0;
  let откуда = 0;                       // от какого места страницы идет такт
  let поставили = 0;                    // и куда ход поставил ее в прошлом кадре
  let вел = 1;                          // куда шел последний такт
  let чиню = false;                     // один доезд на такт, не больше
  const glide = (now) => {
    if (!gliding) return;
    const t = Math.min(1, (now - gliding) / span);
    const want = Math.round(total * (1 - Math.pow(1 - t, 3)));
    // Страницу ход ставит туда, куда идет такт, а не двигает на столько-то
    // пикселей от того места, где она сейчас. Разница видна на айфоне: там
    // прокрутка живет на своей стороне, и сдвиг «на столько-то» иногда
    // пропадает целиком — следующим кадром страница возвращается туда, где
    // была. За такт так терялось два-три десятка пикселей: ход вставал между
    // остановками, карточка застывала с полураскрытой строкой посреди слова,
    // а шаг назад не доходил до начала. Поставленное место потерю переживает
    // — следующий кадр ставит то же самое снова.
    //
    // А место, откуда такт идет, едет вместе со страницей: блок, который на
    // приходе складывает свои цифры, меняет высоту, браузер отвечает на это
    // сдвигом прокрутки — и этот сдвиг нужно отдать странице, иначе один такт
    // превратился бы в три.
    откуда += window.scrollY - поставили;
    window.scrollTo({ top: откуда + want });
    поставили = window.scrollY;
    if (t < 1) { requestAnimationFrame(glide); return; }
    gliding = 0;
    // Просьба, пришедшая, пока ход играл, ждала здесь — играем ее теперь.
    const next = ждет;
    ждет = 0;
    if (next) { шаг(next); return; }
    // Доехали в пустоту — доигрываем такт до конца сами. Читатель просил
    // следующий кадр, а не полосу между кадрами, и ждать от него еще одного
    // движения тут не за что. Один доезд на такт: если и после него смотреть
    // не на что, страница просто стоит, а не скачет дальше сама.
    if (!видно() && !чиню) { чиню = true; шаг(вел, true); return; }
    чиню = false;
  };

  // Один ход на всех: палец, колесо, клавиши. Пока ход играет, следующая
  // просьба не копится и не теряется — она просто ждет, как и внутри блока,
  // который держит страницу.
  //
  // Ждет, а не пропадает: ход идет до семисот миллисекунд, а палец на
  // телефоне ходит чаще — и каждое второе-третье движение уходило в никуда.
  // Со стороны это и есть «половина свайпов холостые». Копим ровно одну: две
  // подряд — это «дальше», а не «через одну».
  let ждет = 0;
  const шаг = (dir, доезд) => {
    // Первый же ход — это чтение, а не возвращение: предложение повторить
    // главу уходит вместе с ним.
    offer(-1);
    // Новое движение читателя — новый счет доездам: один на такт.
    if (!доезд) чиню = false;
    chill();
    if (caught) { кадр(frame + dir); return; }
    if (gliding) { ждет = dir; return; }
    вел = dir;
    const [first] = стопы(dir);
    if (first === undefined) return;
    total = dir * Math.min(first, Math.round(window.innerHeight * AT_MOST));
    откуда = window.scrollY;
    поставили = откуда;
    span = Math.min(700, 200 + Math.abs(total) / 2.5);
    gliding = performance.now();
    requestAnimationFrame(glide);
  };

  // Блок может попросить ход сам — кнопкой, которой читатель отправляет свою
  // догадку. На широком экране это умеет машина тактов; здесь ход тот же, что
  // от пальца.
  document.addEventListener('story:next', () => шаг(1));

  // И вспышку на стыке блок тоже просит сам. На широком экране ее играет
  // занавес машины тактов (`flash` в CURTAINS): снимок и приход финала — одно
  // движение колеса. Тактов тут нет, и просьба приходит кнопкой «Сделать
  // снимок»: экран белеет, страница за белым переходит к следующему разделу,
  // и он проступает из белого, как проявляется фотография. При «меньше
  // движения» вспышки нет — только переход.
  let вспыхнули = false;
  document.addEventListener('story:flash', (ev) => {
    if (вспыхнули) return;
    const i = entries.findIndex((e) => e.section.contains(ev.target));
    if (i < 0 || !entries[i + 1]) return;
    вспыхнули = true;
    if (REDUCED.matches) { toBlock(i + 1, { jump: true }); вспыхнули = false; return; }
    const cover = flashCurtain();
    play(FLASH_UP, (p) => cover.put(settle(p)), () => {
      toBlock(i + 1, { jump: true });
      setTimeout(() => play(FLASH_DOWN, (p) => cover.put(1 - develop(p)), () => {
        cover.remove();
        вспыхнули = false;
      }), FLASH_HOLD);
    });
  });

  // ---------- Картинка, переданная предыдущим блоком ----------
  // Стадион отдает «Флагам» свою арену: вопрос про страны задается над ней —
  // студенты на своих местах одним цветом, иностранцы кучкой внутри своего
  // кампуса. На широком экране картинка прилетает тактом; здесь она просто
  // лежит под переходным экраном, пока он на экране, и тает вместе с ним.
  const lay = () => {
    entries.forEach((e, i) => {
      const before = entries[i - 1];
      if (!before || !before.carry || !e.section.querySelector('.viz-lead')) return;
      if (!near(e.section)) return;
      const given = tried('картинка из прошлого блока', before.carry);
      if (!given) return;
      tried('картинка из прошлого блока', () => backdropOf(e.section, given));
      // Прибитая к окну, она видна только пока видна своя секция — иначе
      // висела бы поверх всех следующих блоков, как висел бы и сам экран.
      // С тем же допуском, что и экран: ход доезжает до верха секции с
      // точностью до доли пикселя (см. ДОПУСК в lib/page.js).
      const frame = e.section.querySelector(':scope > .viz-backdrop');
      const own = e.section.getBoundingClientRect();
      if (frame) {
        frame.style.visibility = own.top > ДОПУСК || own.bottom < ДОПУСК ? 'hidden' : '';
      }
    });
  };

  let queued = false;
  let стоит = -1;                       // the block the reader is in right now
  // И самый дальний, где читатель побывал: в такую главу прыжок по полоске
  // приводит ее итогом, а не карточкой.
  let дошел = -1;
  let доля = 0;                         // and how far through it they are
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
    // A block that reads by frames stops the page at its top edge.
    maybeCatch();
    lay();
    const at = place();
    // Пока страницу держит блок, читаемый кадрами, спрашивать о положении
    // некого: тело прибито к окну, прокрутка обнулена, и по ней выходит, что
    // читатель в самом начале страницы.
    const стою = caught ? стоит : at.index;
    // Читатель перешел в другой раздел — значит, блок вышел на экран, и то,
    // что в нем идет само, начинается сначала. Одного наблюдателя за въездом
    // секции для этого мало: вернувшись шагом назад из следующего раздела,
    // читатель застает блок там, где его бросил, — секция все это время с
    // экрана не уходила, и въезжать ей было неоткуда.
    if (стою >= 0 && стою !== стоит) {
      const e = entries[стою];
      if (e && e.open) tried('открытие блока', e.open);
    }
    // Where the reader stands, kept from one painting to the next. Asked for it
    // at the moment the phone unfolds, the page would answer by the geometry it
    // has just taken on — the wide one, where the whole story is eight screens
    // — and a reader halfway through would be read as being at the end.
    if (стою >= 0) {
      стоит = стою;
      if (стою > дошел) дошел = стою;
      доля = caught ? доля : at.part;
    }
    // Полоске сверху тоже отвечает блок, а не прокрутка: прибитая к окну
    // страница стоит в нуле, и по ней выходило, что читатель в самом начале —
    // полоска гасла целиком, хотя за спиной у него полстраницы. Доля внутри
    // раздела тогда считается по кадру: блок рассказывает историю сам.
    const где = caught
      ? { ...at, index: стоит, part: caught.steps > 1 ? frame / (caught.steps - 1) : 1 }
      : at;
    if (onProgress) {
      onProgress(caught ? (стоит + где.part) / entries.length : window.scrollY / height(), где);
    }
    // И заодно — собран ли следующий блок. Спрашивается на каждой отрисовке:
    // так подготовка начинается и после хода, и после обычной прокрутки внутри
    // блока, и просто от того, что читатель дошел до следующего раздела.
    warm(стоит);
  };

  // Every card is painted once at the start, even the ones far below: until a
  // card has been through this it is placed by the rules of a wide screen, and
  // a lead-in screen — fixed to the window here — would hang over the title.
  entries.forEach((e) => { if (e.opening) e.opening.follow(); });
  paint();

  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  let ширина = window.innerWidth;
  window.addEventListener('resize', () => {
    entries.forEach((e) => { if (e.opening) e.opening.follow(); });
    onScroll();
    // A folding phone opened without crossing the line where the two ways of
    // reading meet, or a phone turned on its side: the blocks are a different
    // height now, and the page is still at the same number of pixels — which is
    // the middle of somebody else's screen. The city of buildings came back as
    // an empty canvas that way, a screen before it is drawn.
    //
    // Only the width. The height changes every time the browser's own bar
    // slides away, and moving the page under a reader for that would be worse
    // than anything it could fix.
    if (window.innerWidth === ширина) return;
    ширина = window.innerWidth;
    const e = entries[стоит];
    if (!e) return;
    // The story inside a block is told by how far through it the page is, so
    // the same share of the new height is the same place in the story — the
    // reader goes on from where they were rather than from the top of the
    // block. A block read by frames is not told by scrolling at all: it is
    // caught at its top edge, and that is where the page is put.
    if (byTaps(e)) { toBlock(стоит, { jump: true }); return; }
    window.scrollTo(0, Math.round(e.section.offsetTop + доля * e.section.offsetHeight));
  });

  // The blocks of the progress bar still lead somewhere: here it is simply a
  // scroll to the top of that block.
  // «Смотреть сначала» — то же предложение, что и на широком экране: читатель
  // пришел по полоске в прочитанную главу и увидел сразу ее итог.
  let offered = -1;
  const offer = (i) => {
    offered = i;
    if (replay) replay.hidden = i < 0;
  };
  if (replay) replay.addEventListener('click', () => {
    if (offered >= 0) toBlock(offered, { jump: true, fresh: true });
  });

  const toBlock = (i, { jump = false, fresh = false } = {}) => {
    const entry = entries[i];
    if (!entry) return;
    // Блок, читаемый кадрами, держит страницу прибитым телом, и прокрутка в
    // этот момент обнулена: уехать из него, не отпустив, нельзя — прыжок
    // попадал на обложку. Отпускаем, не засчитывая блок прочитанным: читатель
    // не дочитал его, а ушел.
    if (caught) { caught = null; release(); }
    // A block read by frames catches the page as it comes down to its top edge
    // — and a jump from the bar rides past it smoothly, frame of scroll by
    // frame of scroll, which looks to it exactly like a reader walking up. So
    // everything left behind the target counts as read: without this a jump to
    // the last section stopped at the stadium and stayed there.
    entries.forEach((e, k) => {
      if (k >= i || e.told) return;
      e.told = true;
      if (e.built && e.steps) tried('кадр', () => e.setState(e.steps - 1));
    });
    // And the place the jump is aimed at moves while it is in the air: the
    // blocks it rides past are built on the way and grow as they are, so the
    // top of the target section is no longer where it was when the reader
    // picked it. A jump to the last section landed two sections short. So the
    // page is aimed again whenever it stops short of the mark.
    // Глава, которую уже читали, встречает своим итогом: сцена рассказана,
    // блок отдан читателю — целимся в последний его экран, а не в карточку.
    // Непрочитанная открывается с начала, как и раньше. «Смотреть сначала»
    // снимает отметку и возвращает главу к ее первому кадру.
    const read = !fresh && i < дошел;
    if (fresh) {
      entry.told = false;
      if (entry.built) tried('открытие блока', () => entry.open && entry.open());
    }
    if (read) {
      entry.told = true;
      if (entry.built && entry.steps) tried('кадр', () => entry.setState(entry.steps - 1));
    }
    offer(read ? i : -1);
    const цель = () => {
      const top = entry.section.offsetTop;
      if (!read) return top;
      const низ = top + entry.section.offsetHeight - window.innerHeight;
      return Math.max(top, Math.round(низ));
    };
    let rounds = 0;
    let still = 0;
    let was = NaN;
    const ride = () => {
      still = window.scrollY === was ? still + 1 : 0;
      was = window.scrollY;
      if (still < 3) { requestAnimationFrame(ride); return; }
      const want = цель();
      if (Math.abs(window.scrollY - want) < 5 || ++rounds > 5) return;
      still = 0;
      window.scrollTo({ top: want, behavior: jump ? 'auto' : 'smooth' });
      requestAnimationFrame(ride);
    };
    window.scrollTo({ top: цель(), behavior: jump ? 'auto' : 'smooth' });
    requestAnimationFrame(ride);
  };

  // And back to the title screen, the way the bar offers everywhere else.
  const rewind = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // The phone was unfolded: from here on the page is read beat by beat, and
  // that machine is set up at the start. So the page is read again — standing
  // on the block it stood on.
  NARROW.addEventListener('change', () => { keep(стоит); location.reload(); });

  // And the other way round, a moment ago: the page came up here after a fold.
  // Not a journey the reader asked for — a place they were put back in, so it
  // happens at once rather than scrolling past everything in between.
  const раздел = kept();
  if (раздел > 0) requestAnimationFrame(() => toBlock(раздел, { jump: true }));

  return { free: true, toBlock, rewind };
}

// `entries` describe the sections in order. Each is
// { section, opening, steps, setStep, build } — see beatsOf.
export function mountStepper(entries, { onProgress, finale, replay } = {}) {
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
      // Такт на двоих: начинается в одном блоке, кончается в другом. Итогом
      // главы он быть не может — досидеть в нем значит уже уехать дальше.
      joined: true,
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
  let lastWay = 0;             // и в какую сторону оно шло в последний раз
  let lastBeat = 0;            // when the page last moved on its own account

  // Nothing to watch: everything is put in its finished state at once, and the
  // page is left to scroll normally.
  if (REDUCED.matches) {
    entries.forEach((e) => tried('сборка блока', () => {
      e.build();
      if (e.opening) e.opening.run(1);
      if (e.steps) e.setState(e.steps - 1);
    }));
    if (onProgress) onProgress(1);
    return { free: true };
  }

  // A phone is read with the thumb, and a block does not fit its screen: laid
  // out in one column, every one of them is a screen and a half tall. Beats
  // would have to hide half of what they show, so here the page is a page —
  // it scrolls, and the story is told by that scrolling instead. The title
  // cards still play: each follows its own place on the screen.
  if (NARROW.matches) return mountScrolled(entries, onProgress, replay);

  // A tablet turned on its side crosses that width, and so does a folding
  // phone opened in the middle of reading. The two ways of reading cannot be
  // swapped under the reader's feet: the page is read again in the other one —
  // from the block they were standing in, not from the title screen.
  NARROW.addEventListener('change', () => { keep(blockOf(at)); location.reload(); });

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
  // И такт, которым глава кончается, — ее итоговое состояние. Такт на двоих
  // сюда не годится: он уводит страницу в следующий раздел.
  const ends = order.map((s) => {
    let k = beats.length - 1;
    while (k >= 0 && (beats[k].section !== s || beats[k].joined)) k -= 1;
    return k;
  });
  const blockOf = (i) => {
    if (i < 0) return -1;
    const beat = beats[i];
    // The beat of the title screen is before the story starts...
    if (beat.title) return -1;
    // ...and the credits at the end belong to no block: it is simply over.
    return beat.section ? order.indexOf(beat.section) : order.length - 1;
  };

  // Прыжок в дальнюю главу не собирает по дороге все, что читатель пропустил.
  //
  // Раньше он проигрывал settle() у каждого такта от начала истории до цели, а
  // settle такта прихода строит блок целиком. Переход с обложки сразу в
  // «Космос» стоил 238 миллисекунд сплошной работы, и собранными оказывались
  // все восемь разделов — ради одного, который читатель и просил.
  //
  // Пройденное состояние и собранный блок — разные вещи. Прыжок записывает за
  // пропущенным разделом долг: такт, на котором тот должен стоять. Отдается
  // долг тогда, когда раздел понадобится, — при фоновой подготовке, при шаге
  // назад в него и при следующем прыжке. Геометрия страницы от этого не
  // зависит: при чтении тактами каждая секция ровно в экран высотой, собран
  // блок или нет.
  const owed = new Map();           // section -> такт, до которого ее довести
  const startOf = (section) => starts[order.indexOf(section)];

  // Довести раздел такта `i` до этого такта. Если за разделом числится долг,
  // он отдается тем же махом — с его первого такта, потому что состояние
  // открытия и шагов набирается по порядку.
  const settleTo = (i) => {
    const beat = beats[i];
    if (!beat) return;
    const from = beat.section && owed.has(beat.section) ? startOf(beat.section) : i;
    if (beat.section) owed.delete(beat.section);
    for (let k = from; k <= i; k++) {
      if (beats[k].settle) tried('подготовка такта', () => beats[k].settle());
    }
  };

  // Долг отдается и сам собой, когда до раздела дошла фоновая подготовка.
  const payUp = (section) => {
    if (!owed.has(section)) return;
    settleTo(owed.get(section));
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
  // Отсрочка и способ ее отменить — одним куском, см. такой же idle в
  // mountScrolled: у таймера своя отмена, и забытый clearTimeout означал, что
  // сборка все-таки приходила посреди такта.
  // Отмену держим замыканием, а не ссылкой на cancelIdleCallback: вызванная
  // методом объекта, она получает своим `this` этот объект, а не window, и
  // браузер отвечает «Illegal invocation» — ошибка уносила страницу целиком.
  const idle = (fn) => {
    if (window.requestIdleCallback) {
      const id = requestIdleCallback(fn, { timeout: 1500 });
      return { stop: () => cancelIdleCallback(id) };
    }
    const id = setTimeout(fn, 300);
    return { stop: () => clearTimeout(id) };
  };

  const prepare = (entry) => {
    if (!entry || entry.ready) return;
    entry.ready = true;
    // Made ready ahead of time and out of sight: a block that cannot be built
    // must not take the page down with it, and the reader is not even looking
    // at it yet.
    tried('сборка блока', () => {
      entry.build();
      if (entry.opensOnStep && entry.steps) entry.setState(0);
      if (entry.opening) entry.opening.remeasure();
      // A full-screen picture is a lump of its own — see backdropOf.
      if (entry.lay) entry.lay();
    });
    // Раздел мог быть пропущен прыжком по полоске — тогда за ним числится
    // такт, на котором он должен стоять. Свободная минута, в которую его
    // собрали, — лучшее время это и доиграть.
    payUp(entry.section);
  };

  // The browser hands out idle time between frames too, and a block is a
  // single lump of work that cannot be cut in half — let go mid-beat it eats
  // seven frames of the animation. So it is put off again whenever a beat
  // starts, and taken up when the page comes to rest.
  let warming = null;
  const warm = () => {
    if (warming) return;
    const next = blockOf(at) + 1;
    if (next >= entries.length || entries[next].ready) return;
    warming = idle(() => {
      warming = null;
      // Пока задача ждала свободной минуты, читатель мог уйти в другой раздел,
      // а такт — начаться. Спрашиваем заново: готовить нужно соседа тому
      // разделу, в котором читатель сейчас, и только когда страница стоит.
      if (busy) return;
      const want = blockOf(at) + 1;
      if (want >= entries.length || entries[want].ready) return;
      prepare(entries[want]);
    });
  };

  const chill = () => {
    if (warming) warming.stop();
    warming = null;
  };

  // Одна команда ждет своей очереди, и только одна.
  //
  // Такт длится до двух с половиной секунд, и все это время страница ничего не
  // принимала: читатель, нажавший «дальше» второй раз, не получал ни такта, ни
  // ответа — нажатие просто пропадало. Теперь оно запоминается и играется, как
  // только такт доиграл. Запоминается ровно одно: очередь из нажатий
  // превратила бы страницу в кино, которое листает само себя, а хвост
  // инерции с тачпада и так отсеивается раньше — до forward и back доходит
  // только то, что читатель сделал нарочно.
  let asked = 0;                 // 1 — вперед, -1 — назад, 0 — ничего
  const done = () => {
    busy = false;
    const next = asked;
    asked = 0;
    if (next) (next > 0 ? forward : back)();
    else warm();
  };

  // «Смотреть сначала». Предложение появляется, когда читатель пришел по
  // полоске в прочитанную главу и увидел сразу ее итог, и пропадает с первым
  // же тактом: дальше он читает страницу, а не возвращается в нее.
  let offered = -1;
  const offer = (i) => {
    offered = i;
    if (replay) replay.hidden = i < 0;
  };
  if (replay) replay.addEventListener('click', () => {
    if (offered >= 0) toBlockRef.go(offered, { fresh: true });
  });

  const forward = () => {
    offer(-1);
    if (at >= beats.length - 1) return;
    // While a beat plays the page takes no orders. Anything arriving then is
    // the same movement still going — a trackpad keeps sending for a second
    // after the fingers have left it — and nothing is remembered for later:
    // a beat the reader did not ask for twice is worse than one they have to
    // ask for again.
    if (busy) { asked = 1; return; }
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
  const toBlockRef = {};
  const toBlock = (i, { fresh = false } = {}) => {
    if (i < 0 || i >= starts.length) return;
    // Такт, который идет, прыжку не помеха: читатель попросил другую главу и
    // получает ее сразу. Идущий такт обрывается, а доигрывается он тут же,
    // ниже — все блоки до цели собираются в том состоянии, которым они
    // кончаются, так что оборванный приходит к своему концу, просто мигом.
    if (busy) cut();
    // Читатель попросил другую главу — значит, то, что он просил до нее,
    // больше не в счет.
    asked = 0;
    // Глава, которую уже читали, встречает своим итогом: смотреть заново то,
    // что уже видел, читатель не просил — он просил эту главу. Чтобы сыграть
    // ее сначала, рядом с подсказкой появляется «Смотреть сначала».
    const read = !fresh && ends[i] >= 0 && ends[i] <= reached;
    const target = read ? ends[i] : starts[i];
    if (target < 0 || (target === at && !busy && !fresh)) { offer(read ? i : -1); return; }
    chill();
    busy = true;
    // One block that cannot put itself back does not stop the jump: the rest
    // still go where they belong, and the reader still arrives.
    entries.forEach((e) => tried('сброс блока', () => {
      if (e.opening) e.opening.run(0);
      if (e.steps) e.setState(0);
    }));
    // Сразу доводим только то, что будет видно: сам целевой раздел и тот, что
    // перед ним, — его картинку целевой может взять себе под переходный экран
    // (carry), и без собранного соседа она просто не приедет. Остальным
    // записывается долг.
    owed.clear();
    const aim = blockOf(target);
    const near = order[aim - 1] || null;
    for (let k = 0; k <= target; k++) {
      const section = beats[k].section;
      if (!section || section === order[aim] || section === near) {
        if (beats[k].settle) tried('подготовка такта', () => beats[k].settle());
      } else {
        owed.set(section, k);
      }
    }
    at = target;
    // Jumping ahead counts as having been there: what the reader skipped is
    // behind them now, and going back a beat at a time has to work from here.
    if (at > reached) reached = at;
    report();
    offer(read ? i : -1);
    const beat = beats[target];
    glide(beat.top ? beat.top() : beat.section.offsetTop, done);
  };
  toBlockRef.go = toBlock;

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
    offer(-1);
    if (at < 0) return;
    if (busy) { asked = -1; return; }
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
      // section back into the state it was left in can. Раздел, в который
      // читатель возвращается, мог быть пропущен прыжком и стоять с долгом —
      // settleTo отдает его по дороге.
      settleTo(at);
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
    // И третье: перемена знака. Хвост инерции едет туда, куда его пустили, —
    // вниз он не поворачивает. Значит, событие, пришедшее в другую сторону, —
    // это рука, а не хвост, и считать его продолжением прошлого движения
    // нельзя: «назад» сразу после «вперед» так пропадало целиком. Мелочь при
    // этом не в счет: у тачпада на излете набегает дрожь в пару единиц.
    const way = Math.sign(e.deltaY);
    const turnedAround = lastWay !== 0 && way !== lastWay && force > 10;
    if (way) lastWay = way;

    const paused = now - lastInput > GESTURE_GAP;
    // A momentum tail is not smooth: it dips and bumps on the way down, and a
    // bump three times the dip is nothing like a hand. A new swipe opens with
    // a push of its own size — that is what is looked for here.
    const shove = force > Math.max(quietest * 4, 30);
    lastInput = now;

    if (!paused && !shove && !turnedAround) {
      if (force >= peak) peak = force;            // still speeding up
      else quietest = Math.min(quietest, force);  // past the peak, fading
      return;
    }

    // Two beats cannot follow each other closer than a beat lasts, whoever
    // asked for them: one movement of the hand is one beat, and a tail that
    // fooled the test above cannot make it two.
    //
    // Кроме поворота назад: эту команду читатель дал нарочно, и терять ее
    // нельзя. Если такт еще идет, forward/back запомнят ее и сыграют, как
    // только он доиграет, — одну, не очередь.
    if (!turnedAround && now - lastBeat < BEAT_MS) {
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
  let touchX = 0;
  let swiped = false;
  let turned = false;                   // палец вертит картинку, а не листает
  const onTouchStart = (e) => {
    touchY = e.touches[0].clientY;
    touchX = e.touches[0].clientX;
    swiped = false;
    turned = false;
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (swiped) return;
    const dy = touchY - e.touches[0].clientY;
    // Планшет в альбом тоже читается тактами, и шар на нем тоже крутят рукой:
    // поперек экрана — его движение, вдоль — страницы. То же правило, что и на
    // телефоне, см. вертят() в mountScrolled.
    const dx = touchX - e.touches[0].clientX;
    if (turned || (Math.abs(dx) > Math.abs(dy)
      && e.target.closest && e.target.closest('.page-turns'))) { turned = true; return; }
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
    offer(-1);
    if (at < 0) return;
    // Как и прыжок по полоске, возврат на обложку не ждет анимацию.
    if (busy) cut();
    asked = 0;
    chill();
    busy = true;
    entries.forEach((e) => tried('сброс блока', () => {
      if (e.opening) e.opening.run(0);
      if (e.steps) e.setState(0);
    }));
    // Все разделы вернулись к своему началу — долгов за ними больше нет.
    owed.clear();
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
    // То же и у того, что водит стрелками внутри себя: стена флагов ходит
    // ими от страны к стране, называя каждую. Объявляет это блок сам,
    // атрибутом `data-arrows` на коробке, внутри которой ходят.
    if (el && el.closest('[data-arrows]') && e.key.startsWith('Arrow')) return;
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
  // Unless the reader is not on it: the phone was folded a moment ago, the page
  // came up in the other way of reading, and it owes them the block they were
  // standing in.
  const раздел = kept();
  if (раздел > 0) requestAnimationFrame(() => {
    toBlock(раздел);
    // Прицел берется, пока страница еще собирается: шрифты и картинки
    // приезжают следом и двигают разделы под ходом. Доиграв, страница
    // переспрашивает, где ее раздел, — иначе она встает в трех сотнях
    // пикселей от него.
    setTimeout(() => { if (!busy) window.scrollTo(0, hereTop()); }, SETTLE_MS + 160);
  });
  // Обложка отпускает читателя одним действием: кнопка «Начать путешествие»
  // просит тот самый первый такт, в который сшиты фонарь и створки.
  return { forward, back, toBlock, rewind, begin: forward };
}
