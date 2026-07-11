"""CEA Daily Generation Report — KPCL thermal stations  [REAL]

CEA's own site blocks automated GETs, but the National Power Portal (npp.gov.in)
re-publishes the identical CEA Daily Generation Report (DGR) as a machine-readable
.xls. Subreport-2 ("dgr2") is the region/state/station-wise thermal generation
sheet. We pull the KARNATAKA → KPCL rows (BTPS/RTPS/YTPS) plus each unit, giving:

  · monitored capacity (MW)
  · today's scheduled vs actual generation (MU)  → schedule adherence
  · FY-to-date scheduled vs actual (MU, since 1 April)
  · coal stock in days
  · capacity under outage (MW) + outage remark (real reason)

Every figure is copied verbatim from CEA's report — nothing is fabricated.
Powers /plants (real generation, coal-stock days, unit outages).

Requires: pip install xlrd (old binary .xls).
"""

from __future__ import annotations

import io
import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "cea_dgr"
NPP = "https://npp.gov.in"
REPORTS = f"{NPP}/publishedReports"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124 Safari/537.36")

# CEA station name → our plant code
STATIONS = {
    "BELLARY TPS": "BTPS",
    "RAICHUR TPS": "RTPS",
    "YERMARUS TPP": "YTPS",
}

# dgr2 column layout (0-indexed), stable across daily reports
C_NAME, C_UNIT, C_STATUS = 0, 2, 5
C_CAP, C_TODAY_PROG, C_TODAY_ACT = 7, 8, 9
C_FYTD_PROG, C_FYTD_ACT = 10, 11
C_COAL_DAYS, C_OUTAGE_MW, C_OUTAGE_DATE = 12, 13, 14
C_REMARKS = 17


def _num(v) -> float | None:
    try:
        f = float(v)
        return round(f, 2)
    except (TypeError, ValueError):
        return None


def _xl_date(v, datemode: int) -> str | None:
    """CEA stores outage dates as Excel serials — render as DD.MM.YYYY."""
    try:
        import xlrd
        dt = xlrd.xldate.xldate_as_datetime(float(v), datemode)
        return dt.strftime("%d.%m.%Y")
    except Exception:
        s = str(v).strip()
        return s or None


def _report_date(url: str) -> str | None:
    m = re.search(r"dgr2-(\d{4})-(\d{2})-(\d{2})\.xls", url)
    return f"{m.group(3)}.{m.group(2)}.{m.group(1)}" if m else None


def _parse(raw: bytes) -> list[dict]:
    import xlrd

    wb = xlrd.open_workbook(file_contents=raw)
    sh = wb.sheet_by_index(0)
    datemode = wb.datemode
    rows = [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]

    out: list[dict] = []
    current: dict | None = None
    for row in rows:
        name = str(row[C_NAME]).strip()
        plant = STATIONS.get(name.upper())
        if plant:  # station header row
            current = {
                "plant": plant,
                "station": name.title(),
                "capacityMW": _num(row[C_CAP]),
                "todayProgMU": _num(row[C_TODAY_PROG]),
                "todayActualMU": _num(row[C_TODAY_ACT]),
                "fytdProgMU": _num(row[C_FYTD_PROG]),
                "fytdActualMU": _num(row[C_FYTD_ACT]),
                "coalStockDays": _num(row[C_COAL_DAYS]),
                "outageMW": _num(row[C_OUTAGE_MW]),
                "units": [],
                "provenance": "REAL",
            }
            out.append(current)
            continue
        if current and name.upper() == "UNIT":  # unit detail under the current station
            unit = str(row[C_UNIT]).strip().rstrip(".0") or "?"
            remark = str(row[C_REMARKS]).strip()
            outage_mw = _num(row[C_OUTAGE_MW])
            current["units"].append({
                "unit": f"U{unit}",
                "capacityMW": _num(row[C_CAP]),
                "todayActualMU": _num(row[C_TODAY_ACT]),
                "outageMW": outage_mw,
                "outageDate": _xl_date(row[C_OUTAGE_DATE], datemode) if outage_mw and row[C_OUTAGE_DATE] else None,
                "remark": remark or None,
            })
            continue
        # any other non-blank station-looking row ends the current station block
        if name and name.isupper() and current and name.upper() not in STATIONS:
            current = None
    return out


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(NPP)
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url=f"{REPORTS} (CEA Daily Generation Report, subreport-2)",
                       status=FeedStatus.PENDING, robots=robots)
    try:
        listing = http.get_text(REPORTS, ua=UA)
        m = re.search(r"(/public-reports/cea/daily/dgr/[0-9-]+/dgr2-\d{4}-\d{2}-\d{2}\.xls)", listing)
        if not m:
            res.note = "NPP publishedReports listing did not expose a dgr2 .xls link."
            res.payload = []
            return res
        url = NPP + m.group(1)
        raw = http.get_bytes(url)
        records = _parse(raw)
    except Exception as e:
        res.note = (f"CEA DGR via NPP unavailable ({type(e).__name__}) — "
                    f"pip install xlrd, or NPP offline. Kept last snapshot.")
        res.payload = []
        return res

    records = [r for r in records if r["capacityMW"]]
    rdate = _report_date(url) or "?"
    for r in records:
        r["reportDate"] = rdate
    if records:
        res.status = FeedStatus.LIVE
        outages = sum(1 for r in records for u in r["units"] if u.get("outageMW"))
        res.note = (f"CEA DGR {rdate} via NPP: {len(records)} KPCL thermal stations, "
                    f"{outages} units under outage. Real gen/coal-stock/outage figures.")
    else:
        res.note = "DGR2 fetched but no KPCL station rows matched — CEA layout may have changed."
    res.payload = records
    return res
