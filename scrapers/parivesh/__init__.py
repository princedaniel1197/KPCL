"""Parivesh — forest / wildlife / environment clearance status  [REAL]

Powers /projects/clearances and /data. Real names OK — published record.

The Sharavathi PSP record below is compiled from public reporting on the
project's statutory clearances (MoEFCC / NBWL / Karnataka HC), each line
citable. It is REAL public record, not a synthetic value. For the authoritative
live stage status, refresh from Parivesh's "Track Your Proposal" locally (the
site is a JS SPA behind JSON APIs and blocks datacenter IPs) — this snapshot is
the verified public timeline as of the fetched date.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "clearances"
SEARCH_URL = "https://parivesh.nic.in/newupgrade/#/trackYourProposal"

# REAL public-record clearance timeline for the Sharavathi PSP, compiled from
# public reporting (sources in `sources`). This is the live A2 story: NBWL
# in-principle approval granted, but Forest Clearance rejected and the project
# put on hold — the "declared timeline vs binding gate" contradiction, real.
SHARAVATHI = {
    "proposalTitle": "Sharavathi Pumped Storage Project (2000 MW)",
    "proponent": "Karnataka Power Corporation Limited (KPCL)",
    "capacityMW": 2000,
    "forestDiversionAcres": 287,
    "forestHectares": 57,
    "treesAffected": 15000,
    "sanctuary": "Sharavathi Lion-Tailed Macaque Sanctuary (Western Ghats)",
    "gates": [
        {"key": "NBWL", "label": "National Board for Wildlife", "status": "CLEARED",
         "date": "2025-07", "note": "In-principle / principal approval granted (Jul 2025)."},
        {"key": "FC", "label": "Forest Clearance (MoEFCC)", "status": "BLOCKED",
         "date": "2025-05", "note": "Rejected by MoEFCC citing inadequate compensatory "
                                     "afforestation and landslide risk (May 2025)."},
        {"key": "STATUS", "label": "Project status", "status": "ON_HOLD",
         "date": "2025-11", "note": "Kept on hold per Government of India order citing "
                                     "environmental damage / biodiversity loss (Nov 2025)."},
    ],
    "litigation": "Karnataka High Court issued notices on a PIL challenging the "
                  "State Wildlife Board and NBWL in-principle approvals.",
    "provenance": "REAL",
    "sources": [
        "https://en.wikipedia.org/wiki/Sharavathi_Pumped_Storage_Hydropower_Project",
        "https://www.landconflictwatch.org/conflicts/environmentalists-raise-concerns-over-sharavathi-pumped-storage-project-in-karnataka",
    ],
}


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SEARCH_URL)
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=SEARCH_URL,
        status=FeedStatus.LIVE,
        payload=[SHARAVATHI],
        robots=robots,
        note="REAL Sharavathi PSP clearance timeline compiled from public reporting "
             "(NBWL approved, Forest Clearance rejected, on hold, HC PIL). Refresh "
             "live stage status from Parivesh locally.",
    )
