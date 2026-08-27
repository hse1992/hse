// Page-level behaviour shared by every section: the reading progress bar,
// starting a section when the reader gets to it, and sticky scenes.

// Thin bar along the top edge showing how far down the page the reader is.
export function mountProgress() {
  const bar = document.createElement('div');
  bar.className = 'page-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  // The arrow on the opening screen has done its job once the page moves.
  const hint = document.querySelector('.scroll-hint');

  let frame = null;
  const update = () => {
    frame = null;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = `scaleX(${p})`;
    if (hint) hint.classList.toggle('is-gone', window.scrollY > 40);
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

// How much bigger the heading is while it holds as a title card. The lead-in
// screen is laid out against the same number, so the two line up. A section
// can ask for another one — with 1 the card holds at the size it will settle
// at, and the reader sees it move without it changing.
const CARD_K = 1.55;

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
function titleCard(section, zone = INTRO_SCREENS, K = CARD_K) {
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');

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

// A section can open with a lead-in screen — one figure and one line — that
// slides away to the left while the title card comes in from the right. These
// are how much scrolling it holds for and how long the swap itself takes.
const LEAD_SCREENS = 1;
const LEAD_HOLD = 0.55;

// The lead-in can arrive in parts, the same way the title card does: what is
// marked `.intro-stage` inside it waits its turn and then grows into place
// while the screen still holds. Each part buys the screen this much more
// scrolling, and takes this share of it to appear.
const LEAD_STAGE_SCREENS = 0.7;
const LEAD_STAGE_AT = 0.3;
const LEAD_STAGE_SPAN = 0.35;

// Drives that swap. Returns how many screens the lead-in holds for and the
// painter itself; `q` is how far the card has scrolled, in screens.
function leadCard(section, K = CARD_K) {
  const lead = section.querySelector('.viz-lead');
  if (!lead) return null;
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');

  // Where it goes when its turn is over: aside, making way for the title card,
  // or up to the top of the section, where it stays and reads as the heading.
  const parks = lead.dataset.exit === 'top';

  // Squeezed shut until their turn — see stageCards for why by height.
  const parts = [...lead.querySelectorAll('.intro-stage')];
  parts.forEach((el) => { el.style.overflow = 'hidden'; });
  const screens = LEAD_SCREENS + parts.length * LEAD_STAGE_SCREENS;
  const hold = LEAD_HOLD + parts.length * LEAD_STAGE_SCREENS;

  const paint = (q, narrow) => {
    // Sit exactly where the title card will: same top edge, so the swap is a
    // move sideways and nothing hops up or down. On a narrow screen the lead-in
    // is fixed to the middle of the window instead, so it needs no top — but it
    // has to keep out of sight until the section itself arrives.
    const cardTop = container.clientHeight / 2 - (header.offsetHeight * K) / 2;
    lead.style.top = narrow ? '' : `${Math.round(cardTop)}px`;
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
      el.style.opacity = grown.toFixed(3);
      el.style.height = grown < 1 ? `${(el.scrollHeight * grown).toFixed(1)}px` : '';
    });

    const t = clamp((q - hold) / (screens - hold));
    const e = 1 - Math.pow(1 - t, 3);

    // Parking only works where the whole section is pinned: the screen goes up
    // to the top of the container and stays there, at its own size, while the
    // block comes up underneath it — so the block starts below it, and the
    // heading of the section keeps waiting off to the right. On a narrow
    // screen nothing is pinned as a whole, so the usual swap happens instead.
    if (parks && !narrow) {
      const pad = parseFloat(getComputedStyle(container).paddingTop);
      lead.style.setProperty('--lead-x', '0px');
      lead.style.setProperty('--lead-y', `${(-e * (cardTop - pad)).toFixed(1)}px`);
      lead.style.opacity = '';
      section.style.setProperty('--card-x', '108vw');
      section.style.setProperty('--lead-hold',
        `${Math.max(0, Math.round(lead.offsetHeight - header.offsetHeight))}px`);
      return;
    }

    lead.style.setProperty('--lead-y', '0px');
    lead.style.setProperty('--lead-x', `${(-e * 108).toFixed(2)}vw`);
    lead.style.opacity = (1 - clamp(t * 1.6)).toFixed(3);
    // The heading waits off to the right until its turn.
    section.style.setProperty('--card-x', `${((1 - e) * 108).toFixed(2)}vw`);
  };

  return { screens, paint };
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
// that is whole from the start. A section with a lead-in screen in its meta
// opens with that instead, exactly as a scene does.
export function mountIntro(section, stages = 1, scale = CARD_K) {
  const lead = leadCard(section, scale);
  const swapLead = lead && lead.paint;
  const leadScreens = lead ? lead.screens : 0;
  const zone = leadScreens + INTRO_SCREENS + (stages - 1) * STAGE_SCREENS;
  const paint = titleCard(section, zone, scale);
  const reveal = stages > 1 ? stageCards(section) : null;
  const wide = window.matchMedia('(min-width: 861px)');
  let frame = null;

  const measure = () => {
    frame = null;
    const narrow = !wide.matches;
    const raw = introProgress(section, narrow, zone);
    if (raw === null) return;
    // The lead-in goes first, then the stages, and the card settles over the
    // last screens of the zone; the blocks grow before the card is measured,
    // so it stays centred.
    const q = raw * zone;
    if (swapLead) swapLead(q, narrow);
    if (reveal) reveal(q - leadScreens);
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
// `stages` works the same as in mountIntro: the card comes in that many parts
// before it settles and the steps begin.
export function mountScene(section, steps, onStep, { intro = false, stages = 1, scale = CARD_K } = {}) {
  const wide = window.matchMedia('(min-width: 861px)');
  const STEP_SCREENS = 0.8;              // how much scrolling one step takes
  const lead = intro ? leadCard(section, scale) : null;
  const swapLead = lead && lead.paint;
  const leadScreens = lead ? lead.screens : 0;
  const introScreens = intro
    ? leadScreens + INTRO_SCREENS + (stages - 1) * STAGE_SCREENS
    : 0;
  const paintTitle = intro ? titleCard(section, introScreens, scale) : null;
  const reveal = intro && stages > 1 ? stageCards(section) : null;
  const travelScreens = introScreens + steps * STEP_SCREENS;
  const introShare = introScreens / travelScreens;

  // How far the card has got, in screens, from the share of the whole travel.
  const cardScreens = (p) => (p / introShare) * introScreens;
  const settleOf = (q) => settleCurve((q - (introScreens - INTRO_SCREENS)) / INTRO_SCREENS);

  let current = -1;
  let frame = null;

  const measure = () => {
    frame = null;

    // Narrow: no steps — but the title card still plays, pinned by itself.
    if (!wide.matches) {
      if (paintTitle) {
        const raw = introProgress(section, true, introScreens);
        if (raw === null) return;
        const q = raw * introScreens;
        if (swapLead) swapLead(q, true);
        if (reveal) reveal(q - leadScreens);
        paintTitle(settleOf(q), true);
      }
      return;
    }

    const box = section.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    if (travel <= 0) return;
    const p = Math.min(1, Math.max(0, -box.top / travel));

    if (paintTitle) {
      // The parts come first, then the card settles over the last screens of
      // its share; the parts grow before the card is measured, so it stays
      // centred while it fills in.
      const q = cardScreens(p);
      if (swapLead) swapLead(q, false);
      if (reveal) reveal(q - leadScreens);
      paintTitle(settleOf(q), false);
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
    section.style.setProperty('--intro-zone', introScreens.toFixed(2));
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
