// Shared HSE headcount, 2025. Every visualisation reads its numbers from here
// so the whole page can never disagree with itself.

export const CITIES = [
  { key: 'msk', name: 'Москва', students: 48139, staff: 9612, colorStudents: '#2A55D6', colorStaff: '#8AA4EE' },
  { key: 'spb', name: 'Санкт-Петербург', students: 7895, staff: 1310, colorStudents: '#2E9440', colorStaff: '#95CC9E' },
  { key: 'nn', name: 'Нижний Новгород', students: 4366, staff: 572, colorStudents: '#E5820F', colorStaff: '#F3C182' },
  { key: 'perm', name: 'Пермь', students: 2869, staff: 324, colorStudents: '#A8459A', colorStaff: '#D79ACF' }
];

export const LYCEUM = 2600;
export const LYCEUM_COLOR = '#FFD400';

export const STUDENTS = CITIES.reduce((n, c) => n + c.students, 0);
export const STAFF = CITIES.reduce((n, c) => n + c.staff, 0);
export const HSE_TOTAL = STUDENTS + STAFF + LYCEUM;
