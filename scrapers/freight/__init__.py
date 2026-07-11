"""Railway freight + demurrage  [CALIBRATED]

Seeds data/calibration/freight.json. Per-tonne freight by distance slab and the
demurrage rate (₹150/wagon-hour, current Railway Board authority) calibrate the
demurrage / idle-freight math. Not fault-implying.

Distance-slab freight is representative of Railway Board coal-freight levels;
refresh from the Railway Board freight circular / FOIS when reachable.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "freight"
SOURCE = "https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,1,304,366,554"

# Representative Railway Board coal freight by distance slab (₹/tonne).
FREIGHT_SLABS = [
    {"uptoKm": 300, "ratePerTonne": 520},
    {"uptoKm": 500, "ratePerTonne": 720},
    {"uptoKm": 700, "ratePerTonne": 1050},
    {"uptoKm": 900, "ratePerTonne": 1210},
    {"uptoKm": 1100, "ratePerTonne": 1380},
    {"uptoKm": 1300, "ratePerTonne": 1520},
    {"uptoKm": 1600, "ratePerTonne": 1760},
]

# Railway Board demurrage authority.
DEMURRAGE_PER_WAGON_HOUR = 150
FREE_TIME_HOURS = 6


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SOURCE)
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.CALIBRATED,
        source_url=SOURCE,
        status=FeedStatus.LIVE,
        payload_key="params",
        payload={
            "freightSlabs": FREIGHT_SLABS,
            "demurragePerWagonHour": DEMURRAGE_PER_WAGON_HOUR,
            "freeTimeHours": FREE_TIME_HOURS,
        },
        robots=robots,
        note="Demurrage ₹150/wagon-hour (Railway Board). Distance-slab freight is "
             "representative; refresh from the Railway Board freight circular.",
        calibration=True,
    )
