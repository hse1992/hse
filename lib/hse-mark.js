// The HSE mark from assets/hse-znak.svg, ready to be drawn on a canvas.
// The file has no colours of its own — the disc and the mark cut out of it are
// two separate paths, and whoever draws them picks the fill.

let loading = null;

// Resolves to { disc, mark, cx, cy, r } — paths in the coordinates of the
// file — or to null if the file could not be read (opening the page over
// file:// instead of a local server, for one).
export function loadMark() {
  if (!loading) {
    loading = fetch(new URL('../assets/hse-znak.svg', import.meta.url))
      .then((res) => res.text())
      .then((text) => {
        const svg = new DOMParser().parseFromString(text, 'image/svg+xml');
        const circle = svg.querySelector('circle');
        const cx = Number(circle.getAttribute('cx'));
        const cy = Number(circle.getAttribute('cy'));
        const r = Number(circle.getAttribute('r'));
        const disc = new Path2D();
        disc.arc(cx, cy, r, 0, Math.PI * 2);
        return { disc, mark: new Path2D(svg.querySelector('path').getAttribute('d')), cx, cy, r };
      })
      .catch(() => null);
  }
  return loading;
}
