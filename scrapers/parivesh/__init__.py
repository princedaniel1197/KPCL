"""Parivesh — forest / wildlife / environment clearance status  [REAL]

Powers /projects/clearances and /data. Pulls the real Sharavathi PSP proposal
(and other KPCL proposals) clearance stages. Real names OK — published record.

NOTE ON RUNNING LIVE: Parivesh (parivesh.nic.in) is a JS-driven single-page app
whose proposal data comes from JSON API endpoints, not static HTML. The exact
endpoint + payload must be captured from the browser Network tab on the user's
machine (it changes, and the site blocks datacenter IPs). Until then this scraper
returns PENDING and writes nothing — it never fabricates a real proposal number.
Fill KNOWN_PROPOSALS + the API call in parse() once captured locally.
"""

from __future__ import annotations

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "clearances"
BASE = "https://parivesh.nic.in"
# Search UI where a human confirms the live proposal numbers before wiring them in.
SEARCH_URL = "https://parivesh.nic.in/newupgrade/#/trackYourProposal"

# Real, publicly-known KPCL proposals to track. Proposal numbers are left blank on
# purpose — fill them from Parivesh's public "Track Your Proposal" once confirmed;
# we will not guess a government proposal number.
KNOWN_PROPOSALS = [
    {"title": "Sharavathi Pumped Storage Project (2000 MW)", "proponent": "KPCL", "proposal_no": ""},
]

GATES = ["ToR", "EC", "FC-I", "FC-II", "NBWL"]


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status(SEARCH_URL)
    res = ScrapeResult(
        feed=FEED,
        provenance=Provenance.REAL,
        source_url=SEARCH_URL,
        status=FeedStatus.PENDING,
        robots=robots,
        note=(
            "Parivesh is a JS SPA backed by JSON APIs; capture the proposal-detail "
            "endpoint from the browser Network tab locally, then implement parse(). "
            "No proposal fabricated. Gates tracked: " + ", ".join(GATES)
        ),
    )
    if not robots_check.allowed(SEARCH_URL):
        res.status = FeedStatus.SKIPPED
        res.note = "robots.txt disallows this path for our UA."
        return res

    # --- LIVE PARSE (implement after capturing the API locally) -------------
    # records = []
    # for prop in KNOWN_PROPOSALS:
    #     if not prop["proposal_no"]:
    #         continue
    #     data = json.loads(http.get_text(f"{BASE}/api/.../{prop['proposal_no']}"))
    #     records.append({
    #         "proposalNo": prop["proposal_no"],
    #         "title": prop["title"],
    #         "proponent": prop["proponent"],
    #         "gates": [{"key": g, "status": ..., "date": ...} for g in GATES],
    #         "latestMinute": ...,
    #         "statusText": ...,
    #         "provenance": "REAL",
    #     })
    # if records:
    #     res.payload, res.status = records, FeedStatus.LIVE
    return res
