#!/usr/bin/env python3
"""Serve the website locally. Works on macOS, Linux and Windows (Python 3.9+, nothing to install).

    python3 tools/serve.py            # this computer only: http://localhost:8765
    python3 tools/serve.py --phone    # also phones on the same Wi-Fi: prints the address to open

Only the website files are served (the same list the Cloudflare zip uses), so backend/,
notes and tools/ are never reachable, even from other devices. Edits show up on reload.
Stop with Ctrl+C.
"""
import argparse
import http.server
import socket
import sys
from functools import partial
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_zip import ALLOW, LIVE_ONLY, ROOT  # noqa: E402

PUBLIC = set(ALLOW + LIVE_ONLY)


class SiteHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        first = path.lstrip("/").split("/", 1)[0]
        if first and (first not in PUBLIC or any(p.startswith(".") for p in path.split("/") if p)):
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always the latest edit
        super().end_headers()

    def log_request(self, code="-", size="-"):
        if not str(getattr(code, "value", code)).startswith(("2", "3")):  # only show problems
            super().log_request(code, size)


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # phones close idle connections all the time; that is not an error
        if isinstance(sys.exc_info()[1], (ConnectionResetError, BrokenPipeError, ConnectionAbortedError)):
            return
        super().handle_error(request, client_address)


def lan_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # picks the Wi-Fi interface; nothing is sent
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--phone", action="store_true", help="allow other devices on the same Wi-Fi")
    ap.add_argument("--port", type=int, help="default 8765, or 8080 with --phone")
    a = ap.parse_args()
    sys.stdout.reconfigure(line_buffering=True)  # show the address at once, even in IDE consoles
    port = a.port or (8080 if a.phone else 8765)
    host = "0.0.0.0" if a.phone else "127.0.0.1"

    try:
        httpd = Server((host, port), partial(SiteHandler, directory=str(ROOT)))
    except OSError:
        sys.exit("Port %d is busy. Stop the other server or add --port 8899." % port)

    print("Serving the site on http://localhost:%d" % port)
    if a.phone:
        ip = lan_address()
        print("On your phone (same Wi-Fi): " + ("http://%s:%d" % (ip, port) if ip else "use this computer's Wi-Fi IP address, port %d" % port))
        print("If the phone can't connect, allow Python through this computer's firewall.")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
