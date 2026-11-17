// Что каркас знает о разделе «Все цифры» до того, как тот загружен: заголовок,
// подзаголовок, число шагов, переходы. Каркас берет это при старте
// (index.html), а сама картинка — viz/each.js — грузится по требованию,
// когда читатель к разделу подходит. Поэтому здесь только строки и числа и
// ни одного импорта: иначе с ними вернулось бы в начальную загрузку то, ради
// чего раздел вынесен.
//
// Сам модуль берет meta отсюда же и отдает дальше — второй копии нет.

export const meta = {
  id: 'each',
  // Short enough for the strip at the top of a phone — see meta.short in CLAUDE.md.
  short: 'Все цифры',
  // The section arrives out of the white of a satellite's flash, like a photo
  // developing — and the heading is the caption to that shot: the whole
  // university in one frame.
  title: 'Вышка такая большая, что ее можно увидеть только со спутника',
  subtitle: '',
  // No title card: the flash opens straight onto the photograph, figures and
  // all. A heading waiting alone in the middle of the screen would be one more
  // beat between the camera going off and the picture it took.
  // The board is what the section arrives with, rather than an empty field
  // that spends a beat of the reader's on filling it.
  opensOnStep: true,
  // The board is there, the question comes up over it — and then the whole
  // end plays out in one beat: the figures add up into one number, that number
  // falls to one, and the one is told what it is.
  steps: 3
};
