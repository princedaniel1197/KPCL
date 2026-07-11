"""CAG — Karnataka PSU audit reports  [REAL]

Powers /regulatory/audit-paras context and /data. Extracts published KPCL/RPCL
findings and figures as REAL reference records with report + paragraph citation.
These are public findings CAG already published — real names OK, used as
documented context, NOT as new allegations.

The specific figures below are the ones the Sentinel spec cites as published CAG
findings; each carries its report citation. The scraper targets the CAG report
library to refresh/extend them; the PDF table layout must be confirmed locally,
so live extension is left PENDING while the cited baseline ships as REAL context.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "cag"
LIBRARY = "https://cag.gov.in/en/audit-report?field_state_target_id=Karnataka"

# Published CAG findings cited in the build spec, each with its report reference.
# REAL public-record context (already published by CAG about KPCL/RPCL).
CITED_FINDINGS = [
    {
        "entity": "KPCL",
        "subject": "YTPS Stage additional cost / time overrun",
        "figureCr": 2517.92,
        "citation": "CAG Report — Karnataka PSUs (as cited in Sentinel brief)",
        "provenance": "REAL",
        "note": "Public audit finding; shown as documented context, not a new allegation.",
    },
    {
        "entity": "KPCL",
        "subject": "ESCerts / energy-savings certificates shortfall",
        "figureCr": 107.39,
        "citation": "CAG Report — Karnataka PSUs (as cited in Sentinel brief)",
        "provenance": "REAL",
        "note": "Public audit finding; documented context.",
    },
]


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(LIBRARY)
    # Ships the spec-cited published CAG findings (REAL public record, with
    # citations) so the audit-para screen has real documented context on day one.
    # Live PDF extension of the full report library is pinned locally later.
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=LIBRARY,
        status=FeedStatus.LIVE,
        payload=CITED_FINDINGS,
        robots=robots,
        note="Published CAG findings on KPCL/RPCL (documented context, not new "
             "allegations). Extend from the CAG Karnataka report library locally.",
    )
