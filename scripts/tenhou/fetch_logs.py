"""Downloads a sample of Tenhou phoenix-room game logs for the rules tests.

Run by the "Fetch Tenhou logs" workflow (Claude's container cannot reach
tenhou.net). Picks 4-player hanchan games with red fives and open tanyao
(四鳳南喰赤) from one year's archive, downloads their mjlog XML, removes the
player names and writes them to tests/python/data/tenhou/phoenix.jsonl.gz:
one {"id": ..., "xml": ...} object per line.

    python scripts/tenhou/fetch_logs.py --year 2024 --count 300
"""

import argparse
import gzip
import json
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "tests/python/data/tenhou/phoenix.jsonl.gz"
UA = {"User-Agent": "Mozilla/5.0 (RiichiNight rules tests)", "Referer": "https://tenhou.net/"}
GAME_TYPE = "四鳳南喰赤"


def get(url: str, tries: int = 4) -> bytes:
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if attempt == tries - 1:
                raise
            print(f"retry {url}: {e}", file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise AssertionError


def game_ids(year: int) -> list:
    """Phoenix games of the last days (the daily lists on Tenhou's raw page).

    The yearly archives (scrawYYYY.zip, ~450 MB) are not downloadable by
    scripts; the daily lists are."""
    index = get("https://tenhou.net/sc/raw/").decode("utf-8", "replace")
    links = sorted(set(re.findall(r'(?:href|file)="?([^" >]*scc\d+\.html(?:\.gz)?)', index)))
    if not links:
        # The list may come from a script; take dates from any scc file names.
        links = sorted(set(re.findall(r"(scc\d{8,10}\.html(?:\.gz)?)", index)))
    print(f"::notice::{len(links)} daily lists, e.g. {links[:3]}")
    if not links:
        print(f"::notice::index: {index[:1500]!r}")
        raise RuntimeError("no daily lists on the index page")
    ids = []
    for link in links:
        url = urllib.parse.urljoin("https://tenhou.net/sc/raw/dat/", link.split("/")[-1])
        if link.startswith("http") or "/" in link:
            url = urllib.parse.urljoin("https://tenhou.net/sc/raw/", link)
        try:
            raw = get(url, tries=2)
        except Exception as e:  # noqa: BLE001
            print(f"::notice::{url}: {e}")
            continue
        if raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        for line in raw.decode("utf-8", "replace").splitlines():
            if GAME_TYPE in line:
                m = re.search(r"log=([0-9a-z\-]+)", line)
                if m:
                    ids.append(m.group(1))
    return ids


def strip_names(xml: str) -> str:
    return re.sub(r'<UN [^>]*/>', lambda m: re.sub(r' n[0-3]="[^"]*"', "", m.group(0)), xml)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=2024)
    ap.add_argument("--count", type=int, default=300)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    ids = game_ids(args.year)
    print(f"::notice::{len(ids)} {GAME_TYPE} games in {args.year}")
    if not ids:
        sys.exit("::error::no games found in the archive")
    random.Random(args.seed).shuffle(ids)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    done = 0
    failed = []
    with gzip.open(OUT, "wt", encoding="utf-8") as out:
        for gid in ids:
            if done >= args.count:
                break
            try:
                xml = get(f"https://tenhou.net/0/log/?{gid}").decode("utf-8")
            except Exception as e:  # noqa: BLE001
                failed.append(f"{gid}: {e}")
                continue
            if "<mjloggm" not in xml:
                failed.append(f"{gid}: not a log ({xml[:80]!r})")
                continue
            out.write(json.dumps({"id": gid, "xml": strip_names(xml)}, ensure_ascii=False) + "\n")
            done += 1
            time.sleep(0.5)
    print(f"::notice::saved {done} logs to {OUT.name}, {len(failed)} failed")
    for f in failed[:10]:
        print(f"::warning::{f}")
    if done < args.count // 2:
        sys.exit(f"::error::only {done} logs downloaded")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except BaseException:  # noqa: BLE001
        import traceback

        # Job logs are not readable from Claude's container; annotations are.
        for line in traceback.format_exc().strip().splitlines()[-6:]:
            print(f"::error::{line.strip()}")
        sys.exit(1)
