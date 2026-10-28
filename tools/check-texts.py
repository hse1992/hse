#!/usr/bin/env python3
"""Проверяет тексты страницы по правилам проекта.

Правила записаны в CLAUDE.md, но соблюдаются на глаз, а над проектом работают
несколько диалогов — что-то да проскочит. Скрипт читает исходники и печатает
места, где правило нарушено:

  ё            буква «ё» не используется
  ·            разделитель запрещен, вместо него тире или запятая
  вы           к читателю обращаемся на «ты»
  число        длинное число прямо в тексте — скорее всего, мимо nf()
  toLocale     форматирование чисел мимо lib/format.js
  комментарий  непарные /* и */ в стилях

Последнее — не про текст, но ловится тем же проходом и иначе не ловится
вовсе. Лишний */ в CSS не ошибка для браузера: он читает текст после него как
начало правила и доедает следующее настоящее правило целиком, молча. Так на
телефоне вернулся подзаголовок, убранный полгода назад, — правило, которое
его складывает, просто перестало существовать, одинаково во всех браузерах.

Проверяется то, что видит читатель: строковые литералы и текст в разметке.
Код и комментарии не в счет — там и константа в 81000, и цитата в комментарии
законны. Исключение — «ё» и «·»: их незачем писать нигде.

Запуск:  python3 tools/check-texts.py
Выходит с кодом 1, если что-то нашлось, — так его можно повесить на хук.
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

LOOK_IN = ["index.html", "viz", "lib", "data", "styles"]

CYRILLIC = re.compile(r"[а-яА-Я]")

# Строковый литерал любого вида, шаблонный — вместе с переносами строк.
STRING = re.compile(r"'[^'\\\n]*(?:\\.[^'\\\n]*)*'"
                    r'|"[^"\\\n]*(?:\\.[^"\\\n]*)*"'
                    r"|`[^`\\]*(?:\\.[^`\\]*)*`", re.S)

# Текст разметки: все, что между тегами.
HTML_TEXT = re.compile(r">([^<>]+)<")

# «вы» во всех падежах, но не внутри слова: «Вышка», «выпуск», «выше» — свои.
# И частые повелительные на «вы»: обращение видно и без местоимения. Список, а
# не окончание «-йте»: иначе в него попадут «на сайте» и прочие существительные.
YOU = re.compile(r"(?<![а-яА-Я])("
                 r"вы|вас|вам|вами|ваш|ваша|ваше|ваши|ваших|вашем|вашего"
                 r"|попробуйте|нажмите|посмотрите|смотрите|выберите|кликните|наведите"
                 r"|включите|выключите|сравните|найдите|узнайте|представьте|листайте"
                 r"|крутите|читайте|поверните|перетащите|обратите|заметьте|проверьте"
                 r"|откройте|закройте|двигайте|тяните|начните|продолжите"
                 r")(?![а-яА-Я])", re.I)

# Число, которое стоило бы прогнать через nf(): четыре цифры подряд или
# разряды через пробел. Год — не число в этом смысле.
BIG_NUMBER = re.compile(r"(?<![\w.#])\d{4,}(?![\w.%])|\d{1,3}(?: \d{3})+")
YEAR = re.compile(r"^(1[89]|20)\d\d$")


def sources():
    for name in LOOK_IN:
        path = ROOT / name
        if path.is_file():
            yield path
            continue
        for f in sorted(path.rglob("*")):
            if f.is_file() and f.suffix in {".js", ".css", ".html"}:
                yield f


def visible(src: str, html: bool):
    """Куски файла, которые доходят до читателя, — со смещением каждого."""
    for m in STRING.finditer(src):
        yield m.start(), m.group(0)
    if html:
        for m in HTML_TEXT.finditer(src):
            yield m.start(1), m.group(1)


def stray_comments(text: str):
    """Непарные /* и */ — со смещением каждого.

    Внутри комментария вложенный /* — обычный текст, поэтому открывающий
    считается только там, где комментарий закрыт.
    """
    i, opened = 0, -1
    while i < len(text) - 1:
        pair = text[i:i + 2]
        if pair == "/*" and opened < 0:
            opened, i = i, i + 2
            continue
        if pair == "*/":
            if opened < 0:
                yield i, "лишний */"
            opened, i = -1, i + 2
            continue
        i += 1
    if opened >= 0:
        yield opened, "/* не закрыт"


def check(path: pathlib.Path):
    rel = path.relative_to(ROOT)
    src = path.read_text(encoding="utf-8")
    lines = src.splitlines()
    at = lambda pos: src.count("\n", 0, pos) + 1        # noqa: E731
    found = []

    for n, line in enumerate(lines, 1):
        if "ё" in line or "Ё" in line:
            found.append((rel, n, "ё"))
        if "·" in line:
            found.append((rel, n, "·"))
        if "toLocaleString" in line and rel.as_posix() != "lib/format.js":
            found.append((rel, n, "toLocale"))

    # Стили блоков лежат в шаблонных строках модулей, и лишний */ там стоит
    # ровно столько же, сколько в самом layout.css.
    for pos, piece in ([(0, src)] if path.suffix == ".css"
                       else [(p, s) for p, s in visible(src, False)
                             if s.startswith("`") and "/*" in s]):
        for off, why in stray_comments(piece):
            found.append((rel, at(pos + off), f"комментарий: {why}"))

    for pos, piece in visible(src, path.suffix == '.html'):
        if not CYRILLIC.search(piece):
            continue
        hit = YOU.search(piece)
        if hit:
            found.append((rel, at(pos + hit.start()), f"вы: «{hit.group(0)}»"))
        number = BIG_NUMBER.search(piece)
        # Число считается текстом, только если рядом слова: в стилях и в
        # разметке картинок цифр полно, и они не про людей.
        near = piece[max(0, number.start() - 30):number.end() + 30] if number else ""
        if number and not YEAR.match(number.group(0)) and CYRILLIC.search(near):
            found.append((rel, at(pos + number.start()), f"число: {number.group(0)}"))

    return [(rel, n, why, lines[n - 1].strip()) for rel, n, why in found]


def main():
    found = []
    for path in sources():
        found += check(path)

    for rel, n, why, line in sorted(found):
        if len(line) > 96:
            line = line[:93] + "…"
        print(f"{rel}:{n}: {why}\n    {line}")

    print(f"\nнайдено: {len(found)}" if found else "тексты чистые")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
