"""Extract text (and simple tables) from PDF bytes via pdfplumber.

Government PDFs (CEA, CAG, KERC) are the norm-parameter and figure sources. We
extract page text and let each scraper's parse() run regexes over it. Table
extraction is best-effort — layout varies wildly across reports."""

from __future__ import annotations

import io


def extract_text(pdf_bytes: bytes, max_pages: int | None = None) -> str:
    try:
        import pdfplumber
    except ImportError as e:  # pragma: no cover
        raise RuntimeError("pdfplumber not installed — pip install -r requirements.txt") from e

    out: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = pdf.pages if max_pages is None else pdf.pages[:max_pages]
        for page in pages:
            txt = page.extract_text() or ""
            out.append(txt)
    return "\n".join(out)


def extract_tables(pdf_bytes: bytes, max_pages: int | None = None) -> list[list[list[str]]]:
    try:
        import pdfplumber
    except ImportError as e:  # pragma: no cover
        raise RuntimeError("pdfplumber not installed") from e

    tables: list[list[list[str]]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = pdf.pages if max_pages is None else pdf.pages[:max_pages]
        for page in pages:
            for tbl in page.extract_tables() or []:
                cleaned = [[(c or "").strip() for c in row] for row in tbl]
                tables.append(cleaned)
    return tables
