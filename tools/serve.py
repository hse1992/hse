#!/usr/bin/env python3
"""Локальный сервер для разработки: как http.server, но без кэша.

Обычный `python3 -m http.server` не шлет заголовков о кэшировании, и браузер
решает сам — как правило, держит скрипты и стили у себя. Из-за этого правка
уже на диске, а на экране старая страница, и это выглядит так, будто ничего
не поменялось. Здесь каждый ответ помечен «не хранить».

    python3 tools/serve.py          # http://localhost:8000
    python3 tools/serve.py 8080     # на другом порту
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCache, directory=str(ROOT))
    with ThreadingHTTPServer(('', port), handler) as server:
        print(f'На сколько большая: http://localhost:{port} (без кэша)')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nостановлен')


if __name__ == '__main__':
    main()
