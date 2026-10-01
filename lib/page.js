// Page-level behaviour shared by every section: the reading progress bar,
// starting a section when the reader gets to it, and sticky scenes.

// Thin bar along the top edge showing how far down the page the reader is —
// divided into the blocks of the story, one slot each, so it also says how many
// of them there are and which one is being read.
// It is also the way back: a click on a slot goes to that block. Reading is
// slow on purpose — a beat at a time — and without this, coming back from the
// end of the story means playing the whole of it backwards.
//
// `titles` name the blocks, in order; `pick` is handed the stepper's jump once
// there is one.
export function mountProgress(titles = []) {
  const bar = document.createElement('nav');
  bar.className = 'page-progress';
  bar.setAttribute('aria-label', 'Разделы');
  document.body.appendChild(bar);

  // Which block of how many, in words: the bar shows the place but cannot say
  // it. Comes up as a block starts and goes once the reader is into it.
  const counter = document.createElement('div');
  counter.className = 'page-progress-count';
  counter.setAttribute('aria-hidden', 'true');
  document.body.appendChild(counter);

  // The same thing said out loud for a screen reader, which otherwise hears
  // seven buttons and no idea which of them is being read.
  const said = document.createElement('div');
  said.className = 'sr-only';
  said.setAttribute('aria-live', 'polite');
  document.body.appendChild(said);

  let jump = null;
  let goHome = null;
  // A heading is markup: it can carry a picture that says a word — the station
  // board of the metro block — and a second copy of itself for the card to open
  // with. What is hidden from screen readers is hidden here too; what a picture
  // stands for is read off its alt.
  const plain = (html) => {
    const box = document.createElement('div');
    box.innerHTML = html || '';
    // A heading can carry the styles its card needs, because the card plays
    // before the block that would bring them is built. That is markup, not
    // words: taken as words it would put a stylesheet under the slot.
    box.querySelectorAll('style, script, template').forEach((el) => el.remove());
    box.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    box.querySelectorAll('img').forEach((img) => img.replaceWith(` ${img.alt || ''} `));
    return box.textContent.replace(/\s+/g, ' ').trim();
  };

  // What a slot leads to, written under it. Pointing anywhere at the bar brings
  // all the names up at once — one look instead of seven — and the one under
  // the cursor shows itself whole; see the styles.
  const names = [];
  // A name is centred under its slot, and pointed at it opens out to its full
  // length — which, for a slot at either end of the bar, can run off the
  // screen, and at the right end under the count in the corner. So the name
  // under the cursor is moved along just enough to stay in view and clear of
  // the count; everywhere else it stays centred.
  const EDGE = 8;
  // The name opens out under the cursor, not under the middle of its slot: a
  // long one centred on a narrow slot lands a screen away from the hand that
  // asked for it. Only the edges of the screen move it, and only as far as
  // they must — the name of the last block is wider than the room left to the
  // right of it, so it comes as close to the cursor as it can.
  const fit = (slot, tag, at) => {
    const full = tag.scrollWidth;
    const box = slot.getBoundingClientRect();
    const middle = box.left + box.width / 2;
    const half = full / 2;
    const want = Number.isFinite(at) ? at : middle;
    const put = Math.min(
      Math.max(want, EDGE + half),
      window.innerWidth - EDGE - half
    );
    tag.style.setProperty('--name-shift', `${Math.round(put - middle)}px`);
  };
  const label = (slot, name) => {
    slot.setAttribute('aria-label', name);
    const tag = document.createElement('b');
    tag.className = 'page-progress-name';
    tag.textContent = name;
    slot.appendChild(tag);
    // Placed where the cursor came in and left there: a name that slid along
    // under the hand would be harder to read than one that simply appeared.
    slot.addEventListener('pointerenter', (e) => fit(slot, tag, e.clientX));
    slot.addEventListener('pointerleave', () => tag.style.removeProperty('--name-shift'));
  };

  // The title screen, at the head of the bar: the story opens there and can
  // always be sent back to it. Narrow, because it is a screen rather than a
  // block — the story proper starts after it.
  let home = null;
  const homeSlot = () => {
    home = document.createElement('button');
    home.type = 'button';
    home.className = 'page-progress-slot page-progress-home';
    home.appendChild(document.createElement('i'));
    home.addEventListener('click', () => goHome && goHome());
    label(home, 'В начало');
    bar.appendChild(home);
  };

  // The slots are built once, when the stepper first says how many there are.
  let slots = [];
  const slotsFor = (count) => {
    if (slots.length === count) return;
    bar.textContent = '';
    homeSlot();
    slots = Array.from({ length: count }, (_, i) => {
      const name = plain(titles[i]) || `Раздел ${i + 1}`;
      names[i] = name;
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'page-progress-slot';
      slot.appendChild(document.createElement('i'));
      slot.addEventListener('click', () => jump && jump(i));
      label(slot, name);
      bar.appendChild(slot);
      return slot;
    });
  };

  // The hint at the foot of the screen. It keeps out of the way while the
  // reader is reading and comes back whenever they have been still for a
  // while — on any screen, not only the first one: nothing else on the page
  // says that it is read a beat at a time. On the opening screen it waits for
  // the title to finish assembling before showing up at all.
  const hint = document.querySelector('.scroll-hint');
  const IDLE_MS = 60000;
  const FIRST_MS = 2200;
  let timer = 0;
  let ended = false;
  let waiting = null;          // asks the stepper whether a step is holding

  // A step that waits for the reader has already said what it wants, right
  // where it wants it. «Scroll» on top of that would name the one thing that
  // does nothing here — so the hint keeps quiet and asks again a while later.
  const prompt = () => {
    if (waiting && waiting()) { timer = setTimeout(prompt, IDLE_MS); return; }
    hint.classList.add('is-here');
  };

  // The count is shown while a block is new and then left alone.
  const COUNT_MS = 1900;
  let told = -2;               // the block the count last named
  let counting = 0;

  const set = (p, place) => {
    waiting = place && place.waiting ? place.waiting : null;
    // A step that waits has already said what it wants, in its own place on
    // the screen — and a hint standing over its button would cover the one
    // thing the reader is asked to press. So it leaves as soon as the waiting
    // starts, not only when it was about to arrive.
    if (waiting && waiting()) hint.classList.remove('is-here');
    if (place && place.count) {
      slotsFor(place.count);
      slots.forEach((slot, i) => {
        const full = i < place.index ? 1 : i === place.index ? place.part : 0;
        slot.firstChild.style.transform = `scaleX(${full.toFixed(3)})`;
        // The block being read is cut into its beats, so «three of seven,
        // halfway» becomes «two more pictures and the block is over». The
        // others stay plain: a bar of notches all the way across would be a
        // pattern rather than a place.
        const steps = i === place.index ? place.beats || 0 : 0;
        if (steps > 1) slot.style.setProperty('--steps', String(steps));
        slot.style.setProperty('--steps-on', steps > 1 ? '1' : '0');
        // Every block is a place to go to, read or not: the bar is a way
        // around the page, and a reader who came for one of them should be
        // able to go straight there. What they skip is played into the state
        // it ends in on the way — see toBlock in lib/stepper.js.
        slot.disabled = false;
        if (i === place.index) slot.setAttribute('aria-current', 'step');
        else slot.removeAttribute('aria-current');
      });

      // «Третий из семи» — the one thing the bar cannot say by itself.
      if (place.index !== told) {
        told = place.index;
        clearTimeout(counting);
        if (place.index >= 0) {
          counter.textContent = `${place.index + 1} из ${place.count}`;
          counter.classList.add('is-here');
          counting = setTimeout(() => counter.classList.remove('is-here'), COUNT_MS);
          said.textContent = `Раздел ${place.index + 1} из ${place.count}. ${names[place.index] || ''}`;
        } else {
          counter.classList.remove('is-here');
          said.textContent = 'Титульный экран';
        }
      }

      // The count stands under the slot it is about, wherever that slot is —
      // near the head of the bar at the beginning of the story and near its
      // end at the end, so the number and the place it names are one thing to
      // look at. Measured after the text is set, and kept on the screen at
      // either edge, the way the names are.
      const here = slots[place.index];
      if (here) {
        const box = here.getBoundingClientRect();
        const half = counter.offsetWidth / 2;
        const middle = Math.min(
          Math.max(box.left + box.width / 2, EDGE + half),
          window.innerWidth - EDGE - half
        );
        counter.style.setProperty('--count-x', `${Math.round(middle)}px`);
      }
      // The title screen is behind the reader as soon as the story starts, and
      // there is nowhere to go from it while they are still on it.
      if (home) {
        const left = place.index >= 0 || p > 0.001;
        home.firstChild.style.transform = `scaleX(${left ? 1 : 0})`;
        home.disabled = !left || !goHome;
      }
      if (hint) hint.classList.toggle('has-way-back', place.seen >= 1);
    }
    if (!hint) return;
    ended = p > 0.999;              // the story is over, there is nothing to prompt
    hint.classList.remove('is-here');
    clearTimeout(timer);
    if (!ended) timer = setTimeout(prompt, p > 0.001 ? IDLE_MS : FIRST_MS);
  };

  set(0);
  return {
    set,
    pick: (fn, back) => { jump = fn; goHome = back; }
  };
}

// The mark standing in for the «о» of the title turns towards the cursor, like
// a coin catching the light — the one thing on the opening screen that answers
// the reader before they have done anything. Where there is no cursor to follow
// (a touch screen), or the reader has asked for less movement, it just sits.
export function mountTitleMark() {
  const mark = document.querySelector('.page-header .hse-o');
  if (!mark
      || !matchMedia('(hover: hover)').matches
      || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const TILT = 20;             // degrees at the far corner of the screen
  let queued = false;
  let px = 0;
  let py = 0;

  const draw = () => {
    queued = false;
    const box = mark.getBoundingClientRect();
    if (!box.width) return;    // scrolled away — nothing to turn
    const dx = (px - (box.left + box.width / 2)) / (window.innerWidth / 2);
    const dy = (py - (box.top + box.height / 2)) / (window.innerHeight / 2);
    const cap = (v) => Math.max(-1, Math.min(1, v));
    mark.style.transform =
      `perspective(600px) rotateY(${cap(dx) * TILT}deg) rotateX(${cap(-dy) * TILT}deg)`;
  };

  window.addEventListener('pointermove', (e) => {
    px = e.clientX;
    py = e.clientY;
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  }, { passive: true });

  // The cursor has left the window: the mark faces front again.
  document.addEventListener('pointerleave', () => { mark.style.transform = ''; });
}

// How much bigger the heading is while it holds as a title card. The lead-in
// screen is laid out against the same number, so the two line up. A section
// can ask for another one — with 1 the card holds at the size it will settle
// at, and the reader sees it move without it changing.
const CARD_K = 1.55;

// Cards of the usual size are all set in one: where a heading had to shrink to
// keep its line, its neighbours shrink with it. Two cards in a row at different
// sizes, arriving from different heights, read as a stumble — and the reader
// sees them one after another, so the difference is right in front of them.
//
// A card that needs far more than a nudge is left out of that: it is a card of
// its own anyway — the professions block opens on a logo, not on a line of
// text — and dragging the whole page down to its size would cost more than it
// saves.
const TOGETHER = 0.15;         // how much shrinking still goes with the others
const CARDS = [];
let common = CARD_K;

const rethink = (changed) => {
  const now = CARDS.reduce(
    (low, c) => (c.safe >= CARD_K - TOGETHER ? Math.min(low, c.safe) : low), CARD_K);
  if (Math.abs(now - common) < 0.0005) return;
  common = now;
  CARDS.forEach((c) => { if (c !== changed) c.remeasure(); });
};

// Gives a section a title card: it starts with its heading alone in the middle
// of the screen, larger than usual but smaller than the title of the page, and
// as the reader scrolls the heading settles into its normal place and size
// while the visualisation itself fades in underneath.
//
// The heading is scaled rather than re-typeset, and its layout width is divided
// by the same factor — so the line breaks never move, only the size does.
// Moves a heading between its title-card state (p = 0: big, centred, body
// hidden) and its normal one (p = 1). Used by mountIntro and by scenes that
// open with a title card.
// `K` is a function: how big the card is may be settled only once the heading
// has been measured — see cardScale.
function titleCard(section, zone = INTRO_SCREENS, K = () => CARD_K, fullHeight = null) {
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');

  // The padding of the container is a stylesheet value: it cannot change
  // while a beat plays, and asking for it every frame makes the browser
  // recalculate style for the whole page each time.
  let pad = null;
  const padding = () => {
    if (pad === null) pad = parseFloat(getComputedStyle(container).paddingTop);
    return pad;
  };
  window.addEventListener('resize', () => { pad = null; });

  return (p, narrow) => {
    const big = K();
    const k = big - (big - 1) * p;
    // Measured with every part of the card open: parts arrive one after
    // another, and centring on the height of the moment would nudge the
    // heading down each time one of them does.
    const h = (fullHeight ? fullHeight(k) : header.offsetHeight) * k;
    // Where the heading ends up differs between the two layouts: on a wide
    // screen the whole container is pinned and the heading settles at its top;
    // on a narrow one the heading is pinned by itself to the top of the screen.
    const centred = narrow
      ? window.innerHeight / 2 - h / 2
      : container.clientHeight / 2 - (padding() + h / 2);

    section.style.setProperty('--intro-k', k.toFixed(4));
    section.style.setProperty('--intro-dy', `${(centred * (1 - p)).toFixed(1)}px`);
    section.style.setProperty('--intro-body', p.toFixed(3));

    // The zone the pinned heading lives in is one heading taller than the
    // intro itself: it settles at the top of the screen and waits there while
    // the block comes up to meet it.
    if (narrow) {
      const hold = window.innerHeight * zone + header.offsetHeight;
      section.style.setProperty('--intro-hold', `${Math.round(hold)}px`);
    }
  };
}

// A part waiting its turn is squeezed shut by its height, and reports through
// scrollHeight the height it would have open. That reading makes the browser
// lay the page out, and it is wanted on every frame of a beat — so it is taken
// once and kept.
//
// Only once there is something to measure, though. The styles that shape a
// part come with the block, and the block is put together long after the first
// frame is drawn: until then the very same reading gives another number — for
// a part that is still an inline span, none at all. So while the block is not
// there every frame asks afresh, and the answer is kept only afterwards — until
// the window, the fonts or the markup say it has changed.
function openHeights(watched, section) {
  const body = section.querySelector('.viz-body');
  let kept = new WeakMap();
  const forget = () => { kept = new WeakMap(); };
  window.addEventListener('resize', forget);
  new MutationObserver(forget).observe(watched,
    { childList: true, characterData: true, subtree: true });
  if (body) new MutationObserver(forget).observe(body, { childList: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(forget);
  return (el) => {
    if (!body || !body.children.length) return el.scrollHeight;
    if (!kept.has(el)) kept.set(el, el.scrollHeight);
    return kept.get(el);
  };
}

// One beat — the scrolling it takes for one thing to happen. Everything the
// page does on the way is a whole number of these: a part of a card arriving,
// a screen sliding aside, a step of a scene. Written down once so the story
// keeps an even pace and the whole of it can be sped up or slowed down here.
const BEAT = 0.7;

// A section can open with a lead-in screen — one figure and one line — that
// slides away to the left while the title card comes in from the right: one
// beat to read it, one to see it go.
const LEAD_SCREENS = 2 * BEAT;
const LEAD_HOLD = 0.5;                 // the share of that spent holding

// The lead-in can arrive in parts, the same way the title card does: what is
// marked `.intro-stage` inside it waits its turn and then grows into place
// while the screen still holds. A beat each, one after another.
const LEAD_STAGE_SCREENS = BEAT;
const LEAD_STAGE_AT = 0;
const LEAD_STAGE_SPAN = BEAT;

// Drives that swap. Returns how many screens the lead-in holds for and the
// painter itself; `q` is how far the card has scrolled, in screens.
function leadCard(section, K = () => CARD_K, cardHeight = null) {
  const lead = section.querySelector('.viz-lead');
  if (!lead) return null;
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');
  // How tall the card that follows will be. Not the heading as it stands —
  // its parts are still shut and it is shorter than it will be — but the
  // height the card is centred by. Read it off the wrong one and the screen
  // and the card that replaces it come out at different heights.
  const tall = (k) => (cardHeight ? cardHeight(k) : header.offsetHeight);

  // Where it goes when its turn is over. Aside, making way for the title card
  // that comes in from the other side; up to the top of the section, where it
  // stays and reads as the heading; or up and off the screen altogether, with
  // the card coming up from below in its place — for a screen that says how
  // far up something is, where sliding sideways would cut across the sense.
  const parks = lead.dataset.exit === 'top';
  const rises = lead.dataset.exit === 'up';

  // A screen of one line starts where the heading of the title card will be,
  // so the swap is a move sideways and nothing hops. One that grows part by
  // part can ask to stay in the middle instead: it then rises as its parts
  // arrive, and each of them is read in the centre of the screen.
  const centres = lead.dataset.fit === 'center';

  // Squeezed shut until their turn — see stageCards for why by height.
  const parts = [...lead.querySelectorAll('.intro-stage')];
  parts.forEach((el) => { el.style.overflow = 'hidden'; });
  // A beat for every number, not for every box: two parts of the screen can
  // carry the same `data-stage` — a question and the scale under it arrive
  // together — and counting boxes would then buy a beat with nothing on it at
  // the end of the screen.
  const stages = parts.length
    ? Math.max(...parts.map((el) => Number(el.dataset.stage) || 1))
    : 0;
  const openHeight = openHeights(lead, section);

  // Stylesheet value: it cannot change while a beat plays.
  let pad = null;
  const padding = () => {
    if (pad === null) pad = parseFloat(getComputedStyle(container).paddingTop);
    return pad;
  };
  window.addEventListener('resize', () => { pad = null; });
  const screens = LEAD_SCREENS + stages * LEAD_STAGE_SCREENS;
  const hold = LEAD_HOLD + stages * LEAD_STAGE_SCREENS;

  // A figure of one short line — «Только первокурсников ~22 000 человек» — is
  // read at a glance, and breaking it in two spoils that. Where such a line
  // very nearly fits, the type steps down instead of wrapping; where it is not
  // a headline at all but a sentence, it wraps like one and nothing changes.
  // Measured, not guessed: the same rule then holds for any lead-in.
  const NEARLY = 1.35;         // how much of a squeeze is still worth it
  const value = lead.querySelector('.viz-lead-value');
  const fitLine = () => {
    if (!value) return;
    section.style.setProperty('--lead-fit', '1');
    lead.dataset.line = 'one';                 // measured as it would be set
    const room = lead.clientWidth;
    const line = value.scrollWidth;
    if (!room || !line) return;
    if (line > room * NEARLY) {
      delete lead.dataset.line;                // a sentence: let it wrap
      return;
    }
    if (line > room) {
      section.style.setProperty('--lead-fit', (room / line - 0.004).toFixed(4));
    }
  };

  // And the same for its height. A screen that has grown part by part can come
  // out taller than the room it has — the one with the question, the answer and
  // the year it lands on is the tallest on the page — and the foot of the
  // window is not free: the reading hint stands there. So the screen is scaled
  // down as a whole by exactly what does not fit. Measured with every part of
  // it open, because that is the height it has to fit at; scaled about its own
  // middle, so the placement below needs to know nothing about it.
  const fitHeight = () => {
    const kept = parts.map((el) => [el.style.height, el.style.opacity]);
    parts.forEach((el) => { el.style.height = ''; el.style.opacity = '1'; });
    section.style.setProperty('--lead-squeeze', '1');
    const full = lead.offsetHeight;
    const room = container.clientHeight;
    const k = full > room && room > 0 ? room / full : 1;
    parts.forEach((el, i) => { [el.style.height, el.style.opacity] = kept[i]; });
    section.style.setProperty('--lead-squeeze', k.toFixed(4));
  };

  // Both are taken together, and only when something they depend on has moved
  // — the card asks for it before every beat, see measure() in introRunner.
  const fit = () => { fitLine(); fitHeight(); };

  const paint = (q, narrow) => {
    // Sit exactly where the title card will: same top edge, so the swap is a
    // move sideways and nothing hops up or down. On a narrow screen the lead-in
    // is fixed to the middle of the window instead, so it needs no top — but it
    // has to keep out of sight until the section itself arrives.
    const cardTop = container.clientHeight / 2 - (tall(K()) * K()) / 2;
    // A lead-in that stands over a picture handed over by the block before
    // starts where it would park, at the top: the picture takes the screen
    // under it, and when its turn is over there is nowhere for it to go.
    const lifted = parks && !narrow && section.classList.contains('has-backdrop');
    const top = lifted ? padding() : cardTop;
    if (!narrow && !centres) lead.style.top = `${Math.round(top)}px`;
    if (narrow) lead.style.top = '';
    lead.style.visibility = narrow && section.getBoundingClientRect().top > 1
      ? 'hidden'
      : '';
    // Centred against the same screen height as the heading — in pixels, not
    // dvh, so the two agree even while the address bar of a phone is moving.
    if (narrow) {
      section.style.setProperty('--lead-screen', `${window.innerHeight}px`);
    }

    // The parts come first, one after another, and the screen only starts
    // moving once the last of them is there.
    parts.forEach((el) => {
      const k = Number(el.dataset.stage) || 1;
      const from = (k - 1) * LEAD_STAGE_SCREENS + LEAD_STAGE_AT;
      const v = clamp((q - from) / LEAD_STAGE_SPAN);
      const grown = 1 - Math.pow(1 - v, 3);
      const tall = openHeight(el);
      el.style.opacity = grown.toFixed(3);
      // Nothing to grow if it has no height of its own yet — see stageCards.
      el.style.height = grown < 1 && tall > 0 ? `${(tall * grown).toFixed(1)}px` : '';
      // How far each part has come, for anyone who cares: a screen where one
      // part replaces another has the earlier one leave by the same number.
      section.style.setProperty(`--lead-stage-${k}`, grown.toFixed(3));
    });

    // A screen that holds the middle is placed once its parts have grown: its
    // height is what has just changed, and reading it before them would leave
    // the screen a frame behind — plain to see when the reader stops.
    if (!narrow && centres) {
      lead.style.top = `${Math.round(container.clientHeight / 2 - lead.offsetHeight / 2)}px`;
    }

    const t = clamp((q - hold) / (screens - hold));
    const e = 1 - Math.pow(1 - t, 3);
    // How far the screen has gone. A picture the block before laid under it
    // goes with it — see backdropOf in lib/stepper.js.
    section.style.setProperty('--lead-away', e.toFixed(3));

    // Parking only works where the whole section is pinned: the screen goes up
    // to the top of the container and stays there, at its own size, while the
    // block comes up underneath it — so the block starts below it, and the
    // heading of the section keeps waiting off to the right. On a narrow
    // screen nothing is pinned as a whole, so the usual swap happens instead.
    if (parks && !narrow) {
      lead.style.setProperty('--lead-x', '0px');
      lead.style.setProperty('--lead-y', `${(-e * (top - padding())).toFixed(1)}px`);
      lead.style.opacity = '';
      section.style.setProperty('--card-x', '108vw');
      section.style.setProperty('--lead-hold',
        `${Math.max(0, Math.round(lead.offsetHeight - header.offsetHeight))}px`);
      return;
    }

    // Off the top of the screen, and the card comes up from below to take its
    // place — one movement upwards instead of two sideways.
    if (rises && !narrow) {
      lead.style.setProperty('--lead-x', '0px');
      lead.style.setProperty('--lead-y', `${(-e * 108).toFixed(2)}vh`);
      lead.style.opacity = (1 - clamp(t * 1.6)).toFixed(3);
      section.style.setProperty('--card-x', '0px');
      section.style.setProperty('--card-y', `${((1 - e) * 108).toFixed(2)}vh`);
      return;
    }

    lead.style.setProperty('--lead-y', '0px');
    lead.style.setProperty('--lead-x', `${(-e * 108).toFixed(2)}vw`);
    lead.style.opacity = (1 - clamp(t * 1.6)).toFixed(3);
    // The heading waits off to the right until its turn.
    section.style.setProperty('--card-x', `${((1 - e) * 108).toFixed(2)}vw`);
    section.style.setProperty('--card-y', '0px');
  };

  // A lead-in can ask to leave and let the card settle in the one movement,
  // instead of a beat each with the card standing in the middle of the screen
  // in between — see the beats of introRunner. It works either way it leaves:
  // one that parks takes the block up with it, one that slides aside brings
  // the card in from the right as it goes.
  const together = lead.dataset.together === 'block';
  return { screens, hold, parts: stages, paint, fit, together, parks };
}

// The title card: a beat to read it where it stands, then it settles into
// place. A card that arrives in parts gets a beat for each of them first.
const INTRO_SCREENS = 2 * BEAT;
const STAGE_SCREENS = BEAT;
const HOLD = 0.5;                      // half of it holding, half settling
const DONE = 1;

const clamp = (v) => Math.min(1, Math.max(0, v));

// How far the section has scrolled through its intro phase, 0..1. On a wide
// screen the whole section is pinned, so the phase is measured against its
// travel; on a narrow one only the heading is pinned and the phase is the
// intro zone above the block.
function introProgress(section, narrow, zone = INTRO_SCREENS) {
  const box = section.getBoundingClientRect();
  const span = narrow
    ? zone * window.innerHeight
    : box.height - window.innerHeight;
  if (span <= 0) return null;
  return clamp(-box.top / span);
}

// The card stands still for a while and then settles into its place over the
// rest of its screen. Takes the raw progress of that screen, gives back how far
// the card has settled.
function settleCurve(raw) {
  const t = clamp((raw - HOLD) / (DONE - HOLD));
  return 1 - Math.pow(1 - t, 3);            // same easing as everywhere else
}

// A title card can arrive in stages: blocks inside the heading marked
// `.intro-stage` with a number wait their turn and then grow into place, one
// per screen of scrolling, while the card is still holding in the middle. What
// is not marked is there from the first frame.
//
// The block is squeezed shut by its height, so it keeps reporting through
// scrollHeight the height it would have had if it were open — that is what the
// share is taken of. Once it is fully there the height goes back to auto and
// the block is free to change on its own again.
function stageCards(section, stages) {
  const blocks = [...section.querySelectorAll('.intro-stage')];
  blocks.forEach((el) => { el.style.overflow = 'hidden'; });
  const openHeight = openHeights(section.querySelector('.viz-header'), section);

  const grown = (q, k) =>
    1 - Math.pow(1 - clamp((q - (k - 1) * STAGE_SCREENS) / STAGE_SCREENS), 3);

  // `q` is how far the card has scrolled, counted in screens. A part takes a
  // beat to arrive, and the next one starts where it finished.
  return (q) => {
    // Every beat says how far it has come, whether or not a block is tied to
    // it: a card can play something else on one — a logo opening up, a phrase
    // wedging itself into the heading — and that is driven from the module.
    for (let k = 1; k < stages; k++) {
      section.style.setProperty(`--stage-${k}`, grown(q, k).toFixed(3));
    }

    blocks.forEach((el) => {
      const e = grown(q, Number(el.dataset.stage) || 1);
      const tall = openHeight(el);
      el.style.opacity = e.toFixed(3);
      // A part that measures nothing is not a box yet. The card plays before
      // the block is built, and a module that gives its parts `display: block`
      // from its own stylesheet — which lives inside the block — still has
      // them as inline text at this point: no height, nothing to grow. Giving
      // that a height of zero hides it and then lets the whole of it appear at
      // once when the beat ends; letting it come up by opacity alone is the
      // lesser fault, and it fixes itself the moment the block is there.
      el.style.height = e < 1 && tall > 0 ? `${(tall * e).toFixed(1)}px` : '';
    });
  };
}

// Whether the reader has asked for less movement: then a section shows its
// finished state and nothing plays at all.
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

// Builds the opening of a section — the lead-in screen, the parts of the card
// and the card settling into place — as one function of progress 0..1, plus
// how many beats it is worth.
export function introRunner(section, stages = 1, scale = CARD_K) {
  // How big the card actually turns out to be. It is asked for in `scale`, but
  // the heading has the last word — see cardScale below.
  let cardK = scale;
  // The usual size is shared; a section that asked for one of its own keeps it.
  const shares = scale === CARD_K;
  const me = { safe: scale, remeasure: () => measure() };
  if (shares) CARDS.push(me);
  const K = () => (shares && cardK >= CARD_K - TOGETHER ? common : cardK);
  const lead = leadCard(section, K, (k) => heightAt(k));
  const leadScreens = lead ? lead.screens : 0;
  const zone = leadScreens + INTRO_SCREENS + (stages - 1) * STAGE_SCREENS;
  const header = section.querySelector('.viz-header');
  const heading = header.querySelector('h2');

  // The card is the same heading, only bigger: it is laid out at 1/k of the
  // width and then scaled back up. So the larger the card, the fewer words fit
  // on its line — and a heading that breaks into two lines on the card and one
  // line in its place does not settle, it snaps: the tail of it jumps up a line
  // mid-beat and everything under it with it.
  //
  // Hence the card takes the largest size that still breaks its lines exactly
  // where the settled heading breaks them. On a wide screen that is the size it
  // asked for; on a narrower one it is a little smaller, and the move stays
  // smooth. Sizes only shrink from here, so one pass down is enough.
  const cardScale = () => {
    if (!heading || scale <= 1) return scale;
    section.style.setProperty('--intro-k', '1');
    const lines = heading.offsetHeight;
    for (let k = scale; k > 1.02; k -= 0.05) {
      section.style.setProperty('--intro-k', k.toFixed(3));
      if (heading.offsetHeight <= lines) return k;
    }
    return 1;
  };

  let drawn = null;
  let narrow = false;
  // `q` is where the lead-in is and `qCard` where the card is — the same
  // number, except in a beat where the two move at once (see the beats below).
  const draw = (q, qCard = q) => {
    drawn = [q, qCard];
    if (lead) lead.paint(q, narrow);
    if (reveal) reveal(qCard - leadScreens);
    paint(settleCurve((qCard - (zone - INTRO_SCREENS)) / INTRO_SCREENS), narrow);
  };
  // How tall the card is with all of its parts open — the heading is placed
  // against that from the first frame, so it does not shift as they arrive.
  // The card is scaled, and a scaled card is also narrower in layout terms, so
  // its text wraps differently: the height is measured at both ends and read
  // off in between.
  let tallOpen = 0;      // held out in the middle of the screen
  let tallSettled = 0;   // sitting in its place
  const measure = () => {
    const parts = [...header.querySelectorAll('.intro-stage')];
    const keptParts = parts.map((el) => [el.style.height, el.style.opacity]);
    const keptK = section.style.getPropertyValue('--intro-k');
    parts.forEach((el) => { el.style.height = ''; el.style.opacity = '1'; });

    // Whatever else plays on those beats follows --stage-N — a phrase wedging
    // itself into the heading, say, which can push it onto another line. Those
    // are opened for the measurement too, so the card is placed against the
    // height it will end up with.
    const keptStages = [];
    for (let k = 1; k < stages; k++) {
      keptStages.push(section.style.getPropertyValue(`--stage-${k}`));
      section.style.setProperty(`--stage-${k}`, '1');
    }

    // Both variables together, not just the size: a card can hold something
    // that belongs to one state only — a logo instead of the heading, say —
    // and --intro-body is what such a thing follows.
    const keptBody = section.style.getPropertyValue('--intro-body');
    section.style.setProperty('--intro-body', '0');
    // The heading is measured for line breaks in the state the card is in.
    cardK = cardScale();
    me.safe = cardK;
    if (shares) rethink(me);
    if (lead) lead.fit();
    // Measured at the size the card will actually come out at — the shared one.
    section.style.setProperty('--intro-k', String(K()));
    tallOpen = header.offsetHeight;
    section.style.setProperty('--intro-k', '1');
    section.style.setProperty('--intro-body', '1');
    tallSettled = header.offsetHeight;
    if (keptBody) section.style.setProperty('--intro-body', keptBody);
    else section.style.removeProperty('--intro-body');

    parts.forEach((el, i) => { [el.style.height, el.style.opacity] = keptParts[i]; });
    keptStages.forEach((v, i) => {
      if (v) section.style.setProperty(`--stage-${i + 1}`, v);
      else section.style.removeProperty(`--stage-${i + 1}`);
    });
    if (keptK) section.style.setProperty('--intro-k', keptK);
    else section.style.removeProperty('--intro-k');

    // Restoring the inline styles is not enough: before the first frame there
    // were none, and «no inline height» means fully open. Redraw the frame the
    // opening was on, so a part cannot flash into view.
    if (drawn !== null) draw(...drawn);
    taken = state();
    edited = false;
  };

  // Measuring walks the whole section several times over — the heading is laid
  // out at half a dozen sizes to find the one that keeps its line breaks — and
  // in a block of hundreds of elements that is more work than a frame can hold.
  // Whoever plays the opening asks for it before every beat, so the reader
  // would feel it as a hitch at the very moment they scroll.
  //
  // What can change the answer: the size of the window, the fonts, the
  // pictures inside the heading — and the heading itself, since a module is
  // free to write into it. The first three are read off in a line; the last is
  // watched, because it changes rarely and asking would cost as much as
  // measuring. While all of them stand still the last measurement holds.
  const state = () => `${window.innerWidth}×${window.innerHeight}`
    + `|${document.fonts ? document.fonts.status : ''}`
    + `|${[...header.querySelectorAll('img')].filter((img) => img.complete).length}`;
  let taken = null;
  let edited = false;
  const watch = (el, what) => {
    if (el) new MutationObserver(() => { edited = true; }).observe(el, what);
  };
  watch(header, { childList: true, characterData: true, subtree: true });
  // The lead-in screen is measured in the same pass, and its height is not
  // settled when the shell first draws it: the styles that shape it come inside
  // the block, which is put together much later. So the block arriving counts
  // as an edit too — otherwise the screen is placed against a height it had
  // before it knew how tall it was, and reaches past the foot of the window.
  watch(section.querySelector('.viz-lead'),
    { childList: true, characterData: true, subtree: true });
  watch(section.querySelector('.viz-body'), { childList: true });
  const remeasure = () => { if (edited || state() !== taken) measure(); };

  measure();
  window.addEventListener('resize', measure);
  // A heading can carry pictures — a station board, a scarf — and they arrive
  // after the shell has drawn it. Anything that changes its height means the
  // measurement has to be taken again.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  header.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', measure, { once: true });
  });

  // tallOpen is measured at the size the card comes out at; heights read off it.
  const heightAt = (k) => {
    const top = K();
    if (!tallOpen) return header.offsetHeight;
    if (top === 1) return tallSettled;
    return tallSettled + (tallOpen - tallSettled) * ((k - 1) / (top - 1));
  };

  const paint = titleCard(section, zone, K, heightAt);
  const reveal = stages > 1 ? stageCards(section, stages) : null;

  section.classList.add('viz-intro');

  // Where one thing happens and the next begins. The opening is not a smooth
  // ramp: parts arrive one after another, the lead-in slides aside, the card
  // settles — and between some of those it simply waits. Whoever plays this
  // walks the list and gives each stretch its own beat, so nothing is spent on
  // the waiting.
  const beats = [];
  if (lead) {
    for (let k = 1; k <= lead.parts; k++) {
      beats.push([(k - 1) * LEAD_STAGE_SCREENS, k * LEAD_STAGE_SCREENS]);
    }
    // A lead-in that stays at the top can ask to take the block up with it: it
    // goes up and the block comes up under it in the one movement, rather than
    // a beat each with nothing in between to wait for.
    if (!lead.together) beats.push([lead.hold, leadScreens]);   // sliding aside
  }
  for (let k = 1; k < stages; k++) {
    beats.push([leadScreens + (k - 1) * STAGE_SCREENS, leadScreens + k * STAGE_SCREENS]);
  }
  const settling = [zone - INTRO_SCREENS * (1 - HOLD), zone];     // the card settling
  // A joined beat keeps each part on its own stretch and walks both at once:
  // [lead-in from, lead-in to, card from, card to]. Where the lead-in parks,
  // the card is already standing where it belongs and only has to settle. Where
  // it slides aside, the card is still off to the right and has the whole of
  // its own stretch to cross: it comes in as the lead-in leaves and sits down
  // without stopping in the middle — the stretch the card would have stood
  // still on is what the joined beat spends on the journey.
  if (lead && lead.together) {
    beats.push([lead.hold, leadScreens, lead.parks ? settling[0] : zone - INTRO_SCREENS, zone]);
  } else {
    beats.push(settling);
  }



  return {
    beats,
    zone,
    // How many of those beats belong to the parts of the lead-in screen, in
    // the order the module marked them: beat 0 opens the part with
    // data-stage="1" and so on. A module that wants to stop the reader on one
    // of them — to ask something before the screen answers it — needs to know
    // which beat is which, and this is the only honest way to say it.
    leadParts: lead ? lead.parts : 0,
    // Whoever plays this calls it before a beat: by then the pictures have
    // loaded and the card knows its real height. Free when nothing that the
    // measurement depends on has moved since the last one.
    remeasure,
    // p from 0 to 1 across the whole opening — used to put it in its opening
    // or finished state in one go.
    run(p) { draw(p * zone); },
    // On a narrow screen the opening is not played beat by beat: nothing is
    // pinned there, the page scrolls as a page, and the card follows the
    // scroll — the heading holds the top of the screen for the length of the
    // intro zone while the block comes up to meet it. Called on every scroll,
    // it reads its own position and paints the frame that belongs to it.
    follow() {
      narrow = true;
      const q = introProgress(section, true, zone);
      if (q !== null) draw(q * zone);
    },
    // One stretch of it, p from 0 to 1 within that stretch.
    runBeat(i, p) {
      const [from, to, cardFrom = from, cardTo = to] = beats[i];
      draw(from + (to - from) * p, cardFrom + (cardTo - cardFrom) * p);
    }
  };
}
