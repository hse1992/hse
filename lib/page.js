// Page-level behaviour shared by every section: the reading progress bar,
// starting a section when the reader gets to it, and sticky scenes.

// Thin bar along the top edge showing how far down the page the reader is.
export function mountProgress() {
  const bar = document.createElement('div');
  bar.className = 'page-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  let frame = null;
  const update = () => {
    frame = null;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = `scaleX(${p})`;
  };
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(update); };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}

// Runs `start` once, when the element is about to come into view. Sections
// build themselves at that moment, so their opening animation plays for a
// reader who has actually arrived — not minutes earlier, off-screen.
// The margin is generous: heavy canvases need a head start.
export function whenVisible(el, start, margin = '60% 0px') {
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    start();
  }, { rootMargin: margin });
  io.observe(el);
}

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
function titleCard(section) {
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');
  const K = 1.55;            // how much bigger the heading starts out

  return (p) => {
    const k = K - (K - 1) * p;
    // Centred inside the pinned container, not inside the viewport: the
    // container is exactly one screen tall, so while it is pinned the two are
    // the same — but the heading also rides in correctly while the section is
    // still on its way up.
    const padTop = parseFloat(getComputedStyle(container).paddingTop);
    const centred = container.clientHeight / 2 - (padTop + (header.offsetHeight * k) / 2);

    section.style.setProperty('--intro-k', k.toFixed(4));
    section.style.setProperty('--intro-dy', `${(centred * (1 - p)).toFixed(1)}px`);
    section.style.setProperty('--intro-body', p.toFixed(3));
  };
}

// How long the title card holds before it starts moving, and how long the whole
// intro phase lasts — long enough that a reader scrolling steadily still has
// time to read the heading before it leaves.
const INTRO_SCREENS = 1.35;
const HOLD = 0.35;
const DONE = 0.88;

export function mountIntro(section) {
  const paint = titleCard(section);

  // Wide screens only: a stacked section is taller than the viewport, and
  // pinning it to one screen would cut its bottom off.
  const wide = window.matchMedia('(min-width: 861px)');
  let frame = null;

  const measure = () => {
    frame = null;
    const box = section.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    if (travel <= 0) return;

    const raw = Math.min(1, Math.max(0, -box.top / travel));
    const t = Math.min(1, Math.max(0, (raw - HOLD) / (DONE - HOLD)));
    paint(1 - Math.pow(1 - t, 3));          // same easing as everywhere else
  };

  const schedule = () => { if (frame === null) frame = requestAnimationFrame(measure); };

  const enable = () => {
    section.classList.add('viz-intro');
    section.style.setProperty('--intro-screens', (INTRO_SCREENS + 1).toFixed(2));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
  };

  const disable = () => {
    section.classList.remove('viz-intro');
    ['--intro-screens', '--intro-k', '--intro-dy', '--intro-body']
      .forEach((v) => section.style.removeProperty(v));
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };

  const apply = () => (wide.matches ? enable() : disable());
  wide.addEventListener('change', apply);
  apply();

  return { sync: () => wide.matches && measure() };
}

// Turns a section into a sticky scene: it becomes `steps + 1` screens tall,
// its contents stay pinned to the viewport, and scrolling through it reports
// the current step. Desktop only — on a narrow screen the columns are already
// stacked and pinned, and a scene on top of that just fights the reader.
//
// Called as the page is built, before the section itself is, so its height is
// settled from the start and nothing shifts under the reader later. The module
// arrives afterwards: call sync() once it does to replay the current step.
// With `intro: true` the scene opens with the same title card as mountIntro:
// the first screen of scrolling belongs to the heading alone, and the steps
// start once it has taken its place.
export function mountScene(section, steps, onStep, { intro = false } = {}) {
  const wide = window.matchMedia('(min-width: 861px)');
  const paintTitle = intro ? titleCard(section) : null;
  const STEP_SCREENS = 0.8;              // how much scrolling one step takes
  const introScreens = intro ? INTRO_SCREENS : 0;
  const travelScreens = introScreens + steps * STEP_SCREENS;
  const introShare = introScreens / travelScreens;

  let current = -1;
  let frame = null;

  const measure = () => {
    frame = null;
    const box = section.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    if (travel <= 0) return;
    const p = Math.min(1, Math.max(0, -box.top / travel));

    if (paintTitle) {
      // The heading holds for a while, then settles over the rest of its share.
      const t = Math.min(1, Math.max(0, (p / introShare - HOLD) / (DONE - HOLD)));
      paintTitle(1 - Math.pow(1 - t, 3));
    }

    // The last step gets the tail of the scroll to itself, so the reader ends
    // the scene looking at the finished picture rather than passing through it.
    const ps = introShare < 1 ? (p - introShare) / (1 - introShare) : 0;
    const i = Math.min(steps - 1, Math.max(0, Math.floor(ps * steps)));
    if (i !== current) {
      current = i;
      onStep(i);
    }
  };
  const schedule = () => { if (frame === null) frame = requestAnimationFrame(measure); };

  const enable = () => {
    section.classList.add('viz-scene');
    if (intro) section.classList.add('viz-intro');
    section.style.setProperty('--scene-screens', (travelScreens + 1).toFixed(2));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    current = -1;
    measure();
  };

  const disable = () => {
    section.classList.remove('viz-scene', 'viz-intro');
    section.style.removeProperty('--scene-screens');
    ['--intro-k', '--intro-dy', '--intro-body'].forEach((v) => section.style.removeProperty(v));
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    current = -1;
    onStep(steps - 1);       // no scene: show the finished state
  };

  const apply = () => (wide.matches ? enable() : disable());
  wide.addEventListener('change', apply);
  apply();

  return {
    sync() {
      current = -1;
      if (wide.matches) measure(); else onStep(steps - 1);
    }
  };
}
