// Number and word formatting shared by every visualisation.

// 48139 -> "48 139" (non-breaking thin space, so numbers never wrap).
export const nf = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ');

// 12.5 -> "12,5"
export const pct = (part, whole, digits = 1) => {
  const f = Math.pow(10, digits);
  return `${(Math.round((part / whole) * 100 * f) / f).toString().replace('.', ',')}%`;
};

// 96.265 -> "96,3"
export const dec = (n, digits = 1) => (n.toFixed(digits)).replace('.', ',');

// plural(2, 'студент', 'студента', 'студентов') -> 'студента'
export const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
};
