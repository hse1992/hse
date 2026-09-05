// The page as a sequence of beats.
//
// Scrolling does not scrub anything and does not carry the reader past what
// they have not seen yet: one movement of the wheel — or one swipe, or one
// press of the space bar — plays the next beat and nothing more. While a beat
// is playing, input is ignored; when it lands, the page waits for the reader
// again. Sections are settled onto the screen the same way: a beat of their
// own carries the page from one to the next.

const BEAT_MS = 700;         // how long one beat plays
const SETTLE_MS = 520;       // moving the page from one section to the next

// A trackpad keeps sending events for a second or so after the fingers have
// left it, and a mouse wheel sends a burst per notch. Anything arriving within
// this of the previous event is the same movement, still going — only the
// first event of a movement counts as «next».
const GESTURE_GAP = 200;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

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

// Collects the beats of one section: settling it onto the screen, its title
// card (which may arrive in parts), and the steps of its scene.
function beatsOf(entry) {
  const { section, opening, steps, setStep, build } = entry;
  const list = [];

  // 1. Bring the section onto the screen, and build it while it travels.
  list.push({
    section,
    run: (done) => {
      build();
      // The block has just been put together and the section is on its way in:
      // this is the moment the card can be measured for real.
      if (opening) { opening.remeasure(); opening.runBeat(0, 0); }
      glide(section.offsetTop, done);
    }
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
        }
      });
    });
  }

  // 3. The scene, one step per beat. The module animates the step itself; the
  //    beat is over when that animation has had its time.
  for (let i = 0; i < steps; i++) {
    list.push({
      section,
      run: (done) => { setStep(i); play(BEAT_MS, () => {}, done); }
    });
  }

  return list;
}

// `entries` describe the sections in order. Each is
// { section, opening, steps, setStep, build } — see beatsOf.
export function mountStepper(entries, { onProgress } = {}) {
  const beats = entries.flatMap(beatsOf);
  let at = -1;                 // the last beat played
  let busy = false;
  let lastInput = 0;           // when the current movement last said anything
  let peak = 0;                // the hardest it has pushed
  let quietest = Infinity;     // and how gently it has got since that peak
  let queued = 0;              // one movement may wait for the beat to finish

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

  document.documentElement.classList.add('is-stepped');

  // A reload would otherwise drop the reader back where they were scrolled to,
  // while the story itself starts from the beginning — a page standing in the
  // middle of a section that has not been told yet.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  // Pictures and fonts land after this, and the browser can nudge the page
  // again while it settles.
  window.addEventListener('load', () => { if (at < 0) window.scrollTo(0, 0); });

  const report = () => onProgress && onProgress((at + 1) / beats.length);

  // A movement that arrives mid-beat is not thrown away — it waits its turn.
  // Only one waits, so a flurry of swipes cannot run the story off ahead.
  const done = () => {
    busy = false;
    const next = queued;
    queued = 0;
    if (next > 0) forward();
    else if (next < 0) back();
  };

  const forward = () => {
    if (at >= beats.length - 1) return;
    if (busy) { queued = 1; return; }
    busy = true;
    at += 1;
    report();
    beats[at].run(done);
  };

  // Going back does not replay anything: the page steps to where the reader
  // was, in one move, and waits there.
  const back = () => {
    if (at <= 0) return;
    if (busy) { queued = -1; return; }
    at -= 1;
    report();
    const target = beats[Math.max(0, at)].section;
    busy = true;
    glide(target.offsetTop, done);
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
    const shove = force > Math.max(quietest * 3, 12);
    lastInput = now;

    if (!paused && !shove) {
      if (force >= peak) peak = force;            // still speeding up
      else quietest = Math.min(quietest, force);  // past the peak, fading
      return;
    }
    peak = force;
    quietest = Infinity;
    (e.deltaY > 0 ? forward : back)();
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
    (dy > 0 ? forward : back)();
  };

  const KEYS_FORWARD = [' ', 'PageDown', 'ArrowDown', 'ArrowRight', 'Enter'];
  const KEYS_BACK = ['PageUp', 'ArrowUp', 'ArrowLeft'];
  const onKey = (e) => {
    if (e.repeat) { e.preventDefault(); return; }   // holding a key is one press
    if (KEYS_FORWARD.includes(e.key)) { e.preventDefault(); forward(); }
    else if (KEYS_BACK.includes(e.key)) { e.preventDefault(); back(); }
    else if (e.key === 'Home') { e.preventDefault(); while (at > 0) back(); }
  };

  // Capture, not bubble: a list with its own scrollbar would otherwise take
  // the movement for itself and the page would stand still until the reader
  // tapped somewhere neutral first.
  const grab = { passive: false, capture: true };
  document.addEventListener('wheel', onWheel, grab);
  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onTouchMove, grab);
  document.addEventListener('keydown', onKey, true);

  // Belt and braces: anything sent straight at the window never passes through
  // the document, and a second call on the same event is harmless — the
  // gesture check swallows it.
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  report();
  return { forward, back };
}
