# Sentinel scraper suite

Standalone Python scrapers that pull **public-record** government data, write
provenance-stamped JSON snapshots into `data/scraped/` and calibration parameters
into `data/calibration/`, and produce `data/manifest.json`. The Next.js app reads
these exactly like it reads synthetic data. Scrapers run locally on command; you
commit the JSON and deploy. **Nothing fetches at request time.**

## The one rule
Every field carries a provenance tag — **REAL** (public record, real names OK),
**CALIBRATED** (real parameter shaping synthetic instances), or **SYNTHETIC**
(invented, fault-implying, fictional names only). A real entity name is never
attached to a SYNTHETIC fault value. See `SOURCES.md`.

## Setup
```bash
cd scrapers
python -m venv .venv && . .venv/Scripts/activate   # (Windows) or . .venv/bin/activate
pip install -r requirements.txt
# only if a source needs a JS render:
python -m playwright install chromium
```
Edit `common/http.py` → `CONTACT` so the User-Agent is contactable before running.

## Run
```bash
python scrapers/run_all.py                 # all sources → snapshots + manifest
python scrapers/run_all.py --only coalprices,freight
python scrapers/run_all.py --dry-run       # preview; write nothing
python scrapers/run_all.py --no-cache      # force live fetch (ignore .cache)
```
Each scraper is idempotent: an unreachable source keeps the last good snapshot and
is recorded as STALE; a captcha/paywall source is SKIPPED; a scraper that hasn't
been wired to a live endpoint yet is PENDING. Nothing crashes the suite; nothing
blanks a page.

## What ships working today
- **CALIBRATED** (live baselines, offline-safe): CIL grade GCV bands + notified
  pithead prices, railway freight + ₹150/wagon-hour demurrage, CEA/KERC norm
  parameters. These seed the coal & plant engines so synthetic numbers sit against
  true norms — the rakes and the slipping colliery stay fictional.
- **REAL** context: the CAG published findings the build brief cites (with report
  citations).

## What to wire locally before a demo
The REAL feeds that need a live pull from your machine (they block datacenter IPs
and/or are JS/PDF/captcha sources): **Parivesh** (clearance status), **eCourts**
(case status), **e-Proc** (tenders), **CEA** (project rows), **KERC** (tariff
orders). Each scraper's `run()` has the target URL and a commented `parse()` stub;
`SOURCES.md` explains exactly what to capture. Fill them in, run, verify the
manifest shows LIVE, commit `data/`, deploy.

## Layout
```
scrapers/
  common/       http (polite+cached), pdf_text, json_writer (+provenance), robots_check
  parivesh/ ecourts/ eproc/ cea/ cag/ kerc/ coalprices/ freight/ uttam/
  run_all.py    orchestrator + manifest writer
  requirements.txt  SOURCES.md  README.md
```

## The calibration handshake
`data/calibration/*.json` carry the authoritative public constants (grade bands,
prices, freight, demurrage, norms) with provenance. The app's `lib/engines/norms.ts`
embeds the same values as its defaults, so the coal engine and the synthetic
generator reconcile against one consistent set of thresholds. The generator
(`scripts/generate.ts`) guarantees baseline calibration + manifest files exist on
every build, so a clean checkout never breaks even before the scrapers are run.
Refreshing a scraper updates the calibration file and the manifest (visible on the
`/data` screen); numbers stay realistic while every fault stays synthetic.
