// Числа на экране — для прогона страницы на настоящем телефоне, где консоли
// нет. Включается `?debug` в адресе, без него не грузится вовсе. К странице
// отношения не имеет: смотрит на нее со стороны и ничего в ней не трогает.

const hud = document.createElement('div');
hud.style.cssText = [
  'position: fixed', 'left: 0', 'right: 0', 'bottom: 0', 'z-index: 9999',
  'font: 11px/1.25 ui-monospace, monospace', 'color: #fff',
  'background: rgba(0,0,0,.72)', 'padding: 4px 6px', 'white-space: pre-wrap',
  'pointer-events: none'
].join(';');
document.body.appendChild(hud);

const sections = [...document.querySelectorAll('.viz-section')];

function line() {
  const y = window.scrollY;
  const H = window.innerHeight;
  // В каком разделе читатель: последний, чей верх выше середины окна.
  let i = 0;
  sections.forEach((s, k) => { if (s.getBoundingClientRect().top < H * 0.5) i = k; });
  const s = sections[i];
  const cs = getComputedStyle(s);
  const body = s.querySelector('.viz-body');
  const lead = s.querySelector('.viz-lead');
  const num = (name) => cs.getPropertyValue(name).trim() || '-';
  return [
    `H ${H.toFixed(1)}  y ${y.toFixed(2)}  w ${window.innerWidth}`,
    `#${i} ${s.id}  rel ${(y - s.offsetTop).toFixed(2)}`
      + `  top ${s.getBoundingClientRect().top.toFixed(2)}  secH ${s.offsetHeight}`,
    `k ${num('--intro-k')} body ${num('--intro-body')} away ${num('--lead-away')}`
      + ` hold ${num('--lead-hold')}`,
    `s1 ${num('--stage-1')} s2 ${num('--stage-2')} s3 ${num('--stage-3')}`,
    `L1 ${num('--lead-stage-1')} L2 ${num('--lead-stage-2')} sq ${num('--lead-squeeze')}`,
    `bodyTop ${body ? body.getBoundingClientRect().top.toFixed(1) : '-'}`
      + `  leadTop ${lead ? lead.getBoundingClientRect().top.toFixed(1) : '-'}`,
    [...s.querySelectorAll('.intro-stage')].map((e) => {
      const r = e.getBoundingClientRect();
      return `#${e.dataset.stage} ${Math.round(r.top)}..${Math.round(r.bottom)}`
        + ` o${Number(getComputedStyle(e).opacity).toFixed(2)}`;
    }).join('  ')
  ].join('\n');
}

let queued = false;
const draw = () => { queued = false; hud.textContent = line(); };
const tick = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
window.addEventListener('scroll', tick, { passive: true });
window.addEventListener('resize', tick);
setInterval(tick, 200);
draw();
