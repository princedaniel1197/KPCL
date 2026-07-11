r"""Reachability probe — run from YOUR machine to see what your connection can
actually fetch with the scraper's real library (Python requests + browser UA).

    python scrapers\_probe.py

OK (status < 400) = the scraper can pull it here. Anything else = blocked / needs
another route. Send the output back so we build the scrapers your IP can reach.
"""

from __future__ import annotations

import requests

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36",
      "Accept-Language": "en-IN,en;q=0.9"}

SOURCES = [
    # (label, url, why it matters)
    ("CEA (generation/coal stock)",     "https://cea.nic.in"),
    ("National Power Portal (alt CEA)", "https://npp.gov.in"),
    ("MERIT (variable cost)",           "https://meritindia.in"),
    ("KERC (tariff orders)",            "https://kerc.karnataka.gov.in"),
    ("Parivesh (clearances)",           "https://parivesh.nic.in"),
    ("e-Proc Karnataka (tenders)",      "https://eproc.karnataka.gov.in"),
    ("Ministry of Coal (grades)",       "https://coal.gov.in"),
    ("CAG (audit reports)",             "https://cag.gov.in"),
    ("Indian Kanoon (litigation)",      "https://indiankanoon.org"),
    ("eCourts (case status)",           "https://services.ecourts.gov.in"),
    ("CWC / India-WRIS (reservoirs)",   "https://indiawris.gov.in"),
]

print("Sentinel reachability probe (Python requests, browser UA)\n" + "-" * 60)
for label, url in SOURCES:
    try:
        r = requests.get(url, headers=UA, timeout=15, allow_redirects=True)
        mark = "OK " if r.status_code < 400 else "BAD"
        print(f"  [{mark}] {r.status_code}  {label}")
    except Exception as e:
        print(f"  [ERR]      {label}  ({type(e).__name__})")
print("-" * 60)
print("OK = scraper can pull it from here. Send this whole output back.")
