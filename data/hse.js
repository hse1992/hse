// Shared HSE figures. Every visualisation reads its numbers from here so the
// whole page can never disagree with itself.

// Bump this together with EXPECTED_DATA_REVISION in index.html when figures
// change, so a browser holding an older data file refreshes it before launch.
export const DATA_REVISION = 1;

// Legacy exports are kept for visitors whose browser has cached older scripts.
// They do not assign a reporting year to the current figures shown on the page.
export const YEAR = 2025;
export const ADMISSION_YEAR = 2026;

import { tint } from '../lib/color.js';

// How much lighter the secondary shade of a city is (staff on the stadium,
// any second series elsewhere). Same hue, just mixed towards white.
const LIGHT = 0.52;

// area — total floor area of the city's buildings, m².
// areaStudy — the part of it used for teaching and labs.
// admitted — students enrolled in the ADMISSION_YEAR campaign.
// foreign — students from abroad, rounded down to tens.
// Короткое имя для узких строк: первое слово сворачивается в букву с точкой —
// «С. Петербург», «Н. Новгород». Города из одного слова остаются собой.
const shorten = (name) => name.replace(/^([А-Я])[а-я]+[ -](?=[А-Я])/, '$1. ');

const city = (key, name, color, students, staff, area, areaStudy, admitted, foreign) => ({
  key, name, students, staff, area, areaStudy, admitted, foreign,
  short: shorten(name),     // имя для строки, в которой полное не помещается
  color,                    // main colour of the city
  colorLight: tint(color, LIGHT)
});

export const CITIES = [
  city('msk', 'Москва', '#11A0D7', 46592, 10207, 509397, 308789, 15573, 4500),
  city('spb', 'Санкт-Петербург', '#EB681F', 7989, 1394, 111924, 60648, 2676, 700),
  city('nn', 'Нижний Новгород', '#029C63', 4685, 621, 32332, 20949, 1684, 270),
  city('perm', 'Пермь', '#7D4EBA', 2832, 347, 33679, 21227, 868, 130)
];

export const LYCEUM = 2819;         // students of the lyceum, the exact count
export const LYCEUM_COLOR = '#FFD400';

// Students from abroad on all campuses. The campus figures are rounded down, so
// the page quotes the total as «5 600+», a scale rather than a figure to check.
export const FOREIGN = CITIES.reduce((n, c) => n + c.foreign, 0);

export const STUDENTS = CITIES.reduce((n, c) => n + c.students, 0);
export const STAFF = CITIES.reduce((n, c) => n + c.staff, 0);
export const HSE_TOTAL = STUDENTS + STAFF + LYCEUM;
export const AREA_TOTAL = CITIES.reduce((n, c) => n + c.area, 0);
export const ADMITTED = CITIES.reduce((n, c) => n + c.admitted, 0);
