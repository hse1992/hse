// Small markup helpers for pieces that repeat across visualisations.

// Source line pinned to the bottom of the left column.
export const sourceFooter = () => `
  <div class="footer">
    <span>Данные на 2025 год</span>
    <a href="https://data.hse.ru" target="_blank" rel="noopener">© Дирекция по аналитике и управлению данными</a>
  </div>
`;

// Sets up a canvas that fills its .canvas-wrap parent and repaints on resize.
// Returns { canvas, ctx, resize } — call resize() once after the first paint
// setup if the module needs to force a redraw.
export function mountCanvas(wrap, paint) {
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  new ResizeObserver(() => paint()).observe(wrap);
  window.addEventListener('resize', paint);
  return { canvas, ctx };
}
