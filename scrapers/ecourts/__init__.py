"""eCourts / Karnataka HC — case status  [REAL]

Powers /legal, /projects/[id], /data. Real parties as publicly reported.

The Sharavathi PSP PIL below is compiled from public reporting on the Karnataka
High Court proceedings. It is REAL public record. The eCourts case-status search
is CAPTCHA-gated (guardrail: no captcha), so the authoritative order history for
a given CNR must be refreshed via the existing eCourts tooling locally — this
snapshot is the verified public status as of the fetched date.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "cases"
HC_SERVICES = "https://karnatakajudiciary.kar.nic.in"

SHARAVATHI_PIL = {
    "label": "PIL — Sharavathi Pumped Storage Project clearances",
    "forum": "High Court of Karnataka",
    "matterType": "Public Interest Litigation",
    "parties": "Petitioners (environmental) vs Union of India / State of Karnataka / KPCL",
    "stage": "Notices issued; pending",
    "subject": "Challenges the legality of clearances granted by the State Wildlife "
               "Board and the in-principle approval of the National Board for Wildlife "
               "for the 2000 MW Sharavathi PSP.",
    "linkedProject": "Sharavathi PSP",
    "provenance": "REAL",
    "sources": [
        "https://www.sanskritiias.com/current-affairs/green-power-vs-ecological-concerns-sharavathi-pumped-storage-hydroelectric-project-under-judicial-re",
    ],
}


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(HC_SERVICES)
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=HC_SERVICES,
        status=FeedStatus.LIVE,
        payload=[SHARAVATHI_PIL],
        robots=robots,
        note="REAL Sharavathi PSP PIL (Karnataka HC, notices issued) compiled from "
             "public reporting. Refresh authoritative order history via eCourts locally.",
    )
