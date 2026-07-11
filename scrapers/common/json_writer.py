"""Provenance-stamping JSON writer + the base Scraper contract.

Every snapshot file is a small envelope:
  {
    "feed": "parivesh",
    "provenance": "REAL",
    "source_url": "...",
    "fetched_at": "2026-07-11T18:04:00Z",
    "status": "LIVE" | "STALE" | "SKIPPED" | "PENDING" | "ERROR",
    "note": "...",
    "records": [ ... ]     # or "params": {...} for calibration files
  }

Idempotent: on unreachable source or parse failure we DO NOT overwrite the last
good snapshot — we return a status so run_all can record it in the manifest.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .provenance import FeedStatus, Provenance

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRAPED_DIR = REPO_ROOT / "data" / "scraped"
CALIB_DIR = REPO_ROOT / "data" / "calibration"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def out_path(feed: str, calibration: bool = False) -> Path:
    d = CALIB_DIR if calibration else SCRAPED_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{feed}.json"


@dataclass
class ScrapeResult:
    feed: str
    provenance: Provenance
    source_url: str
    status: FeedStatus
    payload_key: str = "records"           # "records" or "params"
    payload: Any = field(default_factory=list)
    note: str = ""
    robots: str = ""
    calibration: bool = False

    @property
    def count(self) -> int:
        if isinstance(self.payload, list):
            return len(self.payload)
        if isinstance(self.payload, dict):
            return len(self.payload)
        return 0


def write_snapshot(result: ScrapeResult) -> None:
    """Write the envelope ONLY when we have fresh data (LIVE). For any other
    status, leave the existing snapshot on disk untouched (idempotent)."""
    path = out_path(result.feed, result.calibration)
    if result.status != FeedStatus.LIVE:
        return  # keep the last good snapshot; run_all records the status
    envelope = {
        "feed": result.feed,
        "provenance": result.provenance.value,
        "source_url": result.source_url,
        "fetched_at": _now_iso(),
        "status": result.status.value,
        "robots": result.robots,
        "note": result.note,
        result.payload_key: result.payload,
    }
    path.write_text(json.dumps(envelope, indent=2, ensure_ascii=False), encoding="utf-8")


def read_existing(feed: str, calibration: bool = False) -> dict | None:
    path = out_path(feed, calibration)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
