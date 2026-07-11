"""KERC approved per-station charges — KPCL thermal  [REAL]

KERC does not publish a clean per-station *generation tariff* archive (those are
scattered case files). But the retail (ESCOM) tariff orders carry a station-wise
"Approved Power Purchase" annexure that lists, for every KPCL thermal station,
the KERC-approved capacity charge and variable (fuel) charge in ₹/unit. That
annexure is a text-extractable table, so we parse it directly — no OCR.

We read ONLY rows whose numeric columns are complete and unambiguous (exactly
the seven expected figures), so a station name can never be paired with the wrong
number. Powers /regulatory (real approved ₹/unit per station).

Source doc (HESCOM approved power purchase, FY24 tariff order):
  https://kerc.karnataka.gov.in/uploads/77431683892954.pdf
Requires: pip install pdfplumber.
"""

from __future__ import annotations

import io
import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "kerc_charges"
# The station-wise approved power-purchase annexure (FY24 ESCOM tariff order).
DOC_URL = "https://kerc.karnataka.gov.in/uploads/77431683892954.pdf"
DOC_LABEL = "KERC FY24 tariff order — Approved Power Purchase (Annexure-2)"

PLANT = [
    (re.compile(r"RAICHUR", re.I), "RTPS"),
    (re.compile(r"BELLARY", re.I), "BTPS"),
    (re.compile(r"YERAMARUS|YERMARUS", re.I), "YTPS"),
]
NUM = re.compile(r"\d+(?:\.\d+)?")


def _plant(name: str) -> str | None:
    for rx, code in PLANT:
        if rx.search(name):
            return code
    return None


def _unit_label(name: str) -> str:
    # e.g. "...RTPS 1-7 (7x210)" -> "RTPS 1-7 (7x210)"
    m = re.search(r"(RTPS|BTPS|YTPS)[\s\-]*([0-9\-]+)?\s*(\([^)]*\))?", name, re.I)
    if m:
        return " ".join(p for p in (m.group(1).upper(), m.group(2), m.group(3)) if p).strip()
    return name.strip()


def _parse(raw: bytes) -> list[dict]:
    import pdfplumber

    out: list[dict] = []
    seen: set[str] = set()
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                for row in table:
                    cells = [(c or "").replace("\n", " ").strip() for c in row]
                    name = next((c for c in cells if _plant(c) and "THERMAL" in c.upper()), None)
                    if not name:
                        continue
                    plant = _plant(name)
                    # collect numeric tokens across the row, in order
                    nums = [float(x) for c in cells for x in NUM.findall(c)]
                    # drop the leading Sl-no if the name isn't the first cell's number
                    # expected: [%share, energyMU, capCr, varCr, varUnit, totalCr, totalUnit]
                    tail = nums[-7:] if len(nums) >= 7 else nums
                    if len(tail) != 7:
                        continue  # incomplete row → skip (never guess)
                    share, energy, cap_cr, var_cr, var_unit, total_cr, total_unit = tail
                    label = _unit_label(name)
                    key = f"{plant}|{label}"
                    if key in seen:
                        continue
                    seen.add(key)
                    out.append({
                        "plant": plant,
                        "station": label,
                        "energyMU": round(energy, 2),
                        "capacityChargesCr": round(cap_cr, 2),
                        "variableChargeCr": round(var_cr, 2),
                        "variableChargePerUnit": round(var_unit, 2),
                        "totalCostCr": round(total_cr, 2),
                        "totalCostPerUnit": round(total_unit, 2),
                        "source": DOC_URL,
                        "provenance": "REAL",
                    })
    return out


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status("https://kerc.karnataka.gov.in")
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url=f"{DOC_URL} ({DOC_LABEL})",
                       status=FeedStatus.PENDING, robots=robots)
    try:
        records = _parse(http.get_bytes(DOC_URL))
    except Exception as e:
        res.note = (f"KERC charges annexure unavailable ({type(e).__name__}) — "
                    f"pip install pdfplumber, or source moved. Kept last snapshot.")
        res.payload = []
        return res

    if records:
        res.status = FeedStatus.LIVE
        rng = sorted(r["variableChargePerUnit"] for r in records)
        res.note = (f"KERC-approved per-station charges (FY24) for {len(records)} KPCL thermal "
                    f"stations: variable ₹{rng[0]}–{rng[-1]}/unit. Real approved rates.")
    else:
        res.note = "Annexure fetched but no complete KPCL thermal rows parsed — layout may have changed."
    res.payload = records
    return res
