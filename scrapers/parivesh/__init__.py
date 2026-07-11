"""Parivesh — forest / wildlife / environment clearance status  [REAL]

Powers /projects/clearances and /data. Real names OK — published record.

Two REAL data paths, both authoritative public record:

1. **Manual export (preferred):** Parivesh's "Track Your Proposal → Advanced
   Search" has an Export-to-Excel. Drop the exported .xlsx into
   `scrapers/.manual/` and this scraper parses it, filters KPCL proposals, and
   emits each with its real proposal number, clearance type, submission date and
   official status. (Parivesh is a JS SPA behind a login-gated API; the Excel
   export is the clean, guardrail-safe route to the same public record.)

2. **Curated gate timeline:** the Sharavathi PSP statutory-gate story (NBWL
   approved / Forest Clearance rejected / on hold), compiled from public
   reporting and merged onto the real proposal when present.
"""

from __future__ import annotations

import glob
import os
import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "clearances"
SEARCH_URL = "https://parivesh.nic.in/newupgrade/#/trackYourProposal"
MANUAL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".manual")

KPCL = re.compile(
    r"karnataka power|\bkpcl\b|raichur.*(power|thermal)|bellary.*thermal|"
    r"ballari.*thermal|yeramarus|sharavath|\brtps\b|\bbtps\b|\bytps\b",
    re.I,
)

# Public-record statutory-gate timeline for the Sharavathi PSP (the A2 story:
# NBWL approved while Forest Clearance was rejected and the project put on hold).
SHARAVATHI_GATES = [
    {"key": "ToR", "label": "Terms of Reference (EC)", "status": "CLEARED",
     "date": "2023-10", "note": "ToR granted for the EC process (Parivesh: IA/KA/RIV/447282/2023)."},
    {"key": "NBWL", "label": "National Board for Wildlife", "status": "CLEARED",
     "date": "2025-07", "note": "In-principle / principal approval granted (Jul 2025)."},
    {"key": "FC", "label": "Forest Clearance (MoEFCC)", "status": "BLOCKED",
     "date": "2025-05", "note": "Rejected citing inadequate compensatory afforestation and landslide risk."},
    {"key": "STATUS", "label": "Project status", "status": "ON_HOLD",
     "date": "2025-11", "note": "Kept on hold per Government of India order (Nov 2025)."},
]


def _read_export() -> list[dict]:
    """Parse the newest Parivesh 'Track Your Proposal' Excel export in .manual."""
    files = sorted(
        glob.glob(os.path.join(MANUAL_DIR, "*.xlsx")),
        key=os.path.getmtime, reverse=True,
    )
    export = next((f for f in files if "proposal" in os.path.basename(f).lower()
                   or "parivesh" in os.path.basename(f).lower()), files[0] if files else None)
    if not export:
        return []
    import openpyxl

    wb = openpyxl.load_workbook(export, read_only=True, data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    if not rows:
        return []
    hdr = [str(h).strip() if h is not None else "" for h in rows[0]]

    def col(row, name):
        try:
            return row[hdr.index(name)]
        except (ValueError, IndexError):
            return None

    out = []
    for r in rows[1:]:
        name = str(col(r, "Project Name") or "")
        prop = str(col(r, "Project Proponent") or "")
        if not KPCL.search(f"{name} {prop}"):
            continue
        out.append({
            "proposalNo": str(col(r, "Proposal No") or "").strip(),
            "clearanceType": str(col(r, "Clearance Type") or "").strip(),
            "projectName": name.strip(),
            "proponent": prop.strip(),
            "submitted": str(col(r, "Date of Submission") or "").strip(),
            "officialStatus": str(col(r, "Proposal Status") or "").strip(),
            "cafNumber": str(col(r, "CAF Number") or "").strip(),
        })
    return out


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SEARCH_URL)
    kpcl = _read_export()

    # Build the flagship Sharavathi record, enriched with the real proposal
    # number + official status from the export when available.
    sharavathi_row = next((r for r in kpcl if "sharavath" in r["projectName"].lower()), None)
    sharavathi = {
        "proposalTitle": "Sharavathi Pumped Storage Project (2000 MW)",
        "proponent": "Karnataka Power Corporation Limited (KPCL)",
        "capacityMW": 2000,
        "forestDiversionAcres": 287,
        "forestHectares": 140,
        "sanctuary": "Sharavathi Lion-Tailed Macaque Sanctuary (Western Ghats)",
        "proposalNo": (sharavathi_row or {}).get("proposalNo") or "IA/KA/RIV/447282/2023",
        "officialStatus": (sharavathi_row or {}).get("officialStatus") or "ToR Granted",
        "submitted": (sharavathi_row or {}).get("submitted") or "21/10/2023",
        "gates": SHARAVATHI_GATES,
        "litigation": "Karnataka High Court issued notices on a PIL challenging the "
                      "State Wildlife Board and NBWL in-principle approvals.",
        "provenance": "REAL",
        "sources": [
            "https://parivesh.nic.in/  (Track Your Proposal export)",
            "https://en.wikipedia.org/wiki/Sharavathi_Pumped_Storage_Hydropower_Project",
        ],
    }

    # Other KPCL proposals from the export (breadth) — real proposal-level rows.
    others = [r for r in kpcl if "sharavath" not in r["projectName"].lower()]

    payload = {"flagship": [sharavathi], "kpclProposals": kpcl, "otherCount": len(others)}
    note = (f"Parivesh export parsed: {len(kpcl)} KPCL proposal(s), "
            f"Sharavathi real proposal {sharavathi['proposalNo']} ({sharavathi['officialStatus']})."
            if kpcl else
            "No Parivesh export in .manual/; using curated Sharavathi timeline. "
            "Export from Track Your Proposal → Advanced Search and drop the .xlsx in scrapers/.manual/.")

    return ScrapeResult(
        feed=FEED, provenance=Provenance.REAL, source_url=SEARCH_URL,
        status=FeedStatus.LIVE, payload=[sharavathi], robots=robots, note=note,
    )
