"""KPCL active tenders — via BidAssist aggregator  [REAL]

The Karnataka e-Procurement portal gates its public tender search behind a
CAPTCHA, so it can't be scraped directly. BidAssist (bidassist.com) is a
third-party aggregator that re-publishes the same public KPCL eProcurement
tenders through a clean JSON API. We pull the active KPCL tender list:
tender id, description, value, EMD, posting date, closing date, location.

Every figure is the real published tender datum (KPCL's own tender ids, e.g.
KPCL/2026-27/IND2784). Provenance is REAL; the source is noted as BidAssist's
aggregation of the public KPCL eProcurement portal.

Powers /contracts (real live tender pipeline).
"""

from __future__ import annotations

import time
from datetime import datetime, timezone

import requests

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "bidassist"
API = ("https://api.bidassist.com/api/tender/v2"
       "?countRequired=true&showArchivedInActive=true&restrictAction=false&searchBar=false")
PURCHASER = "Karnataka Power Corporation Limited"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124 Safari/537.36")
HEADERS = {"User-Agent": UA, "Content-Type": "application/json",
           "Origin": "https://bidassist.com", "Referer": "https://bidassist.com/"}
PAGE_SIZE = 100
MAX_PAGES = 8  # safety cap; 155 tenders → 2 pages


def _iso(epoch_ms) -> str | None:
    try:
        return datetime.fromtimestamp(epoch_ms / 1000, timezone.utc).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError):
        return None


def _year() -> int:
    return datetime.now(timezone.utc).year


def _body(page: int) -> dict:
    return {
        "filter": {"PURCHASER_NAME": [PURCHASER]},
        "sort": "RELEVANCE:DESC",
        "pageNumber": page,
        "pageSize": PAGE_SIZE,
        "tenderType": "ACTIVE",
        "tenderEntity": "TENDER_LISTING",
        "year": _year(),
    }


def _place(t: dict) -> str | None:
    loc = t.get("location")
    if isinstance(loc, dict):
        parts = [loc.get("district") or loc.get("taluk"), loc.get("state")]
        s = ", ".join(p for p in parts if p)
        return s or None
    if isinstance(loc, str):
        return loc
    return t.get("originPlace")


def _map(t: dict) -> dict:
    sectors = t.get("sectorNames") or []
    return {
        "tenderId": t.get("sourceTenderId"),
        "title": (t.get("tenderDescription") or "").strip(),
        "valueRs": t.get("value"),
        "emdRs": t.get("emd"),
        "postedDate": _iso(t.get("postingDate")),
        "closingDate": _iso(t.get("bidDeadLine")),
        "location": _place(t),
        "category": ", ".join(sectors) if isinstance(sectors, list) else (sectors or None),
        "contractType": t.get("typeOfContract"),
        "noticeNo": t.get("tenderNoticeNo"),
        "docCount": t.get("documentCount"),
        "source": "BidAssist (KPCL eProcurement)",
        "provenance": "REAL",
    }


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status("https://bidassist.com")
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url="https://bidassist.com/all-tenders/karnataka-power-corporation-limited/active",
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
            data = r.json().get("data") or {}
            td = data.get("tenderData") or {}
            content = td.get("content") or []
            if total is None:
                total = td.get("totalElements")
            for t in content:
                tid = t.get("sourceTenderId")
                if tid and tid not in seen:
                    seen.add(tid)
                    records.append(_map(t))
            if td.get("number", page) + 1 >= (td.get("totalPages") or 1) or not content:
                break
            time.sleep(2.5)  # polite gap between pages
    except Exception as e:
        res.note = (f"BidAssist KPCL tenders unavailable ({type(e).__name__}) — "
                    f"API moved or offline. Kept last snapshot.")
        res.payload = []
        return res

    records = [r for r in records if r["tenderId"]]
    if records:
        res.status = FeedStatus.LIVE
        vals = [r["valueRs"] for r in records if r.get("valueRs")]
        crore = sum(vals) / 1e7 if vals else 0
        res.note = (f"BidAssist: {len(records)} active KPCL tenders, ₹{crore:.2f} cr total value. "
                    f"Real published tender ids/values/deadlines from the KPCL eProcurement portal.")
    else:
        res.note = "BidAssist returned no KPCL tenders — filter or API may have changed."
    res.payload = records
    return res
