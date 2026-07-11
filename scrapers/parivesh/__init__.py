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

# A proposal is KPCL's only if EITHER the user agency is KPCL specifically
# (excludes KPTCL transmission and KNNL/Neeravari irrigation), OR the project is
# an unambiguous KPCL generating asset. Bare "Sharavathi"/"Varahi" is NOT enough
# — those names also appear on region drinking-water and KNNL irrigation works.
KPCL_AGENCY = re.compile(r"karnataka power corporation", re.I)
KPCL_PROJECT = re.compile(
    r"(sharavath|varahi)\s*pumped\s*storage|pumped\s*storage.*(sharavath|varahi)|"
    r"(raichur|bellary|ballari)\s*thermal|yeramarus|\b(rtps|btps|ytps)\b|"
    r"sharavath\w*\s*generating",
    re.I,
)


def _is_kpcl(name: str, agency: str) -> bool:
    return bool(KPCL_AGENCY.search(agency) or KPCL_PROJECT.search(name))

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


def _read_exports() -> list[dict]:
    """Parse every Parivesh 'Track Your Proposal' Excel export in .manual and
    merge KPCL proposals across clearance types (EC / WL / FC). The EC export
    uses a 'Project Proponent' column; the WL/FC exports use 'User Agency' and
    add 'Area (ha)' — handle both. Dedupe by proposal number."""
    import openpyxl

    seen: set[str] = set()
    out: list[dict] = []
    for path in sorted(glob.glob(os.path.join(MANUAL_DIR, "*.xlsx"))):
        try:
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        except Exception:
            continue
        rows = list(wb.active.iter_rows(values_only=True))
        if not rows:
            continue
        hdr = [str(h).strip() if h is not None else "" for h in rows[0]]

        def col(row, *names):
            for n in names:
                if n in hdr:
                    v = row[hdr.index(n)]
                    if v is not None:
                        return v
            return None

        for r in rows[1:]:
            name = str(col(r, "Project Name") or "")
            prop = str(col(r, "Project Proponent", "User Agency") or "")
            if not _is_kpcl(name, prop):
                continue
            no = str(col(r, "Proposal No") or "").strip()
            if not no or no in seen:
                continue
            seen.add(no)
            ctype = str(col(r, "Clearance Type") or "").strip()
            gate = ("WL" if no.startswith("WL") else "FC" if no.startswith("FP") else
                    "EC" if no.startswith("IA") else "—")
            out.append({
                "proposalNo": no,
                "gate": gate,
                "clearanceType": ctype,
                "projectName": name.strip(),
                "submitted": str(col(r, "Date of Submission") or "").strip(),
                "officialStatus": str(col(r, "Proposal Status") or "").strip(),
                "area": str(col(r, "Area (ha)") or "").strip(),
            })
    return out


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SEARCH_URL)
    kpcl = _read_exports()

    # The flagship EC proposal (ToR Granted) anchors the gate timeline.
    ec_row = next((r for r in kpcl if r["gate"] == "EC" and "sharavath" in r["projectName"].lower()), None)
    sharavathi = {
        "proposalTitle": "Sharavathi Pumped Storage Project (2000 MW)",
        "proponent": "Karnataka Power Corporation Limited (KPCL)",
        "capacityMW": 2000,
        "forestDiversionAcres": 287,
        "forestHectares": 140,
        "sanctuary": "Sharavathi Lion-Tailed Macaque Sanctuary (Western Ghats)",
        "proposalNo": (ec_row or {}).get("proposalNo") or "IA/KA/RIV/447282/2023",
        "officialStatus": (ec_row or {}).get("officialStatus") or "ToR Granted",
        "submitted": (ec_row or {}).get("submitted") or "21/10/2023",
        "gates": SHARAVATHI_GATES,
        "litigation": "Karnataka High Court issued notices on a PIL challenging the "
                      "State Wildlife Board and NBWL in-principle approvals.",
        # Every real KPCL Parivesh proposal (EC / WL / FC) with official status.
        "kpclProposals": sorted(kpcl, key=lambda x: (x["projectName"], x["gate"])),
        "provenance": "REAL",
        "sources": [
            "https://parivesh.nic.in/  (Track Your Proposal export)",
            "https://en.wikipedia.org/wiki/Sharavathi_Pumped_Storage_Hydropower_Project",
        ],
    }

    gate_counts = {}
    for r in kpcl:
        gate_counts[r["gate"]] = gate_counts.get(r["gate"], 0) + 1
    note = (f"Parivesh exports parsed: {len(kpcl)} real KPCL proposals "
            f"({', '.join(f'{v} {k}' for k, v in sorted(gate_counts.items()))}); "
            f"flagship {sharavathi['proposalNo']} ({sharavathi['officialStatus']})."
            if kpcl else
            "No Parivesh export in .manual/; using curated Sharavathi timeline.")

    return ScrapeResult(
        feed=FEED, provenance=Provenance.REAL, source_url=SEARCH_URL,
        status=FeedStatus.LIVE, payload=[sharavathi], robots=robots, note=note,
    )
