"""KPCL EC compliance disclosures — KPCL's own Environment page  [REAL]

MoEF conditions require a proponent to publish its six-monthly / half-yearly EC
compliance reports. The central Parivesh compliance module is login-gated (401)
and the legacy environmentclearance.nic.in search can't isolate KPCL's reports —
but KPCL publishes them directly on its own official Environment page, captcha-free
with proper titles. We index those documents: title, URL, type, project, and
(for the compliance PDFs) the stated compliance period.

Powers /projects/clearances (real EC compliance disclosures alongside the
Parivesh clearance gates).
"""

from __future__ import annotations

import io
import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "kpcl_env"
PAGE = "https://kpcl.karnataka.gov.in/136/environment/en"
BASE = "https://kpcl.karnataka.gov.in"


def _classify(title: str) -> str:
    t = title.lower()
    if "half yearly" in t or "half-yearly" in t:
        return "HALF_YEARLY_COMPLIANCE"
    if "six monthly" in t or "six-monthly" in t or "6 monthly" in t:
        return "SIX_MONTHLY_COMPLIANCE"
    if "complian" in t:
        return "COMPLIANCE"
    if "granted" in t or "environmental clearance" in t or re.search(r"\bec\b", t):
        return "EC_GRANT"
    return "EC_DOC"


def _project(title: str) -> str | None:
    for rx, name in [
        (r"YCCPP|Yelahanka", "YCCPP (Yelahanka CCPP)"),
        (r"Baranj|Manoradeep|Kiloni", "Baranj/Manoradeep/Kiloni coal blocks"),
        (r"Raichur|RTPS", "RTPS"),
        (r"Bellary|Ballari|BTPS", "BTPS"),
        (r"Yeramarus|Yermarus|YTPS", "YTPS"),
        (r"Sharavath", "Sharavathi PSP"),
    ]:
        if re.search(rx, title, re.I):
            return name
    return None


def _period(http: Http, url: str) -> str | None:
    """Best-effort: read the stated compliance period from the PDF's first page."""
    try:
        import pdfplumber
        raw = http.get_bytes(url)
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            txt = " ".join((pdf.pages[i].extract_text() or "") for i in range(min(2, len(pdf.pages))))
        flat = " ".join(txt.split())
        m = re.search(
            r"COMPLIANCE PERIOD[:\s]*"
            r"([A-Za-z]+\s*-?\s*\d{4}(?:\s*(?:TO|–|-)\s*[A-Za-z]+\s*-?\s*\d{4})?)",
            flat, re.I)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else None
    except Exception:
        return None


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(BASE)
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url=PAGE, status=FeedStatus.PENDING, robots=robots)
    records: list[dict] = []
    try:
        html = http.get_text(PAGE)
        # anchor tags linking to PDFs, capturing the visible title text
        seen: set[str] = set()
        for m in re.finditer(r'href="([^"]+\.pdf)"[^>]*>\s*([^<]{4,140})', html, re.I):
            url = m.group(1)
            title = re.sub(r"\s+", " ", m.group(2)).strip()
            if not url.startswith("http"):
                url = BASE + "/" + url.lstrip("/")
            if url in seen:
                continue
            if re.search(r"budget|annual.?report|word", title, re.I):
                continue
            if not re.search(r"complian|environ|clearance|\bec\b|monitor|emission", title, re.I):
                continue
            seen.add(url)
            doctype = _classify(title)
            rec = {
                "title": title,
                "url": url,
                "docType": doctype,
                "project": _project(title),
                "source": "KPCL Environment page",
                "provenance": "REAL",
            }
            if doctype in ("HALF_YEARLY_COMPLIANCE", "SIX_MONTHLY_COMPLIANCE", "COMPLIANCE"):
                rec["period"] = _period(http, url)
            records.append(rec)
    except Exception as e:
        res.note = (f"KPCL environment page unavailable ({type(e).__name__}) — "
                    f"site offline or layout changed. Kept last snapshot.")
        res.payload = []
        return res

    if records:
        res.status = FeedStatus.LIVE
        comp = sum(1 for r in records if "COMPLIANCE" in r["docType"])
        res.note = (f"KPCL Environment page: {len(records)} EC documents "
                    f"({comp} compliance reports). Real KPCL-published EC compliance disclosures.")
    else:
        res.note = "KPCL environment page fetched but no EC/compliance documents matched."
    res.payload = records
    return res
