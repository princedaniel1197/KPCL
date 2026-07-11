"""KPCL Annual Report — real operational + financial data  [REAL]

Powers /plants and /plants/hydro. KPCL's own website rejects bots, but the
Annual Report PDF (dropped into scrapers/.manual/) is fully text-extractable.
This parser pulls the station-wise generation / PLF / PAF / auxiliary-consumption
table and the reservoir levels — real, published KPCL figures for the latest FY.
Everything REAL: KPCL's own audited performance report, real station names OK.
"""

from __future__ import annotations

import glob
import os
import re

from common import FeedStatus, Http, Provenance, ScrapeResult

FEED = "annual_report"
MANUAL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".manual")


def _find_pdf() -> str | None:
    files = glob.glob(os.path.join(MANUAL_DIR, "*.pdf"))
    ar = [f for f in files if re.search(r"annual|report", os.path.basename(f), re.I)]
    return (ar or files or [None])[0]


def _num(s: str) -> float | None:
    m = re.search(r"-?\d[\d,]*\.?\d*", str(s))
    return float(m.group(0).replace(",", "")) if m else None


def _last_num(s: str) -> float | None:
    nums = re.findall(r"\d[\d,]*\.?\d*", str(s))
    return float(nums[-1].replace(",", "")) if nums else None


def run(http: Http) -> ScrapeResult:
    pdf_path = _find_pdf()
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url="https://kpcl.karnataka.gov.in (Annual Report PDF)",
                       status=FeedStatus.PENDING)
    if not pdf_path:
        res.note = ("No KPCL Annual Report PDF in scrapers/.manual/. Download the "
                    "latest from kpcl.karnataka.gov.in and drop it there.")
        res.payload = {"fy": None, "stations": [], "reservoirs": []}
        return res

    import pdfplumber

    stations: list[dict] = []
    reservoirs: list[dict] = []
    fy = None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            if fy is None:
                m = re.search(r"ANNUAL REPORT (\d{4}-\d{2})", t)
                if m:
                    fy = m.group(1)
            has_summary = "A. KPCL" in t and "Generation" in t
            has_reservoir = "Full level" in t and "Capacity" in t
            if not (has_summary or has_reservoir):
                continue
            for tbl in page.extract_tables() or []:
                for row in tbl:
                    cells = [(" ".join(str(c).split()) if c else "") for c in row]
                    if not cells or len(cells) < 3:
                        continue
                    label = cells[0]
                    row_str = " ".join(cells)
                    # Reservoir rows carry a level unit (ft/mts) and share station
                    # names — never count them as generation.
                    is_reservoir_row = bool(re.search(r"\b(ft|mts?|feet|meters?)\b", row_str, re.I))
                    # Station-wise generation summary (A. KPCL: station | 2024-25 | 2023-24)
                    if has_summary and not is_reservoir_row and re.search(
                        r"Thermal|Sharavath|Nagjhari|Supa|Kadra|Kodasalli|Varahi|"
                        r"Gerusoppa|Linganamakki|Almatti|Mani|Ghataprabha|Bhadra|Shivasamudram",
                        label, re.I,
                    ):
                        cur, prev = _num(cells[1]), _num(cells[-1])
                        if cur:
                            plant = ("RTPS" if re.search(r"Raichur", label, re.I) else
                                     "BTPS" if re.search(r"Bellary|Ballari", label, re.I) else
                                     "YTPS" if re.search(r"Yeramarus", label, re.I) else "HYDRO")
                            stations.append({
                                "station": re.sub(r"\s+", " ", label).strip(),
                                "plant": plant,
                                "genMU": cur, "genPrevMU": prev,
                            })
                    # Reservoir levels — the reservoir table's "Full level" cell
                    # carries a unit (ft/mts), which distinguishes it from the
                    # generation summary rows that share the same station names.
                    full = cells[1] if len(cells) > 1 else ""
                    if (has_reservoir
                            and re.search(r"Linganamakki|Supa|Mani|Bhadra|Ghataprabha|Almatti|Harangi|Hemavathy", label, re.I)
                            and re.search(r"\b(ft|mts?|feet|meters?)\b", full, re.I)):
                        reservoirs.append({
                            "name": re.sub(r"\s+", " ", label).strip(),
                            "fullLevel": full,
                            "highestLevel": cells[3] if len(cells) > 3 else "",
                            "pctCapacity": _last_num(" ".join(cells[-2:])),
                        })

    # dedupe by station/name (tables can repeat across the report)
    seen: set[str] = set()
    stations = [s for s in stations if not (s["station"] in seen or seen.add(s["station"]))]
    seenr: set[str] = set()
    reservoirs = [r for r in reservoirs if not (r["name"] in seenr or seenr.add(r["name"]))]

    if stations:
        res.status = FeedStatus.LIVE
        res.note = (f"KPCL Annual Report {fy}: {len(stations)} stations "
                    f"(real generation), {len(reservoirs)} reservoirs.")
    else:
        res.note = "Annual Report found but station table not parsed — layout may differ."
    res.payload = {"fy": fy, "stations": stations, "reservoirs": reservoirs}
    return res
