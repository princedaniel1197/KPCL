#!/usr/bin/env python3
"""Orchestrate every Sentinel scraper and write data/manifest.json.

Usage:
  python scrapers/run_all.py                 # run all sources
  python scrapers/run_all.py --only coalprices,freight
  python scrapers/run_all.py --dry-run       # preview; write nothing
  python scrapers/run_all.py --no-cache      # force live fetch (ignores .cache)

Each scraper is idempotent: an unreachable source leaves the last good snapshot in
place and is recorded as STALE. Nothing crashes the suite; nothing blanks a page.
Run this the NIGHT BEFORE a demo, verify the manifest, commit /data, deploy. Never
run live during a demo.
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Windows consoles default to cp1252; the status glyphs need UTF-8.
try:
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
except Exception:
    pass

# Allow running as `python scrapers/run_all.py` from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import FeedStatus, Http, ScrapeResult, write_snapshot  # noqa: E402
from common.json_writer import REPO_ROOT  # noqa: E402

# feed key -> (module, which pages it powers) — drives the manifest + /data page.
SCRAPERS = [
    ("parivesh", "REAL clearance status", ["/projects/clearances", "/data"]),
    ("ecourts", "REAL case status", ["/legal", "/data"]),
    ("eproc", "REAL KPCL tenders", ["/contracts/spend", "/projects/retenders", "/data"]),
    ("cea", "REAL project status + CALIBRATED norms", ["/projects", "/plants/hydro", "/data"]),
    ("cag", "REAL published audit findings", ["/regulatory/audit-paras", "/data"]),
    ("kerc", "REAL approved charges + CALIBRATED norm rates", ["/regulatory", "/regulatory/costing"]),
    ("coalprices", "CALIBRATED CIL grade bands + prices", ["/coal", "/data"]),
    ("freight", "CALIBRATED railway freight + demurrage", ["/coal/demurrage", "/data"]),
    ("cwc", "REAL reservoir levels (Linganamakki/Supa)", ["/plants/hydro", "/data"]),
    ("annualreport", "REAL KPCL generation/PLF + reservoirs", ["/plants", "/plants/hydro", "/data"]),
    ("uttam", "REAL third-party GCV (if public)", ["/coal/ledger", "/data"]),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _as_list(x) -> list[ScrapeResult]:
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def main() -> int:
    ap = argparse.ArgumentParser(description="Sentinel scraper suite")
    ap.add_argument("--only", help="comma-separated feed keys to run")
    ap.add_argument("--dry-run", action="store_true", help="preview; write nothing")
    ap.add_argument("--no-cache", action="store_true", help="ignore the on-disk cache")
    args = ap.parse_args()

    only = set(x.strip() for x in args.only.split(",")) if args.only else None
    http = Http(use_cache=not args.no_cache)

    manifest_entries: list[dict] = []
    print(f"Sentinel scrapers — {_now_iso()}  {'(dry-run)' if args.dry_run else ''}")

    for key, desc, powers in SCRAPERS:
        if only and key not in only:
            continue
        try:
            mod = importlib.import_module(key)
            results = _as_list(mod.run(http))
        except Exception:
            print(f"  ✗ {key}: crashed\n{traceback.format_exc()}")
            manifest_entries.append({
                "feed": key, "label": desc, "powers": powers,
                "provenance": "REAL", "status": "ERROR",
                "note": "scraper raised; last snapshot kept", "count": 0,
            })
            continue

        for r in results:
            if not args.dry_run:
                write_snapshot(r)
            fresh = r.status == FeedStatus.LIVE
            manifest_entries.append({
                "feed": r.feed,
                "label": desc,
                "powers": powers,
                "provenance": r.provenance.value,
                "status": r.status.value,
                "source_url": r.source_url,
                "robots": r.robots,
                "note": r.note,
                "count": r.count,
                "calibration": r.calibration,
                "fetched_at": _now_iso() if fresh else None,
            })
            icon = {"LIVE": "✓", "STALE": "≈", "SKIPPED": "–", "PENDING": "…", "ERROR": "✗"}.get(r.status.value, "?")
            print(f"  {icon} {r.feed:12s} {r.provenance.value:10s} {r.status.value:8s} n={r.count}  {r.note[:60]}")

    manifest = {
        "generatedAt": _now_iso(),
        "sources": manifest_entries,
        "summary": {
            "live": sum(1 for e in manifest_entries if e["status"] == "LIVE"),
            "pending": sum(1 for e in manifest_entries if e["status"] == "PENDING"),
            "skipped": sum(1 for e in manifest_entries if e["status"] == "SKIPPED"),
            "stale": sum(1 for e in manifest_entries if e["status"] == "STALE"),
            "error": sum(1 for e in manifest_entries if e["status"] == "ERROR"),
        },
    }
    if not args.dry_run:
        (REPO_ROOT / "data" / "manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    s = manifest["summary"]
    print(f"\nManifest: {s['live']} live · {s['pending']} pending · "
          f"{s['skipped']} skipped · {s['stale']} stale · {s['error']} error")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
