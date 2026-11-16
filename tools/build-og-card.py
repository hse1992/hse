#!/usr/bin/env python3
"""Карточка превью ссылки: снимок tools/og-card.html в assets/og-card-cover.jpg.

    python3 tools/build-og-card.py

Мессенджер, получив ссылку на страницу, читает ее <head> и показывает
картинку из og:image. Картинка — снимок карточки 1200 на 630, сделанный
Chrome без окна. Страница на нее только ссылается: при обычном открытии
браузер читателя ее не скачивает.

Перерисовывать карточку нужно, когда меняется обложка: заголовок, цвета,
шрифт. После этого — закоммитить снимок. Новая карточка — новое имя файла (и в <head> тоже):
мессенджеры держат картинку по адресу, и старый адрес отдавал бы им старую. Мессенджеры кэшируют
превью надолго; у Telegram его обновляет @WebpageBot.

Нужен установленный Google Chrome, а для перевода снимка в JPEG — Pillow
или sips (он есть на любом маке). Сборщиков и npm по-прежнему нет.
"""

import functools
import http.server
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "og-card-cover.jpg"
# JPEG, а не PNG: свечение и рисунок на фоне PNG сжимает плохо (без малого
# 300 КБ), а WhatsApp превью тяжелее примерно 300 КБ не показывает вовсе.
QUALITY = 88
W, H = 1200, 630

CHROMES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "google-chrome",
    "chromium",
    "chromium-browser",
]


def chrome():
    for c in CHROMES:
        found = shutil.which(c) or (c if Path(c).exists() else None)
        if found:
            return found
    sys.exit("Не нашелся Chrome: карточку снимает он.")


def to_jpeg(src, dst):
    """Chrome снимает только в PNG; в JPEG переводит то, что есть под рукой."""
    try:
        from PIL import Image
        Image.open(src).convert("RGB").save(dst, "JPEG", quality=QUALITY, optimize=True)
        return
    except ImportError:
        pass
    if shutil.which("sips"):     # есть на любом маке
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(QUALITY),
                        str(src), "--out", str(dst)], check=True, stdout=subprocess.DEVNULL)
        return
    sys.exit("Нечем перевести снимок в JPEG: нужен Pillow или sips.")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    # Шрифты и картинки карточка берет из проекта, а с file:// браузер
    # шрифты не отдает — поэтому свой маленький сервер на свободном порту.
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/tools/og-card.html"
    profile = tempfile.mkdtemp()
    shot = Path(profile) / "card.png"
    try:
        subprocess.run([
            chrome(), "--headless=new", "--hide-scrollbars", "--no-first-run",
            f"--user-data-dir={profile}",
            f"--window-size={W},{H}", "--force-device-scale-factor=1",
            # Ждать, пока догрузятся шрифты: без них снимок выйдет системным
            # шрифтом.
            "--virtual-time-budget=4000",
            f"--screenshot={shot}", url,
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        to_jpeg(shot, OUT)
    finally:
        server.shutdown()
        shutil.rmtree(profile, ignore_errors=True)
    print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size // 1024} КБ")


if __name__ == "__main__":
    main()
