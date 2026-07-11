"""CEA Daily Coal Stock Report — KPCL thermal stations  [REAL]

CEA publishes a Daily Coal Stock Report (per thermal station: capacity, daily
requirement, normative vs actual stock, days of stock, critical/supercritical
flag, receipt vs consumption of the day). CEA's own site blocks bots, but the
National Power Portal re-publishes the identical .xlsx. We pull the rows where
Genco = KPCL (BTPS/RTPS/YTPS).

Every figure is copied verbatim from CEA's report. The "days of stock" and the
"below normative" / "depleting" flags are computed from CEA's own numbers, not
fabricated. Powers /coal (real coal-position panel).

Requires: pip install openpyxl.
"""

from __future__ import annotations

import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "cea_coal"
NPP = "https://npp.gov.in"
REPORTS = f"{NPP}/publishedReports"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124 Safari/537.36")

STATIONS = {
    "BELLARY TPS": "BTPS",
    "RAICHUR TPS": "RTPS",
    "YERMARUS TPP": "YTPS",
}

# 0-indexed columns in CEA's DailyCoalReport sheet (stable layout).
C_GENCO, C_STATION, C_CAP = 2, 4, 5
C_PLF, C_DAILY_REQ, C_NORM_STOCK = 6, 7, 8
C_STOCK_TOTAL = 11
C_CRITICAL = 13
C_RECEIPT, C_CONSUMPTION = 14, 15


def _num(v, mult: float = 1.0, nd: int = 2) -> float | None:
    try:
        return round(float(v) * mult, nd)
    except (TypeError, ValueError):
        return None


def _report_date(url: str) -> str | None:
    m = re.search(r"dailyCoal1-(\d{4})-(\d{2})-(\d{2})\.xlsx", url)
    return f"{m.group(3)}.{m.group(2)}.{m.group(1)}" if m else None


def _parse(raw: bytes, rdate: str) -> list[dict]:
    import io

    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(raw), data_only=True, read_only=True)
    sh = wb.active
    out: list[dict] = []
    for row in sh.iter_rows(values_only=True):
        name = str(row[C_STATION]).strip() if len(row) > C_STATION and row[C_STATION] else ""
        plant = STATIONS.get(name.upper())
        if not plant:
            continue
        genco = str(row[C_GENCO]).strip().upper() if row[C_GENCO] else ""
        if "KPCL" not in genco:
            continue
        daily_req = _num(row[C_DAILY_REQ])
        stock = _num(row[C_STOCK_TOTAL])
        norm = _num(row[C_NORM_STOCK])
        days = round(stock / daily_req, 1) if stock and daily_req else None
        receipt = _num(row[C_RECEIPT])
        consumption = _num(row[C_CONSUMPTION])
        critical_raw = str(row[C_CRITICAL]).strip() if row[C_CRITICAL] else ""
        out.append({
            "plant": plant,
            "station": name.title(),
            "reportDate": rdate,
            "capacityMW": _num(row[C_CAP], nd=0),
            "plfPct": _num(row[C_PLF], mult=100, nd=1),
            "dailyRequirementKT": daily_req,
            "normativeStockKT": norm,
            "actualStockKT": stock,
            "stockDays": days,
            "belowNormative": bool(stock and norm and stock < norm),
            "receiptKT": receipt,
            "consumptionKT": consumption,
            "depleting": bool(receipt is not None and consumption is not None and receipt < consumption),
            "critical": bool(critical_raw and critical_raw not in ("None", "")),
            "provenance": "REAL",
        })
    return out


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(NPP)
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url=f"{REPORTS} (CEA Daily Coal Stock Report)",
                       status=FeedStatus.PENDING, robots=robots)
    try:
        listing = http.get_text(REPORTS, ua=UA)
        m = re.search(r"(/public-reports/cea/daily/fuel/[0-9-]+/dailyCoal1-\d{4}-\d{2}-\d{2}\.xlsx)", listing)
        if not m:
            res.note = "NPP listing did not expose a dailyCoal1 .xlsx link."
            res.payload = []
            return res
        url = NPP + m.group(1)
        rdate = _report_date(url) or "?"
        records = _parse(http.get_bytes(url), rdate)
    except Exception as e:
        res.note = (f"CEA coal report via NPP unavailable ({type(e).__name__}) — "
                    f"pip install openpyxl, or NPP offline. Kept last snapshot.")
        res.payload = []
        return res

    if records:
        res.status = FeedStatus.LIVE
        below = sum(1 for r in records if r["belowNormative"])
        crit = sum(1 for r in records if r["critical"])
        res.note = (f"CEA daily coal stock {records[0]['reportDate']} via NPP: "
                    f"{len(records)} KPCL stations, {below} below normative stock, {crit} critical.")
    else:
        res.note = "Coal report fetched but no KPCL (Genco) rows matched — CEA layout may have changed."
    res.payload = records
    return res
