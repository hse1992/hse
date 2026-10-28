// Page-level behaviour shared by every section: the reading progress bar,
// starting a section when the reader gets to it, and sticky scenes.

// Which way the page is read. The lead-in screen is placed differently in
// each, and the bar at the top is eight targets in one and a single one in
// the other — both have to know.
const NARROW = window.matchMedia('(max-width: 860px)');

// Насколько секция может не доехать до верха окна и все еще считаться
// пришедшей. То, что прибито к окну, — переходный экран и картинка под ним —
// видно, только пока видна его секция; раньше это спрашивалось с точностью до
// пикселя, и на айфоне такта не хватало.
//
// Прокрутка там дробная: у секции и в спокойном состоянии верх стоит на 0,35
// пикселя ниже окна, а ход, доехав, попадает в эту долю как придется.
// Промахнулся на пиксель вниз — и экран пропадал целиком: такт кончался
// пустотой, каркас доигрывал его сам (видно() в lib/stepper.js), и читатель
// получал заголовок открытия вместе с первой его частью — «Все эти здания
// нужны…» и 127 квадратов бакалавриата приходили одним движением.
//
// Столько же, сколько ОСТАТОК в lib/stepper.js: то, что разошлось меньше чем
// на это, страница считает одним и тем же местом.
export const ДОПУСК = 24;

// Thin bar along the top edge showing how far down the page the reader is —
// divided into the blocks of the story, one slot each, so it also says how many
// of them there are and which one is being read.
// It is also the way back: a click on a slot goes to that block. Reading is
// slow on purpose — a beat at a time — and without this, coming back from the
// end of the story means playing the whole of it backwards.
//
// `titles` name the blocks, in order; `pick` is handed the stepper's jump once
// there is one.
export function mountProgress(titles = [], shorts = []) {
  const bar = document.createElement('nav');
  bar.className = 'page-progress';
  bar.setAttribute('aria-label', 'Разделы');
  // First in the document, not last. It is fixed to the top of the window and
  // reads as the navigation of the page, but Tab follows the document — and
  // appended at the end it came after every control of the block and the
  // credits, so a reader on the keyboard had to walk the whole screen to reach
  // the way out of it.
  document.body.insertBefore(bar, document.body.firstChild);

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
    sheetFor(count);
  };

  // The same places, written out — for a thumb.
  //
  // The bar is a hairline four pixels tall, and a slot of it is forty-three by
  // four: a mouse hits that, a finger does not, and the names it shows live on
  // hovering, which a phone has none of. So on a phone the bar stops being
  // eight targets and becomes one: touching it anywhere opens the list of
  // sections, and the names are read rather than aimed at. The hairline itself
  // stays a hairline — what grows is the invisible strip that answers the
  // touch, see the styles.
  let sheet = null;
  const sheetFor = (count) => {
    if (sheet) sheet.remove();
    sheet = document.createElement('div');
    sheet.className = 'page-sheet';
    sheet.hidden = true;

    const veil = document.createElement('button');
    veil.type = 'button';
    veil.className = 'page-sheet-veil';
    veil.setAttribute('aria-label', 'Закрыть список разделов');
    veil.addEventListener('click', () => shut());
    sheet.appendChild(veil);

    const list = document.createElement('nav');
    list.className = 'page-sheet-list';
    list.setAttribute('aria-label', 'Разделы');
    const row = (text, go, extra) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = extra ? `page-sheet-row ${extra}` : 'page-sheet-row';
      b.textContent = text;
      b.addEventListener('click', () => { shut(); go(); });
      list.appendChild(b);
      return b;
    };
    row('В начало', () => goHome && goHome(), 'page-sheet-home');
    for (let i = 0; i < count; i++) {
      // Короткое имя раздела — его единственное место на телефоне с тех пор,
      // как полоска с названием в углу экрана убрана: см. meta.short.
      // Заголовки у блоков в шестьдесят символов, и список из них читается
      // хуже, чем список из двух слов.
      const b = row(shorts[i] || names[i] || `Раздел ${i + 1}`, () => jump && jump(i));
      b.dataset.at = String(i);
    }
    sheet.appendChild(list);
    document.body.appendChild(sheet);
  };

  const shut = () => {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    bar.setAttribute('aria-expanded', 'false');
    bar.focus({ preventScroll: true });
  };
  const open = () => {
    if (!sheet) return;
    sheet.hidden = false;
    bar.setAttribute('aria-expanded', 'true');
    const here = sheet.querySelector('.page-sheet-row[aria-current]') || sheet.querySelector('.page-sheet-row');
    if (here) here.focus({ preventScroll: true });
  };

  // Only where the bar is not eight targets of its own — see the styles, which
  // give it back its clicks on a narrow screen and take them away on a wide one.
  bar.addEventListener('click', (e) => {
    if (!NARROW.matches) return;       // on a wide screen the slots are the navigation
    if (e.target !== bar) return;      // a slot of its own was hit, not the strip
    if (sheet && sheet.hidden) open(); else shut();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });

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
        // The same place in the list the bar opens on a phone.
        const row = sheet && sheet.querySelector(`.page-sheet-row[data-at="${i}"]`);
        if (row) {
          if (i === place.index) row.setAttribute('aria-current', 'true');
          else row.removeAttribute('aria-current');
          // And how much of the page is behind: the bar says it in a line four
          // pixels high, which on a phone is next to nothing. In the list the
          // blocks already read are marked, so «3 из 8» has something to look
          // at next to it.
          row.classList.toggle('is-read', i < place.index);
        }
      });

      // «Третий из семи» — the one thing the bar cannot say by itself.
      //
      // На телефоне этой полоски нет вовсе. Она приходила с каждым движением
      // пальца и вставала поверх картинки в верхнем углу — а там у блока самое
      // важное: счет на стадионе, строка истории, первые цифры доски. Какой
      // это раздел, читатель и так знает — он только что его открыл, — а если
      // забыл, полоска сверху открывается касанием и называет все восемь.
      const phone = NARROW.matches;
      const fresh = place.index !== told;
      told = place.index;
      if (phone) {
        counter.classList.remove('is-here');
        if (fresh) {
          said.textContent = place.index >= 0
            ? `Раздел ${place.index + 1} из ${place.count}. ${names[place.index] || ''}`
            : 'Титульный экран';
        }
      } else if (place.index >= 0 && fresh) {
        const says = `${place.index + 1} из ${place.count}`;
        if (counter.textContent !== says) counter.textContent = says;
        counter.classList.add('is-here');
        clearTimeout(counting);
        counting = setTimeout(() => counter.classList.remove('is-here'), COUNT_MS);
        said.textContent = `Раздел ${place.index + 1} из ${place.count}. ${names[place.index] || ''}`;
      } else if (fresh && place.index < 0) {
        clearTimeout(counting);
        counter.classList.remove('is-here');
        said.textContent = 'Титульный экран';
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
    // Блок, который читается кадрами, держит страницу прибитым телом, и
    // прокрутка в этот момент обнулена. Ноль тут значит не «читатель на
    // обложке», а «страница в руках у блока» — и подсказка выходила посреди
    // стадиона, закрывая собой арену.
    const held = document.documentElement.classList.contains('is-holding');
    const cover = !held && p <= 0.001;
    // На телефоне подсказка живет только на титульном экране: там она и нужна,
    // один раз сказать, чем листают. Дальше читатель уже листает сам, а она
    // стоит у нижнего края и закрывает собой то, чем блок кончается, — кнопки,
    // последний город, подпись под картинкой. На широком экране она
    // по-прежнему возвращается всюду, где читатель замешкался: там внизу
    // пусто, полоса --hint-room ее и ждет.
    if (ended || (NARROW.matches && !cover)) return;
    timer = setTimeout(prompt, cover ? FIRST_MS : IDLE_MS);
  };

  set(0);
  return {
    set,
    pick: (fn, back) => { jump = fn; goHome = back; }
  };
}

// Сколько окна видно сейчас — померенное руками, а не через dvh. На айфоне
// страница открывается с полной панелью Safari, а на первом же движении панель
// сворачивается, и окно вырастает примерно на сотню пикселей. dvh на это не
// отвечает: единица остается такой, какой была на загрузке. Титульный экран
// ростом в 100dvh оказывался ниже окна, и снизу из-под него выглядывал
// следующий раздел — заголовок и начало картинки. innerHeight меняется честно,
// и про каждое такое изменение браузер говорит событием resize.
export function mountWindowSize() {
  const set = () => {
    // Из двух мерок берется большая. Одна — высота документа, другая — высота
    // видимого куска; на разных телефонах за уехавшую панель отвечает то одна,
    // то другая, а меньшая из них врет только в одну сторону — в ту, из-за
    // которой обложка и не дорастала до экрана. Сведенные пальцы (там видимое
    // окно меньше) обложку при этом не ужимают.
    const seen = window.visualViewport ? window.visualViewport.height : 0;
    const tall = Math.max(window.innerHeight, seen);
    document.documentElement.style.setProperty('--win', `${Math.round(tall)}px`);
  };
  set();
  window.addEventListener('resize', set);
  window.addEventListener('orientationchange', set);
  // Панель, уезжающая на ходу, — это ровно оно: видимая часть окна меняется,
  // а размер самого документа нет.
  if (window.visualViewport) window.visualViewport.addEventListener('resize', set);
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
// Воздух над карточкой и под ней на телефоне: меньше этого — и она читается
// как упертая в края экрана, а не как карточка посреди него.
const CARD_AIR = 56;
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
    //
    // На телефоне — наоборот, по тому, что на карточке сейчас. Места под
    // неприехавшие части подзаголовок там больше не держит (см. --sub-h
    // в layout.css), и мерка наперед означала бы ровно то, от чего эта
    // правка: карточка метро считалась в полный экран, центрировать ее было
    // нечем, и заголовок с единственной строкой под ним стоял у верхнего
    // края, а под ним была треть экрана пустоты. Считанная живьем, карточка
    // растет от середины — каждая новая строка раздвигает ее в обе стороны.
    const h = (narrow || !fullHeight ? header.offsetHeight : fullHeight(k)) * k;
    // Where the heading ends up differs between the two layouts: on a wide
    // screen the whole container is pinned and the heading settles at its top;
    // on a narrow one the heading is pinned by itself to the top of the screen.
    // Выше своего раздела карточка не поднимается. Центр экрана — это место
    // для карточки, которая в экран помещается; та, что выше его, при том же
    // счете получала отрицательный сдвиг и вылезала над секцией — на телефоне
    // с развернутой панелью браузера край карточки метро торчал снизу в
    // титульный экран. Раздел начинается там, где начинается, и его открытие
    // тоже.
    const centred = narrow
      ? Math.max(0, window.innerHeight / 2 - h / 2)
      : container.clientHeight / 2 - (padding() + h / 2);

    section.style.setProperty('--intro-k', k.toFixed(4));
    // Кегль, в котором карточка держит экран. Переходный экран набран как
    // заголовок карточки, которая придет ему на смену, и садится вместе с
    // ней — за --intro-k. Но экрану, который паркуется, идти за ним некуда:
    // карточки у него не будет, он сам и есть заголовок блока. Такой экран
    // держится за этот кегль — тот, в котором его прочитали.
    section.style.setProperty('--intro-k-big', big.toFixed(4));
    section.style.setProperty('--intro-dy', `${(centred * (1 - p)).toFixed(1)}px`);
    section.style.setProperty('--intro-body', p.toFixed(3));

    // The zone the pinned heading lives in is one heading taller than the
    // intro itself: it settles at the top of the screen and waits there while
    // the block comes up to meet it.
    // Высота эта — севшая, а не та, что у шапки прямо сейчас: пока карточка
    // держит экран, шапка стоит в 1/k ширины, переносится чаще и выше себя
    // настоящей раза в три. Считая по ней, зона парковки сжималась с каждым
    // кадром посадки, и блок под ней ехал вверх вместе с ней — такт, который
    // вел к верху блока, промахивался мимо на две с лишним сотни пикселей.
    if (narrow) {
      const settled = fullHeight ? fullHeight(1) : header.offsetHeight;
      const hold = window.innerHeight * zone * ZONE_NARROW + settled;
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

// Air left above and below a lead-in screen on a phone, where it is fixed to
// the window and has nothing else to stand off from.
const LEAD_AIR = 20;
// Припаркованному экрану на телефоне воздуха нужно побольше: в правом верхнем
// углу стоит полоска «4 из 8 — Здания», и заголовок, поднятый вплотную к краю,
// уезжает под нее.
const LEAD_AIR_PARKED = 34;

// How much of that scrolling a phone asks for. On a wide screen every part of
// the opening is a beat — one movement of the wheel each — and the same count
// on a phone turned into a screen of thumb for every one of them: the screen
// with the question held still for two full screens, and the opening of the
// studies block alone was seven. The opening plays the same, it is simply
// asked for in half the distance.
// Measured again once the page was walked screen by screen: at a half the
// openings still held the same picture for two half-screens of thumb in a row —
// five places on the page where a whole screen of scrolling brought nothing
// new. At 0,38 each part of an opening costs about two thirds of a screen,
// which is a flick, and the openings keep every part they had.
const ZONE_NARROW = 0.38;

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
  // How tall the screen stands, once squeezed — measured in fitHeight.
  let span = 0;
  // A block whose lead-in parks reads that screen as its heading, and its own
  // heading never comes in — on a wide screen the card simply waits off to the
  // right for ever. The styles need to know on a phone, where the card has a
  // screen of travel held for it that nothing would ever use.
  if (parks) section.classList.add('lead-parks');
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
    // Мерить нужно в несжатой коробке — в той, что уже никогда. Сжатый экран
    // каркас расширяет ровно на свою долю (--lead-squeeze в layout.css) и
    // возвращает назад масштабом, так что коробка у него шире окна: на
    // телефоне бывает и 580 точек при экране в 393. Померенная там, строка
    // почти влезает — и каркас запрещает ей переноситься. А следом идет
    // fitHeight: строка в одну вместо двух ниже, сжимать стало нечего, доля
    // возвращается в единицу — и коробка схлопывается до 361. Заголовок
    // «На стадионе 63 000+ студентов» при этом уезжал за правый край экрана.
    //
    // Доля всегда не больше единицы, то есть коробка от нее только шире.
    // Значит, строка, влезшая в несжатую, влезет в любую — а запас,
    // который сжатие могло бы дать, не стоит заголовка за краем.
    // Единицу ставим без возврата: fitHeight идет следом и начинает ровно
    // с нее, пересчитывая долю заново.
    section.style.setProperty('--lead-squeeze', '1');
    // И в том кегле, в котором экран встанет. Набран он от --intro-k (а если
    // паркуется — от --intro-k-big), и оба к этому моменту держат что
    // попало: --intro-k только что перебирала cardScale(), подбирая размер
    // карточки, а --intro-k-big остался с последнего нарисованного кадра.
    // Померенная в кегле 1,05 строка влезала в одну, ей запрещали
    // переноситься — а вставал экран в 1,55, и та же строка оказывалась в
    // полтора раза длиннее экрана. Карточка к этому моменту уже знает свой
    // размер (см. measure() в introRunner, fit() зовут сразу за cardScale),
    // и K() — это он и есть; дальше кегль только уменьшается, садясь в
    // единицу, так что мерка идет по самому широкому состоянию строки.
    // На широком экране у припаркованного экрана кегль записан числом
    // (1,55 в layout.css) — карточки у него нет, и следовать ему не за чем.
    const kAt = parks && !NARROW.matches ? CARD_K : K();
    const keptK = section.style.getPropertyValue('--intro-k');
    const keptBig = section.style.getPropertyValue('--intro-k-big');
    section.style.setProperty('--intro-k', String(kAt));
    section.style.setProperty('--intro-k-big', String(kAt));
    lead.dataset.line = 'one';                 // measured as it would be set
    const room = lead.clientWidth;
    const line = value.scrollWidth;
    const back = () => {
      if (keptK) section.style.setProperty('--intro-k', keptK);
      else section.style.removeProperty('--intro-k');
      if (keptBig) section.style.setProperty('--intro-k-big', keptBig);
      else section.style.removeProperty('--intro-k-big');
    };
    if (!room || !line) { back(); return; }
    if (line > room * NEARLY) {
      delete lead.dataset.line;                // a sentence: let it wrap
    } else if (line > room) {
      section.style.setProperty('--lead-fit', (room / line - 0.004).toFixed(4));
    }
    back();
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
    // И на весь свой рост: у экрана, который паркуется, часть строк может
    // складываться по дороге наверх (заголовок «Зданий» следует за
    // --lead-away). Померенный на полпути, он выходит низким, сжимать его
    // нечего — а вернувшись назад, читатель видит его обрезанным по краям
    // окна. Так же, как раскрываются части: мерить нужно то состояние,
    // в котором экран должен поместиться.
    const keptAway = section.style.getPropertyValue('--lead-away');
    section.style.setProperty('--lead-away', '0');
    // И со всеми частями, которые уже пришли. Раскрыть коробки мало: часть
    // может не только появляться, но и двигать соседей по своему
    // --lead-stage-N — у «Годов учебы» ответ поднимается наверх, уступая место
    // карточке года под ним. Такой экран выше всего на последнем такте, а
    // померенный на первом он сжимается меньше, чем нужно, и вылезает за край
    // окна по дороге: заголовок срезает сверху, шкалу снизу.
    const keptStages = [];
    for (let k = 1; k <= stages; k += 1) {
      keptStages.push(section.style.getPropertyValue(`--lead-stage-${k}`));
      section.style.setProperty(`--lead-stage-${k}`, '1');
    }
    section.style.setProperty('--lead-squeeze', '1');
    // How tall the screen really is, and what it has to fit into.
    //
    // On a wide screen the box of the screen is the screen, and it stands in
    // the pinned container. On a phone the box is the window — the styles give
    // it the height of one — so its own height says nothing, and the room is
    // the window itself: what can overflow there is the content inside the box,
    // above the top edge and below the bottom one. Measuring the box against
    // the container was wrong twice over: it asked the screen to fit a section
    // seven thousand pixels tall, so nothing was ever squeezed and the tallest
    // screen on the page was cut off at both ends, head and question alike.
    const spread = () => {
      const kids = [...lead.children].map((el) => el.getBoundingClientRect());
      return NARROW.matches && kids.length
        ? Math.max(...kids.map((r) => r.bottom)) - Math.min(...kids.map((r) => r.top))
        : lead.offsetHeight;
    };
    const full = spread();
    const room = NARROW.matches
      ? window.innerHeight - LEAD_AIR * 2
      : container.clientHeight;
    let k = full > room && room > 0 ? room / full : 1;
    // Сжатие забирает у экрана не только высоту, но и ширину: он уезжал в
    // узкий столбик посреди экрана. Поэтому на телефоне коробке выдается
    // запас ровно на эту долю (см. --lead-squeeze в layout.css), и после
    // сжатия она занимает ширину целиком. Но в широкой коробке строки
    // переносятся реже, и экран выходит ниже — значит, и сжимать его нужно
    // меньше. Отсюда вторая мерка: первая узнает долю, вторая меряет уже в
    // той ширине, которую эта доля дает.
    if (NARROW.matches && k < 1) {
      section.style.setProperty('--lead-squeeze', k.toFixed(4));
      const shown = spread();                  // уже сжатая высота
      if (shown > 0) k = Math.min(1, Math.max(k, (room * k) / shown));
      // И третья, проверочная. Вторая мерка отпускает долю, считая, что
      // высота идет за ней ровно; на деле в коробке пошире строки ложатся
      // иначе, и экран выходил выше комнаты — у «Годов учебы» на три десятка
      // пикселей, прямо в край окна. Если не влез — долю возвращаем назад.
      section.style.setProperty('--lead-squeeze', k.toFixed(4));
      const again = spread();
      if (again > room && again > 0) k *= room / again;
    }
    parts.forEach((el, i) => { [el.style.height, el.style.opacity] = kept[i]; });
    if (keptAway) section.style.setProperty('--lead-away', keptAway);
    else section.style.removeProperty('--lead-away');
    keptStages.forEach((was, i) => {
      if (was) section.style.setProperty(`--lead-stage-${i + 1}`, was);
      else section.style.removeProperty(`--lead-stage-${i + 1}`);
    });
    section.style.setProperty('--lead-squeeze', k.toFixed(4));
    // How tall the screen stands after all that, for parking it on a phone:
    // there it is fixed to the middle of the window, and going up to the top
    // edge means going up by half of what is left over. Taken here rather than
    // measured again on every frame, where the measurement would be reading
    // back the very move it is about to make.
    span = full * k;
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
    // Fixed to the window, it is on the screen whatever the page does — so it
    // is hidden whenever its own section is not: below the reader, where its
    // turn has not come, and above them, where a screen left half faded would
    // otherwise hang over every block that follows.
    const own = section.getBoundingClientRect();
    lead.style.visibility = narrow && (own.top > ДОПУСК || own.bottom < ДОПУСК)
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

    // The same parking on a phone. There the screen is pinned to the window
    // rather than to the section, so it goes up to the top edge of the window
    // and stays there — and the block comes up underneath it, which is the
    // whole point of parking: «Но есть 196 зданий. А это уже целый город» and
    // the town those buildings make belong on one screen. Sliding it aside
    // instead, as every other screen is slid aside, left the phrase gone a
    // screen before the picture it was about arrived.
    if (parks) {
      // Высота берется живая, а не та, что осталась от последней мерки.
      // Размах детей от сдвига не зависит — экран двигается целиком, — а вот
      // мерка могла случиться, когда строки ложились иначе: у «Зданий»
      // припаркованный экран резервировал под себя 308 пикселей при
      // собственных 182, и треть экрана над городом стояла пустой.
      const kids = [...lead.children].map((el) => el.getBoundingClientRect());
      const tall = kids.length
        ? Math.max(...kids.map((r) => r.bottom)) - Math.min(...kids.map((r) => r.top))
        : span;
      const up = Math.max(0, (window.innerHeight - tall) / 2 - LEAD_AIR_PARKED);
      // Экран, под которым лежит картинка из прошлого блока, стоит наверху с
      // самого начала, а не съезжает туда по дороге: иначе строки держат
      // середину окна, а арене достается полоса у нижнего края. На широком
      // экране это давно так — см. lifted выше.
      const held = section.classList.contains('has-backdrop');
      lead.style.setProperty('--lead-x', '0px');
      lead.style.setProperty('--lead-y', `${(-(held ? up : e * up)).toFixed(1)}px`);
      lead.style.opacity = '';
      // And the room it takes at the top of every screen of the block, so that
      // what the block pins to the top pins itself under the parked screen
      // instead of behind it — the same room the wide layout holds, measured
      // against the window rather than against the pinned container.
      section.style.setProperty('--lead-hold',
        `${Math.round((held ? 1 : e) * (tall + LEAD_AIR_PARKED * 2))}px`);
      return;
    }

    // Off the top of the screen, and the card comes up from below to take its
    // place — one movement upwards instead of two sideways.
    //
    // На телефоне так уезжает любой переходный экран, а не только тот, что
    // просил об этом полем exit. Вбок страница там не ходит вовсе: читатель
    // ведет ее тактами сверху вниз, и подмена, в которой экран уезжает влево,
    // а заголовок приходит справа, была единственным движением поперек хода —
    // на широком экране это смена кадра, а под пальцем читалось так, будто
    // страницу листают вбок. Вверх она идет туда же, куда и все остальное.
    if (rises || narrow) {
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
  const sub = header.querySelector('p');

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
    // Подзаголовок на время измерений стоит в свою настоящую высоту: обычно
    // она задана через --sub-h, то есть прошлым измерением, и считать по ней
    // новое — значит мерить вчерашний день.
    if (sub) sub.style.height = 'auto';

    // А на телефоне у карточки есть еще один предел, кроме переносов строк:
    // экран. Окно там 659 пикселей с развернутой панелью браузера, а карточка
    // метро — заголовок, табло и две строки под ним — выходила на 870 и в
    // экран не помещалась вовсе: счет давал ей отрицательный сдвиг, и верх ее
    // вылезал над разделом. Поэтому здесь она ужимается, пока не встанет в
    // окно целиком. Меряется на каждом шаге заново: ширина карточки — это 1/k
    // ширины экрана, и от размера зависят переносы, а значит и высота.
    if (NARROW.matches && cardK > 1) {
      const room = window.innerHeight - CARD_AIR;
      let k = cardK;
      let tall = header.offsetHeight;
      while (k > 1.03 && tall * k > room) {
        k = Math.max(1, k - 0.05);
        section.style.setProperty('--intro-k', k.toFixed(3));
        tall = header.offsetHeight;
      }
      if (k !== cardK) {
        cardK = k;
        me.safe = cardK;
        if (shares) rethink(me);
      }
      section.style.setProperty('--intro-k', String(K()));
    }

    // На телефоне подзаголовок уходит вместе с карточкой: прочитан он на ней,
    // а дальше стоит между заголовком и картинкой и отнимает у нее треть
    // экрана. Чтобы складываться, а не пропадать рывком, он должен знать свою
    // высоту. Меряется она прямо здесь — на раскрытой карточке, где
    // подзаголовок стоит в 1/k ширины, переносится чаще и выше всего. Не через
    // scrollHeight: внешние отступы строк в него не входят, и у метро он
    // недосчитывал полсотни пикселей — две строки с картинками обрезало.
    if (sub) {
      section.style.setProperty('--sub-h', `${sub.offsetHeight}px`);
      sub.style.height = '';
    }
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
      // Whoever plays the card on a wide screen measures it before every beat.
      // Here the frames come from scrolling, so «before a beat» means «before a
      // frame» — and the measurement costs nothing while nothing has moved.
      // Without it the card keeps the height it had before the block was built:
      // the heading of the professions block is a logo that arrives with the
      // block, and the card was placed against a height three times smaller.
      remeasure();
      // The same opening over a shorter run of scrolling — see ZONE_NARROW.
      // The zone the section reserves for it is cut by the same amount, so
      // the two still agree about where in the opening the reader is.
      const q = introProgress(section, true, zone * ZONE_NARROW);
      if (q !== null) draw(q * zone);
    },
    // Где кончается каждый такт открытия — в пикселях от верха секции. На
    // телефоне открытие читается прокруткой, и вся его арифметика линейна:
    // такт, который на широком экране просят одним движением колеса, здесь
    // лежит на своем отрезке пути. По этим точкам ход и ведет.
    //
    // Ноль в начале — сам верх секции: раздел пришел, но ничего еще не
    // сыграло. На широком экране это отдельный такт, и на телефоне он тоже
    // нужен — иначе первое же движение проносит открытие мимо до конца первого
    // такта, и то, что на нем менялось, читатель видит только уже измененным.
    //
    // А последний такт кончается не там, где кончается зона открытия. Карточка
    // садится на свое место в шапке, и блок под ней начинается ниже экрана:
    // чтобы увидеть его целиком, нужен был еще один ход, на котором только и
    // происходило, что уезжала шапка. Поэтому последняя остановка — верх
    // `.viz-body`: карточка садится по дороге, и блок приезжает собранным.
    stops() {
      const screen = ZONE_NARROW * window.innerHeight;
      const out = [0, ...beats.map(([, to]) => Math.round(to * screen))];
      const body = section.querySelector('.viz-body');
      if (body) {
        const top = body.getBoundingClientRect().top - section.getBoundingClientRect().top;
        out[out.length - 1] = Math.max(out[out.length - 1], Math.round(top));
      }
      return out;
    },
    // One stretch of it, p from 0 to 1 within that stretch.
    runBeat(i, p) {
      const [from, to, cardFrom = from, cardTo = to] = beats[i];
      draw(from + (to - from) * p, cardFrom + (cardTo - cardFrom) * p);
    }
  };
}
