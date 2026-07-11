// Regulatory & audit world: 3 KERC filing cycles per thermal station,
// 214 audit paras across 46 inspection reports, close-the-books tasks,
// data feeds. STORY injections (§4, set 7) flagged inline.

import { chance, pick, randFloat, randInt, stream } from "@/lib/rng";
import type { AuditPara, CloseTask, DataFeed, InspectionReport, TariffYear, ThermalPlant } from "@/lib/types";
import { AS_OF } from "./context";

function addDays(base: string, days: number): string {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── KERC filing cycles [G1] ─────────────────────────────────── */
// STORY: the DRAFT year's prudence flags sum to ≈ ₹41 cr:
//   RTPS heat-rate 13.40 + RTPS aux 5.36 + BTPS O&M 8.54 + BTPS capex-cert 7.20
//   + YTPS capex overrun 6.50 = 41.00.

export function genTariffYears(): TariffYear[] {
  const y = Number(AS_OF.slice(0, 4));
  const fy = (offset: number) => `FY${String(y + offset).slice(2)}`;
  const out: TariffYear[] = [];

  const base: Record<ThermalPlant, { roe: number; interest: number; dep: number; om: number; fuel: number; gen: number; hr: number; aux: number; capex: number }> = {
    RTPS: { roe: 210, interest: 160, dep: 240, om: 310, fuel: 2680, gen: 9200, hr: 2400, aux: 8.5, capex: 120 },
    BTPS: { roe: 190, interest: 210, dep: 260, om: 290, fuel: 2410, gen: 8300, hr: 2330, aux: 6.0, capex: 90 },
    YTPS: { roe: 230, interest: 340, dep: 300, om: 280, fuel: 2530, gen: 8600, hr: 2280, aux: 5.8, capex: 60 },
  };

  for (const station of ["RTPS", "BTPS", "YTPS"] as ThermalPlant[]) {
    const b = base[station];
    const rng = stream(`tariff-${station}`);
    // Two settled cycles with modest, unexciting variances…
    for (let k = 2; k >= 1; k--) {
      const scale = 1 - k * 0.04;
      const approved = {
        roe: b.roe * scale, interest: b.interest * scale, depreciation: b.dep * scale,
        om: b.om * scale, fuelCost: b.fuel * scale, genMU: b.gen * scale,
        heatRate: b.hr + k * 5, auxPct: b.aux, capexAdditions: b.capex * scale, capexCertified: true,
      };
      out.push({
        fy: fy(-k),
        station,
        status: k === 2 ? "TRUED_UP" : "FILED",
        approved,
        actual: {
          ...approved,
          om: approved.om * (1 + randFloat(rng, 0.01, 0.045)),
          fuelCost: approved.fuelCost * (1 + randFloat(rng, -0.03, 0.04)),
          genMU: approved.genMU * (1 + randFloat(rng, -0.04, 0.02)),
          heatRate: approved.heatRate + randFloat(rng, -8, 8),
          capexCertified: true,
        },
      });
    }
    // …and the DRAFT year carrying the crafted prudence exposure.
    const approved = {
      roe: b.roe, interest: b.interest, depreciation: b.dep, om: b.om,
      fuelCost: b.fuel, genMU: b.gen, heatRate: b.hr, auxPct: b.aux,
      capexAdditions: b.capex, capexCertified: true,
    };
    const actual = { ...approved };
    if (station === "RTPS") {
      actual.heatRate = b.hr * 1.005; // +0.5% → ₹13.40 cr on ₹2,680 cr fuel
      actual.auxPct = b.aux + 0.2; // +0.2 pp → ₹5.36 cr
      actual.om = b.om * 1.05; // inside the 5.72% escalation norm — no flag
    } else if (station === "BTPS") {
      actual.om = b.om * 1.0572 + 8.54; // ₹8.54 cr beyond the norm
      actual.capexAdditions = 45;
      actual.capexCertified = false; // ₹45 cr × 0.16 = ₹7.20 cr
      actual.heatRate = b.hr - 4; // below norm — no flag
    } else {
      actual.capexAdditions = 66.5; // vs 60 approved → ₹6.50 cr overrun flag
      actual.heatRate = b.hr - 2;
    }
    out.push({ fy: fy(0), station, status: "DRAFT", approved, actual });
  }
  return out;
}

/* ── Audit paras [G2] ────────────────────────────────────────── */
// STORY: 31 paras past the 4-month COPU clock.

const PARA_TITLES = [
  "Avoidable expenditure on idle freight due to under-loading of wagons",
  "Non-levy of liquidated damages despite delivery default",
  "Excess payment against un-verified physical progress",
  "Loss due to acceptance of coal with slipped grade without debit note",
  "Blocking of funds in dead inventory of DG-set spares",
  "Demurrage charges paid to Railways due to tippler outage",
  "Short-recovery of EPF from labour contractor bills",
  "Delay in encashment of expired bank guarantee",
  "Un-reconciled difference between book and physical coal stock",
  "Infructuous expenditure on re-tendered works",
  "Non-claim of FSA short-supply penalty from coal company",
  "Heat-rate deterioration leading to excess fuel consumption",
  "Irregular capitalization without commissioning certificate",
  "Delay in filing truing-up petition — carrying cost burden",
  "Outstanding energy dues — delayed realization",
  "Avoidable payment of electricity duty on auxiliary consumption",
];
const OWNERS = ["CE (Thermal)", "CE (Projects)", "GM (Fuel)", "GM (Finance)", "SE (CHP)", "SE (O&M)", "CFO", "Company Secretary", "GM (HR)"];
const CATEGORIES = ["Fuel", "Contracts", "Projects", "Finance", "HR", "Stores", "Operations"];

export function genAuditParas(): { paras: AuditPara[]; irs: InspectionReport[] } {
  const rng = stream("audit");
  const stations: (ThermalPlant | "CORP" | "HYDRO")[] = ["RTPS", "BTPS", "YTPS", "CORP", "HYDRO"];
  const irs: InspectionReport[] = [];
  const paras: AuditPara[] = [];
  const y = Number(AS_OF.slice(0, 4));

  let paraSeq = 1;
  for (let i = 1; i <= 46; i++) {
    const station = pick(rng, stations);
    const year = y - randInt(rng, 0, 3);
    const received = addDays(AS_OF, -randInt(rng, 20, 900));
    irs.push({
      id: `IR-${year}-${String(i).padStart(2, "0")}`,
      year,
      station: station as InspectionReport["station"],
      title: `Inspection Report — ${station} (${year})`,
      receivedDate: received,
    });
  }

  // STORY: exactly 31 overdue paras — older than 4 months and still open.
  const overdueTarget = 31;
  let overdueMade = 0;
  while (paras.length < 214) {
    const ir = pick(rng, irs);
    const makeOverdue = overdueMade < overdueTarget;
    const receivedDate = makeOverdue
      ? addDays(AS_OF, -randInt(rng, 130, 700)) // > 4 months ago
      : addDays(AS_OF, -randInt(rng, 10, 115)); // inside the clock
    const status: AuditPara["status"] = makeOverdue
      ? (chance(rng, 0.6) ? "OPEN" : "ATN_DRAFT")
      : chance(rng, 0.45)
        ? "REPLIED"
        : chance(rng, 0.4)
          ? "SETTLED"
          : chance(rng, 0.5)
            ? "ATN_DRAFT"
            : "OPEN";
    if (makeOverdue) overdueMade++;
    paras.push({
      id: `${paraSeq}/${ir.year}`,
      irId: ir.id,
      year: ir.year,
      station: ir.station as AuditPara["station"],
      title: pick(rng, PARA_TITLES),
      category: pick(rng, CATEGORIES),
      valueCr: Math.round(randFloat(rng, 0.04, 18) * 100) / 100,
      owner: pick(rng, OWNERS),
      receivedDate,
      status,
    });
    paraSeq++;
  }
  return { paras, irs };
}

/* ── Close the books [G3] ────────────────────────────────────── */

export function genCloseTasks(): CloseTask[] {
  const entities = ["KPCL (standalone)", "KPC Gas Power JV (mock)", "Raichur Power JV (mock)"];
  const tasks = [
    "Bank reconciliation — all collection accounts",
    "Fuel cost accrual vs weighbridge ledger",
    "Capital WIP transfer to fixed assets",
    "Inter-company balances confirmation",
    "Provision for wage revision arrears",
    "Depreciation run & componentization check",
    "GST input credit reconciliation",
    "Inventory NRV assessment (incl. dead stock)",
    "Contingent liability schedule from legal register",
    "Ind-AS 115 unbilled revenue assessment",
  ];
  const rng = stream("close");
  const out: CloseTask[] = [];
  for (const entity of entities) {
    for (const task of tasks) {
      const r = rng();
      out.push({
        entity,
        task,
        status: r < 0.55 ? "DONE" : r < 0.85 ? "IN_PROGRESS" : "BLOCKED",
        owner: pick(rng, ["DGM (Accounts)", "AGM (Books)", "Sr AO", "Costing cell"]),
        note:
          r >= 0.85
            ? pick(rng, [
                "Awaiting sub-ledger from station",
                "JV auditor's confirmation pending",
                "Legal register extract awaited",
                "Physical verification report pending",
              ])
            : "",
      });
    }
  }
  return out;
}

/* ── Data feeds [A11, C7, E3] ────────────────────────────────── */

export function genDataFeeds(): DataFeed[] {
  const rng = stream("feeds");
  const feeds: [string, string, number, DataFeed["health"], string][] = [
    ["Parivesh clearance feed", "Public — MoEFCC portal scrape", 412, "OK", "EC/FC/wildlife stages per project; drives the clearance-gate tracker"],
    ["eCourts / HC / APTEL sync", "Public — case-status APIs", 1462, "OK", "Auto-updates every listed matter; last sync completed in full"],
    ["CEA monthly generation reports", "Public — CEA CDM", 216, "OK", "Unit-wise generation & outage cross-check"],
    ["e-Procurement tender feed", "Public — KPPP portal", 388, "OK", "Award/re-tender detection input"],
    ["UTTAM coal sampling", "Counterparty — CIL portal", 3178, "DEGRADED", "As-billed GCV per rake; 4.2% of rakes missing declarations this month"],
    ["Weighbridge capture (RTPS/BTPS/YTPS)", "Internal — station OPC relay", 3181, "OK", "As-received tonnage & sample GCV per rake"],
    ["Railway RR / demurrage advice", "Counterparty — SWR division office", 3164, "STALE", "Manual PDF advices; 11 days behind"],
    ["ERP extracts (FICO/MM)", "Internal — nightly batch", 88412, "OK", "RA bills, POs, stores issues, payroll summary"],
    ["DCS historian relay", "Internal — plant network", 512640, "DEGRADED", "RTPS U-5 heat-rate tags intermittent since tippler outage"],
    ["CLMS biometric attendance", "Internal — gate controllers", 96110, "OK", "Contract-labour manshifts by contractor"],
  ];
  return feeds.map(([name, kind, records, health, note], i) => ({
    id: `FEED-${String(i + 1).padStart(2, "0")}`,
    name,
    kind,
    lastSync: addDays(AS_OF, health === "STALE" ? -11 : 0) + (health === "STALE" ? "" : `T0${randInt(rng, 1, 6)}:1${randInt(rng, 0, 5)}:00`),
    records,
    health,
    note,
  }));
}
