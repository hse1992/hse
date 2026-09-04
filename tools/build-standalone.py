#!/usr/bin/env python3
"""Собирает автономную копию страницы — всё в одном файле.

Состав разделов берётся из MODULES в index.html, так что выгрузка не отстаёт
от страницы. ES-модули расплющиваются: библиотеки идут на верхнем уровне,
каждая визуализация заворачивается в свою функцию, чтобы одинаковые имена
(meta, init) не столкнулись. Картинки, флаги, иконки профессий и шрифты
вставляются как data-URI — страница не делает ни одного внешнего запроса.
"""

import base64
import re
import pathlib
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "metro-standalone.html"

MIME = {
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".otf": "font/otf", ".avif": "image/avif",
}

# Папки, из которых файлы берутся по имени, собранному в коде: путь целиком
# в исходнике не встречается, поэтому для каждой строится своя таблица.
BY_NAME = {
    "flags": ("FLAGS", "assets/flags/${code}.svg", "${FLAGS[code] || ''}"),
    "professions": ("PROFS", "assets/professions/${p.icon}.svg", "${PROFS[p.icon] || ''}"),
}


def data_uri(path: pathlib.Path) -> str:
    mime = MIME.get(path.suffix.lower(), "application/octet-stream")
    raw = path.read_bytes()
    if path.suffix.lower() == ".svg":
        # SVG короче в процентном кодировании, чем в base64
        text = re.sub(r"<\?xml[^>]*\?>", "", raw.decode("utf-8")).strip()
        text = re.sub(r"\s+", " ", text)
        return f"data:{mime};charset=utf-8,{urllib.parse.quote(text, safe='')}"
    return f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"


def strip_module(src: str) -> str:
    """Убирает import/export — файл станет частью общего скрипта."""
    src = re.sub(r"^import[^;]*;\s*$", "", src, flags=re.M)
    return re.sub(r"^export\s+", "", src, flags=re.M)


def inline_assets(text: str) -> str:
    def repl(m):
        rel = m.group(0)
        path = ROOT / rel.lstrip("./").replace("../", "")
        return data_uri(path) if path.is_file() else rel

    return re.sub(r"(?:\.\./)?assets/[A-Za-z0-9_\-./]+\.(?:svg|png|jpe?g|avif|otf)", repl, text)


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

# ---------- библиотеки и данные ----------
LIBS = ["lib/color.js", "data/hse.js", "data/countries.js", "data/history.js",
        "data/professions.js", "lib/format.js", "lib/ui.js", "lib/hse-mark.js",
        "lib/page.js"]
libs = "\n".join(strip_module((ROOT / f).read_text(encoding="utf-8")) for f in LIBS)
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
index_src = (ROOT / "index.html").read_text(encoding="utf-8")
NAMES = [n.strip() for n in
         re.search(r"const MODULES = \[([^\]]+)\]", index_src).group(1).split(",")
         if n.strip()]

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
shell = re.search(r"MODULES\.forEach\(\(mod, index\) => \{.*?\n  \}\);", index_src, re.S).group(0)

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

mountProgress();
</script>
</body>
</html>
"""

OUT.write_text(html, encoding="utf-8")
print(f"{OUT.name}: {len(html.encode('utf-8')) / 1024 / 1024:.2f} МБ, разделов {len(NAMES)}")
