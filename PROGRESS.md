# Sentinel — Build Progress

Resume point for cross-session builds. Update at every phase boundary.

## Phase status

- [x] P0 — Scaffold, ivory design system, shell, i18n (layout, sidebar, header, folio, UI primitives)
- [x] P1 — World generator (§4) — 3,083 rakes, all story injections verified by tests
- [x] P2 — Engines + tests (§5) — 98 tests passing; headline ₹84.5 cr (coal 35.4 + LD 8.1 + prudence 41)
- [x] P3 — Coal module (9 routes incl. rake detail, debit note, claims letters, reports)
- [x] P4 — Projects (6 routes incl. detail, clearances, rm, retenders, reporting)
- [x] P5 — Contracts (6 routes incl. detail, guarantees, vendors, spend, inventory)
- [x] P6 — Regulatory (KERC filing + prudence simulator, truing-up, audit paras + ATN, close, costing)
- [x] P7 — Legal (matters, case detail, intelligence with recoverable-LD linkage)
- [x] P8 — Workforce (retirement wave, knowledge, contract labour, pipeline, skills)
- [x] P9 — Plants (fleet, unit detail, outages, maintenance, safety, emissions, hydro, solar)
- [x] P10 — MD dashboard, entity graph + dossiers, data feeds, assistant API (Claude + offline modes)
- [x] P11 — Reports / print polish + full runtime verification (all 46 routes 200)
- [x] P12 — README.md, ASSUMPTIONS.md, DEMO_SCRIPT.md, /coverage self-audit, acceptance checklist run

## BUILD COMPLETE — acceptance checklist (§8)

- [x] `npm run generate-data && npm run build` clean (45 static + dynamic routes compile)
- [x] All 46 routes render 200 with live numbers (batched runtime smoke test)
- [x] Every §4 injected story discoverable on its named screen (27 world-invariant tests)
- [x] All §5 formulas unit-tested with hand-verified cases (98 tests, 7 files)
- [x] Print pages render: debit note, project status report, KERC annexure, monthly coal report, claim letters, ATN
- [x] Plant switcher + period selector filter every module (verified: RTPS 1,103 vs ALL 3,083 rakes; month 513)
- [x] EN/ಕನ್ನಡ toggle flips nav/KPIs/titles (cookie-driven, server-rendered)
- [x] Graph dossier joins ≥4 modules for Deccan EPC (projects + contracts + LD + litigation)
- [x] MD headline lands ₹84.5 cr (coal 35.4 + LD 8.1 + prudence 41.0) — inside the ₹55–90 cr band
- [x] Mobile: /, /coal/ledger, /projects wrapped + global narrow-screen table scroll
- [x] Every catalogue ID A1–H3 appears in the UI + /coverage self-audit route (49 IDs, 45 buildable)

## Three bugs found and fixed during integration
1. `PALETTE` moved from the `"use client"` charts module to `lib/palette.ts` — server pages read its
   string values (RSC client-manifest boundary would otherwise 500 the dashboard/coal/project pages).
2. `SimpleBars` highlight changed from a function prop to serializable `highlightIndices: number[]`
   (server components cannot pass functions to client components).
3. Entity-graph `GraphCanvas` — d3-force uses `Math.random()` internally, so the SSR run and the client
   run produced different node coordinates → React hydration mismatch (12 "Prop x1 did not match" warnings).
   Fixed by computing the layout only after mount (SSR now emits 0 nodes/lines — nothing to mismatch) and
   seeding d3's RNG for stable run-to-run layouts. Verified: SSR HTML has 0 `<circle>`/`<line>`.

## Hardening pass (3 parallel code reviewers + design upgrade)

Bugs found by systematic review and FIXED (all verified live in browser):
1. **Scope-dropping links (pervasive)** — drill-down links across ~15 pages lost the global ?plant/?period.
   Fixed centrally with `components/shell/ScopePreserver.tsx` (capture-phase click interceptor that carries
   the active scope onto any internal link that doesn't set its own). Verified: /coal/ledger?plant=RTPS →
   rake link → lands on ?plant=RTPS with the header selector intact.
2. **GraphCanvas pan crash** — null-deref on `dragging.current!` inside a deferred state updater; snapshot
   the ref first. **GraphCanvas zoom stall** — stale-closure `zoom.k`; compute inside the functional updater.
   Verified: drag lands translate(40 20); wheel accumulates; no crash on post-mouseup moves.
3. **SettingsPanel snap-to-zero** — clearing a norm input committed 0 to localStorage instantly; now a string
   draft that only commits finite numbers (both NumField and the grade-price input). Verified live.
4. **Assistant API 400 on long chats** — `.slice(-12)` could start history with an assistant turn; now drops
   leading non-user turns. **Offline intent misrouting** — "should/would/old" matched the "ld" intent; now
   leading-word-boundary matching (verified: "What should I prioritise?" no longer routes to LD).
5. **blend() over-allocation** — enricher headroom never decremented + duplicate mix rows; rewritten to
   track headroom and merge entries (availableT now a hard cap).
6. **randNormal ~29% too tight** — redundant ×0.7071 cancelled the √0.5 scaling; fixed, data regenerated
   (coal leakage 35.4→37.0 cr, headline ≈86.1 cr — still in band; all 98 tests pass unchanged).
7. **paraClock month-overflow** — 31 Oct + 4 months rolled into 3 Mar; now clamps to month-end.
8. **Overview KPI scoping** — MD dashboard mixed plant-scoped coal with corporate-wide LD/BG/para KPIs;
   all three now respect plant scope (BGs via their contract's plant, paras via station).
9. **BandArea chart never drew its line** — AreaChart ignores <Line> children; switched to ComposedChart.
10. **Coverage page** said "45" while listing 49 IDs; count now derived from the data.
11. **CountUp stranding** — rAF throttling in hidden tabs left the hero at ₹0.0; safety timeout + hidden-tab
    guard guarantee the true value.
12. Misleading `landedFuelCostPerKg` comment corrected (it is ₹/1,000 kcal, as consumed).

## UI/UX + transitions upgrade
- Motion system: one easing (`--ease`), three speeds; staggered page-enter (rise-and-settle, keyed by
  pathname so it re-fires per navigation); prefers-reduced-motion + print kill-switches.
- Sticky ledger column headers (page- and container-scoped), animated row hover, gold focus-visible rings,
  gold text selection.
- KPI tiles: tone accent stripe (left edge), hover lift + gold border. TwinBar/InlineBar widths animate.
- Buttons: hover lift + press settle. Panels: shadow/border transitions.
- Header: search icon + animated dropdown; selects hover-gold.
- Assistant: panel pop-in, message slide-in, three-dot typing indicator, animated bubble (✦/✕).
- MD hero: count-up numeral (SSR-safe, reduced-motion aware).
- Route-level loading skeleton (ledger-shaped shimmer) + custom ivory 404 ("No such folio in the ledger").
- Graph: node fade-in on mount.

## Live assistant wired (H1 — online mode)
- `ANTHROPIC_API_KEY` in `.env.local` (server-side only; `.env*.local` gitignored).
- `app/api/assistant/route.ts` upgraded: official `@anthropic-ai/sdk` client, `claude-opus-4-8` with
  adaptive thinking, prompt-cached aggregate context (`cache_control: ephemeral` on the system block),
  `refusal` stop-reason handling, typed error chain (auth / rate-limit / other) — every failure path
  degrades to the offline engine so the demo never dead-ends. Response now carries `mode: live|offline`.
- Verified live: cross-module reasoning (connected the expiring BGs to the same contracts carrying the
  un-pursued LD claims and sequenced the recovery actions) and multi-turn context ("the second item"
  resolved correctly). Offline fallback still intact when the key is absent.

## Browser verification pass (Preview MCP, real Chromium)
- MD dashboard: ₹84.5 cr hero renders in danger ink; no console warnings.
- Entity graph: 364 nodes render post-mount; clicking Deccan EPC shows a dossier joining **5 modules**
  (vendor grade D · 3 slipping projects · 2 contracts ₹202 cr · ₹4.2 cr un-pursued LD · ARB-2025-014 dispute);
  ghosting/focus works; hydration clean after fix.
- Settings live-recompute: changing demurrage rate ₹150→₹300 doubled the worked example ₹44,250→₹88,500.
- Regulatory prudence simulator: 5 flags, RTPS ₹18.76 cr, corporate total ₹41.00 cr, fix hints present.
- Blending lab: slider 3800–5200 recomputes achieved GCV (5,000) + feasibility chip.
- Assistant bubble: opens, answers "which BGs expire this month?" with the exact D5 story (3 + 1 lapsed).
- Kannada toggle, plant scope (RTPS 1,103 vs ALL 3,083), period scope (513) all confirmed live.

## Routes done

/, /graph, /api/assistant, /coal, /coal/ledger, /coal/ledger/[rakeId], /coal/ledger/[rakeId]/debit-note,
/coal/claims, /coal/claims/[claimId], /coal/demurrage, /coal/blending, /coal/stockyard, /coal/sources, /coal/reports,
/projects, /projects/[id], /projects/clearances, /projects/rm, /projects/retenders, /projects/reporting,
/contracts, /contracts/[id], /contracts/guarantees, /contracts/vendors, /contracts/spend, /contracts/inventory

## Known gaps / notes

- Global controls: plant+period via URL query, lang via cookie; data via static JSON imports (Vercel-safe); `prebuild` regenerates data.
- After agents finish: run generate+build+tests, fix cross-module link nits (contracts pages link matters to /legal, prefer /legal/[caseId]), verify /coverage, mobile overflow wrappers on /projects.

## Public-data scraper suite (Spec Option 1) — added & deployed
- `/scrapers` Python suite: `common/` (polite cached HTTP + robots + pdf_text +
  provenance-stamping json_writer), 9 source scrapers, `run_all.py` + manifest,
  `requirements.txt`, `SOURCES.md`, `README.md`.
- THE ONE RULE enforced in code: REAL / CALIBRATED / SYNTHETIC provenance; real
  names never on synthetic fault values. Live REAL feeds (Parivesh, eCourts, eproc,
  CEA, KERC) ship as run-locally scrapers marked PENDING — no gov records fabricated.
- Ships working (offline-safe): CALIBRATED CIL grade bands + prices, railway freight
  + ₹150/wagon-hr demurrage, CEA/KERC norms; REAL cited CAG findings.
- App: `components/ui/ProvenanceChip.tsx`, `lib/manifest.ts`, `/data` rebuilt from
  `data/manifest.json` (the proof screen). Generator writes baseline calibration +
  manifest if missing, so a clean build never breaks; norms.ts stays pure.
- Verified: 98/98 tests, clean prod build, `/data` LIVE on kpcl.vercel.app showing
  10 public sources with provenance chips.

## Real public-data expansion (session 2026-07-11) — deployed
Replaced synthetic figures with REAL public data on four more surfaces. Winning
pattern: government portals block bots / serve scanned PDFs, so we (a) OCR the
scanned ones and (b) fetch the machine-readable mirrors.

- **KERC tariff norms (REAL, /regulatory)** — `scrapers/kerc` OCRs the scanned
  BTPS Unit-3 tariff order (PyMuPDF raster → Tesseract). Extracts ONLY prose-stated
  norms (RoE 15.5%, Gross Station Heat Rate 2166.7 kCal/kWh, order 29.12.2025,
  ref KERC/F-37/Vol-05/1413) — never jumbled scanned tables. `RealKercNorms`.
- **CEA daily generation + unit outages (REAL, /plants)** — CEA blocks direct GETs,
  but the National Power Portal (npp.gov.in) re-publishes CEA's Daily Generation
  Report as .xls. `scrapers/cea_dgr` parses KARNATAKA thermal rows (BTPS/RTPS/YTPS)
  + every unit: today prog vs actual, FY-to-date, coal-stock days, and units under
  forced outage WITH CEA's stated reason (e.g. RTPS U1 down since 15.03.2024 —
  coal feeding system failure). `RealDailyGeneration`.
- **CEA daily coal stock vs normative (REAL, /coal)** — `scrapers/cea_coal` parses
  CEA's Daily Coal Stock Report (Genco=KPCL rows): actual vs normative stock (kT),
  days, receipt vs burn. All three KPCL thermal stations below normative & depleting
  (BTPS 58%, RTPS 50%, YTPS 50% of norm as on 10.07.2026). `RealCoalStock`.
- Manifest now **11 live feeds**. Not achievable from here (recorded honestly):
  CEA direct (network-blocked — used NPP mirror), KERC RTPS/YTPS/hydro orders
  (JS-menu archive — needs manual PDF drop), e-Proc tenders (robots-disallowed),
  UTTAM GCV (access-gated). Monthly CEA generation exists on NPP but only the latest
  month is exposed (no time series) — skipped as low marginal value.
