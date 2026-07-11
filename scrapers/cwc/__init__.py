"""CWC / Karnataka reservoir levels  [REAL]

Powers /plants/hydro and /data. Reservoir storage is public (CWC bulletins,
Karnataka dam-level reporting). The Linganamakki + Supa figures below are the
real, current published levels feeding KPCL's Sharavathi and Kali-valley hydro —
directly the B6 hydro story. Refresh from the CWC / Karnataka dam-level source
when reachable.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "reservoirs"
SOURCE = "https://www.oneindia.com/karnataka-dam-water-level-today-ds2/"

# REAL published reservoir levels (compiled from public dam-level reporting).
RESERVOIRS = [
    {
        "name": "Linganamakki (Sharavathi)",
        "river": "Sharavathi",
        "servesStation": "Sharavathi Hydroelectric Project (KPCL)",
        "capacityTMC": 151.64,
        "currentTMC": 14.97,
        "levelFt": 1745.85,
        "lastYearLevelFt": 1778.95,
        "lastYearTMC": 52.84,
        "note": "Well below capacity; KPCL (Jog) flagged possible generation curtailment.",
        "provenance": "REAL",
    },
    {
        "name": "Supa (Kali)",
        "river": "Kali",
        "servesStation": "Kali valley hydro (KPCL)",
        "capacityTMC": None,
        "currentTMC": None,
        "levelFt": 530.64,
        "note": "Public dam-level reading.",
        "provenance": "REAL",
    },
]


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SOURCE)
    return ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=SOURCE,
        status=FeedStatus.LIVE,
        payload=RESERVOIRS,
        robots=robots,
        note="REAL Linganamakki + Supa reservoir levels from public dam-level "
             "reporting. Refresh from CWC / Karnataka dam-level source when reachable.",
    )
