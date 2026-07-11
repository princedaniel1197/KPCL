# Sentinel — Oversight & Intelligence Ledger

A complete demo platform for Indian state power generation companies: one
reconciliation ledger, one obligation register, and one entity graph across
coal, capital projects, contracts, plants, legal, workforce, and regulatory —
implementing all 45 solutions of the Orianode KPCL Master Build Catalogue
(see `/coverage` in the running app for the ID-by-ID map).

**Everything in this app is synthetic demonstration data.** Real names appear
only as public anchors (plant names, reservoirs, banks). Every counterparty
that carries fault — collieries, contractors, vendors, employees, law firms —
is fictional.

## Quick start

```bash
npm install
npm run generate-data   # writes /data/*.json + public/search-index.json (fixed seed — same numbers every time)
npm run dev             # http://localhost:3000
```

`npm run build` regenerates data automatically (`prebuild`), so the repo
deploys clean to Vercel with **zero required environment variables**.

Optional: set `ANTHROPIC_API_KEY` to give the floating assistant a live
Claude backend. Without it the assistant runs in a deterministic offline mode
over the same precomputed aggregates and says so.

```bash
npm test                # 98 vitest cases: every engine formula + world-story invariants
```

## What is rule-based vs generative

All rupee findings on every screen are **rule-based**: pure functions in
`lib/engines/*` (unit-tested against hand-verified numbers) applied to the
generated dataset — grade-band arithmetic, LD accrual clocks, BG expiry
windows, COPU clocks, heat-rate deltas, prudence checks. Two surfaces are
explicitly **concept demonstrations** and are labelled as such in the UI: the
asset-risk index and boiler-tube early-warning (rule-based composites standing
in for ML on plant historians). The assistant is generative **only when an API
key is provided**, and is instructed to answer solely from the precomputed
aggregate JSON; offline mode is fully deterministic. No screen fabricates a
number that does not trace to the dataset.

## Layout

```
scripts/generate.ts     seeded world generator (§4 stories injected + commented)
scripts/gen/*           per-domain generators
lib/engines/*           all computation (pure, unit-tested)
lib/data.ts             typed accessors over /data/*.json
lib/views/*             per-module server aggregation
app/*                   ~45 routes across 9 module groups
components/*            ivory-ledger design system pieces
tests/*                 engine tests + world-story invariants
```

Key documents: `ASSUMPTIONS.md` (every judgment call), `PROGRESS.md` (phase
log), `DEMO_SCRIPT.md` (the 7-minute MD walkthrough).

## Design

Ivory ledger: paper `#F5F1E8`, ink `#2A2418`, gold rules `#C9A84C`,
Cormorant Garamond display over DM Sans, hairline-ruled ledger tables,
tabular numerals, Indian number formatting, EN/ಕನ್ನಡ toggle, print CSS on
every report. No dark mode, no emblems, no fake portals — by design.
