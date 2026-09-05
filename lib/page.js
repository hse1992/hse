// Page-level behaviour shared by every section: the reading progress bar,
// starting a section when the reader gets to it, and sticky scenes.

// Thin bar along the top edge showing how far down the page the reader is.
export function mountProgress() {
  const bar = document.createElement('div');
  bar.className = 'page-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  // The arrow on the opening screen has done its job once the story moves.
  const hint = document.querySelector('.scroll-hint');

  const set = (p) => {
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    if (hint) hint.classList.toggle('is-gone', p > 0.001);
  };

  set(0);
  return { set };
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
function titleCard(section, zone = INTRO_SCREENS, K = CARD_K, fullHeight = null) {
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');

  return (p, narrow) => {
    const k = K - (K - 1) * p;
    // Measured with every part of the card open: parts arrive one after
    // another, and centring on the height of the moment would nudge the
    // heading down each time one of them does.
    const h = (fullHeight ? fullHeight(k) : header.offsetHeight) * k;
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
function leadCard(section, K = CARD_K) {
  const lead = section.querySelector('.viz-lead');
  if (!lead) return null;
  const container = section.querySelector('.viz-container');
  const header = section.querySelector('.viz-header');

  // Where it goes when its turn is over: aside, making way for the title card,
  // or up to the top of the section, where it stays and reads as the heading.
  const parks = lead.dataset.exit === 'top';

  // A screen of one line starts where the heading of the title card will be,
  // so the swap is a move sideways and nothing hops. One that grows part by
  // part can ask to stay in the middle instead: it then rises as its parts
  // arrive, and each of them is read in the centre of the screen.
  const centres = lead.dataset.fit === 'center';

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
    if (!narrow && !centres) lead.style.top = `${Math.round(cardTop)}px`;
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
      el.style.opacity = grown.toFixed(3);
      el.style.height = grown < 1 ? `${(el.scrollHeight * grown).toFixed(1)}px` : '';
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

  return { screens, hold, parts: parts.length, paint };
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
function stageCards(section) {
  const blocks = [...section.querySelectorAll('.intro-stage')];
  blocks.forEach((el) => { el.style.overflow = 'hidden'; });

  // `q` is how far the card has scrolled, counted in screens. A part takes a
  // beat to arrive, and the next one starts where it finished.
  return (q) => blocks.forEach((el) => {
    const k = Number(el.dataset.stage) || 1;
    const v = clamp((q - (k - 1) * STAGE_SCREENS) / STAGE_SCREENS);
    const e = 1 - Math.pow(1 - v, 3);
    el.style.opacity = e.toFixed(3);
    el.style.height = e < 1 ? `${(el.scrollHeight * e).toFixed(1)}px` : '';
  });
}

// Whether the reader has asked for less movement: then a section shows its
// finished state and nothing plays at all.
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

// Builds the opening of a section — the lead-in screen, the parts of the card
// and the card settling into place — as one function of progress 0..1, plus
// how many beats it is worth.
export function introRunner(section, stages = 1, scale = CARD_K) {
  const lead = leadCard(section, scale);
  const leadScreens = lead ? lead.screens : 0;
  const zone = leadScreens + INTRO_SCREENS + (stages - 1) * STAGE_SCREENS;
  const header = section.querySelector('.viz-header');

  let drawn = null;
  const draw = (q) => {
    drawn = q;
    if (lead) lead.paint(q, false);
    if (reveal) reveal(q - leadScreens);
    paint(settleCurve((q - (zone - INTRO_SCREENS)) / INTRO_SCREENS), false);
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

    section.style.setProperty('--intro-k', String(scale));
    tallOpen = header.offsetHeight;
    section.style.setProperty('--intro-k', '1');
    tallSettled = header.offsetHeight;

    parts.forEach((el, i) => { [el.style.height, el.style.opacity] = keptParts[i]; });
    if (keptK) section.style.setProperty('--intro-k', keptK);
    else section.style.removeProperty('--intro-k');

    // Restoring the inline styles is not enough: before the first frame there
    // were none, and «no inline height» means fully open. Redraw the frame the
    // opening was on, so a part cannot flash into view.
    if (drawn !== null) draw(drawn);
  };
  measure();
  window.addEventListener('resize', measure);
  // A heading can carry pictures — a station board, a scarf — and they arrive
  // after the shell has drawn it. Anything that changes its height means the
  // measurement has to be taken again.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  header.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', measure, { once: true });
  });

  const heightAt = (k) => {
    if (!tallOpen) return header.offsetHeight;
    if (scale === 1) return tallSettled;
    return tallSettled + (tallOpen - tallSettled) * ((k - 1) / (scale - 1));
  };

  const paint = titleCard(section, zone, scale, heightAt);
  const reveal = stages > 1 ? stageCards(section) : null;

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
    beats.push([lead.hold, leadScreens]);            // sliding aside
  }
  for (let k = 1; k < stages; k++) {
    beats.push([leadScreens + (k - 1) * STAGE_SCREENS, leadScreens + k * STAGE_SCREENS]);
  }
  beats.push([zone - INTRO_SCREENS * (1 - HOLD), zone]);   // the card settling



  return {
    beats,
    zone,
    // Whoever plays this calls it before a beat: by then the pictures have
    // loaded and the card knows its real height.
    remeasure: measure,
    // p from 0 to 1 across the whole opening — used to put it in its opening
    // or finished state in one go.
    run(p) { draw(p * zone); },
    // One stretch of it, p from 0 to 1 within that stretch.
    runBeat(i, p) {
      const [from, to] = beats[i];
      draw(from + (to - from) * p);
    }
  };
}
