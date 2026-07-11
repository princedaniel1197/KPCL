# Sentinel scraper — LOCAL RUNBOOK (Phase 3)

Run the full suite from **your own machine** (residential/office IP). This unlocks
the sources that block datacenter IPs (**CEA, eCourts**) and lets the browser +
OCR scrapers (**KERC, e-Proc, Parivesh**) run at full depth. You commit the JSON
and push; Vercel redeploys automatically.

> **One rule stays enforced:** REAL / CALIBRATED / SYNTHETIC provenance. No auth,
> no captcha, no paywalled content. If a source needs a login, skip it (or have
> KPCL export it — see Phase 4 in `DATA_PLAN.md`).

---

## 1. One-time setup (~10 min)

### Windows PowerShell (your setup)
```powershell
git clone https://github.com/princedaniel1197/KPCL.git
cd KPCL\scrapers

python -m venv .venv
# if activation is blocked ("running scripts is disabled"), run this once:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python -m playwright install chromium          # headless browser for JS portals
```
> **PowerShell 5.1 note:** it does NOT support `&&` chaining — run each command on
> its own line (this whole runbook is written that way). `python scrapers\run_all.py`
> works with either slash direction.

### macOS / Linux
```bash
git clone https://github.com/princedaniel1197/KPCL.git
cd KPCL/scrapers
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

**Tesseract OCR binary** (needed only for the scanned KERC/CAG PDFs):
- **Windows:** install from https://github.com/UB-Mannheim/tesseract/wiki, then
  either add it to PATH or set in your shell:
  `setx TESSDATA_PREFIX "C:\Program Files\Tesseract-OCR\tessdata"`
- **macOS:** `brew install tesseract`
- **Linux:** `sudo apt install tesseract-ocr poppler-utils`
  (`poppler` is what `pdf2image` uses to rasterize pages.)
- **Windows poppler:** download from https://github.com/oschwartz10612/poppler-windows,
  add its `bin/` to PATH (needed by `pdf2image`).

Edit `scrapers/common/http.py` → `CONTACT` so the User-Agent is contactable
(courtesy for the public servers).

---

## 2. Run

```bash
# from the repo root
python scrapers/run_all.py                 # all sources → data/scraped, data/calibration, data/manifest.json
python scrapers/run_all.py --only cea,kerc # refresh just these
python scrapers/run_all.py --dry-run       # preview, write nothing
python scrapers/run_all.py --no-cache      # force live fetch (ignore scrapers/.cache)
```

Each source is idempotent: unreachable → keeps last snapshot (STALE); login/captcha
→ SKIPPED; not-yet-pinned → PENDING. Nothing crashes the suite; nothing blanks a page.

After a run, confirm the manifest:
```bash
node -e "const m=require('./data/manifest.json'); console.log(m.generatedAt); m.sources.forEach(s=>console.log(' ',s.status.padEnd(8),s.provenance.padEnd(10),String(s.records).padStart(4),s.feed))"
```

---

## 3. What each LOCAL source needs

| Source | Status target | What to do on your machine |
|---|---|---|
| **CEA** (`cea/`) | LIVE | Just runs — cea.nic.in is reachable from your IP (it's blocked from the build server). If the monthly report URL has rotated, paste the current Broad-Status / Executive-Summary PDF URL into `cea/__init__.py` → `REPORT_URLS`. |
| **eCourts** (`ecourts/`) | already LIVE via Indian Kanoon | Judgment corpus needs nothing. For **authoritative live status**, add CNR numbers of the KPCL matters to `ecourts/CNRS` — CNR lookup avoids the captcha. |
| **KERC** (`kerc/`) | LIVE | Runs the headless browser to list orders, downloads the KPCL generation tariff PDF, OCRs it (scanned), extracts approved heat-rate/aux/RoE/O&M + ₹/unit. Needs Tesseract + poppler (step 1). |
| **e-Proc** (`eproc/`) | LIVE | Headless browser walks the KPCL tender/award listing. If the portal markup shifts, adjust the selectors noted in `eproc/__init__.py`. |
| **Parivesh** (`parivesh/`) | LIVE (all proposals) | Paste the JSON API request you captured (F12 → Network) into `parivesh/API` — then it pulls every KPCL proposal, not just the curated Sharavathi record. |
| **KPCL Annual Report** | LIVE | Drop the PDF(s) you downloaded into `scrapers/.manual/` — the `annualreport` step OCRs/parses them. |
| **CWC / reservoirs** (`cwc/`) | LIVE | Runs from your IP; extend `RESERVOIRS` with the full India-WRIS series if you want history. |

Already LIVE from anywhere (no action): **CAG**, **coal prices**, **freight**, **norms**.

---

## 4. Commit & deploy (the whole point)

PowerShell — one command per line (no `&&`):
```powershell
git add data\ scrapers\
git commit -m "data: refresh public snapshots"
git push origin main          # Vercel auto-deploys in ~1 min
```

The `/data` screen and every provenance chip update automatically from the new
manifest. Verify live at `https://kpcl.vercel.app/data`.

---

## 5. Refresh-before-demo checklist
1. `python scrapers/run_all.py` (night before — never live during a demo).
2. Confirm the manifest shows **LIVE** for Parivesh + eCourts + CEA + KERC.
3. Spot-check `/projects/clearances` (Sharavathi), `/legal` (litigation corpus),
   `/regulatory` (KERC norms).
4. `git add data && git commit && git push` → confirm the Vercel deploy is Ready.

---

## 6. Troubleshooting
- **A source shows STALE:** it was unreachable this run; the last good snapshot is
  intact. Re-run `--only <source> --no-cache`.
- **Indian Kanoon returns 0:** clear `scrapers/.cache/text_*.bin` (a stale block
  page got cached) and re-run.
- **OCR empty:** Tesseract/poppler not on PATH — re-check step 1.
- **Playwright timeout:** the gov portal was slow; re-run (the polite delay +
  retry usually clears it).
- **Everything PENDING:** you're on a datacenter/VPN IP — switch to a normal
  connection; CEA/eCourts block datacenter ranges.
