"""UTTAM — third-party loading-end GCV sampling  [REAL if public, else SKIP]

If public declared-vs-analysed GCV summaries are reachable without auth, pull them
as REAL reference (they corroborate the coal ledger's receiving-end gap story). If
the portal needs a login, we SKIP and say so — we do not fabricate sampling data.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "uttam"
SOURCE = "https://uttam.coalindia.in/"


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SOURCE)
    # UTTAM's consumer-side sampling views are authenticated; without a public,
    # auth-free summary endpoint we SKIP by design (guardrail: no login).
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=SOURCE,
        status=FeedStatus.SKIPPED,
        robots=robots,
        note="UTTAM sampling views require login; skipped by guardrail (no auth). "
             "If a public auth-free GCV summary is found, implement parse() as REAL.",
    )
