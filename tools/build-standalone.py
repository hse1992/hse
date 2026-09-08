#!/usr/bin/env python3
"""Собирает автономную копию страницы — всё в одном файле.

Состав разделов берётся из MODULES в index.html, так что выгрузка не отстаёт
от страницы. ES-модули расплющиваются: библиотеки идут на верхнем уровне,
каждая визуализация заворачивается в свою функцию, чтобы одинаковые имена
(meta, init) не столкнулись. Картинки, флаги, иконки профессий и шрифты
вставляются как data-URI — страница не делает ни одного внешнего запроса.
"""

import base64
import os
import re
import pathlib
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "На сколько большая.html"

MIME = {
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".otf": "font/otf", ".avif": "image/avif",
    ".woff2": "font/woff2",
}

# Папки, из которых файлы берутся по имени, собранному в коде: путь целиком
# в исходнике не встречается, поэтому для каждой строится своя таблица.
BY_NAME = {
    "flags": ("FLAGS", "assets/flags/${code}.svg", "${FLAGS[code] || ''}"),
    "professions": ("PROFS", "assets/professions/${p.icon}.svg", "${PROFS[p.icon] || ''}"),
}


def sized_svg(text: str) -> str:
    """Проставляет SVG собственный размер, если у него только viewBox.

    Такой SVG знает свою пропорцию, но не размер. Chrome достраивает размер
    сам, WebKit — нет: картинка растягивается по контейнеру, и object-fit
    режет то, что вылезло. Флаги приходят как раз без width и height.
    """
    head = re.match(r"<svg\b[^>]*>", text)
    if not head or re.search(r"\s(width|height)\s*=", head.group(0)):
        return text
    box = re.search(r'viewBox\s*=\s*"\s*[\d.eE+-]+[\s,]+[\d.eE+-]+[\s,]+'
                    r'([\d.eE+-]+)[\s,]+([\d.eE+-]+)\s*"', head.group(0))
    if not box:
        return text
    w, h = box.group(1), box.group(2)
    return text[:4] + f' width="{w}" height="{h}"' + text[4:]


def data_uri(path: pathlib.Path) -> str:
    mime = MIME.get(path.suffix.lower(), "application/octet-stream")
    raw = path.read_bytes()
    if path.suffix.lower() == ".svg":
        # SVG короче в процентном кодировании, чем в base64
        text = re.sub(r"<\?xml[^>]*\?>", "", raw.decode("utf-8")).strip()
        text = re.sub(r"\s+", " ", text)
        text = sized_svg(text)
        return f"data:{mime};charset=utf-8,{urllib.parse.quote(text, safe='')}"
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def strip_module(src: str) -> str:
    """Убирает import/export — файл станет частью общего скрипта."""
    src = re.sub(r"^\s*import[^;]*;\s*$", "", src, flags=re.M)
    return re.sub(r"^export\s+", "", src, flags=re.M)


IMPORT_RE = re.compile(r"^\s*import\s[^;]*?from\s+'([^']+)'", re.M)
EXPORT_RE = re.compile(r"^export\s+(?:async\s+)?(?:const|let|var|function|class)\s+"
                       r"([A-Za-z_$][\w$]*)", re.M)


def imports_of(rel: str) -> list:
    """Что файл импортирует — путями от корня проекта."""
    src = (ROOT / rel).read_text(encoding="utf-8")
    here = pathlib.PurePosixPath(rel).parent
    return [str(pathlib.PurePosixPath(os.path.normpath(here / m)))
            for m in IMPORT_RE.findall(src)]


def collect_libs(entries: list) -> list:
    """Библиотеки и данные в порядке «сначала зависимости».

    Список не пишется руками: новый lib/ или data/ попадает в выгрузку сам,
    как только его кто-нибудь импортирует. Иначе он тихо теряется, и рассказ
    останавливается посреди страницы на «X is not defined».
    """
    order, seen = [], set()

    def walk(rel):
        if rel in seen or rel.startswith("viz/"):
            return                      # визуализации собираются отдельно
        seen.add(rel)
        for dep in imports_of(rel):
            walk(dep)
        order.append(rel)

    for entry in entries:
        for dep in imports_of(entry):
            walk(dep)
    return order


def inline_assets(text: str) -> str:
    def repl(m):
        rel = m.group(0)
        path = ROOT / rel.lstrip("./").replace("../", "")
        return data_uri(path) if path.is_file() else rel

    return re.sub(r"(?:\.\./)?assets/[A-Za-z0-9_\-./]+\.(?:svg|png|jpe?g|avif|otf|woff2)", repl, text)


# ---------- стили ----------
fonts = (ROOT / "styles/fonts.css").read_text(encoding="utf-8")
keep = ("Regular", "SemiBold", "Bold")   # только используемые начертания
fonts = "\n".join(b for b in re.findall(r"@font-face\s*\{[^}]*\}", fonts)
                  if any(k in b for k in keep))

css = "\n".join([
    inline_assets(fonts),
    (ROOT / "styles/tokens.css").read_text(encoding="utf-8"),
    inline_assets((ROOT / "styles/layout.css").read_text(encoding="utf-8")),
])

# ---------- состав страницы ----------
index_src = (ROOT / "index.html").read_text(encoding="utf-8")
NAMES = [n.strip() for n in
         re.search(r"const MODULES = \[([^\]]+)\]", index_src).group(1).split(",")
         if n.strip()]

# ---------- библиотеки и данные ----------
LIBS = collect_libs(["index.html"] + [f"viz/{n}.js" for n in NAMES])
print("  библиотеки:", ", ".join(LIBS))

# Каждая библиотека заворачивается в свою функцию и отдаёт наружу только то,
# что экспортировала. Иначе служебные имена вроде clamp сталкиваются, когда
# такое есть в двух файлах, и скрипт не выполняется целиком.
parts = []
for f in LIBS:
    src = (ROOT / f).read_text(encoding="utf-8")
    out = ", ".join(EXPORT_RE.findall(src))
    body = strip_module(src)
    if not out:
        raise SystemExit(f"сборка испорчена: {f} ничего не экспортирует")
    parts.append(f"const {{ {out} }} = (() => {{\n{body}\nreturn {{ {out} }};\n}})();")
libs = "\n\n".join(parts)
# знак Вышки читается через fetch по адресу файла — подставляем его целиком
libs = libs.replace("new URL('../assets/hse-znak.svg', import.meta.url)",
                    f"'{data_uri(ROOT / 'assets/hse-znak.svg')}'")
libs = inline_assets(libs)

# ---------- таблицы файлов, которые берутся по имени ----------
tables = []
for folder, (name, _, _) in BY_NAME.items():
    files = {p.stem: data_uri(p) for p in sorted((ROOT / "assets" / folder).glob("*.svg"))}
    tables.append(f"const {name} = {{\n"
                  + ",\n".join(f"  {k!r}: {v!r}" for k, v in files.items())
                  + "\n};\n")
    print(f"  {folder}: {len(files)}")
tables = "\n".join(tables)

# ---------- визуализации ----------
mods = []
for name in NAMES:
    src = strip_module((ROOT / f"viz/{name}.js").read_text(encoding="utf-8"))
    for _, (_, pattern, replacement) in BY_NAME.items():
        src = src.replace(pattern, replacement)
    src = inline_assets(src)
    mods.append(f"const MOD_{name} = (() => {{\n{src}\nreturn {{ meta, init }};\n}})();")
mods = "\n\n".join(mods)

# ---------- каркас ----------
header = inline_assets(re.search(r"<header class=\"page-header\">.*?</header>", index_src, re.S).group(0))
footer = re.search(r"<footer class=\"page-footer\">.*?</footer>", index_src, re.S).group(0)
# всё, что делает каркас: раскладка секций, запуск пошагового чтения и связка
# полоски прогресса со степпером. Начало ищется по коду, а не по комментарию:
# тем же оборотом начинается ранний скрипт про scrollRestoration, и поиск
# уезжал на него. Конец — конец самого модуля, чтобы строки после
# mountStepper не терялись.
shell = re.search(r"  const plan = MODULES\.map\(.*?(?=\n\s*</script>)", index_src, re.S).group(0)

html = f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>На сколько большая</title>
<!-- Собранная копия страницы целиком: стили, скрипты, шрифты и картинки лежат
     внутри файла, ничего не подгружается. Исходники — в проекте «На сколько
     большая», это выгрузка из них. -->
<style>
{css}
</style>
</head>
<body>
<script>
  // Same as in index.html: the page is read beat by beat, so a reload starts it
  // over rather than dropping the reader where they had scrolled to.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
</script>
<main>
{header}

  <div id="page"></div>

{footer}
</main>

<script>
{tables}
{libs}

{mods}

const MODULES = [{', '.join('MOD_' + n for n in NAMES)}];
const page = document.getElementById('page');

{shell}
</script>
</body>
</html>
"""

# ---------- проверка ----------
# Автономный файл ничего не подгружает, поэтому уцелевший import — это молча
# сломанная страница: скрипт не выполнится, останется одна титульная.
for bad, why in [(r"^\s*import\s", "остался import"),
                 (r"<script[^>]*type=\"module\"", "остался модульный скрипт"),
                 # ${...} — подстановка внутри шаблонной строки, туда встанет data-URI
                 (r"src=\"(?!data:|\$\{)", "остался внешний src"),
                 (r"href=\"(?!data:|\$\{|#|https?:)", "осталась внешняя ссылка на файл")]:
    if re.search(bad, html, re.M):
        raise SystemExit(f"сборка испорчена: {why}")

OUT.write_text(html, encoding="utf-8")
print(f"{OUT.name}: {len(html.encode('utf-8')) / 1024 / 1024:.2f} МБ, разделов {len(NAMES)}")
