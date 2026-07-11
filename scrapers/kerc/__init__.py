"""KERC — tariff orders  [REAL approved figures / CALIBRATED norm rates]

Powers /regulatory and /regulatory/costing. Extracts station-wise approved
fixed/energy charges and approved norms (RoE %, O&M escalation %, heat-rate norm,
aux norm) plus any disallowances. Approved figures = REAL; norm rates feed the
tariff engine's prudence simulator so its flags fire against true thresholds.

KERC publishes tariff orders as PDFs. Layout varies per order/year; the concrete
order URL and its charge tables must be pinned locally. The CALIBRATED norm rates
(e.g. 5.72% O&M escalation) ship in the committed calibration seed.
"""

from __future__ import annotations

import re

from common import FeedStatus, Http, Provenance, ScrapeResult, pdf_text, robots_check

FEED = "kerc"
ORDERS = "https://www.karnataka.gov.in/kerc/"  # tariff-orders index (confirm locally)


def _extract_norm_rates(text: str) -> dict:
    rates: dict[str, float] = {}
    m = re.search(r"O\s*&\s*M[^0-9]{0,30}(\d(?:\.\d+)?)\s*%", text, re.I)
    if m:
        rates["omEscalationPct"] = float(m.group(1))
    m = re.search(r"return\s+on\s+equity[^0-9]{0,20}(\d{1,2}(?:\.\d+)?)\s*%", text, re.I)
    if m:
        rates["roePct"] = float(m.group(1))
    return rates


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(ORDERS)
    res = ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=ORDERS,
        status=FeedStatus.PENDING,
        robots=robots,
        note="Pin the specific KERC tariff-order PDF locally; approved charges are "
             "REAL, norm rates feed calibration.",
    )
    return res
