// Shared HSE headcount, 2025. Every visualisation reads its numbers from here
// so the whole page can never disagree with itself.

import { tint } from '../lib/color.js';

// How much lighter the secondary shade of a city is (staff on the stadium,
// any second series elsewhere). Same hue, just mixed towards white.
const LIGHT = 0.52;

const city = (key, name, color, students, staff) => ({
  key, name, students, staff,
  color,                    // main colour of the city
  colorLight: tint(color, LIGHT)
});

export const CITIES = [
  city('msk', 'Москва', '#11A0D7', 48139, 9612),
  city('spb', 'Санкт-Петербург', '#EB681F', 7895, 1310),
  city('nn', 'Нижний Новгород', '#029C63', 4366, 572),
  city('perm', 'Пермь', '#7D4EBA', 2869, 324)
];

export const LYCEUM = 2600;
export const LYCEUM_COLOR = '#FFD400';

export const STUDENTS = CITIES.reduce((n, c) => n + c.students, 0);
export const STAFF = CITIES.reduce((n, c) => n + c.staff, 0);
export const HSE_TOTAL = STUDENTS + STAFF + LYCEUM;
