#!/usr/bin/env python3
"""Build the zip to upload to Cloudflare (Workers / Pages "upload static files").

Usage (from the project folder):
    python3 tools/build_zip.py            # test site: hidden from Google
    python3 tools/build_zip.py --live     # real launch: indexable, adds sitemap.xml and robots.txt
    python3 tools/build_zip.py --out ~/Desktop/site.zip

Only the files in ALLOW are copied, so backend/, notes (*.md), tools/ and anything
else that happens to be in the folder can never end up on the website.
Needs only the Python that comes with macOS (3.9+).
"""
import argparse
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALLOW = ["index.html", "privacy.html", "site.webmanifest", "css", "js", "assets"]
LIVE_ONLY = ["sitemap.xml", "robots.txt"]
SKIP_NAMES = {".DS_Store", "Thumbs.db"}
NOINDEX_META = '<meta name="robots" content="noindex, nofollow">'
NOINDEX_HEADERS = "/*\n  X-Robots-Tag: noindex, nofollow\n"
HTML = {"index.html", "privacy.html"}


def files(live):
    for name in ALLOW + (LIVE_ONLY if live else []):
        p = ROOT / name
        if not p.exists():
            sys.exit("Missing " + name + ": run this from a complete copy of the project.")
        for f in ([p] if p.is_file() else sorted(p.rglob("*"))):
            if f.is_file() and f.name not in SKIP_NAMES and not f.name.startswith("."):
                yield f


def checks(live):
    """Stop before building something that would look broken or half-finished."""
    problems, warnings = [], []
    app = (ROOT / "js" / "app.js").read_text(encoding="utf-8")
    m = re.search(r"formEndpoint:\s*'([^']*)'", app)
    if not m or not m.group(1).startswith("https://script.google.com/"):
        (problems if live else warnings).append("formEndpoint in js/app.js is empty, so the form only runs in preview mode.")
    versions = set()
    for name in HTML:
        versions |= set(re.findall(r"\?v=([0-9a-z]+)", (ROOT / name).read_text(encoding="utf-8")))
    if len(versions) > 1:
        problems.append("index.html and privacy.html use different ?v= versions: " + ", ".join(sorted(versions)))
    if live:
        for name in HTML:
            text = (ROOT / name).read_text(encoding="utf-8")
            if "00000 00000" in text or "yourdomain" in text:
                warnings.append(name + " still has placeholder contact details.")
    return problems, warnings


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--live", action="store_true", help="build the real public site (no noindex)")
    ap.add_argument("--out", help="zip path (default: next to the project folder)")
    a = ap.parse_args()

    problems, warnings = checks(a.live)
    for w in warnings:
        print("Warning: " + w)
    if problems:
        for p in problems:
            print("Stopped: " + p)
        sys.exit(1)

    name = "Velocity-Travels-Live.zip" if a.live else "Velocity-Travels-Preview.zip"
    out = Path(a.out).expanduser() if a.out else ROOT.parent / name
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_name(out.name + ".part")

    count = 0
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files(a.live):
            rel = f.relative_to(ROOT).as_posix()
            if rel in HTML and not a.live:
                text = f.read_text(encoding="utf-8")
                if NOINDEX_META not in text:
                    text, n = re.subn(r'(<meta name="theme-color")', NOINDEX_META + "\n" + r"\1", text, count=1)
                    if n != 1:
                        sys.exit("Could not add the noindex tag to " + rel + " (theme-color meta not found).")
                z.writestr(rel, text)
            else:
                z.write(f, rel)
            count += 1
        if not a.live:
            z.writestr("_headers", NOINDEX_HEADERS)
            count += 1
    tmp.replace(out)

    size = out.stat().st_size / 1024
    mode = "LIVE (visible to Google)" if a.live else "TEST (hidden from Google)"
    print("Built %s: %d files, %.0f KB, %s" % (out, count, size, mode))


if __name__ == "__main__":
    main()
