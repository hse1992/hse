// The university as a town: every building of it on one map, with the rivers
// of its four campuses, three stations of its own and electric buses between.
// The map itself lives in lib/town-map.js: the section about the area of the
// buildings shows the same town.

import { mountTownMap } from '../lib/town-map.js';

export const meta = {
  id: 'town',
  title: 'Практически целый город',
  subtitle: 'Если собрать все здания Вышки в одном месте, у нее будут свои реки, свое метро и свои электробусы'
};

export function init(root, seed) {
  // Те же настройки, что у карты внутри блока про площадь: на телефоне город
  // занимает всю коробку, а дома строятся крупнее — иначе на трети ширины
  // дом читается точкой.
  const phone = window.matchMedia('(max-width: 860px)');
  return mountTownMap(root, { fill: phone.matches, tall: phone.matches, seed });
}
