// Shared HSE figures, 2025. Every visualisation reads its numbers from here
// so the whole page can never disagree with itself.

import { tint } from '../lib/color.js';

// How much lighter the secondary shade of a city is (staff on the stadium,
// any second series elsewhere). Same hue, just mixed towards white.
const LIGHT = 0.52;

// area — total floor area of the city's buildings, m².
// areaStudy — the part of it used for teaching and labs.
// admitted — students enrolled in the current admission campaign.
const city = (key, name, color, students, staff, area, areaStudy, admitted) => ({
  key, name, students, staff, area, areaStudy, admitted,
  color,                    // main colour of the city
  colorLight: tint(color, LIGHT)
});

export const CITIES = [
  city('msk', 'Москва', '#11A0D7', 48139, 9612, 509397, 308789, 16803),
  city('spb', 'Санкт-Петербург', '#EB681F', 7895, 1310, 111924, 60648, 2695),
  city('nn', 'Нижний Новгород', '#029C63', 4366, 572, 32332, 20949, 1476),
  city('perm', 'Пермь', '#7D4EBA', 2869, 324, 33679, 21227, 981)
];

export const LYCEUM = 2600;
export const LYCEUM_COLOR = '#FFD400';

// Students from abroad, rounded down to a round hundred: the page quotes it as
// «5 600+», as a scale rather than a figure to be checked.
export const FOREIGN = 5600;

export const STUDENTS = CITIES.reduce((n, c) => n + c.students, 0);
export const STAFF = CITIES.reduce((n, c) => n + c.staff, 0);
export const HSE_TOTAL = STUDENTS + STAFF + LYCEUM;
export const AREA_TOTAL = CITIES.reduce((n, c) => n + c.area, 0);
export const ADMITTED = CITIES.reduce((n, c) => n + c.admitted, 0);
