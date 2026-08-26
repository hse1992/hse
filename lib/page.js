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
function titleCard(section, zone = INTRO_SCREENS) {
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');
  const K = 1.55;            // how much bigger the heading starts out

  return (p, narrow) => {
    const k = K - (K - 1) * p;
    const h = header.offsetHeight * k;
    // Where the heading ends up differs between the two layouts: on a wide
    // screen the whole container is pinned and the heading settles at its top;
    // on a narrow one the heading is pinned by itself to the top of the screen.
    const centred = narrow
      ? window.innerHeight / 2 - h / 2
      : container.clientHeight / 2
        - (parseFloat(getComputedStyle(container).paddingTop) + h / 2);

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

// How long the title card holds before it starts moving, and how long the whole
// intro phase lasts — long enough that a reader scrolling steadily still has
// time to read the heading before it leaves. A card that arrives in stages gets
// one more screen-and-a-bit for each of them, ahead of all this.
const INTRO_SCREENS = 1.35;
const STAGE_SCREENS = 0.8;
const HOLD = 0.35;
const DONE = 0.88;

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
function stageCards(section) {
  const blocks = [...section.querySelectorAll('.intro-stage')];
  blocks.forEach((el) => { el.style.overflow = 'hidden'; });

  // `q` is how far the card has scrolled, counted in screens.
  return (q) => blocks.forEach((el) => {
    const k = Number(el.dataset.stage) || 1;
    const v = clamp((q - (k - 0.55) * STAGE_SCREENS) / (0.45 * STAGE_SCREENS));
    const e = 1 - Math.pow(1 - v, 3);
    el.style.opacity = e.toFixed(3);
    el.style.height = e < 1 ? `${(el.scrollHeight * e).toFixed(1)}px` : '';
  });
}

// `stages` is how many parts the card comes in — 1, the default, is a card
// that is whole from the start.
export function mountIntro(section, stages = 1) {
  const zone = INTRO_SCREENS + (stages - 1) * STAGE_SCREENS;
  const paint = titleCard(section, zone);
  const reveal = stages > 1 ? stageCards(section) : null;
  const wide = window.matchMedia('(min-width: 861px)');
  let frame = null;

  const measure = () => {
    frame = null;
    const narrow = !wide.matches;
    const raw = introProgress(section, narrow, zone);
    if (raw === null) return;
    // The stages come first and the card settles over the last screens of the
    // zone; the blocks grow before the card is measured, so it stays centred.
    const q = raw * zone;
    if (reveal) reveal(q);
    paint(settleCurve((q - (zone - INTRO_SCREENS)) / INTRO_SCREENS), narrow);
  };

  const schedule = () => { if (frame === null) frame = requestAnimationFrame(measure); };

  section.classList.add('viz-intro');
  section.style.setProperty('--intro-screens', (zone + 1).toFixed(2));
  section.style.setProperty('--intro-zone', zone.toFixed(2));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  wide.addEventListener('change', measure);
  measure();

  return { sync: measure };
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

    // Narrow: no steps — but the title card still plays, pinned by itself.
    if (!wide.matches) {
      if (paintTitle) {
        const raw = introProgress(section, true);
        if (raw !== null) paintTitle(settleCurve(raw), true);
      }
      return;
    }

    const box = section.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    if (travel <= 0) return;
    const p = Math.min(1, Math.max(0, -box.top / travel));

    if (paintTitle) {
      // The heading holds for a while, then settles over the rest of its share.
      paintTitle(settleCurve(p / introShare), false);
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

  if (intro) {
    section.classList.add('viz-intro');
    section.style.setProperty('--intro-zone', INTRO_SCREENS.toFixed(2));
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  const apply = () => {
    current = -1;
    if (wide.matches) {
      section.classList.add('viz-scene');
      section.style.setProperty('--scene-screens', (travelScreens + 1).toFixed(2));
      measure();
    } else {
      section.classList.remove('viz-scene');
      section.style.removeProperty('--scene-screens');
      onStep(steps - 1);     // no steps on a narrow screen: the finished state
      measure();             // the title card still plays
    }
  };
  wide.addEventListener('change', apply);
  apply();

  return { sync: apply };
}
