// Small markup helpers for pieces that repeat across visualisations.

// Watches an element for a change of size and answers on the next frame.
//
// A callback that measures and then writes — lines up two columns, shrinks an
// icon to fit — changes the layout it was called about, and the browser
// notices while it is still delivering the round of notifications it started.
// It does not break anything; it says so out loud, with «ResizeObserver loop
// completed with undelivered notifications» thrown at the window, and a page
// that cries wolf nineteen times in a reading is a page whose console nobody
// reads. Answering on the next frame instead puts the writing outside that
// round, and the message goes away because the reason for it does.
export function onResize(el, fn) {
  let queued = false;
  new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  }).observe(el);
}

// Привести холст к размеру его коробки — и только если он уже не такой.
//
// Запись в canvas.width или canvas.height — это не «поставить число»: браузер
// заново отводит под холст память, выбрасывает все, что на нем нарисовано, и
// сбрасывает контекст к заводским настройкам. Делать это в каждом кадре, как
// делали поезда, арена и поля, значит пересоздавать картинку шестьдесят раз в
// секунду ради того, чтобы нарисовать на ней почти то же самое. Размер между
// кадрами меняется редко — при ресайзе окна, повороте, смене плотности
// экрана, — и спросить об этом дешевле, чем переписать.
//
// Отвечает { w, h, dpr, resized } в CSS-пикселях: `resized` говорит, что холст
// был пересоздан, — тому, кто держит на нем свои слои или кеши, это нужно
// знать. Трансформацию и очистку делает сама: после пересоздания контекст
// чистый и его все равно настраивать, а в обычном кадре прежнюю картинку
// нужно стереть.
export function sizeCanvas(canvas, ctx, { clear = true, scale = 1 } = {}) {
  const w = canvas.clientWidth || 900;
  const h = canvas.clientHeight || 600;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const want = { w: Math.round(w * dpr), h: Math.round(h * dpr) };
  const resized = canvas.width !== want.w || canvas.height !== want.h;
  if (resized) { canvas.width = want.w; canvas.height = want.h; }
  const k = dpr * scale;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  // Пересозданный холст и так пуст; чистить его второй раз незачем.
  if (clear && !resized) ctx.clearRect(0, 0, w / scale, h / scale);
  return { w, h, dpr, resized };
}

// Sets up a canvas that fills its .canvas-wrap parent and repaints on resize.
// Returns { canvas, ctx, resize } — call resize() once after the first paint
// setup if the module needs to force a redraw.
//
// `alt` is what the picture says, for a reader who cannot see it. A canvas is
// a blank to a screen reader: without a word it is announced as nothing at
// all, and the block loses its picture entirely. With one it is read as the
// image it is. A canvas that only decorates something already said in words —
// the little train beside the legend — passes nothing and is hidden instead,
// which is the honest answer for it.
export function mountCanvas(wrap, paint, alt) {
  const canvas = document.createElement('canvas');
  if (alt) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', alt);
  } else {
    canvas.setAttribute('aria-hidden', 'true');
  }
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  // На изменение размера отвечаем один раз за кадр, кто бы о нем ни сказал.
  //
  // Говорят о нем двое, и говорят об одном и том же. ResizeObserver следит за
  // коробкой — это главный случай. Событие окна нужно ради того, чего он не
  // видит: плотность экрана меняется при переносе окна на другой монитор, а
  // коробка при этом та же. Но на обычном ресайзе — и особенно на телефоне,
  // где окно меряется заново на каждое движение панели браузера, — срабатывали
  // оба, и картинка перерисовывалась дважды подряд ради одного и того же
  // размера.
  //
  // Кадром позже, а не сразу: перерисовка вправе написать цифру рядом с
  // картинкой, а это правка раскладки внутри той порции уведомлений, в
  // которой ее позвали, — см. onResize ниже.
  let queued = false;
  const again = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; paint(); });
  };
  new ResizeObserver(again).observe(wrap);
  window.addEventListener('resize', again);
  return { canvas, ctx };
}

// Where a switch looks for its name: the row it stands in says what it
// switches, and these are the parts of that row worth reading out.
const NAMED = '.city-name, .kind-label, .toggle-label, [data-switch-name]';
const ROWS = '.city-card, .kind-row, .metro-switch, .area-switch, .toggle-row';

// Every block builds its switches from the same markup — a button with
// role="switch" and a knob inside it — and whether one is on is the `on` class
// the module puts on it. On its own such a button says neither what it
// switches nor what state it is in: a screen reader found twenty-three
// nameless switches on the page and could not tell which were on. Both answers
// are already in the markup — the name in the row the switch sits in, the
// state in that class — so they are read off here, once, instead of being
// written out beside every place a module touches them. A block that wants to
// say it better sets its own aria-label and this leaves it alone.
export function nameSwitches(root) {
  const switches = [...root.querySelectorAll('[role="switch"]')];
  if (!switches.length) return;

  const tell = (el) => el.setAttribute('aria-checked', el.classList.contains('on') ? 'true' : 'false');

  switches.forEach((el) => {
    if (!el.hasAttribute('aria-label')) {
      const row = el.closest(ROWS) || el.parentElement;
      const named = row ? [...row.querySelectorAll(NAMED)].map((n) => n.textContent.trim()).filter(Boolean) : [];
      const label = named.length ? named.join(', ')
        : (row ? row.textContent.replace(/\s+/g, ' ').trim() : '');
      if (label) el.setAttribute('aria-label', label);
    }
    tell(el);
  });

  // The class is set wherever the module happens to set it; the state follows
  // it rather than being repeated at every one of those places.
  const watch = new MutationObserver((rows) => rows.forEach((row) => tell(row.target)));
  switches.forEach((el) => watch.observe(el, { attributes: true, attributeFilter: ['class'] }));
}

// Вернуть коробку с собственной прокруткой — стену профессий, стену флагов —
// в начало, так, чтобы это пережило палец.
//
// Простого `scrollTop = 0` на айфоне мало. Мах пальцем оставляет после себя
// инерцию: коробка едет еще полсекунды после того, как палец отпущен, и
// записанный в эту секунду ноль инерция перетирает обратно — читатель
// возвращается в раздел и застает стену там, где ее бросил. На столе этого не
// видно вовсе: там прокрутка кончается вместе с движением.
//
// Оборвать инерцию можно одним способом — на мгновение отобрать у коробки
// прокрутку: `overflow: hidden` заставляет браузер снять ее со своего слоя, и
// ноль после этого держится. Снимается он тут же, в том же кадре, так что
// читатель ничего не замечает.
//
// А дальше ноль держится, пока едет такт. Инерция переживает один кадр, да и
// зовут нас в начале движения, а страница идет к блоку еще семьсот
// миллисекунд: за это время мах, отпущенный в прошлом разделе, успевает
// доехать уже в новом. Отпускаем раньше, если читатель тронул коробку сам:
// повел список пальцем — значит, ведет его он, а не мы.
const ДЕРЖИМ = 800;                   // мс: чуть дольше такта
const ТРОНУЛИ = ['touchstart', 'pointerdown', 'wheel'];

export function toTop(box) {
  if (!box) return;
  const было = box.style.overflow;
  box.style.overflow = 'hidden';
  box.scrollTop = 0;
  void box.offsetHeight;              // перерисовка: здесь инерция и обрывается
  box.style.overflow = было;
  box.scrollTop = 0;

  let держим = true;
  const пусти = () => {
    держим = false;
    ТРОНУЛИ.forEach((t) => box.removeEventListener(t, пусти));
  };
  ТРОНУЛИ.forEach((t) => box.addEventListener(t, пусти, { passive: true }));
  const до = performance.now() + ДЕРЖИМ;
  const кадр = () => {
    if (!держим) return;
    box.scrollTop = 0;
    if (performance.now() < до) requestAnimationFrame(кадр);
    else пусти();
  };
  requestAnimationFrame(кадр);
}

// How far away the next stretch of a scroll-told story is, in pixels — the
// answer a block gives the «Далее» button of the shell (see lib/stepper.js).
//
// A story read by scrolling is cut into equal stretches of travel: `gone` is
// how much of that travel is behind, `span` how much there is of it, `parts`
// how many stretches the story is told in, and `share` how much of the travel
// the story takes at all — a block that hands itself over to the reader keeps
// the last of it for that. Nought means there is nothing ahead: the block has
// not taken the screen yet, or its story is told.
export function stepAhead(gone, span, parts, share = 1) {
  // Доля пикселя назад — это все еще ноль, а не «блок еще не на экране». Ход
  // приводит страницу ровно к верху блока, и getBoundingClientRect дает там
  // то 0, то −0,09. На минусе ответ был «впереди ничего», каркас не видел ни
  // одной остановки и уезжал на целый экран — вся история блока проносилась
  // за одно движение. Отсюда допуск в пиксель и зажим.
  if (!(span > 0) || !(parts > 0) || gone < -1) return 0;
  const walked = Math.max(0, gone);
  if (walked >= span * share) return 0;
  const stretch = (span * share) / parts;
  // A pixel past the line rather than onto it: landing exactly on a boundary
  // leaves which side of it the block is on to the rounding.
  return Math.ceil((Math.floor(walked / stretch) + 1) * stretch - walked) + 1;
}
