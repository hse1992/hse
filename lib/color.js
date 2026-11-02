// Colour helpers. Canvas needs plain strings, so colours live in JS, not CSS.

// Mixes a hex colour towards white. amount 0 = unchanged, 1 = white.
export function tint(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}
