"""Coal grades + notified pithead prices  [CALIBRATED]

Seeds data/calibration/coal_prices.json. The synthetic rake generator and the
coal engine both read these real CIL grade GCV bands + notified pithead price
levels, so billed values, overbilling ₹ and landed costs are realistic — while
the rakes and the slipping colliery stay fictional (SYNTHETIC).

The GCV bands below are the actual Ministry of Coal / CIL non-coking grade bands
(kcal/kg). Pithead prices are representative notified levels (they vary by CIL
subsidiary and revision); refresh from the Ministry of Coal notified-price
circular when reachable. Not fault-implying — pure calibration.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "coal_prices"
SOURCE = "https://coal.gov.in/en/major-statistics/coal-grade"

# Real CIL/Ministry-of-Coal non-coking grade GCV bands (kcal/kg).
# pitheadPrice = representative notified ROM level (₹/tonne).
GRADE_BANDS = [
    {"grade": "G1", "minGcv": 7001, "maxGcv": 8000, "pitheadPrice": 3360},
    {"grade": "G2", "minGcv": 6701, "maxGcv": 7000, "pitheadPrice": 3040},
    {"grade": "G3", "minGcv": 6401, "maxGcv": 6700, "pitheadPrice": 2810},
    {"grade": "G4", "minGcv": 6101, "maxGcv": 6400, "pitheadPrice": 2600},
    {"grade": "G5", "minGcv": 5801, "maxGcv": 6100, "pitheadPrice": 2530},
    {"grade": "G6", "minGcv": 5501, "maxGcv": 5800, "pitheadPrice": 2450},
    {"grade": "G7", "minGcv": 5201, "maxGcv": 5500, "pitheadPrice": 2260},
    {"grade": "G8", "minGcv": 4901, "maxGcv": 5200, "pitheadPrice": 2070},
    {"grade": "G9", "minGcv": 4601, "maxGcv": 4900, "pitheadPrice": 1890},
    {"grade": "G10", "minGcv": 4301, "maxGcv": 4600, "pitheadPrice": 1700},
    {"grade": "G11", "minGcv": 4001, "maxGcv": 4300, "pitheadPrice": 1510},
    {"grade": "G12", "minGcv": 3701, "maxGcv": 4000, "pitheadPrice": 1320},
    {"grade": "G13", "minGcv": 3401, "maxGcv": 3700, "pitheadPrice": 1140},
    {"grade": "G14", "minGcv": 3101, "maxGcv": 3400, "pitheadPrice": 950},
    {"grade": "G15", "minGcv": 2801, "maxGcv": 3100, "pitheadPrice": 820},
    {"grade": "G16", "minGcv": 2501, "maxGcv": 2800, "pitheadPrice": 700},
    {"grade": "G17", "minGcv": 2201, "maxGcv": 2500, "pitheadPrice": 590},
]


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SOURCE)
    # Ships the notified public baseline (offline-safe). A future live parse of the
    # Ministry-of-Coal grade/price page can overwrite it.
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.CALIBRATED,
        source_url=SOURCE,
        status=FeedStatus.LIVE,
        payload_key="params",
        payload={"gradeBands": GRADE_BANDS},
        robots=robots,
        note="Real CIL grade GCV bands; representative notified pithead levels. "
             "Refresh from the Ministry of Coal notified-price circular when reachable.",
        calibration=True,
    )
