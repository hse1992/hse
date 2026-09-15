#!/usr/bin/env python3
"""Локальный сервер для тизера.

Отдает проект так же, как `python3 -m http.server`, и умеет принять записанное
видео: страница teaser/index.html после записи отправляет файл сюда, и он
ложится в teaser/teaser.mp4 (или .webm), без скачивания через браузер.

Запуск:  python3 tools/teaser-server.py [порт]
Дальше   http://localhost:8001/teaser/
"""

import http.server
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALLOWED = {"teaser.mp4", "teaser.webm"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_PUT(self):
        # Only the teaser video itself, only into teaser/.
        name = self.path.split("?")[0].rsplit("/", 1)[-1]
        if not self.path.startswith("/teaser/") or name not in ALLOWED:
            self.send_error(403)
            return
        length = int(self.headers.get("Content-Length", 0))
        (ROOT / "teaser" / name).write_bytes(self.rfile.read(length))
        self.send_response(201)
        self.end_headers()


port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8001))
print(f"http://localhost:{port}/teaser/")
http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
