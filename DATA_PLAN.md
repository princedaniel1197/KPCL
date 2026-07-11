# Sentinel — Data Acquisition Plan (all KPCL public data)

Goal: back every module with real public data, honestly provenance-tagged, with
the fewest manual steps. Four owners:

- 🤖 **ME (remote)** — reachable from the build environment; I scrape now.
- 🖥️ **LOCAL** — blocked from datacenter IPs or bulk; you run the suite on your machine (unattended).
- ✋ **MANUAL** — one-shot browser actions by you (≈20 min total) that unlock a whole source.
- 🏢 **KPCL** — data KPCL legitimately owns the access to; ask them.

Provenance stays enforced: REAL (public record) / CALIBRATED (real parameter → synthetic) /
SYNTHETIC (fault-implying, fictional). No auth, no captcha, no paywalled content in the automated suite.

---

## ✅ REAL DATA NOW LIVE (kpcl.vercel.app) — current state

| Module | Real data live | Source |
|---|---|---|
| **Plants** | 15 stations real generation (RTPS 8,310 MU, BTPS 8,182 MU, Sharavathy 4,968 MU…) + 5 thermal units PLF/aux/PAF/specific-coal | KPCL Annual Report 2024-25 (PDF → parsed) |
| **Overview** | Real audited financials: total income ₹14,510 cr, operating profit ₹4,882 cr, PBT ₹928 cr (−38% YoY) | KPCL Annual Report P&L |
| **Legal** | 105 real reported court cases (SC/HC/district, 1993–2026, judgment links) | Indian Kanoon |
| **Clearances** | Real Sharavathi proposal `IA/KA/RIV/447282/2023`, ToR Granted, 21/10/2023 + gate timeline | Parivesh export + reporting |
| **Regulatory** | 3 CAG findings (₹12,916 cr / ₹2,518 cr / ₹1,563 cr) verified in source PDF | cag.gov.in (live fetch) |
| **Hydro/Coal** | reservoir levels + CIL grades / freight / demurrage / norms | CWC + calibration |

**The pipeline that works best: you drop a PDF/export into `scrapers/.manual/`, I parse it.** Guardrail-safe,
no portal-scraping fragility. The KPCL Annual Report (one PDF) was the single biggest lever — it took Plants +
Finance from mostly-synthetic to genuinely real.

**Still highest-value next:** more from the same Annual Report (coal consumption, manpower, per-station ₹/unit);
KERC tariff norms (needs Tesseract OCR — download Tesseract, then local run); the UTTAM ask to KPCL (coal hero).

---

## Phase 0 — Foundation ✅ DONE (deployed)
- Scraper suite (`/scrapers`) + provenance layer + `/data` manifest screen.
- **CAG** live-scraped from cag.gov.in (YTPS ₹12,915.90 cr, procurement ₹2,517.92 cr, RPCL ₹1,562.76 cr — verified in source PDF).
- **Sharavathi PSP** clearance timeline + **HC PIL** + **reservoir levels** (Linganamakki/Supa) — REAL, live on `/projects/clearances`.
- CALIBRATED coal grades / freight / demurrage / CEA-KERC norms.

## Phase 1 — 🤖 ME, remote, now (no input needed from you)
| Source | Powers | Action |
|---|---|---|
| Indian Kanoon | `/legal`, `/legal/intelligence` | Fix UA → pull full KPCL judgment corpus (all forums, dates, parties) |
| coal.gov.in | `/coal` | Notified grade bands + pithead prices → upgrade CALIBRATED→REAL |
| MERIT (meritindia.in) | `/plants` | Per-plant variable cost / merit order for RTPS/BTPS/YTPS |
| CAG (extend) | `/regulatory/audit-paras` | Pull more KPCL reports (heat-rate, LD, ESCerts paras) |
| CERC | `/regulatory` | Central normative heat-rate / aux benchmarks (calibration) |

## Phase 2 — ✋ MANUAL, you, ~20 min (each unlocks a source)
1. **Parivesh API capture** (5 min, highest leverage): parivesh.nic.in → Track Your Proposal → open Sharavathi PSP → F12 Network → copy the JSON request URL + payload → send me. **Unlocks automated scraping of ALL KPCL clearances.**
2. **KPCL Annual Report** (2 min): download latest 1–2 PDFs from kpcl.karnataka.gov.in → drop in `scrapers/.manual/`. Real capacity, unit-wise generation, financials, manpower, project status in one file.
3. **eCourts CNRs** (10 min): note the case numbers for the key KPCL matters (Sharavathi PIL, Emta/coal disputes, major contract cases). CNR lookup avoids the captcha → feeds the local eCourts scraper.

## Phase 3 — 🖥️ LOCAL, your machine (unattended `python scrapers/run_all.py`)
Runs from a residential/office IP → no datacenter blocks; full depth.
| Source | Powers | Needs |
|---|---|---|
| **CEA** | `/plants`, `/coal/stockyard` | Monthly unit-wise PLF/gen + daily coal stock + FGD tracker (blocked here; opens locally) |
| **eCourts** | `/legal` | Live case status by CNR (from Phase 2.3) — authoritative next-hearing/stage |
| **KERC** | `/regulatory`, `/regulatory/costing` | Headless-browser to list orders + **OCR** the scanned tariff PDFs → real heat-rate/aux/RoE/O&M norms + ₹/unit |
| **e-Proc** | `/contracts/spend`, `/projects/retenders` | Headless-browser tender + award listing (all KPCL tenders, re-tender frequency) |
| **Parivesh** | `/projects/clearances` | The captured API (Phase 2.1) → all proposals + live gates |
| **CWC / India-WRIS** | `/plants/hydro` | Full reservoir series (currently 2 points) |
| **KPCL Annual Report** | multiple | OCR the PDFs from Phase 2.2 |

Add-ons for local: `pip install pytesseract playwright` + `playwright install chromium` + Tesseract OCR binary. Runbook in `scrapers/RUNBOOK.md` (Phase 5).

## Phase 4 — 🏢 KPCL (ask; unlocks the internal + auth-owned real data)
| Source | Powers | Why KPCL |
|---|---|---|
| **UTTAM sampling export** | `/coal/ledger` (the C1 hero) | Loading-end GCV — proves the transit gap. KPCL owns the login. **Highest single ask.** |
| Weighbridge + lab GCV, per rake | `/coal/ledger` | Receiving-end truth vs billed — the leakage number |
| RA bills, mobilisation advances | `/projects/[id]` | RA-vs-physical mismatch, frozen-site flags |
| LD register, bank guarantees | `/legal/intelligence`, `/contracts/guarantees` | Real recoverable-LD + BG expiry |
| Spares/inventory (ERP-MM) | `/contracts/inventory` | Dead stock, stockout risk |
| HR (DOB/cadre/station) + CLMS | `/workforce/*` | Retirement wave, SPOF, wage/EPF compliance |

## Phase 5 — Wire + ship (🤖 ME, after each source lands)
- Provenance chips on every page (● Real / ◐ Calibrated / ○ Synthetic).
- `/data` manifest auto-reflects LIVE/STALE per source.
- `scrapers/RUNBOOK.md`: exact local setup + `run_all.py` usage + refresh-before-demo checklist.
- Refresh cadence: run the suite the night before any demo; commit `/data`; deploy.

## Skip
GeM (KPCL procures via e-Proc, not GeM; auth-gated, low ROI).

---

## Sequence (what to actually do)
1. **Now:** I execute Phase 1 (Indian Kanoon + coal prices + MERIT).
2. **You (20 min):** Phase 2 — Parivesh API capture, Annual Report download, eCourts CNRs.
3. **You (unattended):** Phase 3 — run the local suite once set up.
4. **When you meet KPCL:** Phase 4 asks (lead with UTTAM).
5. **I wire + deploy** after each batch lands.
