"""robots.txt check. Every scraper calls allowed() before a live fetch and skips
(records SKIPPED) if the path is disallowed for our User-Agent."""

from __future__ import annotations

from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

from .http import USER_AGENT

_cache: dict[str, RobotFileParser] = {}


def _parser_for(url: str) -> RobotFileParser | None:
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    if base in _cache:
        return _cache[base]
    rp = RobotFileParser()
    rp.set_url(urljoin(base, "/robots.txt"))
    try:
        rp.read()
    except Exception:
        # If robots is unreachable, default to cautious-allow for public GET pages
        # but record it; callers still honour explicit disallows when readable.
        _cache[base] = None  # type: ignore[assignment]
        return None
    _cache[base] = rp
    return rp


def allowed(url: str) -> bool:
    rp = _parser_for(url)
    if rp is None:
        return True
    try:
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True


def status(url: str) -> str:
    """Human-readable robots status for SOURCES.md / manifest."""
    rp = _parser_for(url)
    if rp is None:
        return "robots.txt unreachable (treated as allow for public GET)"
    return "allowed" if allowed(url) else "DISALLOWED"
