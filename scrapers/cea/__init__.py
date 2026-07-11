"""CEA — project monitoring + norm parameters  [REAL project status / CALIBRATED norms]

Powers /projects, /plants/hydro, /data (project status = REAL) and seeds the coal
& plant engines with normative parameters = CALIBRATED.

Returns TWO outputs:
  - data/scraped/cea.json         REAL   project-status lines (PENDING until the
                                          concrete monthly PDF URL is pinned locally)
  - data/calibration/norms.json   CALIBRATED norm parameters (ships as a real
                                          notified baseline; refreshable from CEA/KERC)

CEA publishes monthly PDFs (Broad Status of Thermal Projects, monthly generation).
Layout is stable-ish but the exact tables must be confirmed locally; text + regex
helpers are provided for when the report URL is pinned.
"""

from __future__ import annotations

import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "cea"
INDEX = "https://cea.nic.in/broad-status-report/?lang=en"

# CALIBRATED norm baseline. These are the norm parameters the coal & plant engines
# reconcile against — CEA design norms (100 kcal/kg drop ≈ 3% extra coal; railway
# transit-loss 1.5%) and KERC O&M escalation (5.72%). Refresh from CEA/KERC PDFs.
NORM_BASELINE = {
    "coalNorms": {
        "transitQuantityLossPct": 1.5,   # railway transit-loss norm
        "transitCvLossKcal": 120,        # acceptable billed→received GCV drop
        "storageLossPctPer10Days": 0.08,
        "storageCvToleranceKcal": 85,
        "extraCoalPctPer100Kcal": 3,     # CEA: 100 kcal/kg ≈ 3% extra coal
    },
    "plantNorms": {
        "omEscalationPct": 5.72,         # KERC O&M escalation norm
    },
}


def _extract_norms(text: str) -> dict:
    """Regex helpers for when a concrete CEA PDF URL is pinned locally."""
    norms: dict[str, float] = {}
    m = re.search(r"heat\s*rate[^0-9]{0,20}(\d{4})\s*kcal", text, re.I)
    if m:
        norms["normHeatRate"] = float(m.group(1))
    m = re.search(r"auxiliary\s*(?:power\s*)?consumption[^0-9]{0,20}(\d(?:\.\d+)?)\s*%", text, re.I)
    if m:
        norms["normAuxPct"] = float(m.group(1))
    return norms


def run(http: Http) -> list[ScrapeResult]:
    robots = robots_check.status(INDEX)

    project_status = ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=INDEX,
        status=FeedStatus.PENDING,
        robots=robots,
        note="Pin the current CEA Broad-Status PDF URL locally, then extract KPCL/PSP "
             "project rows. No project status fabricated.",
    )

    norms = ScrapeResult(
        feed="norms",
        provenance=Provenance.CALIBRATED,
        source_url=INDEX + " + KERC tariff norms",
        status=FeedStatus.LIVE,
        payload_key="params",
        payload=NORM_BASELINE,
        robots=robots,
        note="CEA design norms + KERC O&M escalation. Notified baseline; refresh from "
             "the CEA/KERC PDFs when pinned. Reconciles engine ↔ generator thresholds.",
        calibration=True,
    )
    return [project_status, norms]
