#!/usr/bin/env python3
"""Публикуемая копия страницы: те же файлы, только без комментариев и отступов.

    python3 tools/build-site.py            # собирает в _site/
    python3 tools/build-site.py OUT        # в другую папку

Исходники остаются как есть — по ним работают, их читают. Публикуется сборка:
комментарии в коде длинные и почти все по-русски, по два байта на букву, и
даже сжатые gzip-ом они были больше половины того, что телефон скачивает до
кнопки «Начать историю».

Ничего, кроме комментариев и пробелов, не трогается: имена, строки, шаблоны,
регулярные выражения, относительные пути, шрифты и картинки остаются теми же.
Переводы строк в коде сохраняются — так автоматическая расстановка точек с
запятой в JS читает код ровно так же, как исходник. Внутри шаблонных строк
(`...`) из CSS и разметки убираются /* комментарии */ и отступы в начале
строк; сами переводы строк остаются и там.

Сборщиков и npm в проекте нет и не нужно: это стандартная библиотека Python.
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "_site"

# Публикуется все то же, что публиковалось и раньше, когда GitHub Pages отдавал
# ветку как есть: ни один адрес не пропадает — ни автономные копии, ни тизер,
# ни tools/debug-hud.js, который страница грузит по ?debug. Ужимается только
# сама страница: ее HTML и код в viz/, lib/, data/ и styles/.
SKIP = {".git", ".github", ".claude", "_site", ".stand.html", ".DS_Store", "__pycache__"}
SQUEEZE_DIRS = ("viz", "lib", "data", "styles")


def squeezed(rel):
    """Ужимается ли этот файл."""
    if rel.as_posix() == "index.html":
        return True
    return rel.parts[0] in SQUEEZE_DIRS and rel.suffix in (".js", ".css")


# После этих знаков косая черта открывает регулярное выражение, а не делит.
REGEX_AFTER = set("(,=:[!&|?{};+-*%<>~^")
REGEX_KEYWORDS = {"return", "typeof", "case", "do", "else", "in", "of", "new",
                  "delete", "void", "throw", "yield", "await", "instanceof"}


def squeeze_template_text(s):
    """Текст шаблонной строки: убрать /* комментарии */ и отступы строк."""
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    s = re.sub(r"\n[ \t]+", "\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{2,}", "\n", s)
    return s


def minify_js(src):
    out = []
    i, n = 0, len(src)
    last = ""            # последний значимый знак или слово — для / и регулярок
    stack = []           # открытые ${ внутри шаблонов: глубина фигурных скобок
    depth = 0

    def emit(text, significant=None):
        nonlocal last
        out.append(text)
        if significant is not None:
            last = significant

    def read_template():
        """Читает шаблон с позиции после обратной кавычки до ${ или конца."""
        nonlocal i
        buf = []
        while i < n:
            c = src[i]
            if c == "\\":
                buf.append(src[i:i + 2]); i += 2; continue
            if c == "`":
                i += 1
                emit(squeeze_template_text("".join(buf)) + "`", "`")
                return False
            if c == "$" and i + 1 < n and src[i + 1] == "{":
                i += 2
                emit(squeeze_template_text("".join(buf)) + "${", "{")
                return True
            buf.append(c); i += 1
        raise ValueError("незакрытый шаблон")

    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        # комментарии
        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "/" and nxt == "*":
            j = src.find("*/", i + 2)
            if j < 0:
                raise ValueError("незакрытый комментарий")
            i = j + 2
            out.append(" ")
            continue
        # строки
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "\n":
                    raise ValueError("перевод строки в строке")
                j += 1
            emit(src[i:j + 1], c)
            i = j + 1
            continue
        # шаблоны
        if c == "`":
            emit("`")
            i += 1
            if read_template():
                stack.append(depth)
                depth = 0
            continue
        if c == "{":
            depth += 1
            emit(c, c); i += 1; continue
        if c == "}":
            if stack and depth == 0:
                # конец ${...}: шаблон продолжается
                emit("}")
                i += 1
                depth = stack.pop()
                if read_template():
                    stack.append(depth)
                    depth = 0
                continue
            depth -= 1
            emit(c, c); i += 1; continue
        # регулярные выражения
        if c == "/":
            word = last if last.isidentifier() else ""
            is_regex = (last == "" or last in REGEX_AFTER or word in REGEX_KEYWORDS) \
                and not (last.isidentifier() and word not in REGEX_KEYWORDS)
            if is_regex:
                j = i + 1
                klass = False
                while j < n:
                    ch = src[j]
                    if ch == "\\":
                        j += 2; continue
                    if ch == "[":
                        klass = True
                    elif ch == "]":
                        klass = False
                    elif ch == "/" and not klass:
                        break
                    elif ch == "\n":
                        raise ValueError("перевод строки в регулярном выражении")
                    j += 1
                j += 1
                while j < n and (src[j].isalnum()):
                    j += 1
                emit(src[i:j], "/re/")
                last = ")"      # после регулярки / снова деление
                i = j
                continue
            emit(c, c); i += 1; continue
        # пробелы
        if c in " \t\r":
            j = i
            while j < n and src[j] in " \t\r":
                j += 1
            out.append(" ")
            i = j
            continue
        if c == "\n":
            out.append("\n")
            i += 1
            continue
        # слова и числа
        if c.isalnum() or c in "_$" or ord(c) > 127:
            j = i
            while j < n and (src[j].isalnum() or src[j] in "_$" or ord(src[j]) > 127):
                j += 1
            word = src[i:j]
            emit(word, word if word.isidentifier() else ")")
            i = j
            continue
        if c in ")]":
            emit(c, ")"); i += 1; continue
        if c == ".":
            emit(c, "."); i += 1; continue
        emit(c, c); i += 1

    text = "".join(out)
    # строки: без пробелов по краям, без пустых
    lines = [ln.strip() for ln in text.split("\n")]
    return "\n".join(ln for ln in lines if ln) + "\n"


def minify_css(src):
    out = []
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and src[i + 1:i + 2] == "*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == "\\":
                    j += 1
                j += 1
            out.append(src[i:j + 1])
            i = j + 1
            continue
        if c.isspace():
            j = i
            while j < n and src[j].isspace():
                j += 1
            out.append(" ")
            i = j
            continue
        out.append(c)
        i += 1
    text = "".join(out)
    text = re.sub(r" ?([{};]) ?", r"\1", text)
    return text.strip() + "\n"


def minify_html(src):
    # комментарии разметки — кроме тех, что внутри скриптов
    parts = re.split(r"(<script\b[^>]*>.*?</script>)", src, flags=re.S)
    res = []
    for part in parts:
        m = re.match(r"(<script\b[^>]*>)(.*?)(</script>)", part, flags=re.S)
        if m:
            res.append(m.group(1) + "\n" + minify_js(m.group(2)) + m.group(3))
        else:
            part = re.sub(r"<!--.*?-->", "", part, flags=re.S)
            part = re.sub(r"\n[ \t]+", "\n", part)
            part = re.sub(r"\n{2,}", "\n", part)
            res.append(part)
    return "".join(res)


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    before = after = 0
    for f in sorted(ROOT.rglob("*")):
        rel = f.relative_to(ROOT)
        if any(part in SKIP for part in rel.parts) or not f.is_file():
            continue
        if OUT in f.parents:
            continue
        dst = OUT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if squeezed(rel):
            text = f.read_text(encoding="utf-8")
            try:
                small = {".js": minify_js, ".css": minify_css, ".html": minify_html}[f.suffix](text)
            except ValueError as err:
                sys.exit(f"{rel}: {err}")
            dst.write_text(small, encoding="utf-8")
            before += len(text.encode("utf-8"))
            after += len(small.encode("utf-8"))
        else:
            shutil.copy2(f, dst)
    # GitHub Pages не должен прогонять сборку через Jekyll.
    (OUT / ".nojekyll").write_text("")
    print(f"{OUT.name}: код страницы {before // 1024} КБ -> {after // 1024} КБ")


if __name__ == "__main__":
    build()
