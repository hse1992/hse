// Three cubesats of HSE going round a turning Earth — the one dark card on
// the page.
//
// The picture keeps to the real proportions: a low orbit runs a few hundred
// kilometres over a globe 6371 km across, so the ring all but touches the
// planet. Only the satellites themselves are drawn larger than life — to
// scale they would be smaller than a pixel.

import { mountCanvas, stepAhead } from '../lib/ui.js';
import { loadMark } from '../lib/hse-mark.js';
import { CITIES } from '../data/hse.js';
import { LAND } from '../data/earth.js';
import { ORBIT_KM, INCLINE, SATELLITES } from '../data/satellites.js';

// ---------- The objects ----------
// What the satellites are — names, dates, the height and the lie of the orbit
// — comes from data/satellites.js, which the finale reads as well: it prints
// those figures along the edge of the picture taken here, and a figure kept in
// two places comes apart sooner or later. What belongs to the drawing rather
// than to the satellites stays here.
const EARTH_KM = 6371;   // the planet they go round

// Where the four campuses stand on the globe, degrees north and east. On a
// planet this size they come out a finger apart — which is the point: the
// whole university fits into one corner of one continent, and its satellites
// go round all of it.
const CITY_AT = {
  msk: [55.75, 37.62],
  spb: [59.94, 30.31],
  nn: [56.33, 44.00],
  perm: [58.01, 56.25]
};

// The middle of the four: the marks all stand the way the ground lies there,
// so that they stay parallel to one another.
const MIDDLE = Object.values(CITY_AT).reduce(
  (m, at, i, all) => [m[0] + at[0] / all.length, m[1] + at[1] / all.length], [0, 0]);

// Where each orbit crosses the equator — a matter of the drawing, not of the
// satellites: far enough apart that the three rings can be told from one
// another. In the order they went up.
const NODES = [-64, 2, 66];
const SATS = SATELLITES.map((sat, i) => ({ name: sat.name, node: NODES[i] }));

// What the last two beats say — the satellite hangs over the campuses under
// this line, and takes its picture under the same one.
const SEEN_FROM_ORBIT = 'Вышка такая большая, что ее можно увидеть только со спутника';

// One line per beat, and a quieter one under it.
const STORY = [
  {
    // Первый кадр молчит. Сцена начинается с того, что читатель уже знает:
    // те же города, которыми он ходил по всей странице, — и называть их
    // заново незачем: отсюда они умещаются в один палец, и это видно без
    // подписи. Место под строку все равно держится (min-height у
    // .space-note): подпись, пришедшая со вторым кадром, не должна толкать
    // шар вниз.
    line: '',
    sub: ''
  },
  {
    // The name and the date are the data's; how the launch site is said —
    // «снова», «уже с» — belongs to the sentence and stays here.
    line: `${SATELLITES[0].name} — запуск ${SATELLITES[0].launched}, ${SATELLITES[0].from}`,
    sub: 'Вес 3,5 кг, камера с линзами Френеля'
  },
  {
    line: `${SATELLITES[1].name} — запуск ${SATELLITES[1].launched}, снова ${SATELLITES[1].from}`,
    sub: 'Следил за Арктикой и слушал суда на Северном морском пути'
  },
  {
    line: `${SATELLITES[2].name} — запуск ${SATELLITES[2].launched}, уже с Восточного`,
    sub: 'Снимает Землю и ловит сигналы судов'
  },
  {
    line: 'Первые два завершили свои миссии и сошли с орбиты',
    sub: 'Третий на орбите до сих пор'
  },
  {
    // Спутник доворачивается к Вышке и на этом же такте снимает — строка над
    // картинкой одна на оба движения.
    line: SEEN_FROM_ORBIT,
    sub: ''
  }
];

// The beat the first two come down on: after the empty Earth and one beat
// for each satellite. And the one after it, where the third turns its camera
// down to the Earth — the picture it takes is the flash the next block
// arrives in (meta.flash).
const BURN = SATS.length + 1;
// Снимок делается тем же тактом, что и поворот: порознь эти два такта несли
// одну и ту же строку над картинкой, и второй из них читался как остановка
// без нового кадра. Спутник доворачивается, и за ним щелкает затвор.
const HOLD = BURN + 1;
const SHOT = HOLD;

export const meta = {
  id: 'space',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Космос',
  // The block opens on one sentence alone, and the card of the section comes
  // in over it a beat later — see the lead-in screen in lib/page.js.
  lead: {
    // The phrase goes and the card comes in its place in the one movement:
    // a beat with the card standing alone in the middle would show nothing
    // the beat before and the beat after do not.
    together: true,
    // Up rather than aside: the phrase is about reaching the orbit, so it
    // leaves the way the block goes — and the card rises from below with the
    // planet instead of sliding in from the side.
    exit: 'up',
    // Two lines by design, and the break is chosen rather than left to the
    // width of the window. Set inline, not from the stylesheet of the module:
    // the shell measures the lead-in to decide whether it fits, and it does
    // that before the block is built. Left to the stylesheet, the two lines
    // are measured as one long one, judged not to fit, and the whole screen
    // is set a quarter smaller than every other lead-in on the page.
    // The second line is picked out the way the page picks out what a screen
    // turns on — только наоборот: плашка цвета карточки, буквы корпоративные
    // синие. Небо этой главы лежит на всю секцию, и синяя плашка на нем
    // пропадала; белая на черном читается как выделение, а на белой странице
    // от нее остаются просто синие буквы — то есть экран верен и в том
    // случае, если каркас показал его раньше, чем блок собрался и принес
    // свое небо. Выделение
    // идет по тексту, а не коробкой: на телефоне фраза сама переносится на две
    // строки, и коробке в fit-content доставалась ширина самой длинной из них —
    // под коротким «орбиты» синее поле тянулось до правого края. Строчное с
    // box-decoration-break: clone дает каждой строке свою плашку по словам.
    // Перенос перед выделением — тегом, а не стилем: строчное выделение иначе
    // встало бы сразу за запятой.
    // Строки идут просторнее обычного: плашка строчная, ее поля сверху и снизу
    // наслаиваются на соседние строки — воздух под них дает межстрочие.
    value: '<span style="display: block; white-space: normal; line-height: 1.45">Вышка настолько большая,<br>'
      + '<span style="padding: 0.1em 0.26em; border-radius: 0.22em;'
      + ' -webkit-box-decoration-break: clone; box-decoration-break: clone;'
      + ' background: var(--card); color: var(--hse-blue)">что достает даже до орбиты</span>'
      + '</span>',
    text: ''
  },
  title: 'Вышка — просто космос!',
  // Phrasing content: the shell puts it inside a <p>.
  subtitle: 'Запустили уже <span class="space-mark">три своих спутника</span>',
  intro: true,
  // The empty Earth arrives with the block, then one satellite a beat, a
  // beat for the one still flying, and the last one for the picture it takes.
  steps: 6,
  opensOnStep: true,
  // The block ends on a photograph about to be taken, and the next one comes
  // in the flash of it — the shell draws the flash, see «Вспышка на стыке».
  flash: true
};

export function init(root) {
  'use strict';

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = window.matchMedia('(max-width: 860px)');

  const RAD = Math.PI / 180;
  const LAP_MS = 8000;          // one lap of a satellite
  const DAY_LAPS = 15;          // ... and this many of them to one turn of the Earth
  const ARRIVE_MS = 1700;       // a satellite drawing its own orbit on the way in
  const BURN_MS = 900;          // and the flash it goes out with
  // The last beat, all of it: the globe turns the campuses towards us while
  // the satellite comes round to the point of its orbit right over them, then
  // it turns its camera down, and then it takes the picture. One movement of
  // the wheel, one thing happening — and the flash of that picture is the
  // next beat, drawn by the shell (meta.flash).
  // Kept short: the flash of the picture follows in the same beat, so this
  // and the curtain after it are one stretch of time for the reader.
  const AIM_MS = 1800;
  const AIM_COME = 0.55;        // coming round is over by here
  const AIM_TURN = 0.85;        // and the camera is down by here
  // The point of the orbit right over the campuses lies well to the east of
  // the middle of the disc, and four marks standing there are seen almost
  // edge on. So the globe is turned a little past it: the campuses come round
  // towards the reader and can be made out, while the satellite still looks
  // down on them from inside the width of its own frame.
  const FACE = 18;              // degrees of that extra turn

  // ---------- Markup ----------
  root.innerHTML = `
    <style>
      /* ---------- Сцена во весь экран ----------
         Единственный темный раздел страницы — и темный он целиком, от края до
         края. Не карточка с картинкой внутри, а небо, в которое читатель
         попадает: карточка отдает скругления, тень и поля, границы у космоса
         нет. Небо лежит на самой секции, а не в теле блока: тело само себе
         коробка (contain), и все в нем меряется от него, а не от окна.
         Уходит оно вместе с секцией — финал приходит из вспышки уже белым. */
      .space-section {
        position: relative;
        isolation: isolate;
      }

      .space-sky {
        position: absolute;
        inset: 0;
        z-index: 0;
        background: radial-gradient(120% 130% at 50% 34%,
                    var(--space-sky) 0%, var(--space-sky-edge) 100%);
        pointer-events: none;
      }

      /* Все, что каркас рисует в этой секции, стоит над небом. */
      .space-section > .viz-container {
        position: relative;
        z-index: 1;
      }

      .space-card {
        position: relative;
        background: none;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
        gap: 0;
      }

      /* И читается по темному: заголовок, подзаголовок и переходный экран
         каркас набирает цветами страницы, а страница здесь — ночное небо. */
      .space-section .viz-header h2,
      .space-section .viz-lead-value {
        color: var(--space-sat);
      }

      .space-section .viz-header p,
      .space-section .viz-lead-text {
        color: var(--space-label);
      }

      /* The heading does not fly in from the side. The shell walks a title
         card in from the right while the lead-in leaves, but here the two
         belong together: the heading comes up from below in the same movement
         as the planet under it, and arrives at its own size, in its own place.
         Hence the transform is taken over whole — the card's sideways travel
         and its scaling are both left out, so the width it is laid out at
         goes back to plain 100%. */
      @media (min-width: 861px) {
        .viz-intro.space-section .viz-header {
          width: 100%;
          transform: translateY(calc((1 - var(--intro-body, 1)) * 100vh));
          opacity: var(--intro-body, 1);
        }
      }

      /* What the block is about, picked out in the heading the way the page
         picks out a figure that matters. The heading is drawn by the shell,
         outside this body — these rules reach it all the same, and by the
         time the card is shown the block has long been built.
         Плашка здесь цвета карточки, а буквы синие: небо этой главы темное,
         и синее на синем не читалось бы. */
      .space-mark {
        padding: 0.06em 0.26em;
        border-radius: 0.22em;
        background: var(--card);
        color: var(--hse-blue);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }

      /* The globe can be held and turned with the mouse. */
      .space-card canvas {
        cursor: grab;
      }

      .space-card canvas.is-dragging {
        cursor: grabbing;
      }

      /* Название спутника и строка под ним стоят в самой сцене, у ее верхнего
         края: полосы над картинкой больше нет — картинка и есть экран. Шар
         встает в то, что осталось ниже (band() в коде), так что подпись на
         аппарат не ложится.

         Касаний строка не берет: под ней шар, который вертят рукой, и такт,
         который играет стук по экрану.

         Room for two lines is held from the start: a line that grew by a row
         would push the globe down and pull it back up again mid-story. */
      .space-note {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        z-index: 2;
        min-height: 76px;
        pointer-events: none;
      }

      .space-note-line {
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--space-sat);
        text-wrap: pretty;
      }

      .space-note-sub {
        margin-top: 4px;
        font-size: 1.0625rem;
        color: var(--space-label);
        font-variant-numeric: tabular-nums;
        text-wrap: pretty;
      }

      .space-run { display: none; }

      /* Снимок делает читатель — но только на телефоне: на широком экране
         спутник снимает сам, тактом, и вспышка приходит за ним. */
      .space-shot { display: none; }

      @media (max-width: 860px) {
        /* Сцена держит весь экран: колонка прибита к его верху, и в ней
           ничего, кроме неба и шара. Своего фона у колонки нет — под ней то
           же небо, и полоса цвета страницы дала бы поперек экрана шов.
           Восемь пикселей — поле секции сверху: без них сцена съезжала бы
           вниз ровно на него и столько же вылезала бы за нижний край. */
        .space-section .col-right {
          height: calc(100svh - 8px);
          padding: 0;
          gap: 0;
          background: none;
        }

        /* И тени под ней тоже: она растушевывала карточки, уезжающие под
           прибитую картинку, а здесь под картинкой ничего не едет. */
        .space-section .col-right::after { content: none; }

        .space-card {
          flex: 1;
          height: auto;
          min-height: 0;
        }

        /* Кнопка стоит на самой картинке, у нижнего края: снимает спутник,
           и просить об этом логично там, где он летит, а не строкой ниже.
           Выше подсказки «Листай» — та стоит в своей полосе у самого низа
           (--hint-room), и кнопка, прижатая к краю, легла бы на нее. */
        .space-shot {
          display: block;
          position: absolute;
          left: 50%;
          bottom: calc(var(--hint-room, 12px) + 20px);
          transform: translateX(-50%);
          font-size: 0.9375rem;
          font-weight: 600;
          padding: 12px 26px;
          color: var(--card);
          background: var(--hse-blue);
          border-color: var(--hse-blue);
        }

        .space-shot[hidden] { display: none; }

        .space-note-line { font-size: 1.125rem; }
        .space-note-sub { font-size: 0.9375rem; }

        /* Room for the longest of the lines, held from the start. The line
           and the globe under it are pinned to the top of a phone while the
           story goes by, and a line that grew by a row would push the globe
           down and pull it back up again mid-story. */
        .space-note { min-height: 104px; }

        /* On a phone the page scrolls instead of stepping, and the globe with
           its line is pinned to the top there. This is the travel that goes
           under them: a stretch for the empty Earth, one for each satellite
           going up, one for the two that came down, one for the last one
           turning its camera on the campuses, one for the picture. Without it
           the phone was handed all three at once and none of those lines was
           ever read. */
        /* Путь истории меряется в svh, а не в dvh. dvh ходит вместе с
           панелью браузера: она прячется и показывается на ходу, путь от
           этого то растягивается, то укорачивается — а блок считает по нему,
           сколько состояний уже позади. Стоило пути укоротиться, и пройденное
           оказывалось за последней границей: блок отвечал «история
           рассказана», и один свайп проносил мимо все, что в ней оставалось.
           svh — это тот же экран, но с панелью: он не меняется. */
        /* И немного пути после истории — уже не ее, а ничей. Прибитая к верху
           колонка занимает чуть больше половины экрана, и на последнем кадре
           снизу выглядывал следующий раздел: шар на орбите, а под ним
           заголовок финала и первые строчки доски. Финал приходит целиком,
           одним ходом, — значит до того его не должно быть видно вовсе.
           Считается это в svh по той же причине, что и путь истории. */
        .space-run {
          display: block;
          flex: none;
          height: 280svh;
          margin-bottom: 36svh;
        }
      }
    </style>

    <div class="col-right">
      <div class="canvas-card space-card">
        <div class="canvas-wrap" data-el="wrap"></div>
        <div class="space-note" data-el="note-box">
          <div class="space-note-line" data-el="note"></div>
          <div class="space-note-sub" data-el="sub"></div>
        </div>
        <button type="button" class="btn space-shot" data-el="shot" hidden>Сделать снимок</button>
      </div>
    </div>
    <div class="space-run" data-el="run" aria-hidden="true"></div>
  `;

  // The section itself, so the block can say how its own heading arrives.
  const host = root.closest('.viz-section');
  if (host) host.classList.add('space-section');

  // Небо на всю секцию. Лежит оно на секции, а не внутри блока: тело блока
  // само себе коробка (`contain`), и небо из него не вышло бы ни за поля
  // страницы, ни за заголовок. Отдельным слоем, а не фоном секции, — чтобы
  // каркас мог ставить на секцию свои классы, ничего не зная об этом.
  if (host && !host.querySelector('.space-sky')) {
    const sky = document.createElement('div');
    sky.className = 'space-sky';
    sky.setAttribute('aria-hidden', 'true');
    host.insertBefore(sky, host.firstChild);
  }

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);
  const noteEl = $('note');
  const subEl = $('sub');
  const noteBox = $('note-box');
  // На телефоне снимок делает читатель — кнопкой на последнем такте.
  const shotEl = $('shot');
  let snapped = false;
  // What the picture holds, for whoever is read to rather than shown: the
  // line under it tells the story beat by beat, so this says only the things
  // that are nowhere in words — the planet, the rings round it, and the marks
  // standing where the university does.
  const { canvas, ctx } = mountCanvas($('wrap'), () => paint(),
    'Земля из космоса, вокруг нее орбиты вышкинских спутников, '
    + 'а на ней значки Вышки в четырех городах');

  // Canvas needs plain strings, so the palette is read once from the tokens.
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const C = {
    star: token('--space-star'),
    ocean: token('--space-ocean'),
    land: token('--space-land'),
    ice: token('--space-ice'),
    air: token('--space-air'),
    orbit: token('--space-orbit'),
    orbitBack: token('--space-orbit-back'),
    sat: token('--space-sat'),
    panel: token('--space-sat-panel'),
    label: token('--space-label'),
    hse: token('--hse-blue'),
    burn: token('--space-burn')
  };

  // The mark of the university, for the four places it stands in. It is read
  // from the file, so it arrives a moment after everything else — until then
  // the globe simply goes without it.
  let mark = null;
  loadMark().then((got) => { mark = got; paint(); });

  // ---------- The land ----------
  // Antarctica and Greenland go on as ice: at this size white caps read as
  // the poles, and green ones as a mistake.
  const area = (ring) => {
    let s = 0;
    for (let i = 0; i < ring.length; i += 2) {
      const j = (i + 2) % ring.length;
      s += ring[i] * ring[j + 1] - ring[j] * ring[i + 1];
    }
    return s / 2;
  };

  const reversed = (ring) => {
    const out = new Float64Array(ring.length);
    for (let i = 0, n = ring.length; i < n; i += 2) {
      out[n - 2 - i] = ring[i];
      out[n - 1 - i] = ring[i + 1];
    }
    return out;
  };

  const PIECES = LAND.map((rings) => {
    let lo = 90, hi = -90;
    for (let i = 1; i < rings[0].length; i += 2) {
      lo = Math.min(lo, rings[0][i]);
      hi = Math.max(hi, rings[0][i]);
    }
    // A lake inside a landmass is a hole, and a hole is only a hole to canvas
    // while it winds the other way round than the shore it sits in.
    const outer = Math.sign(area(rings[0]));
    const kept = rings.map((r, i) => (i && Math.sign(area(r)) === outer ? reversed(r) : r));
    return { rings: kept, ice: hi < -55 || (lo > 58 && hi > 78) };
  });

  // The ice caps are the same from every side, so they are written straight
  // in the coordinates of the view: a ring round the pole along one parallel.
  const capOf = (lat) => {
    const pts = [];
    for (let psi = -180; psi < 180; psi += 4) pts.push([psi, lat]);
    return pts;
  };
  const CAP_N = capOf(72);
  const CAP_S = capOf(-78);

  // ---------- Geometry ----------
  // The globe leans towards us, so the Arctic the satellites watch is in
  // sight rather than edge on at the top; and its axis leans in the picture
  // as well, the way it does in every drawing of the Earth.
  //
  // The lean stays above 18 degrees: below that the edge of the northern ice
  // cap slips behind the limb, and a ring round the pole is the one shape
  // the clipping below cannot close — it floods the top of the globe white.
  const LAT0 = 22;
  const cosL = Math.cos(LAT0 * RAD), sinL = Math.sin(LAT0 * RAD);
  const TILT = -0.2;
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const sinI = Math.sin(INCLINE * RAD), cosI = Math.cos(INCLINE * RAD);

  // Кадр, каким его дает экран, — и кадр, каким его видит камера: на
  // последнем такте она наезжает, и все, что ниже, рисуется уже по
  // наехавшему (см. lens()).
  let W = 0, H = 0;
  let CX0 = 0, CY0 = 0, R0 = 0, RO0 = 0;
  let CX = 0, CY = 0, R = 0, RO = 0, S = 1;
  let stars = null;
  // Высота строки над сценой. Меряется, а не считается: строк в ней то одна,
  // то две, и экран у всех разной ширины.
  let noteH = 0;
  const measure = () => { noteH = noteBox ? noteBox.offsetHeight : 0; };

  // Сколько сверху занято подписью, а снизу — кнопкой снимка. Шар встает в
  // то, что осталось между ними: так подпись не ложится на аппарат, а
  // аппарат не вылезает из кадра.
  const band = () => ({
    top: noteH + (narrow.matches ? 10 : 8),
    bottom: narrow.matches ? 72 : 0
  });

  function fit() {
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 520;
    if (w !== W || h !== H) { W = w; H = h; measure(); makeStars(); }
    const b = band();
    const free = Math.max(80, H - b.top - b.bottom);
    CX0 = W / 2;
    CY0 = b.top + free / 2;
    // Кадрирование у телефона свое: экран там узкий и высокий, и шар в нем
    // меряется шириной, а не меньшей стороной — иначе планета, главный
    // предмет главы, занимала бы треть высоты посреди пустого неба.
    R0 = narrow.matches
      ? Math.min(W * 0.40, free * 0.42)
      : Math.min(W * 0.34, free * 0.46);
    // True to scale the orbit runs eight per cent above the surface — a dozen
    // pixels here. Never closer than room enough to make out what is flying.
    RO0 = Math.max(R0 * (1 + ORBIT_KM / EARTH_KM), R0 + 20);
    // Наезд записан в точках базового кадра, а кадр только что пересчитан.
    if (cam) cam = aimAt(SATS[SATS.length - 1]);
    lens();
  }

  // ---------- Камера ----------
  // Всю историю она стоит на месте. На последнем такте, когда спутник
  // доворачивается объективом к Земле, она наезжает: точка базового кадра
  // (bx, by) — середина между аппаратом и метками под ним — встает в
  // (sx, sy), а все расстояния растут в k раз. camK говорит, насколько она
  // туда доехала, и на нуле наезда нет вовсе.
  let cam = null;
  let camK = 0;

  function lens() {
    const t = cam ? camK : 0;
    const k = 1 + (cam ? (cam.k - 1) * t : 0);
    R = R0 * k;
    RO = Math.max(R * (1 + ORBIT_KM / EARTH_KM), R + 20 * k);
    // Аппарат на наезде тоже растет — но медленнее планеты. Вырасти он
    // вровень с ней, и подпись рядом набралась бы вдвое крупнее заголовка;
    // не вырасти вовсе — наезд был бы на Землю, а не на спутник.
    S = Math.max(0.68, Math.min(1.25, R0 / 190)) * (1 + (k - 1) * 0.55);
    CX = cam ? (CX0 - cam.bx) * k + cam.bx + (cam.sx - cam.bx) * t : CX0;
    CY = cam ? (CY0 - cam.by) * k + cam.by + (cam.sy - cam.by) * t : CY0;
  }

  function makeStars() {
    // Always the same sky: the seed is the day the first one went up, so a
    // repaint never reshuffles it.
    let seed = 20210322;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const n = Math.round((W * H) / 8000);
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({ x: rnd() * W, y: rnd() * H, r: 0.4 + rnd() * 1.1, a: 0.2 + rnd() * 0.6 });
    }
  }

  // A point of the sphere: latitude, longitude as seen from here, radius.
  // `z` is what faces us — it is positive on the half of the world we see,
  // and zero exactly along the edge of the disc.
  //
  // Сначала без середины кадра: так ту же точку можно посчитать и на базовом
  // кадре — наезд целится в место, которое не должно ехать вместе с ним.
  function at(phi, psi, r) {
    const f = phi * RAD, l = psi * RAD;
    const cf = Math.cos(f), sf = Math.sin(f), cl = Math.cos(l);
    const X = r * cf * Math.sin(l);
    const Y = -r * (cosL * sf - sinL * cf * cl);
    return {
      dx: X * cosT - Y * sinT,
      dy: X * sinT + Y * cosT,
      z: sinL * sf + cosL * cf * cl
    };
  }

  function put(phi, psi, r) {
    const q = at(phi, psi, r);
    return { x: CX + q.dx, y: CY + q.dy, z: q.z };
  }

  // The same answer without the rest of the work: which side of the world a
  // point is on.
  function facingUs(phi, psi) {
    const f = phi * RAD, l = psi * RAD;
    return sinL * Math.sin(f) + cosL * Math.cos(f) * Math.cos(l);
  }

  const hidden = (p) => p.z < 0 && Math.hypot(p.x - CX, p.y - CY) < R;

  // ---------- Clipping a ring to the half of the world facing us ----------
  // Nothing here knows about the shape of the edge: a point is in if it faces
  // us, and where a stretch of coast crosses over, the crossing is found by
  // halving the step until it sits on the edge. A point found that way is
  // marked, and two marked points in a row mean the ring went round the back
  // — they are joined along the edge of the disc instead of across it.
  const wrap180 = (d) => d - Math.round(d / 360) * 360;

  function crossing(a, b) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 14; k++) {
      const t = (lo + hi) / 2;
      const psi = a[0] + (b[0] - a[0]) * t;
      const phi = a[1] + (b[1] - a[1]) * t;
      if (facingUs(phi, psi) >= 0) lo = t; else hi = t;
    }
    const t = (lo + hi) / 2;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, true];
  }

  function clipToFace(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const inA = facingUs(a[1], a[0]) >= 0;
      const inB = facingUs(b[1], b[0]) >= 0;
      if (inA) out.push(a);
      if (inA !== inB) out.push(inA ? crossing(a, b) : crossing(b, a));
    }
    return out;
  }

  // Every piece of one ring that shows, given how far the Earth has turned.
  function facing(ring, spin) {
    const n = ring.length / 2;
    const pts = new Array(n);
    // Longitudes relative to the middle of the disc, unwrapped so that a ring
    // crossing the date line stays in one piece, and then carried as a whole
    // to where the middle of it is on the screen.
    let psi = wrap180(ring[0] - spin);
    let lo = psi, hi = psi;
    pts[0] = [psi, ring[1]];
    for (let i = 1; i < n; i++) {
      psi += wrap180(ring[i * 2] - ring[i * 2 - 2]);
      lo = Math.min(lo, psi);
      hi = Math.max(hi, psi);
      pts[i] = [psi, ring[i * 2 + 1]];
    }
    const home = -Math.round((lo + hi) / 2 / 360) * 360;

    // One copy, and only one. A ring that reaches round the world — Eurasia
    // does, from the date line to the date line — used to be tried a turn
    // earlier and a turn later as well, in case part of it showed from the
    // other side. But a turn of longitude is the same place on the globe, and
    // everything below reads longitude through a sine or a cosine, so those
    // copies came out exactly on top of this one. Drawn twice, they told the
    // fill that a lake inside the ring was land after all — and the Caspian
    // filled in with the rest of Eurasia while the Earth turned.
    const moved = home ? pts.map((p) => [p[0] + home, p[1]]) : pts;
    const cut = clipToFace(moved);
    return cut.length > 2 ? [cut] : [];
  }

  // Traces a ring of the sphere, cutting every long edge into shorter ones so
  // that it follows the curve instead of stepping across it. The two ends of
  // a cut are joined along the edge of the disc, a little outside it — what
  // hangs over is taken off by the clip on the globe.
  function trace(pts, r) {
    const path = [];
    const angleOf = (p) => Math.atan2(p.y - CY, p.x - CX);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (a[2] && b[2]) {
        const pa = put(a[1], a[0], r), pb = put(b[1], b[0], r);
        const t0 = angleOf(pa);
        let d = angleOf(pb) - t0;
        d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;      // the short way round
        const n = Math.max(1, Math.ceil(Math.abs(d) / 0.12));
        for (let k = 0; k < n; k++) {
          const t = t0 + d * (k / n);
          path.push({ x: CX + Math.cos(t) * r * 1.3, y: CY + Math.sin(t) * r * 1.3 });
        }
        continue;
      }
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 4));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        path.push(put(a[1] + (b[1] - a[1]) * t, a[0] + (b[0] - a[0]) * t, r));
      }
    }
    path.forEach((p, i) => { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.closePath();
  }

  // ---------- Drawing ----------
  let dpr = 1;

  function resize() {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(W * d), h = Math.round(H * d);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      dpr = d;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawStars() {
    ctx.fillStyle = C.star;
    stars.forEach((s) => {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawGlobe() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = C.ocean;
    ctx.fill();
    ctx.clip();

    ctx.fillStyle = C.ice;
    ctx.beginPath();
    [CAP_N, CAP_S].forEach((cap) => {
      const cut = clipToFace(cap);
      if (cut.length > 2) trace(cut, R);
    });
    ctx.fill();

    PIECES.forEach((piece) => {
      ctx.beginPath();
      let any = false;
      piece.rings.forEach((ring) => {
        facing(ring, spin).forEach((part) => { trace(part, R); any = true; });
      });
      if (!any) return;
      ctx.fillStyle = piece.ice ? C.ice : C.land;
      ctx.fill();
    });

    // And the four campuses on it, stuck to the surface like transfers: each
    // one is drawn in the frame of the ground it lies on, so it turns with
    // the globe, flattens towards the edge and goes round with everything
    // else. The mark keeps the colours it wears everywhere on the page.
    if (mark) {
      // Чуть крупнее прежнего: с них начинается глава, и на телефоне метка в
      // восемь пикселей читалась как пылинка.
      const arc = Math.max(10, R * 0.07) / 2 / R;  // its radius, in surface radians
      const D = 0.4;                               // degrees, to read the lie of the ground
      // Which way east and north run on the screen — read once, in the middle
      // of the four, and used for all of them. The lie of the ground is a
      // little different in every place, and marks that each stood by their
      // own would read as a scatter; sharing it keeps their left edges
      // parallel, and they still lean and flatten together as the globe turns.
      const psi0 = MIDDLE[1] - spin;
      const p0 = put(MIDDLE[0], psi0, R);
      const e0 = put(MIDDLE[0], psi0 + D, R);
      const n0 = put(MIDDLE[0] + D, psi0, R);
      const kx = arc / (Math.cos(MIDDLE[0] * RAD) * D * RAD) / mark.r;
      const ky = arc / (D * RAD) / mark.r;
      // North is up on the ground and down in the file, hence the minus.
      const lie = [(e0.x - p0.x) * kx, (e0.y - p0.y) * kx,
                   -(n0.x - p0.x) * ky, -(n0.y - p0.y) * ky];

      CITIES.forEach((city) => {
        const at = CITY_AT[city.key];
        if (!at) return;
        const p = put(at[0], at[1] - spin, R);
        if (p.z <= 0) return;
        ctx.save();
        // Nothing pops in at the edge: a mark coming round fades in over the
        // last of its way.
        ctx.globalAlpha = Math.min(1, p.z / 0.14);
        ctx.transform(lie[0], lie[1], lie[2], lie[3], p.x, p.y);
        ctx.translate(-mark.cx, -mark.cy);
        ctx.fillStyle = C.hse;
        ctx.fill(mark.disc);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill(mark.mark);
        ctx.restore();
      });
    }

    // A ball, not a disc: the light comes from up and to the left and the
    // edge falls away from it.
    const shade = ctx.createRadialGradient(CX - R * 0.3, CY - R * 0.32, R * 0.1,
                                           CX - R * 0.1, CY - R * 0.1, R * 1.26);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(0.62, 'rgba(0, 0, 0, 0.12)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = shade;
    ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    ctx.restore();

    // And a rim of air around it — a hair's breadth of one, or it would swamp
    // the orbits, which run just as close to the surface.
    const air = ctx.createRadialGradient(CX, CY, R * 0.965, CX, CY, R * 1.035);
    air.addColorStop(0, 'rgba(96, 170, 255, 0)');
    air.addColorStop(0.5, C.air);
    air.addColorStop(1, 'rgba(96, 170, 255, 0)');
    ctx.fillStyle = air;
    ctx.beginPath();
    ctx.arc(CX, CY, R * 1.035, 0, Math.PI * 2);
    ctx.fill();
  }

  // Where a satellite is along its orbit, u counted from the equator.
  function orbitAngles(sat, u) {
    return {
      phi: Math.asin(sinI * Math.sin(u)) / RAD,
      psi: sat.node + Math.atan2(cosI * Math.sin(u), Math.cos(u)) / RAD
    };
  }

  function onOrbit(sat, u, r = RO) {
    const a = orbitAngles(sat, u);
    return put(a.phi, a.psi, r);
  }

  function drawOrbit(sat, alpha) {
    // On the way in the ring is only as long as the satellite has flown.
    const span = Math.min(Math.PI * 2, sat.u - sat.uIn);
    const steps = 160;
    const front = new Path2D(), back = new Path2D();
    let was = null;
    for (let i = 0; i <= steps; i++) {
      const p = onOrbit(sat, sat.u - span * (1 - i / steps));
      const hid = hidden(p);
      const path = hid ? back : front;
      if (hid === was) path.lineTo(p.x, p.y); else path.moveTo(p.x, p.y);
      was = hid;
    }
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = C.orbitBack;
    ctx.stroke(back);
    ctx.strokeStyle = C.orbit;
    ctx.stroke(front);
    ctx.globalAlpha = 1;
  }

  // A cubesat of three blocks with its panels out, turned the way it flies.
  function drawBody(x, y, angle, alpha, lens = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = C.panel;
    ctx.fillRect(-3.4 * S, -11.5 * S, 6.8 * S, 7.4 * S);
    ctx.fillRect(-3.4 * S, 4.1 * S, 6.8 * S, 7.4 * S);
    ctx.strokeStyle = 'rgba(12, 27, 51, 0.5)';
    ctx.lineWidth = Math.max(0.6, 0.8 * S);
    ctx.beginPath();
    ctx.moveTo(-3.4 * S, -7.8 * S); ctx.lineTo(3.4 * S, -7.8 * S);
    ctx.moveTo(-3.4 * S, 7.8 * S); ctx.lineTo(3.4 * S, 7.8 * S);
    ctx.stroke();
    ctx.fillStyle = C.sat;
    ctx.fillRect(-5.4 * S, -3.1 * S, 10.8 * S, 6.2 * S);
    // The camera, in the end of the body that turns to the ground.
    if (lens > 0) {
      ctx.globalAlpha = alpha * lens;
      ctx.fillStyle = C.hse;
      ctx.beginPath();
      ctx.arc(5.4 * S, 0, 1.9 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // What the camera takes in: a narrow wedge from the lens down to the ground
  // right under it, and the patch of ground it falls on. Pale and low — a line
  // of sight, not a beam; the white of the picture itself belongs to the
  // flash. The patch lies flat on the planet, so it is squashed the way the
  // ground there is turned from us.
  function drawView(p, g, angle, a) {
    const lx = p.x + Math.cos(angle) * 5.4 * S, ly = p.y + Math.sin(angle) * 5.4 * S;
    // Wide enough to take in all four campuses at once — that is the picture
    // the whole block has been going towards.
    const half = Math.max(7 * S, R * 0.17);
    const dx = g.x - CX, dy = g.y - CY;
    const out = Math.hypot(dx, dy) || 1;
    const ux = dx / out, uy = dy / out;                  // away from the middle of the disc
    const tx = -uy, ty = ux;                             // along the limb
    const ra = half * Math.max(0.2, g.z), rb = half;     // the patch, squashed
    ctx.save();
    ctx.fillStyle = C.sat;
    // The wedge stands on that patch: its sides are the tangents from the lens
    // to the ellipse, so the light never reaches past the ground it lights.
    // Tangents are found in the space where the ellipse is a unit circle —
    // scaling is affine, so a tangent there is a tangent here.
    const ex = (lx - g.x), ey = (ly - g.y);
    const px = (ex * ux + ey * uy) / ra, py = (ex * tx + ey * ty) / rb;
    const far = Math.hypot(px, py);
    if (far > 1.02) {
      const mid = Math.atan2(py, px), spread = Math.acos(1 / far);
      ctx.globalAlpha = 0.3 * a;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      for (const side of [-1, 1]) {
        const w = mid + side * spread;
        const along = Math.cos(w) * ra, across = Math.sin(w) * rb;
        ctx.lineTo(g.x + ux * along + tx * across, g.y + uy * along + ty * across);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.5 * a;
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.beginPath();
    ctx.ellipse(0, 0, ra, rb, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A glint on the lens once it has settled: one small spark that comes up
  // and eases down to a steady point, the camera ready — the only light the
  // block itself makes.
  function drawGlint(p, angle, t) {
    const lx = p.x + Math.cos(angle) * 5.4 * S, ly = p.y + Math.sin(angle) * 5.4 * S;
    const k = Math.max(0, t) / 600;
    const size = (k < 1 ? 2 + 6 * Math.sin(Math.PI * k) : 2) * S;
    ctx.save();
    ctx.globalAlpha = k < 1 ? 0.6 + 0.4 * Math.sin(Math.PI * k) : 0.7;
    ctx.strokeStyle = C.sat;
    ctx.fillStyle = C.sat;
    ctx.lineWidth = Math.max(0.7, 0.8 * S);
    ctx.beginPath();
    ctx.moveTo(lx - size, ly); ctx.lineTo(lx + size, ly);
    ctx.moveTo(lx, ly - size); ctx.lineTo(lx, ly + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(lx, ly, 1.1 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Имя спутника. Оно всегда целиком в кадре: сцена теперь во весь экран, и
  // аппарат, вышедший к его краю, уводил имя за край — читатель видел «Cube»
  // и «-HSE». Коробка строки загоняется в кадр, а если после этого она легла
  // на сам аппарат, уходит от него вверх или вниз: подпись называет аппарат,
  // а не закрывает его.
  function drawLabels(list) {
    if (R < 110 || !list.length) return;
    const size = Math.round(11 * S + 1);
    const pad = 6;
    const top = band().top + size * 0.7;
    const low = H - pad - size * 0.7;
    const hold = (v) => Math.max(top, Math.min(low, v));
    const near = 13 * S;
    ctx.save();
    ctx.fillStyle = C.label;
    ctx.font = `600 ${size}px 'HSE Sans', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // A name crosses the lit side of the planet as often as the sky, so it
    // carries its own bit of night with it.
    ctx.shadowColor = 'rgba(6, 14, 30, 0.9)';
    ctx.shadowBlur = 5;
    const set = [];
    list.forEach(({ sat, x, y, alpha }) => {
      const w = ctx.measureText(sat.name).width;
      const d = Math.max(1, Math.hypot(x - CX, y - CY));
      const ux = (x - CX) / d, uy = (y - CY) / d;
      // Имя стоит с той стороны аппарата, в которую тот смотрит от середины
      // планеты: так оно уходит от шара, а не ложится на него.
      let lx = Math.max(pad, Math.min(W - pad - w, x + ux * 17 * S - (ux >= 0 ? 0 : w)));
      let ly = hold(y + uy * 17 * S);
      // Загнанная в кадр строка могла лечь на сам аппарат — тогда она отходит
      // от него по вертикали, вниз от верхней половины кадра и вверх от
      // нижней: подпись называет аппарат, а не закрывает его.
      if (Math.abs(ly - y) < near && lx < x + near && lx + w > x - near) {
        ly = hold(y + (y < H / 2 ? 1 : -1) * (near + size * 0.8));
      }
      // И не на чужое имя: две орбиты то и дело сходятся на экране, и два
      // названия ложились одно поверх другого в нечитаемую кашу.
      for (let guard = 0; guard < 5; guard++) {
        const hit = set.find((b) => Math.abs(b.ly - ly) < size * 1.2
          && lx < b.lx + b.w + 4 && lx + w > b.lx - 4);
        if (!hit) break;
        const to = hold(hit.ly + (ly >= hit.ly ? 1 : -1) * size * 1.35);
        if (to === ly) break;
        ly = to;
      }
      set.push({ lx, ly, w });
      ctx.globalAlpha = alpha;
      ctx.fillText(sat.name, lx, ly);
      ctx.fillText(sat.name, lx, ly);
    });
    ctx.restore();
  }

  function drawFlare(x, y, p) {
    const r = (4 + 26 * p) * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, C.burn);
    g.addColorStop(1, 'rgba(255, 138, 61, 0)');
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Первый кадр главы — про четыре города, которыми читатель ходил всю
  // страницу: отсюда они умещаются в один палец. Тонкое кольцо говорит, куда
  // смотреть; с приходом первого спутника оно гаснет.
  function drawHome(a) {
    if (a <= 0.01) return;
    const pts = CITIES.map((c) => CITY_AT[c.key]).filter(Boolean)
      .map((place) => put(place[0], place[1] - spin, R))
      .filter((p) => p.z > 0);
    if (!pts.length) return;
    let x = 0, y = 0;
    pts.forEach((p) => { x += p.x / pts.length; y += p.y / pts.length; });
    const far = pts.reduce((m, p) => Math.max(m, Math.hypot(p.x - x, p.y - y)), 0);
    const rr = Math.max(14 * S, far + Math.max(12, R * 0.09));
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.globalAlpha = a * 0.1;
    ctx.fillStyle = C.sat;
    ctx.fill();
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = C.sat;
    ctx.lineWidth = Math.max(1, 1.2 * S);
    ctx.stroke();
    ctx.restore();
  }

  function paint() {
    fit();
    resize();
    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawGlobe();
    drawHome(homeK);

    // Имена собираются по дороге и ставятся после всех: каждое из них должно
    // знать, где уже стоят соседи.
    const names = [];
    SATS.forEach((sat) => {
      if (sat.born === null) return;
      const dying = sat.died === null ? 0 : Math.min(1, (clock - sat.died) / BURN_MS);
      if (dying >= 1) return;
      const p = onOrbit(sat, sat.u);
      const next = onOrbit(sat, sat.u + 0.02);
      // Behind the planet it is not taken away, only turned down: half the
      // lap is spent back there, and a satellite that vanished for four
      // seconds at a time would look like a fault.
      const away = hidden(p) ? 0.38 : 1;
      // Flying, a cubesat points the way it goes. Taking a picture, it turns
      // the end with the camera in it down, to the middle of the planet.
      let angle = Math.atan2(next.y - p.y, next.x - p.x);
      let aimed = 0;
      // What the camera looks at. Flying, that is the ground right under it:
      // the same place on the orbit, brought down to the surface. Seen from
      // the front it can sit almost behind the satellite; then the camera
      // simply faces into the picture, the way the middle of the planet lies.
      // Taking its picture, it looks at the campuses instead — the globe is
      // turned a little past the point right over them so that the four marks
      // face the reader, and a camera that went on staring straight down would
      // leave them outside its own frame. A satellite that can be pointed is
      // how this is done for real, and the lean of the frame shows it.
      const under = sat.aim ? put(MIDDLE[0], MIDDLE[1] - spin, R)
        : onOrbit(sat, sat.u, R);
      if (sat.aim) {
        const q = (clock - sat.aim.t0 - AIM_MS * (AIM_COME - 0.05))
          / (AIM_MS * (AIM_TURN - AIM_COME + 0.05));
        aimed = q <= 0 ? 0 : q >= 1 ? 1 : 1 - Math.pow(1 - q, 3);
        const far = Math.hypot(under.x - p.x, under.y - p.y) > 3;
        let turn = (far ? Math.atan2(under.y - p.y, under.x - p.x)
          : Math.atan2(CY - p.y, CX - p.x)) - angle;
        turn -= Math.round(turn / (Math.PI * 2)) * Math.PI * 2;
        angle += turn * aimed;
      }
      drawOrbit(sat, (1 - dying) * (sat.died === null ? 1 : 0.5));
      if (dying > 0) drawFlare(p.x, p.y, dying);
      // The frame brightens as the picture is taken.
      // Снимок назначен вперед — на конец доворота, — так что до него счет
      // отрицательный и затвора еще нет.
      const since = sat.shot === null ? -1 : clock - sat.shot;
      const taking = since < 0 ? 0 : Math.max(0, 1 - since / 500);
      if (aimed > 0 && !hidden(p)) drawView(p, under, angle, aimed * (1 + taking));
      drawBody(p.x, p.y, angle, away * (1 - dying), aimed);
      if (since >= 0 && !hidden(p)) drawGlint(p, angle, since);
      if (!dying) names.push({ sat, x: p.x, y: p.y, alpha: hidden(p) ? 0.45 : 1 });
    });
    drawLabels(names);
  }

  // ---------- Time ----------
  let clock = 0;
  let spin = 45;              // European Russia faces us to start with
  // Кольцо вокруг четырех городов: единица на первом кадре, ноль дальше.
  let homeK = 0;
  let homeTo = 0;
  let raf = null;
  let last = 0;

  // A satellite draws its own orbit as it arrives, so it has a whole lap to
  // fly in the time of one long beat instead of the eight seconds a lap
  // takes. It sets off fast and settles into its own pace by the end of it:
  // the average of this over the arrival is exactly the lap.
  const rush = (p) => (p >= 1 ? 1 : 1 + 11 * (1 - p) * (1 - p));

  function frame(now) {
    const dt = Math.min(64, now - last);
    last = now;
    clock += dt;
    // While the reader holds the globe it stays where the hand puts it; let
    // go with a flick and it carries on that way, slowing into its own turn.
    if (frozen && !steer && !drag) {
      // Held over the campuses: no turn of its own. A flick of the hand still
      // carries and dies out, and then it stands still again.
      spin += fling * dt;
      fling *= Math.exp(-dt / 450);
      if (Math.abs(fling) < 1e-4) fling = 0;
    } else if (steer && !drag) {
      // Turned round to bring the campuses under the satellite, then left to
      // its own turn again.
      const p = Math.min(1, (clock - steer.t0) / (AIM_MS * AIM_COME));
      spin = steer.from + (steer.to - steer.from) * (1 - Math.pow(1 - p, 3));
      if (p >= 1) steer = null;
    } else if (!drag) {
      // `fling` is how fast the hand was changing the turn, sign and all, so
      // it carries on the same way: added, not taken away like the day's turn.
      spin += fling * dt - (dt / (LAP_MS * DAY_LAPS)) * 360;
      fling *= Math.exp(-dt / 450);
      if (Math.abs(fling) < 1e-4) fling = 0;
    }
    // Кольцо городов приходит и уходит плавно — оно указывает, а не мигает.
    if (homeK !== homeTo) {
      const step = dt / 420;
      homeK = homeTo > homeK ? Math.min(homeTo, homeK + step) : Math.max(homeTo, homeK - step);
    }
    // Наезд идет вместе с доворотом: камера подходит ровно тогда, когда
    // спутник поворачивается объективом к Земле.
    const flying = SATS[SATS.length - 1];
    if (cam && flying.aim) {
      const p = Math.min(1, Math.max(0, (clock - flying.aim.t0) / (AIM_MS * AIM_TURN)));
      camK = 1 - Math.pow(1 - p, 3);
    }
    SATS.forEach((sat) => {
      if (sat.born === null) return;
      if (sat.aim) {
        // Round to the point over the campuses, and there it stops dead: the
        // globe stops with it, and the reader is left a still picture to read
        // the line over for as long as they like.
        const a = sat.aim;
        const p = Math.min(1, (clock - a.t0) / (AIM_MS * AIM_COME));
        sat.u = a.from + (a.to - a.from) * (1 - Math.pow(1 - p, 3));
        return;
      }
      const p = (clock - sat.born) / ARRIVE_MS;
      sat.u += (dt / LAP_MS) * Math.PI * 2 * rush(p);
    });
    paint();
    raf = requestAnimationFrame(frame);
  }

  function run(on) {
    if (still) { paint(); return; }
    if (on && raf === null) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    if (!on && raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  // ---------- Turning it by hand ----------
  // Held with the left button, the globe turns about its own axis with the
  // mouse, and about nothing else: it is the Earth, not a ball, and it keeps
  // the lean it has in every picture of it. The orbits are not part of the
  // planet and stay where they are.
  //
  // Пальцем — тоже, но только поперек экрана: вдоль него ведут страницу, и
  // отнять это у читателя нельзя — шар занимает полэкрана, листать было бы
  // нечем. Поэтому палец шару не отдается сразу: он лег, и пока не стало
  // видно, куда ведет, не делает ничего. Повел поперек — шар его забирает
  // (каркас это видит по классу page-turns и такта не играет, см. вертят()
  // в lib/stepper.js); повел вдоль или стукнул на месте — шар отпускает, и
  // страница читается как обычно.
  let drag = null;
  let steer = null;             // a turn the story asks for, see step()
  let frozen = false;           // ... and the stop it asks for after that
  let fling = 0;                // change of the turn per ms a flick leaves behind
  const TURN_PULL = 8;          // px: столько палец идет, прежде чем решить

  // За шар берется и курсор, и палец — каркасу это видно отсюда.
  canvas.classList.add('page-turns');

  // Рука взяла шар: история больше им не распоряжается.
  const take = (e) => {
    drag.x = e.clientX;
    drag.t = performance.now();
    drag.v = 0;
    drag.ждет = false;
    fling = 0;
    steer = null;               // the hand wins over the story
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  };

  canvas.addEventListener('pointerdown', (e) => {
    const палец = e.pointerType !== 'mouse';
    if (!палец && e.button !== 0) return;
    if (!палец) e.preventDefault();
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), v: 0, ждет: палец };
    if (!палец) take(e);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.ждет) {
      const пошел = e.clientX - drag.x;
      const вниз = e.clientY - drag.y;
      if (Math.abs(пошел) < TURN_PULL && Math.abs(вниз) < TURN_PULL) return;
      // Вдоль экрана — это страница, и шар отходит в сторону на весь жест.
      if (Math.abs(пошел) <= Math.abs(вниз)) { drag = null; return; }
      take(e);
      return;
    }
    // A point under the cursor moves with it: one radius of the globe
    // dragged is one radian of turn.
    const perPx = 180 / Math.PI / Math.max(1, R);
    const dx = e.clientX - drag.x;
    const now = performance.now();
    spin -= dx * perPx;
    const v = (-dx * perPx) / Math.max(1, now - drag.t);
    drag.v = drag.v * 0.6 + v * 0.4;
    drag.x = e.clientX;
    drag.t = now;
    if (raf === null) paint();
  });

  const letGo = (e) => {
    if (!drag) return;
    // Палец лег и ушел, так и не повернув ничего: это стук по картинке, и
    // шару с него взять нечего — ни поворота, ни разгона.
    if (drag.ждет) { drag = null; return; }
    // A hand held still before letting go leaves nothing behind.
    const idle = performance.now() - drag.t;
    // Capped, so that even a hard flick carries the globe on by a sixth of a
    // turn or so rather than spinning the campuses out of sight.
    fling = still || idle > 80 ? 0 : Math.max(-0.15, Math.min(0.15, drag.v));
    drag = null;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener('pointerup', letGo);
  canvas.addEventListener('pointercancel', letGo);

  // Nothing turns while the block is off the screen.
  let near = false;
  const watch = new IntersectionObserver((rows) => {
    near = rows.some((row) => row.isIntersecting);
    run(near && started);
  }, { rootMargin: '200px 0px' });
  watch.observe(root.closest('.viz-section') || root);
  document.addEventListener('visibilitychange', () => run(near && started && !document.hidden));

  // Where a satellite stands when it is right over the campuses: the point of
  // its orbit at their latitude, on the half of the pass that goes north, and
  // the turn of the globe that brings them under it.
  const overhead = (sat) => {
    const u = Math.asin(Math.max(-1, Math.min(1, Math.sin(MIDDLE[0] * RAD) / sinI)));
    const psi = sat.node + Math.atan2(cosI * Math.sin(u), Math.cos(u)) / RAD;
    return { u, spin: MIDDLE[1] - psi + FACE };
  };

  // Куда наезжает камера на последнем такте: середина между аппаратом и
  // метками, над которыми он встанет. Считается на базовом кадре — иначе
  // наезд гнался бы за собственным следом, — и каждый раз заново, потому что
  // базовый кадр меняется с окном.
  function aimAt(sat) {
    const o = overhead(sat);
    const a = orbitAngles(sat, o.u);
    const g = at(MIDDLE[0], MIDDLE[1] - o.spin, R0);
    const p = at(a.phi, a.psi, RO0);
    const b = band();
    const free = Math.max(80, H - b.top - b.bottom);
    return {
      // Насколько ближе — спрашивается у кадра, а не пишется числом: шар
      // меряется шириной экрана, а свободная высота у телефона вдвое больше
      // ее. Одна и та же доля оставляла бы на высоком экране полкадра пустого
      // неба над планетой.
      k: Math.max(1.4, Math.min(2.1, (free * 0.6) / R0)),
      bx: CX0 + (g.dx + p.dx) / 2,
      by: CY0 + (g.dy + p.dy) / 2,
      sx: CX0,
      // И стоит аппарат выше середины: под ним остается Земля, а над ним
      // только небо — кадр, поставленный ровно по центру, выходил пустым
      // сверху.
      sy: b.top + free * 0.33
    };
  }

  // ---------- The story ----------
  // Each of them sets off a little before the point of its own orbit that is
  // nearest to us, so the lap it draws on the way in starts in plain sight
  // and crosses the face of the planet rather than the back of it.
  const nearestU = (sat) => {
    let best = 0, top = -2;
    for (let u = 0; u < Math.PI * 2; u += 0.05) {
      const z = onOrbit(sat, u).z;
      if (z > top) { top = z; best = u; }
    }
    return best - 0.9;
  };

  SATS.forEach((sat) => {
    sat.born = null;
    sat.died = null;
    sat.aim = null;
    sat.shot = null;
    sat.start = nearestU(sat);
    sat.u = sat.start;
    sat.uIn = sat.start;
  });

  let started = false;
  let shown = -1;

  function say(i) {
    noteEl.innerHTML = STORY[i].line;
    subEl.textContent = STORY[i].sub;
    // Строка стоит в самой сцене, и кадр для шара считается по ней: сколько
    // в ней строк — столько сверху и занято.
    measure();
  }

  // The page opens this block: the reader has just come to it, by beats or
  // straight from the bar, and whatever has been going on here while they were
  // elsewhere starts over. The block is put together long before they get to
  // it, and the Earth has been turning all that while — set back, it meets them
  // with the side of it the university is on.
  function open() {
    spin = 45;
    steer = null;
    // A flick of the hand carries the globe on and dies out in half a second —
    // but only while the block is on the screen, and nothing turns here while
    // it is not. Left in, it would be waiting to go off when the reader came
    // back, and the globe would set off from under their hand.
    fling = 0;
    frozen = false;
    shown = -1;
    // Камера тоже возвращается к своему началу: наезд — такое же положение
    // картинки, как поворот планеты.
    cam = null;
    camK = 0;
    homeK = 0;
    homeTo = 0;
    // Снимок — такое же положение картинки, как поворот планеты: вернувшись
    // в раздел, читатель застает спутник над Вышкой и кнопку под ним, а не
    // уже отснятый кадр.
    snapped = false;
    SATS.forEach((sat) => {
      sat.born = null;
      sat.died = null;
      sat.aim = null;
      sat.shot = null;
      sat.u = sat.start;
      sat.uIn = sat.start;
    });
    // On a phone the story is told by the scroll, and the reader can come back
    // to the middle of it: the run says where they are, and the block is put
    // back to that, not to the beginning of the story.
    if (narrow.matches) follow(true);
    paint();
  }

  function step(i) {
    const jumped = i !== shown + 1 && shown !== -1;
    const instant = still || shown === -1 || jumped;
    const last = i >= BURN;
    const count = Math.min(i, SATS.length);

    SATS.forEach((sat, k) => {
      const on = k < count;
      if (on && sat.born === null) {
        // Put there rather than flown in: each of them stands on the side of
        // its orbit that faces us, a little apart from the others, and its
        // ring is there whole from the first frame.
        if (instant) sat.u = sat.start + 0.9 + (k - 1) * 1.1;
        sat.born = instant ? clock - ARRIVE_MS : clock;
        sat.uIn = instant ? sat.u - Math.PI * 2 : sat.u;
      }
      if (!on) { sat.born = null; sat.died = null; }
      // The first two came down; the last beat is where the page says so.
      const dies = last && k < 2;
      if (dies && sat.died === null) sat.died = instant ? clock - BURN_MS : clock;
      if (!dies) sat.died = null;
      // The one still flying comes round to face us and takes its picture.
      const aims = on && i >= HOLD && k === SATS.length - 1;
      if (aims && !sat.aim) {
        // Wherever the globe and the satellite happen to be, both are brought
        // round: the campuses to face us, the satellite to the point of its
        // orbit right over them.
        const over = overhead(sat);
        const to = over.u + Math.PI * 2 * Math.ceil((sat.u - over.u) / (Math.PI * 2));
        const turn = over.spin + 360 * Math.round((spin - over.spin) / 360);
        if (instant) {
          sat.aim = { from: to, to, t0: clock - AIM_MS, extra: 0 };
          // И сам аппарат уже там. Довозит его до этой точки часовой цикл,
          // а он при мгновенном такте не идет вовсе: при «меньше движения»
          // его нет совсем, а на прыжке по полоске такт доигрывается разом.
          // Без этой строки читатель заставал объектив, нацеленный на Вышку
          // откуда-то из-за края кадра.
          sat.u = to;
          spin = turn;
          steer = null;
        } else {
          sat.aim = { from: sat.u, to, t0: clock, extra: 0 };
          steer = { from: spin, to: turn, t0: clock };
        }
        // И камера подходит ближе: аппарат с объективом и четыре метки под
        // ним занимают кадр, остальное уходит за край. Это конец главы —
        // дальше вспышка и снимок.
        cam = aimAt(sat);
        camK = instant ? 1 : 0;
      }
      if (!aims) {
        sat.aim = null;
        if (i < HOLD) steer = null;
        if (k === SATS.length - 1) { cam = null; camK = 0; }
      }
      // The picture is taken on the beat after that, and the flash it goes off
      // in belongs to the same beat — the shell draws that part.
      // На телефоне снимок делает читатель: такт приводит спутник к Вышке и
      // отдает кнопку, а снимает она (см. shoot ниже).
      const shoots = aims && i >= SHOT && (!narrow.matches || snapped);
      if (shoots && sat.shot === null) sat.shot = instant ? clock - 600 : clock + AIM_MS;
      if (!shoots) sat.shot = null;
    });

    // From the beat it comes round over the campuses, the globe stops turning
    // on its own: the reader needs the picture still to read the line over it.
    //
    // И на первом кадре тоже: он про четыре города, и города эти должны
    // стоять лицом к читателю, сколько бы он на них ни смотрел. Шар крутится
    // оборот за две минуты — а блок собирается задолго до того, как до него
    // дошли, и к приходу читателя Вышка успевала уехать за край.
    frozen = i >= HOLD || i === 0;

    // Кольцо вокруг четырех городов — только на первом кадре: дальше глава
    // про то, что летает над ними.
    homeTo = i === 0 ? 1 : 0;
    if (instant) homeK = homeTo;

    // Кнопка приходит с последним тактом и уходит со снимком. Назад, к
    // прошлым тактам, уходит и сам снимок — значит, просить о нем можно снова.
    if (i < SHOT) snapped = false;
    if (shotEl) shotEl.hidden = !narrow.matches || i < SHOT || snapped;

    shown = i;
    say(i);
    if (!started) { started = true; run(near); }
    if (still) paint();
  }

  // ---------- Снимок рукой ----------
  // На широком экране спутник снимает сам: последний такт разворачивает его
  // объективом к Земле, и вспышка этого снимка — занавес, в котором приходит
  // финал. На телефоне тактов нет, историю ведет прокрутка — а прокрутка не
  // умеет остановиться на кадре и не умеет закрыть занавес. Поэтому снимает
  // читатель: такт приводит спутник к Вышке и отдает кнопку.
  //
  // Дальше все то же самое, только по очереди: круглая вспышка на линзе —
  // та же, что и на широком экране, — а за ней белый экран и финал,
  // проступающий из белого. Вспышку играет каркас (`story:flash`).
  // Блик на линзе; 500мс горит, остаток на спад. При «меньше движения»
  // переход сокращается до отклика на нажатие: занавес каркас там не играет
  // вовсе, и ждать полсекунды читателю не за чем.
  const GLINT_MS = still ? 160 : 560;
  if (shotEl) shotEl.addEventListener('click', () => {
    if (snapped) return;
    snapped = true;
    shotEl.hidden = true;
    // Не через step(): шаг с тем же номером считается прыжком и ставит
    // снимок сразу сделанным, без вспышки. Снимает тот спутник, который
    // остался на орбите и уже смотрит вниз.
    const sat = SATS[SATS.length - 1];
    if (sat.shot === null) sat.shot = clock;
    // При «меньше движения» цикл отрисовки не идет вовсе, и кадр со вспышкой
    // некому нарисовать: рисуем его сами, один раз.
    paint();
    setTimeout(() => {
      root.dispatchEvent(new CustomEvent('story:flash', { bubbles: true }));
    }, GLINT_MS);
  });

  // ---------- The story on a phone ----------
  // There the page is not read in beats: nothing calls step() but the shell,
  // once, with the last of them — so the block stood there with all three
  // satellites up and not one line of the story was ever read. The travel is
  // in the markup (see .space-run), and this walks it: every stretch of it is
  // one more step. Scrolling back takes the satellites down again, the way
  // going back a beat does.
  const runEl = $('run');
  const colEl = root.querySelector('.col-right');
  let told = -1;
  const LAST = meta.steps - 1;

  function follow(force) {
    // The picture is pinned to the top of the screen while the run goes by
    // under it — but only until the end of the run comes up to meet it, and
    // the last screenful of travel is the picture leaving. The story is told
    // over what is left, so that the picture it is taking is still there when
    // it takes it.
    const span = runEl.offsetHeight - colEl.offsetHeight;
    if (span <= 0) return;
    const gone = -runEl.getBoundingClientRect().top;
    const p = Math.min(1, Math.max(0, gone / span));
    // The last stretch belongs to the picture being taken, and so does
    // everything past the end of the travel.
    const i = Math.min(LAST, Math.floor(p * (LAST + 1)));
    if (i === told && !force) return;
    told = i;
    step(i);
  }

  if (narrow.matches) {
    window.addEventListener('scroll', () => follow(), { passive: true });
    window.addEventListener('resize', () => follow());
    follow(true);
  }

  // How far the next step is: the same travel as follow() walks, read the
  // other way round.
  //
  // Путь начинается не у верха экрана, а под прибитой колонкой — и пока он до
  // нее не дошел, пройденного еще нет. «Впереди ничего» в этом месте значит
  // другое: блок уже на экране, шар на нем стоит, и следующее состояние —
  // первый спутник — лежит за началом пути. Без этой остановки каркасу некуда
  // было вести, и такт уходил на полтора экрана: планета, а следом сразу два
  // спутника, через голову первого.
  const ahead = () => {
    if (!narrow.matches) return 0;
    const span = runEl.offsetHeight - colEl.offsetHeight;
    if (!(span > 0)) return 0;
    const gone = -runEl.getBoundingClientRect().top;
    const first = stepAhead(0, span, LAST + 1);
    return gone < 0 ? Math.ceil(-gone) + first : stepAhead(gone, span, LAST + 1);
  };

  // И назад — до предыдущего состояния, по тем же отрезкам. Без своего числа
  // назад оставались одни границы разделов, и шаг назад из снимка уносил через
  // всю историю: спутники, вспышки и приход на орбиту проносились за одно
  // движение. До начала пути отвечать нечего — там дорогу назад знает открытие.
  const behind = () => {
    if (!narrow.matches) return 0;
    const span = runEl.offsetHeight - colEl.offsetHeight;
    if (!(span > 0)) return 0;
    const walked = -runEl.getBoundingClientRect().top;
    const stretch = span / (LAST + 1);
    const i = Math.min(LAST, Math.floor(walked / stretch));
    // С первого спутника назад — к приходу блока, а не к началу пути: шар на
    // экране и там и там, и такт между ними не менял бы ничего. Туда дорогу
    // знает открытие, его последняя остановка — верх блока.
    if (i <= 1) return 0;
    return Math.max(0, Math.round(walked - ((i - 1) * stretch + 1)));
  };

  paint();

  return {
    // On a phone the run tells the story and the shell does not: its one call,
    // with the last step, would be the end of it before it had begun.
    step: narrow.matches ? () => {} : step,
    open,
    ahead,
    behind,
    // A satellite drawing its own orbit takes longer than a beat, the two that
    // come down take their time burning up, and the last one takes its time
    // turning to the ground.
    span: (i) => {
      if (still || narrow.matches) return 0;
      // The two flares run 900ms; the rest is for the line under them. It was
      // 2200 while that line counted its laps up — with the counting gone,
      // holding the wheel that long would be holding it on a still picture.
      if (i === BURN) return 1400;
      // Доворот и за ним снимок — один такт, и держать колесо нужно оба.
      if (i === HOLD) return AIM_MS + 600;
      return ARRIVE_MS;
    }
  };
}
