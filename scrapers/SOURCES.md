# Sentinel scraper sources

One row per source: what is pulled, its provenance class, robots status, target
page, and how to run it live. **The one rule:** real names appear only on REAL
public-record feeds; every fault-implying value (slippage, short-supply,
under-performance, wage violation, vendor grade) stays SYNTHETIC with fictional
names until KPCL provides internal data. No auth, no captcha, no paywalled content.

Run `python scrapers/run_all.py` the night before a demo, verify the manifest at
`data/manifest.json`, commit `/data`, deploy. Never run live during a demo.

| # | Feed | Source | Provenance | Powers | robots | Live status |
|---|------|--------|-----------|--------|--------|-------------|
| 1 | Parivesh clearance status | parivesh.nic.in "Track Your Proposal" | REAL | `/projects/clearances`, `/data` | allow (public GET) | **PENDING** — JS SPA backed by JSON APIs; capture the proposal-detail endpoint from the browser Network tab locally, fill `KNOWN_PROPOSALS` + `parse()`. No proposal number fabricated. |
| 2 | eCourts / Karnataka HC case status | services.ecourts.gov.in / karnatakajudiciary.kar.nic.in | REAL | `/legal`, `/projects/[id]`, `/data` | allow | **PENDING** — case-status search is CAPTCHA-gated (guardrail: no captcha). Supply known CNRs via the existing eCourts tooling; this refreshes order history for those CNRs only. |
| 3 | Karnataka e-Proc / KPPP tenders | eproc.karnataka.gov.in | REAL | `/contracts/spend`, `/projects/retenders`, `/data` | check per path | best-effort listing parser; confirm the public tender-table selectors locally. Re-tender detection uses real titles as a frequency signal, **not** an allegation. |
| 4 | CEA project monitoring + norms | cea.nic.in Broad-Status reports (PDF) | REAL status / CALIBRATED norms | `/projects`, `/plants/hydro`, `/data` | allow | project rows **PENDING** (pin the monthly PDF URL locally); norm baseline ships CALIBRATED. |
| 5 | CAG Karnataka PSU audit reports | cag.gov.in (PDF) | REAL | `/regulatory/audit-paras`, `/data` | allow | **LIVE (cited baseline)** — spec-cited published findings with citations (documented context, not new allegations); extend from the report library locally. |
| 6 | KERC tariff orders | karnataka.gov.in/kerc (PDF) | REAL charges / CALIBRATED norm rates | `/regulatory`, `/regulatory/costing` | allow | **PENDING** — pin the specific tariff-order PDF locally; approved charges REAL, norm rates feed calibration. |
| 7 | Coal grades + pithead prices | coal.gov.in grade/price circular | CALIBRATED | `/coal`, `/data` | allow | **LIVE (baseline)** — real CIL grade GCV bands; representative notified pithead levels. |
| 8 | Railway freight + demurrage | indianrailways.gov.in freight circular | CALIBRATED | `/coal/demurrage`, `/data` | allow | **LIVE (baseline)** — demurrage ₹150/wagon-hour (Railway Board); representative distance-slab freight. |
| 9 | UTTAM third-party GCV | uttam.coalindia.in | REAL if public | `/coal/ledger`, `/data` | n/a | **SKIPPED** — sampling views require login; skipped by guardrail (no auth). |

## Etiquette (enforced in `common/`)
- `robots_check.py` reads robots.txt and honours disallows (records SKIPPED).
- `http.py` sends a real, contactable User-Agent (edit `CONTACT`), waits 2–5 s
  between live hits to the same host, and caches every raw response in
  `scrapers/.cache/` so re-runs never re-hit servers.
- No logins, captchas, or paywalled content — public pages only. Datacenter-IP
  blocks are expected and fine; this runs from a local machine.

## Provenance is the rule
- `REAL` — public record, real names OK (Parivesh, eCourts, CAG, KERC approved figures).
- `CALIBRATED` — a real parameter (coal grade bands, freight, demurrage, CEA/KERC norms)
  shaping SYNTHETIC instances. Never fault-implying.
- `SYNTHETIC` — invented, fault-implying; fictional counterparties only.

A real entity name is **never** attached to a SYNTHETIC fault value. If unsure
whether a field is safe to show with a real name, tag it SYNTHETIC.
