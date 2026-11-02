// Trains long enough to carry everyone the university admits in a year.
// They snake down the screen from the top left corner and disappear into the
// tunnel at the bottom right, only to come out of the first one again.

import { CITIES, ADMITTED } from '../data/hse.js';
import { nf, plural } from '../lib/format.js';
import { mountCanvas, onResize } from '../lib/ui.js';
import { loadMark } from '../lib/hse-mark.js';

// Facts about the transport itself — they live here, not in data/hse.js, which
// only knows about the university. 165 people is a packed metro car at rush
// hour, eight cars make one train; an electric bus holds 85.
const PER_CAR = 165;
const TRAIN = 8;
const PER_BUS = 85;

// Every city takes a whole number of cars and buses: nobody rides half of one.
const carsOf = (c) => Math.ceil(c.admitted / PER_CAR);
const busesOf = (c) => Math.ceil(c.admitted / PER_BUS);
const CARS_TOTAL = CITIES.reduce((n, c) => n + carsOf(c), 0);
const BUSES_TOTAL = CITIES.reduce((n, c) => n + busesOf(c), 0);
const TRAINS = Math.floor(CARS_TOTAL / TRAIN);

// The two ways to carry the same people. `of` is how many vehicles a city
// needs, the rest is what the cards and the legend say about them. The first
// one is where the block opens: the metro, the same one the reader has just
// ridden in through the doors.
const MODES = [
  {
    key: 'metro',
    label: 'На метро',
    of: carsOf,
    stop: 'станция',
    title: 'Вагонов метро',
    // What the picture shows, for a reader who cannot see it.
    picture: 'Путь змейкой через весь экран, по нему идут поезда метро',
    noun: ['вагон', 'вагона', 'вагонов'],
    legend: `1 поезд — ${TRAIN} вагонов, в каждом вагоне ${PER_CAR} человек`
  },
  {
    key: 'bus',
    label: 'На электробусе',
    of: busesOf,
    stop: 'остановка',
    title: 'Электробусов',
    picture: 'Дороги по числу городов, по ним едут электробусы',
    noun: ['электробус', 'электробуса', 'электробусов'],
    legend: `Это электробус. Он вмещает ${PER_BUS} ${plural(PER_BUS, 'вышкинца', 'вышкинца', 'вышкинцев')}`
  }
];

// The train is drawn from its last car forward, so the city drawn first ends
// up at the rear: Moscow brings up the rear and Perm leads.
const TAIL_FIRST = CITIES.slice();

// Whose colour every electric bus wears.
const MOSCOW = CITIES.find((c) => c.key === 'msk');

const HOLDS = `Он вмещает ${PER_BUS} ${plural(PER_BUS, 'вышкинца', 'вышкинца', 'вышкинцев')}`;

// The electric bus drawn after assets/electrobus.jpeg, with the caption painted
// along its side. It is needed twice — in the title card and in the legend of
// the picture — and the clip path inside it has to be named anew each time, or
// the second bus would be cut by the shape of the first.
function busPicture(id, cls, attrs = '') {
  const body = 'M116 30a22 22 0 0 1 22-22h396a22 22 0 0 1 22 22v78'
    + 'a8 8 0 0 1-8 8H124a8 8 0 0 1-8-8z';
  return `
    <svg class="${cls}" ${attrs} viewBox="110 0 452 132"
         role="img" aria-label="Это электробус. ${HOLDS}">
      <!-- the scallops are painted on the body, so they are cut by it -->
      <clipPath id="${id}"><path d="${body}"></path></clipPath>
      <!-- body: flat roof, both ends of the same shape, four lengths
           to one height as on the photograph -->
      <path d="${body}" fill="var(--ebus-body)"></path>
      <path d="M112 22q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0 q11-11 22 0v-16H112z" fill="var(--ebus-wave)" clip-path="url(#${id})"></path>
      <!-- windows, the two doors and the windscreen at the front -->
      <g fill="var(--ebus-glass)">
        <rect x="128" y="26" width="60" height="40" rx="7"></rect>
        <rect x="194" y="26" width="60" height="40" rx="7"></rect>
        <rect x="326" y="26" width="60" height="40" rx="7"></rect>
        <rect x="458" y="26" width="60" height="40" rx="7"></rect>
        <rect x="260" y="26" width="60" height="62" rx="7"></rect>
        <rect x="392" y="26" width="60" height="62" rx="7"></rect>
        <rect x="536" y="26" width="20" height="48" rx="6" clip-path="url(#${id})"></rect>
      </g>
      <!-- lights -->
      <rect x="540" y="92" width="14" height="12" rx="3" fill="var(--ebus-light)"></rect>
      <rect x="120" y="92" width="14" height="12" rx="3" fill="var(--ebus-stop)"></rect>
      <!-- the caption, painted right across the middle of the side -->
      <g text-anchor="middle" fill="#FFFFFF">
        <text x="330" y="60" font-size="34" font-weight="700">Это электробус.</text>
        <text x="330" y="86" font-size="20" font-weight="600">${HOLDS}</text>
      </g>
      <!-- wheels: whole, standing a fifth of themselves below the body -->
      <g>
        <circle cx="196" cy="106" r="17" fill="var(--bus-wheel)"></circle>
        <circle cx="196" cy="106" r="6.5" fill="var(--ebus-hub)"></circle>
        <circle cx="470" cy="106" r="17" fill="var(--bus-wheel)"></circle>
        <circle cx="470" cy="106" r="6.5" fill="var(--ebus-hub)"></circle>
      </g>
    </svg>`;
}

// The three sentences of the subtitle, told one by one. The reader gets the
// number of first-years first, then what it takes to carry them by bus, then
// the same by metro — each with the thing itself and how many of them.
const SAID = [
  `За одну приемную кампанию Вышка зачислила ${nf(ADMITTED)} ${plural(ADMITTED, 'первокурсника', 'первокурсника', 'первокурсников')}.`,
  `Чтобы увезти их всех разом, нужно ${nf(BUSES_TOTAL)} ${plural(BUSES_TOTAL, 'электробус', 'электробуса', 'электробусов')}.`,
  `А на метро — ${nf(CARS_TOTAL)} ${plural(CARS_TOTAL, 'вагон', 'вагона', 'вагонов')}, то есть ${TRAINS} ${plural(TRAINS, 'полный поезд', 'полных поезда', 'полных поездов')}`
];

export const meta = {
  id: 'metro',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Вагоны метро',
  // The title card of the section fills in as the reader scrolls: first the
  // heading with one sentence, then a sentence and a picture at a time.
  introStages: 3,
  // The number of first-year students carries over into the next block's
  // lead-in, «~22 000», rather than disappearing with this one.
  handoff: 'people',
  // The word before the name depends on what the reader is riding, so the
  // module changes it when the mode is switched. It starts as the station of
  // the metro, the mode the block opens in — the title card is up before the
  // module has said a word.
  // The name of the station is the station board itself — the same one in
  // both modes.
  // Размер табло повторен инлайном: стили модуля приезжают вместе с блоком, а
  // шапку каркас рисует раньше — и до их приезда файл вставал в свои
  // 1108 пикселей и распирал секцию втрое шире экрана. Карточка при этом
  // меряется по распертому заголовку, и на телефоне она выходила в экран
  // высотой с подзаголовок в пятнадцать строк.
  title: 'Следующая <span data-el="stop">станция</span> '
    + '<img class="metro-tablo" src="assets/tablo-vyshkinskaya.svg" alt="Вышкинская"'
    + ' style="display: inline-block; width: min(100%, 8.46em); height: auto;'
    + ' vertical-align: -0.4em">',
  // Everything below the first line belongs to the title card: the pictures
  // and the multipliers fold away as the card settles, and what is left reads
  // as the plain subtitle of the section. All of it is phrasing content — the
  // page shell puts the subtitle inside a <p>.
  subtitle: `
    <span class="metro-brief">
      <span class="metro-brief-line">${SAID[0]}</span>
      <span class="metro-brief-line intro-stage" data-stage="1">
        <span>${SAID[1]}</span>
        <span class="metro-brief-fig metro-brief-fig-bus">
          ${busPicture('ebus-brief', 'metro-brief-bus')}
          <span class="metro-brief-times">&times;&nbsp;${nf(BUSES_TOTAL)}</span>
        </span>
      </span>
      <span class="metro-brief-line intro-stage" data-stage="2">
        <span>${SAID[2]}</span>
        <span class="metro-brief-fig metro-brief-fig-train">
          <!-- the styles of the module arrive with the module, a moment after
               the shell has drawn the heading, and the file is 4956 px wide:
               this keeps it in the page for that moment -->
          <img class="metro-brief-train" style="max-width: 100%"
               src="assets/poezd.svg" alt="" aria-hidden="true">
          <span class="metro-brief-times">&times;&nbsp;<span
            class="metro-times-wide">${TRAINS}</span><span
            class="metro-times-phone" style="display: none">${nf(CARS_TOTAL)}</span></span>
        </span>
      </span>
    </span>`
};

export function init(root) {
  'use strict';

  // Узкий экран решает сразу несколько вещей — поля вокруг картинки, воздух
  // под табличками городов, что показывает легенда, — поэтому спрашивается он
  // один раз и здесь, до всего остального.
  const phone = window.matchMedia('(max-width: 860px)').matches;

  // Canvas has no CSS variables, so the palette is read once from the tokens —
  // read and not copied: a value written out here goes on being the old one
  // after the token beside it has changed, and nothing says so.
  const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const BUS_GLASS = token('--ebus-glass');
  const BUS_LIGHT = token('--ebus-light');
  const TAIL_LIGHT = token('--ebus-stop');
  const BUS_SHADOW = token('--city-shadow');
  const ROAD_FILL = token('--road-fill');
  const ROAD_EDGE = token('--road-edge');
  const ROAD_LINE = token('--road-line');
  const SIGN_BLUE = token('--sign-blue');
  const SIGN_EDGE = token('--sign-edge');
  const TUNNEL = token('--metro-tunnel');
  const GANGWAY = token('--metro-gangway');
  const BEAM_NEAR = token('--metro-beam');
  // The far end of the same beam, where it has faded out altogether: the same
  // colour at no opacity, which is nothing a token could say. Taken from the
  // near end rather than written out beside it — written out, it would go on
  // being the old colour after the token changed, and a gradient running from
  // one colour to another colour's nothing fades through a tint of neither.
  const clear = (colour) => {
    const rgb = colour.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) return `rgba(${rgb[1].split(',').slice(0, 3).join(',')}, 0)`;
    const hex = colour.match(/^#([0-9a-fA-F]{6})$/);
    return hex ? `#${hex[1]}00` : 'rgba(255, 214, 102, 0)';
  };
  const BEAM_FAR = clear(BEAM_NEAR);
  const HSE_BLUE = token('--hse-blue');

  // Поля вокруг картинки. На телефоне они вдвое меньше: там и самой картинки
  // вдвое меньше, а поезда с электробусами считаются от того, что осталось.
  const M = phone ? 10 : 22;
  const GAP = 0.26;             // coupling between cars, in car lengths
  const TRAIN_GAP = 4;          // gap between trains, same units
  // The track has as few turns as it can: a short snake is calmer to watch.
  // A shorter track means smaller cars, so the trains take most of it — there
  // is still a stretch of empty rails to show them coming out of the tunnel.
  const SHARE = 0.78;           // how much of the track all the trains take
  const MIN_CAR = 15;           // below this the nose and the roof stop reading, px
  const BEAM = 4.5;             // how far the headlights reach, in car widths
  const SPREAD = 0.45;          // half the angle of the light, radians
  const SEC_PER_ROW = 16;       // how long a train takes to cross one row

  // Length of the whole chain, in car lengths.
  const UNITS = CARS_TOTAL * (1 + GAP) + Math.ceil(CARS_TOTAL / TRAIN) * TRAIN_GAP;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Markup ----------
  // The score card is specific to this visualisation, so its styles live here
  // and not in layout.css.
  root.innerHTML = `
    <style>
      .metro-score {
        display: flex;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
      }

      .metro-score-value {
        font-size: 3.5rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .metro-score-note {
        font-size: 0.9375rem;
        color: var(--text-secondary);
      }

      /* The name of the station in the title of the section — the board of a
         carriage, with the name lit on it. The heading is drawn by the page
         shell, but the title belongs to this module, so the picture is styled
         here. Width, not height, sets the size: the board is 5,6 times as wide
         as it is tall, so on a narrow screen it shrinks whole instead of
         running past the edge.
         The numbers make the lit word sit in the line as if it were typed. In
         the file the board is 1108 by 198, and the lamps of the word run from
         52,2 to 145,8 down it — 93,6 tall. At 8,46em wide one unit of the file
         is 0,00764em, so the word comes out 0,715em tall, the cap height of
         the heading. Its feet stand 0,4em above the bottom edge of the board,
         so dropping the board by that much puts them on the baseline. */
      .metro-tablo {
        display: inline-block;
        width: min(100%, 8.46em);
        height: auto;
        vertical-align: -0.4em;
      }

      /* The subtitle of the section, which doubles as the title card. The card
         is what the reader meets first: the heading with one sentence, then a
         sentence and a picture at a time as they scroll. The shell squeezes
         each .intro-stage shut until its turn comes; everything here is about
         what happens afterwards, when the card settles into a plain subtitle.

         --intro-body is how far it has settled, 0 on the card and 1 in place.
         The pictures leave over that stretch and the blank lines between the
         sentences close up, so what is left is an ordinary paragraph.

         It happens in two goes, and never both at once. First --go: the
         vehicles drive off the way they are facing and fade as they go, the
         multiplier with them. Only once they are gone does --shut close the
         line they stood on and bring the sentences together. Doing both at
         once is what looked cheap: a row closing over a picture that is still
         there slices it, and the multiplier — plain text over the fold — came
         out sawn in half.

         Both windows are late in --intro-body on purpose. The card settles on
         an eased curve that covers most of its way in the first fifth of the
         beat, so an early window would flash by in under a tenth of a second;
         these take about two tenths and a half of a second of real time. */
      .metro-brief {
        --go: clamp(0, (0.75 - var(--intro-body, 1)) / 0.6, 1);
        --shut: clamp(0, (1 - var(--intro-body, 1)) / 0.35, 1);
        display: flex;
        flex-direction: column;
        gap: calc(var(--shut) * 1.8em);       /* two blank lines between them */
      }

      /* A plain block, not a column: the shell squeezes a stage shut by its
         height, and the parts of a flex column would be squeezed along with
         it — the block would then have nothing left to report as the height it
         wants to grow to. */
      .metro-brief-line {
        display: block;
      }

      /* The picture of a stage, with its multiplier beside it. Its height is
         written down rather than measured, so that closing the line is a
         matter of one number going to zero. */
      .metro-brief-fig {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: calc(var(--shut) * 0.5em);
        height: calc(var(--shut) * var(--fig-h));
        opacity: var(--go);
        transform: translateX(calc((1 - var(--go)) * var(--away, 0em)));
        overflow: hidden;
      }

      /* Leaving, each the way it is drawn to face: the bus has its windscreen
         on the right, the train its cab on the left. The multiplier goes with
         its vehicle, or the bus would drive into its own «× 260». They do not
         go far — enough to read as driving off rather than blinking out. */
      .metro-brief-fig-bus { --away: 2.4em; }
      .metro-brief-fig-train { --away: -2.4em; }

      .metro-brief-fig-bus { --fig-h: 48px; }
      .metro-brief-fig-train { --fig-h: 40px; }

      /* The bus keeps to the height of the row and takes the width that goes
         with it, but it gives that width up when the screen is too narrow for
         it and the multiplier both — the drawing then fits itself into what is
         left instead of running off the edge. */
      .metro-brief-bus {
        flex: 0 1 auto;
        min-width: 0;
        height: 100%;
        width: auto;
      }

      /* The train is 31 lengths to one height, so it takes the whole width it
         is given and object-fit finds the height that fits. */
      .metro-brief-train {
        flex: 1;
        min-width: 0;
        height: 100%;
        object-fit: contain;
        object-position: left center;
      }

      .metro-brief-times {
        flex: none;
        font-size: 1.375rem;
        font-weight: 700;
        color: var(--text);
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      /* On a phone the card is read on a screen it has to fit into whole — but
         the pictures had given up so much height that the bus was a sticker
         and the train a hairline. Both get it back; the room comes out of the
         width, see below. */
      @media (max-width: 860px) {
        .metro-brief-fig { gap: 8px; }
        .metro-brief-fig-bus { --fig-h: 44px; }
        .metro-brief-fig-train { --fig-h: 44px; }
        .metro-brief-times { font-size: 1.0625rem; }

        /* Поезд в двадцать восемь длин к одной высоте на телефоне —
           волосок: на всю ширину строки ему достается девять пикселей,
           и вагонов в нем не разглядеть. Поэтому здесь из поезда показан
           один головной вагон — ровно как у электробуса, одна машина и
           счет рядом. Обрезает его сам рисунок: cover тянет картинку по
           высоте коробки и отрезает все, что не влезло. Вагон взят средний, а
           не головной: у головного кабина и скошенный нос, и он читается как
           «вот поезд целиком», а счет рядом — вагонам. В файле вагоны стоят с
           шагом 612 единиц при высоте 173, средний из восьми начинается на
           2483-й, сам он шириной 602 — отсюда обе дроби. */
        .metro-brief-fig-train .metro-brief-train {
          flex: none;
          width: calc(var(--fig-h) * 3.48);
          height: 100%;
          object-fit: cover;
          object-position: calc(var(--fig-h) * -14.35) center;
        }

        /* И счет тогда не поездам, а вагонам: их число строка и называет
           первым. Инлайновый display: none на телефонном числе стоит в самой
           разметке — карточка играет до того, как приедут стили блока, и без
           него на экране мелькнуло бы «16134». Перебить инлайн можно только
           важностью. */
        .metro-brief-times .metro-times-wide { display: none; }
        .metro-brief-times .metro-times-phone { display: inline !important; }
      }

      /* The legend sample is a whole train, so it replaces the single bar of
         .canvas-legend-swatch with eight cars. It is painted by the same code
         as the trains on the track and at their size, lights and all. */
      .metro-legend-train {
        display: block;
        flex: none;
      }

      /* A whole train across the picture, under the legend of the metro mode. */
      .metro-train {
        display: block;
        width: 100%;
        height: auto;
        margin: 4px 0 22px;          /* the air that separates it from the roads */
      }

      /* The legend of the bus mode is the bus itself, drawn after the photo in
         assets/electrobus.jpeg, with the caption painted on its side. It keeps
         to the middle of the picture below it, whatever the width of the
         screen, while the little bus from the animation stays in the corner
         and an arrow runs between them. */
      .metro-bus-legend {
        position: relative;
        flex: 1;
        min-width: 0;
        height: 92px;
        /* line up with the picture, not the padding, and keep the same air
           above the animation as the metro mode has */
        margin: 0 -4px 16px;
      }

      .metro-legend-sample {
        position: absolute;
        left: 0;
        top: 4px;
        overflow: visible;             /* the shadow falls outside the body */
      }

      .metro-legend-arrow {
        position: absolute;
        left: 0;
        top: 0;
        overflow: visible;
      }

      .metro-legend-bus {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 0;
        height: 100%;
        width: auto;
      }

      /* На телефоне большой электробус из легенды уходит. Он занимал треть
         карточки, а дорогам под ним оставалось столько высоты, что ехавших
         по ним электробусов было не разглядеть вовсе — а они тут и есть
         ответ. Остается значок и подпись рядом, как у метро, а освободившееся
         забирают дороги. */
      @media (max-width: 860px) {
        .metro-legend-bus,
        .metro-legend-arrow { display: none; }

        .metro-bus-legend {
          flex: none;
          height: auto;
          margin: 0;
          display: flex;
          align-items: center;
        }

        /* Значок уже не того размера, что электробусы на дорогах, — там они
           в несколько пикселей. Размер здесь свой, читаемый. */
        .metro-legend-sample {
          position: static;
          top: auto;
          width: 30px;
          height: auto;
        }
      }

      /* The switch between the two modes stands above both columns, so the
         city cards and the score card start at the same height. */
      .metro-inner {
        flex: 1;
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .metro-cols {
        flex: 1;
        min-height: 0;
        display: flex;
        gap: 16px;
        align-items: stretch;
      }

      .metro-switch {
        flex: none;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 2px 0;
      }

      .metro-switch-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--check-inactive-label);
        cursor: pointer;
        user-select: none;
        transition: color 160ms ease;
      }

      .metro-switch-label.on {
        color: var(--text);
        font-weight: 600;
      }

      @media (max-width: 860px) {
        .metro-score-value { font-size: 2.5rem; }
        .metro-score-note { font-size: 0.875rem; }

        /* On phones the wrappers dissolve and the section itself lays out the
           picture, the switch and the cities. */
        .metro-inner,
        .metro-cols { display: contents; }

        /* Все, что ниже, — ради одного: картинка здесь и есть блок, а ей
           оставалась треть экрана. Остальное мелко повторяло сказанное.

           Поезд во всю ширину под легендой уходит: ровно те же вагоны едут
           по дорожкам под ним, только их там сто тридцать четыре. */
        .metro-train { display: none; }

        /* Числа под каждым городом — «16 803 принятых, 102 вагона» — тоже:
           сверху уже сказано, сколько принятых и сколько вагонов, а в карточке
           важно, какой это город и включен ли он. */
        .metro-inner .city-stats { display: none; }

        /* И освободившееся отдается картинке. Высота у нее не доля экрана, а
           остаток: все остальное в блоке — карточка с числом, переключатель и
           два ряда городов — занимает свои три с половиной сотни пикселей
           независимо от того, какой высоты телефон, и доля от экрана то не
           добирала до края, то вылезала за него. Было четыреста: под городами
           стояла еще строка кнопок «Снять все» и «Вернуть все», а на телефоне
           их больше нет — эти сорок пикселей достались поездам. Нижняя
           граница — для телефона, положенного на бок. */
        .metro-inner .canvas-card { height: max(200px, calc(100dvh - 360px)); }

        /* Картинка перестает быть прибитой: блок помещается на экран целиком,
           и прибивать ее не к чему — зато при прокрутке она наезжала на
           переключатели, и те уходили под нее. На низком экране все наоборот:
           там блок в экран не влезает, и прибитая картинка нужна, чтобы было
           видно, что меняется. */
        @media (min-height: 760px) {
          .metro-inner .col-right { position: static; }
        }

      }
    </style>

    <div class="metro-inner">
      <div class="metro-switch" data-el="modeSwitch">
        <span class="metro-switch-label" data-value="${MODES[0].key}">${MODES[0].label}</span>
        <button type="button" class="toggle" role="switch" aria-label="Везти электробусами, а не метро"><span class="toggle-knob"></span></button>
        <span class="metro-switch-label" data-value="${MODES[1].key}">${MODES[1].label}</span>
      </div>

      <div class="metro-cols">
        <div class="col-left">
          <div class="city-list" data-el="cityList"></div>
          <div class="actions">
            <button type="button" class="btn" data-el="clearAll">Снять все</button>
            <button type="button" class="btn" data-el="restoreAll">Вернуть все</button>
          </div>
        </div>

        <div class="col-right">
          <div class="meter-card">
            <div class="meter-title" data-el="scoreTitle"></div>
            <div class="metro-score">
              <span class="metro-score-value" data-el="count"></span>
              <span class="metro-score-note">на <span data-el="people"></span> принятых студентов</span>
            </div>
          </div>

          <div class="canvas-card">
            <div class="canvas-legend">
              <canvas class="metro-legend-train" data-el="legendTrain" aria-hidden="true"></canvas>
              <div class="metro-bus-legend" data-el="busLegend">
                <!-- the same bus as the ones driving on the roads below, seen
                     from above: the module sizes it to what they measure there -->
                <!-- drawn in the units of drawBus(): the body is 23,8 by 8,5,
                     and the shadow hangs past it, as it does on the road -->
                <svg class="metro-legend-sample" data-el="legendSample" viewBox="0 0 23.8 8.5" aria-hidden="true">
                  <rect x="1.2" y="1.4" width="23.8" height="8.5" rx="2.4" fill="var(--city-shadow)"></rect>
                  <rect x="0" y="0" width="23.8" height="8.5" rx="2.4" fill="var(--bus-body)"></rect>
                  <rect x="4" y="1.8" width="14.3" height="4.9" rx="1" fill="var(--bus-roof)"></rect>
                  <g fill="var(--ebus-glass)">
                    <rect x="20.4" y="0.9" width="2.4" height="6.7" rx="0.8"></rect>
                    <rect x="0.8" y="1.5" width="1.2" height="5.5"></rect>
                  </g>
                  <g fill="var(--ebus-light)">
                    <rect x="23" y="0.5" width="0.8" height="1.4"></rect>
                    <rect x="23" y="6.6" width="0.8" height="1.4"></rect>
                  </g>
                </svg>
                <!-- the arrow from one to the other, drawn by the module: how
                     far they stand apart depends on the width of the screen -->
                <svg class="metro-legend-arrow" data-el="legendArrow" aria-hidden="true">
                  <path data-el="arrowLine" fill="none" stroke="var(--ebus-arrow)" stroke-width="1.6"></path>
                  <path data-el="arrowHead" fill="var(--ebus-arrow)"></path>
                </svg>

                ${busPicture('ebus-legend', 'metro-legend-bus', 'data-el="legendBus"')}
              </div>
              <span data-el="legendText"></span>
            </div>
            <img class="metro-train" data-el="trainPic" src="assets/poezd.svg"
                 alt="" aria-hidden="true">
            <div class="canvas-wrap" data-el="canvasWrap"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (name) => root.querySelector(`[data-el="${name}"]`);

  // ---------- State ----------
  const state = {
    mode: MODES[0].key,
    active: { msk: true, spb: true, nn: true, perm: true }
  };

  const mode = () => MODES.find((m) => m.key === state.mode);

  // Vehicles currently on the screen, per city. Fractional while a city is
  // coming or going: the last one grows out of nothing and pushes the rest.
  const shown = {};
  let tween = null;                 // { from, to, t0 }

  const targets = () => {
    const out = {};
    CITIES.forEach((c) => { out[c.key] = state.active[c.key] ? mode().of(c) : 0; });
    return out;
  };

  // how: 'instant' — no animation at all (the first paint); 'fill' — grow from
  // an empty screen, used when the vehicles themselves change and the previous
  // count means nothing; otherwise the count moves from where it was.
  function animateTo(target, how) {
    if (how === 'instant') {
      Object.assign(shown, target);
      tween = null;
      return;
    }
    const from = {};
    CITIES.forEach((c) => { from[c.key] = how === 'fill' ? 0 : (shown[c.key] || 0); });
    tween = { from, to: target, t0: performance.now() };
  }

  // Moves `shown` towards the target — called once per painted frame.
  function tick(now) {
    if (!tween) return;
    const raw = Math.min(1, Math.max(0, (now - tween.t0) / 620));
    const p = 1 - Math.pow(1 - raw, 3);
    CITIES.forEach((c) => {
      const from = tween.from[c.key] || 0;
      shown[c.key] = from + (tween.to[c.key] - from) * p;
    });
    if (raw >= 1) tween = null;
  }

  // ---------- The track ----------
  // Rows of straight track joined by half-circle turns. The track is always
  // laid out for the whole university, so a car keeps the same size whatever
  // is selected — only the length of the train on it changes.
  // The fewest rows that keep a car big enough to see, counted in odd numbers,
  // plus one more turn on top: the snake reads better with a little more
  // winding. With that extra row the track ends in the bottom left corner,
  // and the mark of the university stands there instead. Where even the
  // tightest snake leaves the cars small (a phone), no row is added.
  function layout(w, h) {
    const fit = (rows) => {
      const dy = (h - 2 * M) / (rows - 1);
      const r = dy / 2;
      const straight = w - 2 * M - 2 * r;      // middle rows are the shortest
      if (straight < r * 2) return null;
      // The first and the last row are longer by r: they reach into the corner
      // instead of making a turn there.
      const len = rows * (w - 2 * M) + (rows - 1) * r * (Math.PI - 2);
      const car = (len * SHARE) / UNITS;
      const carW = Math.min(car * 0.42, dy * 0.4);
      return { rows, dy, r, straight, car, carW };
    };

    let last = null;
    for (let rows = 5; rows <= 13; rows += 2) {
      const L = fit(rows);
      if (!L) continue;
      last = L;
      if (L.car >= MIN_CAR) return fit(rows + 1) || L;
    }
    return last;
  }

  // Samples the whole snake into a polyline: everything else (cars, rails,
  // tunnels) is measured in pixels along it.
  function buildTrack(w, h) {
    const L = layout(w, h);
    const pts = [];
    const push = (x, y) => {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 0.01) pts.push({ x, y });
    };

    const STEP = 4;
    for (let i = 0; i < L.rows; i++) {
      const y = M + i * L.dy;
      const dir = i % 2 === 0 ? 1 : -1;       // even rows go right, odd ones left
      // A row keeps clear of the turn on the side where there is one; the very
      // first and the very last one reach into their corner instead.
      const from = dir === 1 ? M + (i ? L.r : 0) : w - M - (i ? L.r : 0);
      const to = dir === 1 ? w - M - (i < L.rows - 1 ? L.r : 0) : M + (i < L.rows - 1 ? L.r : 0);
      const n = Math.max(1, Math.ceil(Math.abs(to - from) / STEP));
      for (let k = 0; k <= n; k++) push(from + (to - from) * (k / n), y);

      if (i === L.rows - 1) break;
      const cx = to, cy = y + L.r;
      const n2 = Math.max(8, Math.ceil((Math.PI * L.r) / STEP));
      for (let k = 1; k <= n2; k++) {
        const a = -Math.PI / 2 + dir * Math.PI * (k / n2);
        push(cx + Math.cos(a) * L.r, cy + Math.sin(a) * L.r);
      }
    }

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    const len = cum[cum.length - 1];

    // The polyline shifted along its normal by `d` — the two rails are the
    // same line, moved aside.
    const offset = (d) => {
      const path = new Path2D();
      pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y;
        const m = Math.hypot(dx, dy) || 1;
        const x = p.x - (dy / m) * d, y = p.y + (dx / m) * d;
        if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
      });
      return path;
    };

    // The bed the track lies on: the same pale strip with darker edges as the
    // roads of the buses, with the cars riding down the middle of it. It is
    // never wider than 0,76 of a row, so the inner edge still fits a turn.
    const bedW = L.carW * 1.9;
    const bed = offset(0);
    const edges = [bedW / 2, -bedW / 2].map(offset);

    // Two rails, close enough to hide under a car and show between trains.
    const gauge = L.carW * 0.28;
    const rails = [gauge, -gauge].map(offset);

    // Sleepers across the bed, evenly spaced along the whole snake.
    const sleepers = new Path2D();
    const step = Math.max(5, L.car * 0.5);
    const half = bedW * 0.36;
    let next = step / 2;
    for (let i = 1; i < pts.length && next < len; i++) {
      while (cum[i] >= next && next < len) {
        const a = pts[i - 1], b = pts[i];
        const f = (next - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
        const dx = b.x - a.x, dy = b.y - a.y;
        const m = Math.hypot(dx, dy) || 1;
        const nx = (-dy / m) * half, ny = (dx / m) * half;
        const x = a.x + dx * f, y = a.y + dy * f;
        sleepers.moveTo(x - nx, y - ny);
        sleepers.lineTo(x + nx, y + ny);
        next += step;
      }
    }

    return {
      pts, cum, len, bed, bedW, edges, rails, sleepers,
      car: L.car, carW: L.carW, straight: L.straight, dy: L.dy
    };
  }

  let track = null, flock = null, trackKey = '';
  let mark = null;                  // the HSE mark, once it is loaded
  // When the current mode started: switching modes runs its animation from
  // the beginning rather than dropping the reader into the middle of it.
  let epoch = performance.now();

  // ---------- Canvas painting ----------
  // The picture is named here only so that it is announced as a picture at
  // all; what it says is written anew with every count — see updateScore.
  const { canvas, ctx } = mountCanvas($('canvasWrap'), paint, MODES[0].picture);

  // Point at `s` pixels along the track, plus the index of the sample after it.
  function at(s) {
    const clamped = Math.max(0, Math.min(track.len, s));
    let lo = 0, hi = track.cum.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (track.cum[m] < clamped) lo = m + 1; else hi = m;
    }
    const i = Math.max(1, lo);
    const s0 = track.cum[i - 1], s1 = track.cum[i];
    const f = s1 > s0 ? (clamped - s0) / (s1 - s0) : 0;
    const a = track.pts[i - 1], b = track.pts[i];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, i };
  }

  // Strokes the piece of the track between two marks with the current style.
  function strokeAlong(s0, s1) {
    const a = at(s0), b = at(s1);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    for (let i = a.i; i < b.i; i++) ctx.lineTo(track.pts[i].x, track.pts[i].y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // The piece between two marks, cut in two where it runs off the end of the
  // track: everything past the end comes back at its start.
  function pieces(s0, s1) {
    const a = ((s0 % track.len) + track.len) % track.len;
    const b = a + (s1 - s0);
    if (b <= track.len) return [[a, b]];
    return [[a, track.len], [0, b - track.len]];
  }

  // A rounded box filled on a context; `r` is one radius or four.
  //
  // Sizes are clamped before they are used. On a short window the track is
  // squeezed until a car comes out inside out, and roundRect answers a
  // negative side or radius by throwing — which took the whole block down to
  // a blank canvas. A car drawn too small to see is a far smaller loss.
  // The path of one, without filling it: a caller that wants to stroke it too
  // traces it itself.
  function boxPath(c, x, y, bw, bh, r) {
    const w = Math.max(0, bw), h = Math.max(0, bh);
    const lim = Math.min(w, h) / 2;
    const rr = Array.isArray(r) ? r.map((v) => Math.max(0, Math.min(v, lim)))
      : Math.max(0, Math.min(r, lim));
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, h, rr); else c.rect(x, y, w, h);
  }

  function fillBox(c, x, y, bw, bh, r) {
    boxPath(c, x, y, bw, bh, r);
    c.fill();
  }

  // Corners of a car: top-left, top-right, bottom-right, bottom-left. The
  // front is on the right. A metro train is the same at both ends, so the head
  // and the tail car both have a rounded nose on their outer end.
  function carRadii(len, w, car) {
    const round = Math.max(0, Math.min(w * 0.2, len / 2));
    const nose = Math.max(0, Math.min(w * 0.5, len / 2));
    return [
      car.tail ? nose : round, car.head ? nose : round,
      car.head ? nose : round, car.tail ? nose : round
    ];
  }

  // A car seen from above, in the same manner as the electric buses: the body
  // in the colour of the city, two roof units in its lighter shade. Both end
  // cars of a train have a cab: the windscreen and a pair of lamps, white at
  // the head and red at the tail — the same cab, turned the other way. Drawn
  // around the origin of `c`, x running forward; the shadow and the light of
  // the headlights are left to the caller.
  function drawCarBody(c, len, w, car) {
    const x0 = -len / 2, x1 = len / 2;
    c.fillStyle = car.city.color;
    fillBox(c, x0, -w / 2, len, w, carRadii(len, w, car));

    // Roof units, with a gap between them where the car is long enough.
    const r0 = x0 + (car.tail ? w * 0.72 : w * 0.22);
    const r1 = x1 - (car.head ? w * 0.72 : w * 0.22);
    const gapR = w * 0.22, rh = w * 0.48;
    c.fillStyle = car.city.colorLight;
    if (r1 - r0 > gapR * 3) {
      const mid = (r0 + r1) / 2;
      fillBox(c, r0, -rh / 2, mid - gapR / 2 - r0, rh, w * 0.08);
      fillBox(c, mid + gapR / 2, -rh / 2, r1 - mid - gapR / 2, rh, w * 0.08);
    } else if (r1 > r0) {
      fillBox(c, r0, -rh / 2, r1 - r0, rh, w * 0.08);
    }

    // A cab at one end: `front` for the head, otherwise the mirror image of it
    // at the tail.
    const cab = (front) => {
      c.fillStyle = BUS_GLASS;
      fillBox(c, front ? x1 - w * 0.6 : x0 + w * 0.34, -w * 0.36, w * 0.26, w * 0.72, w * 0.1);
      c.fillStyle = front ? BUS_LIGHT : TAIL_LIGHT;
      const lamp = front ? x1 - w * 0.22 : x0 + w * 0.1;
      fillBox(c, lamp, -w * 0.3, w * 0.12, w * 0.18, 0);
      fillBox(c, lamp, w * 0.12, w * 0.12, w * 0.18, 0);
    };
    if (car.head) cab(true);
    if (car.tail) cab(false);
  }

  // The light of the headlights on the bed ahead of a head car: a sector of a
  // circle with its point under the nose, fading out towards its arc. Around
  // the same origin as drawCarBody, and drawn before it, so the nose covers the
  // point. `reach` is the radius of the sector.
  function drawBeam(c, len, w, reach) {
    // Nothing to light up: on a window too short for the track the cars come
    // out smaller than their own headlights, and a circle of negative radius
    // is refused the same way a negative corner is.
    if (!(reach > 0)) return;
    const ax = len / 2 - w * 0.15;
    const glow = c.createRadialGradient(ax, 0, 0, ax, 0, reach);
    glow.addColorStop(0, BEAM_NEAR);
    glow.addColorStop(1, BEAM_FAR);
    c.fillStyle = glow;
    c.beginPath();
    c.moveTo(ax, 0);
    c.arc(ax, 0, reach, -SPREAD, SPREAD);
    c.closePath();
    c.fill();
  }

  // A car on the track. A car is rigid, so on a turn it sits on the chord
  // between its ends instead of bending with the rails.
  function drawCar(s0, s1, car) {
    const w = track.carW;
    pieces(s0, s1).forEach(([s, e]) => {
      const a = at(s), b = at(e);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.2) return;

      const place = (ox, oy) => {
        ctx.translate((a.x + b.x) / 2 + ox, (a.y + b.y) / 2 + oy);
        ctx.rotate(Math.atan2(dy, dx));
      };

      // The shadow falls the same way on every row, so it is shifted before
      // the car is turned along the track.
      ctx.save();
      place(w * 0.14, w * 0.18);
      ctx.fillStyle = BUS_SHADOW;
      fillBox(ctx, -len / 2, -w / 2, len, w, carRadii(len, w, car));
      ctx.restore();

      ctx.save();
      place(0, 0);
      // The light stops short of the next row: its edges must not reach the
      // bed of the neighbouring track.
      if (car.head) drawBeam(ctx, len, w, Math.min(w * BEAM, track.dy * 0.9));
      drawCarBody(ctx, len, w, car);
      ctx.restore();
    });
  }

  // The gangway between two cars of one train — a grey bellows, much narrower
  // than the cars, following the rails. Any darker and the couplings run
  // together into a dotted line under the whole train.
  function drawCoupling(s0, s1) {
    ctx.strokeStyle = GANGWAY;
    ctx.lineWidth = Math.max(1, track.carW * 0.36);
    ctx.lineCap = 'butt';
    pieces(s0, s1).forEach(([s, e]) => { if (e - s > 0.2) strokeAlong(s, e); });
  }

  // Both ends of the track, drawn over the cars so the train really slides
  // under them: the tunnel it comes out of, and the mark of the university it
  // drives into. Until the mark is loaded the far end is a tunnel too.
  function drawEnds() {
    // The portal is always a little wider than the bed it swallows.
    const h = Math.max(track.bedW + 4, Math.min(track.dy * 0.5, 26)), w = h * 0.55, r = h / 2;
    const first = track.pts[0], last = track.pts[track.pts.length - 1];

    ctx.fillStyle = TUNNEL;
    const portal = (x, y, dir) => {
      fillBox(ctx, x, y - h / 2, w, h, dir === 1 ? [4, r, r, 4] : [r, 4, 4, r]);
    };

    portal(first.x, first.y, 1);
    if (!mark) { portal(last.x - w, last.y, -1); return; }

    // The mark sits in the corner the track ends in, so it takes the margin
    // as its radius and no more.
    const size = Math.min(M - 1, track.dy * 0.5);
    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.scale(size / mark.r, size / mark.r);
    ctx.translate(-mark.cx, -mark.cy);
    ctx.fillStyle = HSE_BLUE;
    ctx.fill(mark.disc);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(mark.mark);
    ctx.restore();
  }

  // ---------- The buses ----------
  // A road of many lanes, buses driving left to right along it. A lane holds
  // the same number of buses as any other and loops into itself: the loop is a
  // screen plus one bus, so a bus leaves the screen at one edge and comes back
  // at the other one, never in the middle. Lanes are built for the whole
  // university — a bus keeps its size whatever is selected.
  const BUS_RATIO = 2.8;        // length : width of a bus seen from above
  const SEC_ACROSS = 13;        // how long a bus takes to cross the screen
  const SNUG = 0.72;            // how much of its cell a bus takes up
  const BLOCK = 0.5;            // the column is at most half the road long

  function signFontSize(w) {
    return Math.max(9, Math.min(15, w / 58));
  }

  // Every city gets a road of its own, wide enough for all of its buses, and
  // a sign with its name at the end of it. The roads are built for the whole
  // university, so they stay put — only the buses on them come and go.
  function buildFlock(w, h) {
    // The roads run the whole width of the picture; the signs stand at the
    // end of them, on the road itself.
    const font = signFontSize(w);
    const roadW = w;

    // Every road carries its sign above it, so each one needs a strip of
    // ground of its own on top. The sign stands closer to its own road than
    // to the one above, so it is clear whose name it is.
    // На телефоне воздуха над табличкой вчетверо меньше: эти полоски земли
    // съедали треть картинки, а дороги под ними выходили такими тонкими, что
    // электробусов на них было не разглядеть. Город при этом назван дважды —
    // табличкой и переключателем под картинкой, так что путать их не с чем.
    const signH = font * 2, below = font * 0.35, above = font * (phone ? 0.35 : 1.3);
    const strip = signH + below + above;
    const forSigns = strip * CITIES.length;

    const lanesFor = (perRow) => CITIES.map((c) => Math.max(1, Math.ceil(busesOf(c) / perRow)));

    let best = null;
    for (let perRow = 4; perRow <= 26; perRow++) {
      const lanes = lanesFor(perRow);
      const total = lanes.reduce((a, b) => a + b, 0);
      // Two things keep a bus small: a column takes half of its road across,
      // and all the roads with their signs have to fit down the picture.
      const byWidth = (BLOCK * SNUG * roadW) / (perRow * BUS_RATIO);
      const byHeight = (SNUG * (h - 2 * M - forSigns)) / total;
      const busW = Math.min(byWidth, byHeight);
      if (!best || busW > best.busW) best = { perRow, lanes, total, busW };
    }

    const busW = best.busW, busL = busW * BUS_RATIO;
    const rowH = busW / SNUG;
    const height = best.total * rowH + forSigns;

    let cursor = (h - height) / 2;
    const roads = CITIES.map((c, ci) => {
      const road = { city: c, lanes: best.lanes[ci], top: cursor + strip };
      cursor = road.top + road.lanes * rowH;
      return road;
    });

    const slot = busL / SNUG;
    return {
      perRow: best.perRow, roads, roadW, rowH, busL, busW, slot, font,
      // The loop is long enough for the whole column to leave the road on the
      // right before its first bus comes back on the left. The half a slot is
      // the shift of every other lane: without it the last bus of a shifted
      // lane runs past the loop and pops up at the wrong end.
      loop: roadW + busL + (best.perRow - 0.5) * slot
    };
  }

  // One road: asphalt, a solid line along each side, a dashed one between the
  // lanes, and the sign with the name of the city at the end of it. The
  // markings stand still — only the buses move.
  function paintRoad(road) {
    const { rowH, busL, busW, roadW } = flock;
    const height = road.lanes * rowH;
    const line = (y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(roadW, y);
      ctx.stroke();
    };

    ctx.fillStyle = ROAD_FILL;
    ctx.fillRect(0, road.top, roadW, height);

    ctx.lineCap = 'butt';
    ctx.strokeStyle = ROAD_EDGE;
    ctx.lineWidth = Math.max(1.2, busW * 0.12);
    line(road.top);
    line(road.top + height);

    ctx.strokeStyle = ROAD_LINE;
    ctx.lineWidth = Math.max(0.8, busW * 0.08);
    ctx.setLineDash([busL * 0.3, busL * 0.42]);
    for (let i = 1; i < road.lanes; i++) line(road.top + i * rowH);
    ctx.setLineDash([]);
  }

  // The sign every road ends with — a white plate with a blue field and the
  // name of the city on it, after the one in assets/roadsign.jpg.
  function paintSign(road, w) {
    const font = flock.font;
    const name = road.city.name.toUpperCase();
    ctx.font = `700 ${font}px 'HSE Sans', sans-serif`;
    const plateH = font * 2, plateW = ctx.measureText(name).width + font * 1.6;
    // Standing on the ground above the road, at the end of it.
    const x = w - plateW - font * 0.4;
    const y = road.top - font * 0.35 - plateH;
    const pad = Math.max(1.2, font * 0.16);

    const plate = (px, py, pw, ph, r) => boxPath(ctx, px, py, pw, ph, r);

    plate(x, y, plateW, plateH, plateH * 0.22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = SIGN_EDGE;
    ctx.lineWidth = Math.max(0.6, font * 0.06);
    ctx.stroke();

    plate(x + pad, y + pad, plateW - 2 * pad, plateH - 2 * pad, (plateH - 2 * pad) * 0.2);
    ctx.fillStyle = SIGN_BLUE;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x + plateW / 2, y + plateH / 2 + font * 0.06);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  // A bus from above, the same electric bus as on the town map (viz/town.js):
  // a shadow on the road, the body in the colour of Moscow, a lighter roof
  // panel, the windscreen and headlights at the front, a rear window. It drives
  // left to right, so the front is on the right. `part` grows the last one
  // into place.
  // Every city rides the same Moscow bus: the road and its sign already say
  // whose buses they are, and one colour reads as one fleet.
  function drawBus(x, y, part) {
    const city = MOSCOW;
    const L = flock.busL * part, W = flock.busW * part;
    if (L < 0.5) return;
    // The map bus is 24 × 8.5; every detail keeps its share of that.
    const u = W / 8.5;
    const box = (bx, by, bw, bh, r) => fillBox(ctx, bx, by, bw, bh, r);
    const left = x - L / 2, top = y - W / 2;

    ctx.fillStyle = BUS_SHADOW;
    box(left + 1.2 * u, top + 1.4 * u, L, W, 2.4 * u);
    ctx.fillStyle = city.color;
    box(left, top, L, W, 2.4 * u);
    ctx.fillStyle = city.colorLight;
    box(left + 4 * u, top + 1.8 * u, L - 9.5 * u, W - 3.6 * u, u);
    ctx.fillStyle = BUS_GLASS;
    box(left + L - 3.4 * u, top + 0.9 * u, 2.4 * u, W - 1.8 * u, 0.8 * u);
    ctx.fillRect(left + 0.8 * u, top + 1.5 * u, 1.2 * u, W - 3 * u);
    ctx.fillStyle = BUS_LIGHT;
    ctx.fillRect(left + L - 0.8 * u, top + 0.5 * u, 0.8 * u, 1.4 * u);
    ctx.fillRect(left + L - 0.8 * u, top + W - 1.9 * u, 0.8 * u, 1.4 * u);
  }

  function paintBuses(t, w) {
    const { roads, roadW, rowH, perRow, slot, busL, loop } = flock;
    const drift = still ? 0 : ((t - epoch) / 1000) * (roadW / SEC_ACROSS);
    // A column starts its ride outside the picture on the left, with the
    // first bus at the edge: from there it drives the whole road. The hair
    // taken off keeps the last bus from wrapping round to the other end.
    const start = roadW + busL - 0.01;

    roads.forEach((road) => paintRoad(road));

    roads.forEach((road) => {
      let i = 0;
      for (let left = shown[road.city.key] || 0; left > 0.02; left -= 1, i += 1) {
        const lane = Math.min(road.lanes - 1, Math.floor(i / perRow));
        // Every other lane is shifted by half a slot, so the traffic does not
        // line up into walls of buses.
        const phase = (lane % 2) * slot * 0.5;
        const back = (((i % perRow) * slot + phase + start - drift) % loop + loop) % loop;
        const y = road.top + (lane + 0.5) * rowH;
        drawBus(roadW + busL / 2 - back, y, Math.min(1, left));
      }
    });

    roads.forEach((road) => paintSign(road, w));
  }

  function paint(now) {
    const t = typeof now === 'number' ? now : performance.now();
    const cssW = canvas.clientWidth || 900;
    const cssH = canvas.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    tick(t);
    updateScore();

    const key = `${cssW}x${cssH}`;
    if (key !== trackKey) {
      track = buildTrack(cssW, cssH);
      flock = buildFlock(cssW, cssH);
      trackKey = key;
      syncLegendSample();
      paintLegendTrain();
    }

    if (state.mode === 'bus') { paintBuses(t, cssW); return; }

    // track: the bed and its edges, sleepers across it, rails on top
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ROAD_FILL;
    ctx.lineWidth = track.bedW;
    ctx.stroke(track.bed);
    ctx.strokeStyle = ROAD_EDGE;
    ctx.lineWidth = 1;
    track.edges.forEach((edge) => ctx.stroke(edge));
    ctx.strokeStyle = ROAD_LINE;
    ctx.lineWidth = Math.max(0.6, track.carW * 0.12);
    ctx.stroke(track.sleepers);
    ctx.strokeStyle = ROAD_EDGE;
    ctx.lineWidth = Math.max(0.7, track.carW * 0.1);
    track.rails.forEach((rail) => ctx.stroke(rail));

    // trains: the whole chain of cars, city after city, cut into eights.
    // Cars of one train are coupled; between trains there is just a gap.
    // Laid out back to front, so that Perm leads and Moscow brings up the rear.
    // The city in front rides a whole train: the cars it does not fill go
    // grey and empty at the head of the column.
    const chain = [];
    TAIL_FIRST.forEach((c) => {
      for (let left = shown[c.key] || 0; left > 0.02; left -= 1) {
        chain.push({ city: c, part: Math.min(1, left) });
      }
    });
    // Trains are counted from the head: the car with a multiple of eight cars
    // ahead of it leads its train, and the one right behind it ends the next.
    chain.forEach((car, i) => {
      const ahead = chain.length - 1 - i;
      car.head = ahead % TRAIN === 0;
      car.tail = i === 0 || (ahead + 1) % TRAIN === 0;
    });

    const gap = track.car * GAP, trainGap = track.car * TRAIN_GAP;
    let s = still ? 0 : ((t - epoch) / 1000) * (track.straight / SEC_PER_ROW);
    let prev = null;                 // back of the car in front, if coupled
    chain.forEach((car, i) => {
      const end = s + track.car * car.part;
      if (prev !== null) drawCoupling(prev, s);
      drawCar(s, end, car);
      s = end + gap;
      prev = end;
      // Trains are counted from the head, so a train short of eight cars
      // would be the last one — with the grey cars there is none.
      const ahead = chain.length - 1 - i;
      if (ahead > 0 && ahead % TRAIN === 0) { s += trainGap * car.part; prev = null; }
    });

    drawEnds();
  }

  // ---------- Animation loop ----------
  // The trains never stop, so the loop runs while the track is on the screen
  // and is parked as soon as it scrolls away.
  let frame = null;
  const loop = (now) => {
    paint(now);
    frame = requestAnimationFrame(loop);
  };
  const start = () => { if (frame === null) frame = requestAnimationFrame(loop); };
  const stop = () => { if (frame !== null) { cancelAnimationFrame(frame); frame = null; } };

  new IntersectionObserver((entries) => {
    if (entries[entries.length - 1].isIntersecting) start(); else stop();
  }).observe($('canvasWrap'));

  loadMark().then((m) => {
    mark = m;
    if (frame === null) paint();
  });

  // ---------- DOM rendering ----------
  const cityList = $('cityList');
  const countEl = $('count');
  const peopleEl = $('people');
  const scoreTitleEl = $('scoreTitle');
  // The heading is drawn by the page shell, but its text belongs to the
  // module — this is the one word of it that changes with the mode.
  const header = root.parentElement;
  const stopEl = header && header.querySelector('[data-el="stop"]');
  const legendTrainEl = $('legendTrain');
  const legendBusEl = $('legendBus');
  const legendTextEl = $('legendText');
  const trainPicEl = $('trainPic');

  // The little bus of the legend is exactly as long as the ones on the roads,
  // and the arrow between it and the picture is drawn every time either of
  // them moves — the picture keeps to the middle, so the gap changes with the
  // width of the screen.
  const busLegendEl = $('busLegend');
  const legendSampleEl = $('legendSample');
  const arrowLineEl = $('arrowLine');
  const arrowHeadEl = $('arrowHead');

  // The samples in the legend are painted in the colour of Moscow, like the
  // buses on the roads.

  // The train of the legend: eight Moscow cars at the size of the ones on the
  // track, coupled, lit up at the head, on a straight piece of nothing.
  function paintLegendTrain() {
    if (!track) return;
    const len = track.car, w = track.carW, gap = len * GAP;
    // A shorter light than on the track, or the legend would grow as tall as
    // the fan is wide.
    const reach = w * 2.6;
    const cssW = TRAIN * len + (TRAIN - 1) * gap + reach;
    const cssH = Math.max(w * 1.4, 2 * reach * Math.sin(SPREAD) + 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    legendTrainEl.width = Math.round(cssW * dpr);
    legendTrainEl.height = Math.round(cssH * dpr);
    legendTrainEl.style.width = `${cssW}px`;
    legendTrainEl.style.height = `${cssH}px`;

    const c = legendTrainEl.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cssW, cssH);
    const y = cssH / 2;
    for (let k = 0; k < TRAIN; k++) {
      const x = k * (len + gap) + len / 2;
      const car = { city: MOSCOW, head: k === TRAIN - 1, tail: k === 0 };
      if (k > 0) {
        c.fillStyle = GANGWAY;
        c.fillRect(x - len / 2 - gap, y - w * 0.18, gap, w * 0.36);
      }
      c.save();
      c.translate(x + w * 0.14, y + w * 0.18);
      c.fillStyle = BUS_SHADOW;
      fillBox(c, -len / 2, -w / 2, len, w, carRadii(len, w, car));
      c.restore();
      c.save();
      c.translate(x, y);
      if (car.head) drawBeam(c, len, w, reach);
      drawCarBody(c, len, w, car);
      c.restore();
    }
  }
  legendSampleEl.style.setProperty('--bus-body', MOSCOW.color);
  legendSampleEl.style.setProperty('--bus-roof', MOSCOW.colorLight);

  function syncLegendSample() {
    if (!flock) return;
    // На телефоне большой картинки нет, и стрелке некуда вести: в легенде
    // остается один значок, и размер ему дают стили — на дорогах электробус
    // там в несколько пикселей длиной, значком такой не разглядеть.
    if (phone) return;
    const box = busLegendEl.getBoundingClientRect();
    if (!box.width) return;

    legendSampleEl.style.width = `${flock.busL}px`;

    const from = legendSampleEl.getBoundingClientRect();
    const to = legendBusEl.getBoundingClientRect();
    const x1 = from.right - box.left + 16, y1 = from.top - box.top + from.height / 2;
    const x2 = to.left - box.left - 18, y2 = to.top - box.top + to.height * 0.42;
    // A curve that leaves sideways and arrives pointing at the picture.
    const cx1 = x1 + (x2 - x1) * 0.55, cy1 = y1;
    const cx2 = x2 - (x2 - x1) * 0.1, cy2 = y2 - (y2 - y1) * 0.55;

    arrowLineEl.setAttribute('d', `M${x1} ${y1}C${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`);

    const dx = x2 - cx2, dy = y2 - cy2, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;              // where the arrow points
    const bx = x2 - ux * 9, by = y2 - uy * 9;        // base of the head
    const px = -uy * 4.2, py = ux * 4.2;             // across it
    arrowHeadEl.setAttribute(
      'd', `M${x2} ${y2}L${bx + px} ${by + py}L${bx - px} ${by - py}z`
    );

    $('legendArrow').setAttribute('width', box.width);
    $('legendArrow').setAttribute('height', box.height);
    $('legendArrow').setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  }

  // The picture of the bus moves with the width of the card, so its arrow is
  // redrawn whenever the legend changes size — that also covers the moment the
  // mode is switched and the layout has not settled yet.
  onResize(busLegendEl, syncLegendSample);

  const cityEls = {};
  CITIES.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${phone ? c.short : c.name}</div>
        <div class="city-stats">
          <span class="city-stat"><span class="city-dot" style="background:${c.color}"></span><span class="city-stat-text"></span></span>
        </div>
      </div>
      <button type="button" class="toggle" role="switch"><span class="toggle-knob"></span></button>
    `;
    const toggleBtn = card.querySelector('.toggle');
    toggleBtn.addEventListener('click', () => {
      state.active[c.key] = !state.active[c.key];
      render();
    });
    cityList.appendChild(card);
    cityEls[c.key] = { toggle: toggleBtn, text: card.querySelector('.city-stat-text') };
  });

  // The switch works like the one on the areas: the knob sits on the side of
  // the mode that is shown, and the labels are clickable too.
  const modeSwitch = $('modeSwitch');
  const modeToggle = modeSwitch.querySelector('.toggle');
  const modeLabels = modeSwitch.querySelectorAll('.metro-switch-label');
  const pickMode = (key) => {
    if (key === state.mode) return;
    state.mode = key;
    epoch = performance.now();     // the new mode starts its ride from scratch
    render('fill');
  };
  modeToggle.addEventListener('click', () => {
    pickMode(state.mode === MODES[0].key ? MODES[1].key : MODES[0].key);
  });
  modeLabels.forEach((label) => {
    label.addEventListener('click', () => pickMode(label.dataset.value));
  });

  $('clearAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = false; });
    render();
  });
  $('restoreAll').addEventListener('click', () => {
    CITIES.forEach((c) => { state.active[c.key] = true; });
    render();
  });

  // The counter counts along with the vehicles, so paint() keeps it in sync.
  let lastCount = null, lastPeople = null;
  function updateScore() {
    const of = mode().of;
    let count = 0, people = 0;
    CITIES.forEach((c) => {
      const n = shown[c.key] || 0;
      count += n;
      people += (n / of(c)) * c.admitted;
    });
    count = Math.round(count);
    people = Math.round(people);
    if (count === lastCount && people === lastPeople) return;
    lastCount = count;
    lastPeople = people;
    countEl.textContent = nf(count);
    peopleEl.textContent = nf(people);
  }

  // What the picture says, for a reader who cannot see it: which picture it is
  // now, how many vehicles stand on it and for how many people.
  //
  // Counted from the cities that are switched on, not from what is drawn this
  // frame. The vehicles arrive one after another, and the loop that draws them
  // is parked while the block is off the screen — a line taken off a frame
  // would be caught mid-arrival and left there, telling a reader about three
  // buses when the picture is about to hold two hundred and sixty.
  function tellPicture() {
    const m = mode();
    let count = 0, people = 0;
    CITIES.forEach((c) => {
      if (!state.active[c.key]) return;
      count += m.of(c);
      people += c.admitted;
    });
    canvas.setAttribute('aria-label', count
      ? `${m.picture}: ${nf(count)} ${plural(count, ...m.noun)} — столько нужно,`
        + ` чтобы увезти разом ${nf(people)}`
        + ` ${plural(people, 'принятого студента', 'принятых студента', 'принятых студентов')}`
      : `${m.picture}. Сейчас пусто: ни одного города не выбрано`);
  }

  function render(how) {
    const m = mode();

    modeToggle.classList.toggle('on', state.mode === MODES[1].key);
    modeLabels.forEach((label) => {
      label.classList.toggle('on', label.dataset.value === state.mode);
    });

    if (stopEl) stopEl.textContent = m.stop;
    scoreTitleEl.textContent = m.title;
    // In the bus mode the caption is written on the bus itself.
    // На широком экране подпись к электробусу написана на его же борту, и
    // второй раз ее не повторяют. На телефоне борта нет — есть значок, и
    // подпись к нему приходит словами, как у метро.
    const painted = state.mode === 'bus' && !phone;
    legendTextEl.textContent = painted ? '' : m.legend;
    legendTextEl.style.display = painted ? 'none' : '';
    trainPicEl.style.display = state.mode === 'metro' ? '' : 'none';
    legendTrainEl.style.display = state.mode === 'metro' ? '' : 'none';
    busLegendEl.style.display = state.mode === 'bus' ? '' : 'none';
    if (state.mode === 'bus') syncLegendSample();

    CITIES.forEach((c) => {
      const on = !!state.active[c.key];
      const n = m.of(c);
      cityEls[c.key].toggle.classList.toggle('on', on);
      cityEls[c.key].toggle.style.background = on ? c.color : '';
      cityEls[c.key].text.textContent = `${nf(c.admitted)} принятых, ${n} ${plural(n, ...m.noun)}`;
    });

    tellPicture();
    animateTo(targets(), how);
    if (frame === null) paint();     // keep things right while off screen
  }

  render('instant');
  paint();

  return {
    // The page opens this block — the reader has just arrived at it, or come
    // back to it. The trains start their ride over, so that whoever looks at
    // the track sees the first of them come in from the right rather than a
    // line that has been running since the page was loaded.
    open() {
      epoch = performance.now();
      if (frame === null) paint();
    }
  };
}
