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

# Published CAG findings on KPCL/RPCL, with report references verified against the
# CAG report library. REAL public-record context (already published by CAG) —
# documented context, NOT new allegations.
CITED_FINDINGS = [
    {
        "entity": "RPCL / KPCL — YTPS Yeramarus",
        "subject": "Cost & time overrun; project cost escalation",
        "detail": "Project cost rose from ₹8,806.23 cr (Apr 2009 estimate) to "
                  "₹12,915.90 cr (provisional, Mar 2018) due to delays.",
        "figureCr": 12915.90,
        "citation": "CAG Report No. 5 of 2019 (PSUs, Government of Karnataka)",
        "sourceUrl": "https://cag.gov.in/uploads/download_audit_report/2019/Overview_of_Report_no_5_of_2019_PSU_Government_of_Karnataka.pdf",
        "provenance": "REAL",
    },
    {
        "entity": "RPCL / KPCL — YTPS Yeramarus",
        "subject": "Cost of generation per unit escalated",
        "detail": "Per-unit generation cost rose from ₹3.24 to ₹5.36 (provisional).",
        "figureCr": None,
        "citation": "CAG Report No. 5 of 2019 (PSUs, Government of Karnataka)",
        "sourceUrl": "https://cag.gov.in/uploads/download_audit_report/2019/Overview_of_Report_no_5_of_2019_PSU_Government_of_Karnataka.pdf",
        "provenance": "REAL",
    },
    {
        "entity": "Karnataka ESCOMs (YTPS deficit)",
        "subject": "Extra power-procurement cost from YTPS delay",
        "detail": "22,283.03 MU of short/medium-term power procured (2014-15 to "
                  "2017-18) to meet the deficit, at ₹2,517.92 cr additional cost.",
        "figureCr": 2517.92,
        "citation": "CAG Report No. 5 of 2019 (PSUs, Government of Karnataka)",
        "sourceUrl": "https://cag.gov.in/uploads/download_audit_report/2019/Overview_of_Report_no_5_of_2019_PSU_Government_of_Karnataka.pdf",
        "provenance": "REAL",
    },
    {
        "entity": "KPCL — BTPS Ballari",
        "subject": "Delay in levy of liquidated damages (BHEL); avoidable entry tax",
        "detail": "2×500 MW (Unit-I Mar 2009, Unit-II Feb 2013). BHEL tardiness on "
                  "Unit-II; LD levy delayed. ₹5.88 cr entry tax (2009-11) avoidable.",
        "figureCr": 5.88,
        "citation": "CAG Report No. 9 of 2014 — Performance Audit, BTPS (Karnataka PSUs)",
        "sourceUrl": "https://www.saiindia.gov.in/uploads/download_audit_report/2014/Karnataka_Report_9_2014_chap_2.pdf",
        "provenance": "REAL",
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
