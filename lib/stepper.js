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

// Collects the beats of one section: settling it onto the screen, its title
// card (which may arrive in parts), and the steps of its scene.
//
// A beat knows three things about itself: how to play (`run`), how to play
// backwards (`back`) and how to be simply in its finished state (`settle`,
// for when the reader arrives from another section and there is nothing to
// animate). Both the card and a scene step are a function of one number, so
// putting either of them back where it was is exact, not an approximation.
function beatsOf(entry) {
  const { section, opening, steps, setStep, build, opensOnStep } = entry;
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

  // 1. Bring the section onto the screen, and build it while it travels.
  list.push({
    section,
    run: (done) => { enter(); glide(section.offsetTop, done); },
    settle: enter
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
  for (let i = opensOnStep ? 1 : 0; i < steps; i++) {
    list.push({
      section,
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
  const beats = entries.flatMap(beatsOf);

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

  const report = () => onProgress && onProgress((at + 1) / beats.length, place());

  const done = () => { busy = false; };

  const forward = () => {
    if (at >= beats.length - 1) return;
    // While a beat plays the page takes no orders. Anything arriving then is
    // the same movement still going — a trackpad keeps sending for a second
    // after the fingers have left it — and nothing is remembered for later:
    // a beat the reader did not ask for twice is worse than one they have to
    // ask for again.
    if (busy) return;
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

    lastBeat = now;
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
    lastBeat = lastInput;
    (dy > 0 ? forward : back)();
  };

  // Home goes back to the title screen in one move: every section is put back
  // to the state it opens in, so reading forward again plays out exactly as it
  // did the first time.
  const rewind = () => {
    if (at < 0 || busy) return;
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

  // Belt and braces: anything sent straight at the window never passes through
  // the document, and a second call on the same event is harmless — the
  // gesture check swallows it.
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  report();
  return { forward, back, toBlock };
}
