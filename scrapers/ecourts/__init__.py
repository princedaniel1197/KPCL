"""eCourts / Karnataka HC — case status  [REAL]

Powers /legal, /projects/[id], /data. Pulls known KPCL-linked public cases
(Sharavathi PILs, tender challenges). Real parties as publicly listed.

NOTE ON RUNNING LIVE: the eCourts / HC services portal requires a CAPTCHA on the
case-status search form, so it cannot be automated politely without solving one —
which the guardrails forbid. Two lawful paths, both done on the user's machine:
  (a) reuse Prince's existing eCourts scraper/session that already handles this, or
  (b) enter the CNR / case numbers by hand once and let this scraper refresh the
      order history for those known CNRs where a CAPTCHA-free detail view exists.
Until a CNR list is supplied, this returns PENDING and fabricates nothing.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "cases"
HC_SERVICES = "https://karnatakajudiciary.kar.nic.in"
ECOURTS = "https://services.ecourts.gov.in"

# Known KPCL-linked cases to track. CNRs left blank — supply from Prince's existing
# eCourts tooling; we will not invent a case/CNR number.
KNOWN_CASES = [
    {"label": "Sharavathi PSP — environmental PIL", "cnr": ""},
    {"label": "KPCL tender challenge (writ)", "cnr": ""},
]


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(HC_SERVICES)
    res = ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=HC_SERVICES,
        status=FeedStatus.PENDING,
        robots=robots,
        note=(
            "eCourts case-status search is CAPTCHA-gated (guardrail: no captcha). "
            "Supply known CNRs via Prince's existing eCourts scraper; this refreshes "
            "order history for those CNRs only. No case number fabricated."
        ),
    )
    # --- LIVE PARSE (wire to Prince's existing CAPTCHA-free CNR flow) --------
    # records = []
    # for c in KNOWN_CASES:
    #     if not c["cnr"]:
    #         continue
    #     html = http.get_text(f"{ECOURTS}/.../{c['cnr']}")
    #     records.append(parse_case(html, c["label"]))
    # if records:
    #     res.payload, res.status = records, FeedStatus.LIVE
    return res
