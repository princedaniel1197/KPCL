# Sentinel — Assumptions Log

Where the build spec left a detail open, the most credible choice for a
power-sector officer was made and logged here.

## World & data
- **Window**: six months ending last month, computed at generation time. The RNG is fixed-seed, so amounts and story numbers are identical on every build; only month labels move if regenerated in a later month.
- **Rake count** lands at ~3,080 (spec said ~3,200) — tuned down so the MD headline stays inside the ₹55–90 cr band (it lands ≈₹84.5 cr = coal 35.4 + LD 8.1 + prudence 41).
- **Fleet**: 9 representative units (RTPS U1/U2/U5/U8, BTPS U1–U3, YTPS U1/U2). RTPS-U1 is down for R&M all window (PLF ≈ 0, labelled "under R&M").
- **Grade bands** follow the G6–G14 spec (300 kcal steps); billed GCV is placed in the upper-mid band so a norm transit drop (≤120 kcal) never crosses a grade floor — grade slips are a signature, not noise.
- **Wagon fleet**: BOXN-class, 66 t rated, 56–59 wagons/rake.
- **FSA slabs**: <90% → 5%, <85% → 10%, <80% → 20% of shortfall value — simplified from real FSA incentive/penalty tables.
- **LD clause**: 0.5% of contract value per week of delay, capped at 5% (10% for the PSP EPC) — a common PSU works-contract pattern.
- **COPU clock**: 4 months from IR receipt to first ATN, per the spec.
- **Prudence proxies**: uncertified capitalization carries a 16% carrying-cost/RoE/depreciation proxy; O&M escalation norm 5.72%.
- **Heat-rate ₹**: `landedFuelCostPerKg` is expressed as ₹ per 1,000 kcal delivered (folds GCV into the rate), so month fuel cost = gen × heat rate × rate ÷ 1,000.
- **Minimum wage** ₹421/day is a synthetic zonal figure; EPF statutory rate 12% of basic; basic ≈ 62% of daily wage.
- **Retirement age** 60; SPOF = sole incumbent retiring ≤24 months with no successor.
- **Employee names** are generated from Kannada/Indian name pools; any resemblance to real persons is coincidental.
- Real names used only as public anchors (plant names, reservoir names, banks, real-world norms). Every counterparty that carries fault — collieries, contractors, vendors, labour contractors, law firms, employees — is fictional.

## Product behaviour
- **Global scope**: plant + period travel as URL query params (so server pages filter); language travels as a cookie (so titles render server-side). Cumulative registers (contracts, projects, paras) apply plant scope and note that period scope is not meaningful for them.
- **Settings page** edits norms client-side (localStorage) and demonstrates live recomputation on worked examples; module pages compute on default norms — stated honestly on the page.
- **Assistant**: with `ANTHROPIC_API_KEY` set it calls the Claude API with the precomputed aggregate JSON as system context; without it, a deterministic offline mode answers ~18 intents from the same aggregates and says it is offline. Neither mode can invent figures.
- **Blending optimizer** availability = each source's scoped receipts ÷ 3 — a stand-in for stock-at-hand.
- **Claims register** is generated once (deterministically) from the engine findings so statuses are stable across pages.
- **D6 (tender-discovery AI) intentionally not built**; B6 hydro and B7 solar are deliberately light, advisory-tagged surfaces — per the catalogue's anti-build note.
- The graph page renders ~150–200 highest-degree entities (vendors appearing in projects or ≥₹15 cr contracts) to keep the canvas readable.
