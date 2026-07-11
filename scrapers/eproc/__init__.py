"""Karnataka e-Procurement / KPPP — KPCL tenders  [REAL]

Powers /contracts/spend, /projects/retenders, /data. Pulls public tender
metadata (id, title, category, value, dates, status, awarded bidder+value where
shown). The re-tender detector runs on real tender TITLES — a public-record
frequency pattern, NOT an allegation.

NOTE ON RUNNING LIVE: eproc.karnataka.gov.in lists tenders behind a paginated,
sometimes JS-assisted "Latest Active/Awarded Tenders" view; the KPPP portal
similarly. Static-HTML parsing works for the public listing pages but the exact
table structure must be confirmed on the user's machine. Best-effort parser below
returns whatever rows it can read and PENDING if the layout doesn't match — it
does not invent tenders.
"""

from __future__ import annotations

import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "tenders"
# Public "search active tenders" landing (organisation filter = KPCL applied by hand).
LISTING = "https://eproc.karnataka.gov.in/eprocurement/common/eproc_tendersfree.seam"


def _parse_listing(html: str) -> list[dict]:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return []
    soup = BeautifulSoup(html, "lxml")
    rows: list[dict] = []
    # Public listings render tenders in <table> rows; we read cells defensively and
    # only keep rows that look like a tender (a title + a KPCL reference).
    for tr in soup.select("table tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) < 3:
            continue
        joined = " ".join(cells)
        if not re.search(r"KPCL|Karnataka Power", joined, re.I):
            continue
        rows.append({
            "tenderId": cells[0][:80],
            "title": cells[1][:200] if len(cells) > 1 else "",
            "raw": cells,
            "provenance": "REAL",
        })
    return rows


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(LISTING)
    res = ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=LISTING,
        status=FeedStatus.PENDING,
        robots=robots,
        note="Confirm the public tender-listing table structure locally; re-tender "
             "detection uses real titles as a frequency signal, not an allegation.",
    )
    if not robots_check.allowed(LISTING):
        res.status = FeedStatus.SKIPPED
        res.note = "robots.txt disallows this path for our UA."
        return res
    try:
        html = http.get_text(LISTING)
    except Exception as e:
        res.status = FeedStatus.STALE
        res.note = f"source unreachable ({type(e).__name__}); kept last snapshot."
        return res
    rows = _parse_listing(html)
    if rows:
        res.payload, res.status = rows, FeedStatus.LIVE
        res.note = f"parsed {len(rows)} KPCL-referencing tender rows."
    else:
        res.note = "fetched but no KPCL tender rows matched — verify selectors locally."
    return res
