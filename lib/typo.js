// Висячие предлоги. Строка не кончается коротким предлогом или союзом: «и»,
// «в», «на», «для» уходят на следующую строку вместе со словом, к которому
// относятся. «Сценические искусства и / литературное творчество» читается
// как обрыв, «Сценические искусства / и литературное творчество» — нет.
//
// Делается это неразрывным пробелом после такого слова, и делает это каркас,
// а не каждая строка в исходниках: текст на странице собирают восемь модулей,
// данные и сам каркас, и часть его пишется на ходу — подсказки, ответы,
// карточки лет. Пробел, поставленный руками, держится до первой новой строки,
// которую написали без него. Поэтому каркас проходит по тексту, когда страница
// собрана, и следит за тем, что в нее дописывают потом (keepBound).
//
// Трогаются только текстовые узлы: атрибуты, стили и скрипты остаются как
// есть. Холсты сюда не попадают — подписи на них в строку не переносятся.

// Предлоги, союзы и частицы, которые не остаются в конце строки. Короткие
// слова — потому что именно они висят заметно; «через» или «между» в конце
// строки читаются как обычные слова.
const SHORT = [
  'а', 'в', 'и', 'к', 'о', 'с', 'у',
  'во', 'ко', 'со', 'об', 'от', 'до', 'из', 'на', 'по', 'за',
  'не', 'ни', 'но', 'да',
  'без', 'для', 'над', 'под', 'при', 'про', 'обо', 'изо', 'или',
  'из-за', 'из-под'
];

// Слово целиком: перед ним начало узла, пробел или открывающий знак, после —
// пробелы и еще какой-то текст в том же узле.
const LONGEST_FIRST = [...SHORT].sort((a, b) => b.length - a.length);
const HANGS = new RegExp(
  `(^|[\\s(«„“"'\\[])(${LONGEST_FIRST.join('|')})[ \\t\\r\\n]+(?=\\S)`,
  'gi'
);
// То же слово в самом конце узла, когда следом идет выделенное слово:
// «Начинать пришлось бы в <b>1114</b> году». Склеиваем только с тем, что
// стоит в той же строке текста (INLINE), — и никогда с частью, которая
// приходит отдельно (intro-stage): с ней предлог уехал бы туда, где части еще
// нет.
const TAIL = new RegExp(
  `(^|[\\s(«„“"'\\[])(${LONGEST_FIRST.join('|')})[ \\t\\r\\n]+$`,
  'i'
);
const INLINE = new Set(['B', 'STRONG', 'I', 'EM', 'A', 'SPAN', 'MARK', 'SMALL', 'ABBR', 'Q']);
const joinsNext = (node) => {
  const next = node.nextSibling;
  return !!next && next.nodeType === Node.ELEMENT_NODE && INLINE.has(next.nodeName)
    && !next.classList.contains('intro-stage') && !next.hasAttribute('data-stage');
};
const NBSP = '\u00a0';

// Подряд идущие короткие слова («и в Москве») за один проход не ловятся:
// пробел перед вторым съеден первым совпадением. Второй проход видит его уже
// неразрывным и берет. Больше трех коротких слов подряд в тексте не бывает.
const bound = (text) => {
  let out = text;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(HANGS, `$1$2${NBSP}`);
    if (next === out) break;
    out = next;
  }
  return out;
};

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);

function fixText(node) {
  const text = node.data;
  // Быстрый выход: в узле нет ни одного пробела после буквы — нечего искать.
  // Счетчики, которые блоки переписывают каждый кадр, сюда и попадают.
  if (text.length < 3 || !/[^\s\d]\s/.test(text)) return;
  let next = bound(text);
  if (joinsNext(node)) next = next.replace(TAIL, `$1$2${NBSP}`);
  if (next !== text) node.data = next;
}

// Весь текст внутри root — один раз.
export function bindShortWords(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    if (!(root.parentNode && SKIP.has(root.parentNode.nodeName))) fixText(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.nodeName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE
      ? (SKIP.has(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP)
      : NodeFilter.FILTER_ACCEPT)
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) fixText(n);
}

// И все, что в root допишут потом. Наблюдатель отвечает в той же задаче, до
// отрисовки: читатель строку с висящим предлогом не увидит ни на кадр. Своя
// правка наблюдателя будит его еще раз, но второй проход ничего не меняет —
// и узел больше не трогается.
export function keepBound(root) {
  bindShortWords(root);
  const watch = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') bindShortWords(m.target);
      else m.addedNodes.forEach(bindShortWords);
    }
  });
  watch.observe(root, { childList: true, subtree: true, characterData: true });
  return watch;
}
