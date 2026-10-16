// The satellites the university has put in orbit.
//
// Two blocks say the same things about them: «Космос» draws the picture from
// orbit, and the finale prints the caption along the edge of that picture, the
// way a frame carries the settings it was shot at. A figure kept in two places
// comes apart sooner or later — the orbit is corrected in one of them and the
// caption goes on claiming the old one — so both take it from here.
//
// Dates, launch sites and missions come from the laboratory that built them:
// miem.hse.ru/uvpmiem/lab/ka. The height of the orbit is nowhere published;
// 500 km is the usual one for cubesats of this family, and the page says so
// carefully — «в нескольких сотнях километров».

export const ORBIT_KM = 500;
export const INCLINE = 97.5;    // sun-synchronous, so the orbit passes over the poles

// In the order they went up.
export const SATELLITES = [
  { name: 'CubeSX-HSE', launched: '22 марта 2021', from: 'Байконур' },
  { name: 'CubeSX-HSE-2', launched: '9 августа 2022', from: 'Байконур' },
  { name: 'CubeSX-HSE-3', launched: '27 июня 2023', from: 'Восточный' }
];
