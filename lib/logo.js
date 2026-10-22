// Круглый логотип Вышки — и то, как его кольцо раскрывается, чтобы впустить
// еще два слова.
//
// The ring is rebuilt rather than taken from assets/Logo.svg: in the file the
// words are outlines and cannot move. The circle and the monogram are the real
// ones, copied from it; the ring is set in HSE Sans and laid out around the
// same radius. Everything is in the units of the original viewBox.

const R_BASE = 18.70;              // baseline of the ring text
const CAP = 2.95;                  // cap height of it
const R_ADV = R_BASE + CAP / 2;    // radius the advances are laid out on
const R_DOT = 20.73;               // centre of the separator dots
const DOT_R = 0.81;
const DOT_W = 3.00;                // room a dot takes in the line — dots get air
const WEIGHT = 600;
const ANCHOR = 340.25;             // where the middle of «ШКОЛА» sits in the original

const RING = 'ВЫСШАЯ•ШКОЛА•ЭКОНОМИКИ•';
const ADDED = 'НЕ ТОЛЬКО•';
const CUT = 13;                    // right after «ШКОЛА•»
const OPEN = RING.slice(0, CUT) + ADDED + RING.slice(CUT);
const FRESH = new Set([...ADDED].map((_, i) => CUT + i));

const SVGNS = 'http://www.w3.org/2000/svg';
const CIRCLE = '#102D69';
const MONOGRAM = 'M30.9,22.16c0.88-1.02,1.25-2.26,1.25-3.44c0-0.95-0.26-2.85-1.93-4.16c-1.15-0.89-2.16-1.31-4.59-1.31H24.4 c-0.04,0-0.07,0-0.12,0h-5.06v23.91h14.45v-4.59c0-4.39-1.42-7.34-5.09-8.64C29.73,23.45,30.44,22.72,30.9,22.16z M28.03,21.7 c-0.66,0.82-1.73,1.58-3.25,1.58c-0.01,0-0.02,0-0.03,0v1.19c4.06,0,5.65,2.7,5.65,7.64v3.72h0h-2.61v-7.98h-3.01v7.99h-2.3V14.44 l2.37,0c0.89,0,2.23,0.2,3.18,1.38c0.49,0.6,0.8,1.39,0.9,2.19h-4.15v1.18h4.18C28.93,19.95,28.77,20.8,28.03,21.7z';

const ease = (p) => 1 - Math.pow(1 - p, 3);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const turn = (a) => (a % 360 + 360) % 360;

// Builds the logo inside `host` and gives back a way to move it: place(0) is
// the logo as it is, place(1) the one with «НЕ ТОЛЬКО» in it. The type has to
// be measured, so the font is waited for — until it lands the untouched file
// stands in for the drawing.
export async function mountLogo(host, { label = 'Высшая школа не только экономики' } = {}) {
  host.innerHTML = `
    <svg viewBox="0 0 51.02 51.02" role="img" aria-label="${label}">
      <circle cx="25.51" cy="25.51" r="25.51" fill="${CIRCLE}"/>
      <path fill="#fff" d="${MONOGRAM}"/>
      <g class="logo-ring" data-el="ring" transform="translate(25.51 25.51)"></g>
    </svg>
    <img class="logo-orig" src="assets/Logo.svg" alt="" aria-hidden="true">
  `;
  const ring = host.querySelector('[data-el="ring"]');
  const orig = host.querySelector('.logo-orig');
  const drawn = host.querySelector('svg');

  // ---------- type metrics ----------
  const ctx = document.createElement('canvas').getContext('2d');
  const font = `${WEIGHT} 100px "HSE Sans"`;
  if (document.fonts) await document.fonts.load(font);
  ctx.font = font;
  const SIZE = CAP / (ctx.measureText('Ш').actualBoundingBoxAscent / 100);
  const width = (ch) =>
    ch === '•' ? DOT_W
      : ch === ' ' ? ctx.measureText(' ').width / 100 * SIZE + 0.7
        : ctx.measureText(ch).width / 100 * SIZE;

  // ---------- where every letter sits ----------
  // The ring is a closed loop: every item is followed by one gap, and the
  // tracking is whatever is left of the circumference.
  function layout(seq) {
    const items = [...seq];
    const sum = items.reduce((s, ch) => s + width(ch), 0);
    const track = (2 * Math.PI * R_ADV - sum) / items.length;
    let cursor = 0;
    return items.map((ch) => {
      const a = (cursor + width(ch) / 2) / R_ADV * 180 / Math.PI;
      cursor += width(ch) + track;
      return a;
    });
  }

  // Closed: the middle of «ШКОЛА» where the real logo has it.
  const rawShut = layout(RING);
  const school = RING.indexOf('ШКОЛА');
  const shut = rawShut.map((a) =>
    turn(a + ANCHOR - (rawShut[school] + rawShut[school + 4]) / 2));

  // Open: hung on the item opposite the insertion, so the ring opens up
  // towards the new words instead of swinging round as a whole.
  const rawOpen = layout(OPEN);
  const moved = (i) => (i < CUT ? i : i + ADDED.length);
  let pivot = 0;
  let best = Infinity;
  shut.forEach((a, i) => {
    const d = Math.abs(180 - Math.abs(((a - shut[CUT - 1] + 540) % 360) - 180));
    if (d < best) { best = d; pivot = i; }
  });
  const open = rawOpen.map((a) => turn(a + shut[pivot] - rawOpen[moved(pivot)]));

  // ---------- the letters themselves ----------
  // The new words are the point of the whole thing, so they keep the light
  // blue of the brand book; everything else stays white, dots included.
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--brand-cyan').trim() || '#0FA0D7';

  const nodes = [...OPEN].map((ch, i) => {
    const g = document.createElementNS(SVGNS, 'g');
    const pop = document.createElementNS(SVGNS, 'g');
    if (ch === '•') {
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('r', DOT_R);
      c.setAttribute('fill', '#fff');
      pop.appendChild(c);
    } else if (ch !== ' ') {
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', SIZE);
      t.setAttribute('font-weight', WEIGHT);
      t.setAttribute('font-family', 'HSE Sans');
      t.setAttribute('fill', FRESH.has(i) ? accent : '#fff');
      t.textContent = ch;
      pop.appendChild(t);
    }
    g.appendChild(pop);
    ring.appendChild(g);
    return { ch, g, pop, i, fresh: FRESH.has(i) };
  });

  // Where each item that was there all along starts from.
  const start = [];
  for (let i = 0, k = 0; i < OPEN.length; i++) start.push(FRESH.has(i) ? null : shut[k++]);

  const SEED = CUT - 1;                 // the dot the new words grow out of
  const order = nodes.filter((n) => n.fresh && n.ch !== ' ');

  let last = 0;                         // на каком кадре кольцо стоит сейчас

  function place(p) {
    last = p;
    const seed = start[SEED] + (((open[SEED] - start[SEED] + 540) % 360) - 180) * p;

    for (const n of nodes) {
      // A newcomer rides along with the dot it comes from, then fans out.
      const base = n.fresh ? seed : start[n.i];
      const goal = n.fresh ? open[n.i] - open[SEED] + seed : open[n.i];
      const a = base + (((goal - base + 540) % 360) - 180) * p;
      n.g.setAttribute('transform', `rotate(${a.toFixed(3)})`);

      // ...and they arrive one after another, not all at once.
      const t = n.fresh ? clamp((p - 0.20 - order.indexOf(n) * 0.032) / 0.42) : 1;
      const s = n.fresh ? 0.2 + 0.8 * ease(t) : 1;
      const y = n.ch === '•' ? -R_DOT : -R_BASE;
      const anchor = n.ch === '•' ? 0 : -CAP / 2;
      n.pop.setAttribute('transform',
        `translate(0 ${(y - anchor).toFixed(3)}) scale(${s.toFixed(3)}) translate(0 ${anchor.toFixed(3)})`);
      n.pop.style.opacity = ease(t).toFixed(3);
    }

    // Перерисованное кольцо на волос отличается от печатного, поэтому в покое
    // читатель видит сам файл. Рисунок при этом не просто лежит под ним, а
    // гасится: лежащий под оригиналом, он держался только порядком наложения —
    // а стоит файлу не нарисоваться вовремя, и сквозь него проступал набор.
    // Гасится прозрачностью, а не visibility: имя у логотипа написано на
    // рисунке, и экранный диктор должен читать его в любом из двух состояний.
    const still = p <= 0.001;
    const ready = orig.complete && orig.naturalWidth > 0;
    orig.style.opacity = still ? '1' : '0';
    drawn.style.opacity = still && ready ? '0' : '1';
  }

  place(0);
  // Файл мог еще не дорисоваться к первому кадру — тогда рисунок не гасили, и
  // в покое читатель видел бы его. Как только файл готов, кадр переставляется.
  if (!orig.complete) orig.addEventListener('load', () => place(last), { once: true });
  return { place };
}
