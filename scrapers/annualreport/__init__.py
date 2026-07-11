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


def _parse_thermal(page) -> list[dict]:
    """Parse a RTPS/BTPS per-unit 'Particulars' table into unit reliability rows
    (PLF, aux %, specific coal, PAF) for the latest FY. Header cells are messy, so
    units are labelled by position from the known station layout."""
    out: list[dict] = []
    for tbl in page.extract_tables() or []:
        rows = [[(" ".join(str(c).split()) if c else "") for c in r] for r in tbl]
        flat = " ".join(" ".join(r) for r in rows[:4])
        if "Plant load fact" not in " ".join(r[0] for r in rows if r):
            continue
        is_rtps = "1 to 7" in flat or "U 8" in flat
        labels = ["U1-7", "U8"] if is_rtps else ["U1", "U2", "U3"]
        plant = "RTPS" if is_rtps else "BTPS"

        def matching_rows(key):
            return [[_num(c) for c in r[1:] if _num(c) is not None]
                    for r in rows if re.search(key, r[0], re.I)]

        def first_row(key):
            m = matching_rows(key)
            return m[0] if m else []

        def aux_pct_row():
            # two 'Aux' rows exist (MU then %); the % row's values are all < 30.
            for vals in matching_rows(r"^Aux"):
                if vals and all(v < 30 for v in vals[: len(labels)]):
                    return vals
            return []

        plf = first_row(r"Plant load fact")
        scoal = first_row(r"Specific coal")
        paf = first_row(r"Plant availabil")
        aux = aux_pct_row()
        for i, label in enumerate(labels):
            rec: dict = {"plant": plant, "unit": label}
            if i < len(plf): rec["plfPct"] = plf[i]
            if i < len(aux): rec["auxPct"] = aux[i]
            if i < len(scoal): rec["specificCoal"] = scoal[i]
            if i < len(paf): rec["pafPct"] = paf[i]
            if "plfPct" in rec:
                out.append(rec)
    return out


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
    thermal: list[dict] = []
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
            has_thermal = "Plant load factor" in t and "Specific coal" in t and re.search(r"U\s?1\b|U\s?8", t)
            if has_thermal:
                thermal.extend(_parse_thermal(page))
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
            # The generation/thermal/reservoir tables are clustered together; once
            # the station summary is parsed, stop (avoids re-reading ~900 more pages).
            if stations and reservoirs:
                break

    # dedupe by station/name (tables can repeat across the report)
    seen: set[str] = set()
    stations = [s for s in stations if not (s["station"] in seen or seen.add(s["station"]))]
    seenr: set[str] = set()
    reservoirs = [r for r in reservoirs if not (r["name"] in seenr or seenr.add(r["name"]))]

    # dedupe thermal by plant+unit
    seent: set[str] = set()
    thermal = [x for x in thermal if not (f"{x['plant']}{x['unit']}" in seent or seent.add(f"{x['plant']}{x['unit']}"))]

    if stations:
        res.status = FeedStatus.LIVE
        res.note = (f"KPCL Annual Report {fy}: {len(stations)} stations (real generation), "
                    f"{len(thermal)} thermal-unit reliability rows, {len(reservoirs)} reservoirs.")
    else:
        res.note = "Annual Report found but station table not parsed — layout may differ."
    res.payload = {"fy": fy, "stations": stations, "thermal": thermal, "reservoirs": reservoirs}
    return res
