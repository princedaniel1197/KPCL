"""Provenance is THE rule. Every record and every feed carries one of these tags.

- REAL       public record; real names are OK (already published by government).
- CALIBRATED a real parameter used to shape synthetic instances (no fault implied).
- SYNTHETIC  invented, fault-implying; fictional names only.

A real entity name may NEVER be attached to a SYNTHETIC fault value. Scrapers that
pull real names write only to REAL feeds. The synthetic generator may read
CALIBRATED parameters but must emit only fictional counterparties on any field
implying fault, short-supply, slippage, under-performance, or wrongdoing.
"""

from __future__ import annotations

from enum import Enum


class Provenance(str, Enum):
    REAL = "REAL"
    CALIBRATED = "CALIBRATED"
    SYNTHETIC = "SYNTHETIC"


# Manifest feed status.
class FeedStatus(str, Enum):
    LIVE = "LIVE"        # fetched successfully this run
    STALE = "STALE"      # source unreachable; last good snapshot kept
    SKIPPED = "SKIPPED"  # deliberately not fetched (auth/paywall/captcha)
    PENDING = "PENDING"  # scraper written, never yet run against the live source
    ERROR = "ERROR"      # parse failed; snapshot left untouched
