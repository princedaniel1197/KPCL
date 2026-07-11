"""KPCL tender results / awards — via BidAssist aggregator  [REAL]

Companion to the `bidassist` active-tenders feed. BidAssist's bidaward API
re-publishes KPCL's public Award-of-Contract (AOC) results: what was awarded,
the awarded value, contract date, sector and location. (The winning bidder's
name lives inside the AOC PDF, not the list API, so it is not included.)

We pull the most recent KPCL awards. Every figure is the real published AOC
datum (KPCL's own award refs, e.g. KPCL/2026-27/IND2613). Provenance REAL;
source noted as BidAssist's aggregation of the public KPCL eProcurement portal.

Powers /contracts (real recent awards alongside the active tender pipeline).
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

import requests

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "bidaward"
API = ("https://api.bidassist.com/api/bidaward/v2"
       "?countRequired=true&restrictAction=false&searchBar=false")
PURCHASER = "Karnataka Power Corporation Limited"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124 Safari/537.36")
HEADERS = {"User-Agent": UA, "Content-Type": "application/json",
           "Origin": "https://bidassist.com", "Referer": "https://bidassist.com/"}
PAGE_SIZE = 50
MAX_PAGES = 3  # 150 most-recent awards (sorted recency-first by the API)


def _iso(epoch_ms) -> str | None:
    try:
        return datetime.fromtimestamp(epoch_ms / 1000, timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError):
        return None


def _place(t: dict) -> str | None:
    loc = t.get("location")
    if isinstance(loc, dict):
        parts = [loc.get("district") or loc.get("taluk"), loc.get("state")]
        s = ", ".join(p for p in parts if p)
        return s or None
    if isinstance(loc, str):
        return loc
    return None


def _body(page: int) -> dict:
    return {
        "filter": {"PURCHASER_NAME": [PURCHASER]},
        "sort": "RELEVANCE:DESC",
        "pageNumber": page,
        "pageSize": PAGE_SIZE,
        "tenderType": "ACTIVE",
        "tenderEntity": "TENDER_RESULT",
        "year": datetime.now(timezone.utc).year,
        "label": "",
    }


def _map(t: dict) -> dict:
    sectors = t.get("sectorNames") or []
    return {
        "awardRef": t.get("bidAwardRefNo") or t.get("sourceBidAwardId"),
        "title": (t.get("aocDescription") or "").strip(),
        "awardedValueRs": t.get("value"),
        "contractDate": _iso(t.get("contractDate")),
        "contractPeriod": t.get("contractPeriod"),
        "location": _place(t),
        "category": ", ".join(sectors) if isinstance(sectors, list) else (sectors or None),
        "contractType": t.get("typeOfContract"),
        "stage": t.get("bidAwardResultStage") or t.get("bidAwardStage"),
        "aocDocAvailable": bool(t.get("aocDetailsAvailable")),
        "source": "BidAssist (KPCL eProcurement AOC)",
        "provenance": "REAL",
    }


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status("https://bidassist.com")
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url="https://bidassist.com/tender-results/karnataka-power-corporation-limited/active",
                       status=FeedStatus.PENDING, robots=robots)
    records: list[dict] = []
    seen: set[str] = set()
    total = None
    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        for page in range(MAX_PAGES):
            r = session.post(API, json=_body(page), timeout=40)
            r.raise_for_status()
            td = (r.json().get("data") or {}).get("tenderData") or {}
            content = td.get("content") or []
            if total is None:
                total = td.get("totalElements")
            for t in content:
                ref = t.get("bidAwardRefNo") or t.get("sourceBidAwardId")
                if ref and ref not in seen:
                    seen.add(ref)
                    records.append(_map(t))
            if td.get("number", page) + 1 >= (td.get("totalPages") or 1) or not content:
                break
            time.sleep(2.5)  # polite gap between pages
    except Exception as e:
        res.note = (f"BidAssist KPCL awards unavailable ({type(e).__name__}) — "
                    f"API moved or offline. Kept last snapshot.")
        res.payload = []
        return res

    records = [r for r in records if r["awardRef"]]
    if records:
        res.status = FeedStatus.LIVE
        vals = [r["awardedValueRs"] for r in records if r.get("awardedValueRs")]
        crore = sum(vals) / 1e7 if vals else 0
        res.note = (f"BidAssist: {len(records)} most-recent KPCL contract awards "
                    f"(of {total or '?'} total), ₹{crore:.2f} cr awarded value. "
                    f"Real published AOC refs/values/contract dates.")
    else:
        res.note = "BidAssist returned no KPCL awards — filter or API may have changed."
    res.payload = records
    return res
