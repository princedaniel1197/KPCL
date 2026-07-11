"""KERC — station-wise tariff orders (approved norms)  [REAL]

Powers /regulatory and /regulatory/costing. KERC tariff orders are SCANNED PDFs,
so this scraper rasterizes each page (PyMuPDF) and OCRs it (Tesseract), then pulls
only the norms stated in prose — which OCR reads reliably — and never the jumbled
scanned tables (no fabricated figures). OCR output is cached so re-runs are fast.

Drop KPCL station tariff-order PDFs into scrapers/.manual/ (filename containing
'kerc' or 'tariff'), or the known BTPS-U3 order is fetched as a default.

Requires: pip install pymupdf pytesseract Pillow, plus the Tesseract binary
(see RUNBOOK.md). Set TESSERACT_CMD if it isn't at the default path.
"""

from __future__ import annotations

import glob
import hashlib
import os
import re

from common import FeedStatus, Http, Provenance, ScrapeResult, robots_check

FEED = "kerc"
MANUAL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".manual")
OCR_CACHE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".cache")
TESSERACT = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

# Known KPCL generation tariff orders on KERC (used if none dropped in .manual).
DEFAULT_ORDERS = [
    "https://kerc.karnataka.gov.in/uploads/media_to_upload1772607194.pdf",  # BTPS U3 (1x700 MW)
]


def _ocr_pdf(source: str, raw: bytes) -> str:
    key = hashlib.sha256(source.encode()).hexdigest()[:20]
    cache = os.path.join(OCR_CACHE, f"kercocr_{key}.txt")
    if os.path.exists(cache):
        return open(cache, encoding="utf-8").read()
    import io

    import fitz  # PyMuPDF — rasterizes without poppler
    import pytesseract
    from PIL import Image

    if os.path.exists(TESSERACT):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT
    doc = fitz.open(stream=raw, filetype="pdf")
    parts = []
    for page in doc:
        pix = page.get_pixmap(dpi=210)
        parts.append(pytesseract.image_to_string(Image.open(io.BytesIO(pix.tobytes("png")))))
    text = "\n".join(parts)
    os.makedirs(OCR_CACHE, exist_ok=True)
    open(cache, "w", encoding="utf-8").write(text)
    return text


def _extract(flat: str) -> dict:
    """Pull only prose-stated norms (reliable under OCR); skip scanned tables."""
    rec: dict = {"provenance": "REAL"}
    if re.search(r"Bellary|BTPS", flat, re.I) and re.search(r"Unit-?\s?3|1\s?[xX]\s?700|700\s*MW", flat):
        rec["station"] = "BTPS Unit-3 (700 MW)"
        rec["plant"] = "BTPS"
    elif re.search(r"Raichur|RTPS", flat, re.I):
        rec["station"] = "RTPS"
        rec["plant"] = "RTPS"
    elif re.search(r"Yeramarus|YTPS", flat, re.I):
        rec["station"] = "YTPS"
        rec["plant"] = "YTPS"
    m = re.search(r"Date:\s*(\d{2}\.\d{2}\.\d{4})", flat)
    if m:
        rec["orderDate"] = m.group(1)
    m = re.search(r"(KERC/[A-Z]-\d+/[A-Za-z0-9/-]+)", flat)
    if m:
        rec["kercRef"] = m.group(1)
    m = re.search(r"Return on equity[^.]{0,50}?(\d{1,2}\.\d+)\s*%", flat, re.I)
    if m:
        rec["roePct"] = float(m.group(1))
    hr = re.findall(r"(?:Gross Station Heat Rate|heat rate)[^.]{0,70}?(\d{4}\.\d+)", flat, re.I)
    if hr and len(set(hr)) == 1:  # both mentions agree → trust it
        rec["grossStationHeatRate"] = float(hr[0])
    return rec


def run(http: Http) -> ScrapeResult:
    robots = robots_check.status("https://kerc.karnataka.gov.in")
    res = ScrapeResult(feed=FEED, provenance=Provenance.REAL,
                       source_url="https://kerc.karnataka.gov.in (tariff orders)",
                       status=FeedStatus.PENDING, robots=robots)

    dropped = [f for f in glob.glob(os.path.join(MANUAL_DIR, "*.pdf"))
               if re.search(r"kerc|tariff", os.path.basename(f), re.I)]
    records: list[dict] = []
    try:
        for path in dropped:
            with open(path, "rb") as fh:
                text = _ocr_pdf(path, fh.read())
            rec = _extract(" ".join(text.split()))
            rec["source"] = os.path.basename(path)
            if rec.get("station"):
                records.append(rec)
        if not records:  # nothing dropped → fetch the known order(s)
            for url in DEFAULT_ORDERS:
                text = _ocr_pdf(url, http.get_bytes(url))
                rec = _extract(" ".join(text.split()))
                rec["source"] = url
                if rec.get("station"):
                    records.append(rec)
    except Exception as e:
        res.note = (f"KERC OCR unavailable ({type(e).__name__}) — install pymupdf + "
                    f"Tesseract (see RUNBOOK). Kept last snapshot.")
        res.payload = []
        return res

    if records:
        res.status = FeedStatus.LIVE
        approved = [f"{r.get('station', '?')}: RoE {r.get('roePct', '?')}%"
                    + (f", GSHR {r['grossStationHeatRate']} kCal/kWh" if r.get("grossStationHeatRate") else "")
                    for r in records]
        res.note = f"KERC tariff orders OCR-parsed: {'; '.join(approved)}."
    else:
        res.note = "KERC order OCR'd but no prose norms matched — layout may differ."
    res.payload = records
    return res
