// Small markup helpers for pieces that repeat across visualisations.

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
