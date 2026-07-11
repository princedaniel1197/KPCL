"""Polite, cached HTTP client.

- Real, contactable User-Agent (edit CONTACT below before running).
- 2–5s randomized delay between live requests to the same host.
- On-disk response cache in scrapers/.cache so re-runs never re-hit servers.
- Retries with exponential backoff on transient errors (tenacity).
- Never handles auth, captchas, or paywalled content — public pages only.
"""

from __future__ import annotations

import hashlib
import random
import time
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

CONTACT = "Sentinel oversight demo (contact: princedanieljj@gmail.com)"
USER_AGENT = f"SentinelBot/1.0 (+public-record research; {CONTACT})"

CACHE_DIR = Path(__file__).resolve().parents[1] / ".cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

_last_hit: dict[str, float] = {}


def _cache_path(url: str, kind: str) -> Path:
    h = hashlib.sha256(url.encode("utf-8")).hexdigest()[:20]
    return CACHE_DIR / f"{kind}_{h}.bin"


def _polite_delay(host: str) -> None:
    now = time.monotonic()
    prev = _last_hit.get(host, 0.0)
    gap = now - prev
    wait = random.uniform(2.0, 5.0)
    if gap < wait:
        time.sleep(wait - gap)
    _last_hit[host] = time.monotonic()


class Http:
    def __init__(self, *, use_cache: bool = True, timeout: int = 30) -> None:
        self.use_cache = use_cache
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept-Language": "en-IN,en;q=0.9"})

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=20),
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
        reraise=True,
    )
    def _live_get(self, url: str) -> requests.Response:
        from urllib.parse import urlparse

        _polite_delay(urlparse(url).netloc)
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        return resp

    def get_text(self, url: str) -> str:
        """Fetch a page as text, using (and populating) the on-disk cache."""
        cp = _cache_path(url, "text")
        if self.use_cache and cp.exists():
            return cp.read_text(encoding="utf-8", errors="replace")
        resp = self._live_get(url)
        text = resp.text
        cp.write_text(text, encoding="utf-8", errors="replace")
        return text

    def get_bytes(self, url: str) -> bytes:
        """Fetch a binary resource (PDF), using (and populating) the cache."""
        cp = _cache_path(url, "bin")
        if self.use_cache and cp.exists():
            return cp.read_bytes()
        resp = self._live_get(url)
        cp.write_bytes(resp.content)
        return resp.content

    def post_text(self, url: str, data: dict) -> str:
        """POST for search-form sources (eCourts, e-proc). Cached by url+payload."""
        key = url + "?" + "&".join(f"{k}={v}" for k, v in sorted(data.items()))
        cp = _cache_path(key, "post")
        if self.use_cache and cp.exists():
            return cp.read_text(encoding="utf-8", errors="replace")
        from urllib.parse import urlparse

        _polite_delay(urlparse(url).netloc)
        resp = self.session.post(url, data=data, timeout=self.timeout)
        resp.raise_for_status()
        cp.write_text(resp.text, encoding="utf-8", errors="replace")
        return resp.text
