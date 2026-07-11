// Sentinel world generator. `npm run generate-data` writes /data/*.json and
// public/search-index.json. Deterministic: fixed seed → identical numbers.

import * as fs from "node:fs";
import * as path from "node:path";
import { WORLD_SEED } from "@/lib/rng";
import type { CoalClaim, SearchEntity } from "@/lib/types";
import { analyzeFsa, analyzeRake } from "@/lib/engines/coal";
import { AS_OF, COLLIERIES, MONTHS } from "./gen/context";
import { genFsas, genRakes, genStockpiles } from "./gen/coal";
import { genProjects } from "./gen/projects";
import { genBgs, genContracts, genSpares, genVendors } from "./gen/contracts";
import { genEmissions, genIncidents, genOutages, genReservoirs, genSolar, genUnits } from "./gen/plants";
import { genDrives, genEmployees, genLabourContractors, genSanctions, genSkillAreas } from "./gen/workforce";
import { genLegalMatters } from "./gen/legal";
import { genAuditParas, genCloseTasks, genDataFeeds, genTariffYears } from "./gen/regulatory";

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_DIR = path.join(process.cwd(), "public");

function write(name: string, value: unknown) {
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(value), "utf8");
  const size = fs.statSync(path.join(DATA_DIR, name)).size;
  console.log(`  data/${name}  ${(size / 1024).toFixed(0)} KB`);
}

console.log("Sentinel world generator — seed", WORLD_SEED.toString(16));
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

/* ── Generate ────────────────────────────────────────────────── */

const rakes = genRakes();
const fsas = genFsas(rakes);
const stockpiles = genStockpiles();
const projects = genProjects();
const vendors = genVendors();
const contracts = genContracts(vendors);
const bgs = genBgs(contracts);
const spares = genSpares();
const units = genUnits();
const outages = genOutages();
const emissions = genEmissions(units);
const reservoirs = genReservoirs();
const solar = genSolar();
const incidents = genIncidents();
const employees = genEmployees();
const labourContractors = genLabourContractors();
const drives = genDrives();
const sanctions = genSanctions();
const skillAreas = genSkillAreas();
const legalMatters = genLegalMatters();
const tariffYears = genTariffYears();
const { paras: auditParas, irs: inspectionReports } = genAuditParas();
const closeTasks = genCloseTasks();
const dataFeeds = genDataFeeds();

/* ── Coal claims (derived through the engine, then persisted) ── */

const claims: CoalClaim[] = [];
const statusCycle: CoalClaim["status"][] = ["RECOVERED", "ACKNOWLEDGED", "ISSUED", "ISSUED", "DRAFT", "DRAFT"];
let ci = 1;
for (const r of rakes) {
  const f = analyzeRake(r);
  if (f.overbillingValue >= 8e5) {
    claims.push({
      id: `CLM-${String(ci).padStart(4, "0")}`,
      kind: "GRADE_SLIPPAGE",
      source: r.source,
      plant: r.plant,
      month: r.month,
      rakeId: r.id,
      amount: Math.round(f.overbillingValue),
      basis: `Billed ${r.billedGrade} (${r.billedGCV} kcal/kg) vs received ${r.receivedGCV} kcal/kg — debit note for grade differential on ${Math.round(r.receivedTonnes)} t`,
      status: statusCycle[ci % statusCycle.length],
      draftedOn: r.date,
    });
    ci++;
  }
}
// Transit-shortage claims: per source-month where the excess loss is material.
for (const source of COLLIERIES.map((c) => c.id)) {
  for (const month of MONTHS) {
    const rs = rakes.filter((r) => r.source === source && r.month === month);
    if (rs.length === 0) continue;
    const excess = rs.reduce((s, r) => s + analyzeRake(r).excessLossValue, 0);
    if (excess >= 25e5) {
      claims.push({
        id: `CLM-${String(ci).padStart(4, "0")}`,
        kind: "TRANSIT_SHORTAGE",
        source,
        plant: rs[0].plant,
        month,
        rakeId: null,
        amount: Math.round(excess),
        basis: `Transit loss beyond the 1.5% rail norm across ${rs.length} rakes in ${month}`,
        status: statusCycle[ci % statusCycle.length],
        draftedOn: `${month}-28`,
      });
      ci++;
    }
  }
}
// FSA short-supply claims [C8].
for (const fsa of fsas) {
  const f = analyzeFsa(fsa);
  if (f.claimValue > 0) {
    claims.push({
      id: `CLM-${String(ci).padStart(4, "0")}`,
      kind: "FSA_SHORT_SUPPLY",
      source: fsa.source,
      plant: fsa.plant,
      month: MONTHS[MONTHS.length - 1],
      rakeId: null,
      amount: Math.round(f.claimValue),
      basis: `Lifting at ${f.liftedPct.toFixed(1)}% of pro-rated ACQ — slab penalty ${f.penaltyPct}% on ${Math.round(f.shortfallT).toLocaleString("en-IN")} t shortfall`,
      status: "DRAFT",
      draftedOn: AS_OF,
    });
    ci++;
  }
}

/* ── Write ───────────────────────────────────────────────────── */

const meta = { generatedAt: AS_OF, months: MONTHS, seed: WORLD_SEED, appName: "Sentinel" };

write("meta.json", meta);
write("collieries.json", COLLIERIES);
write("rakes.json", rakes);
write("fsas.json", fsas);
write("stockpiles.json", stockpiles);
write("claims.json", claims);
write("projects.json", projects);
write("vendors.json", vendors);
write("contracts.json", contracts);
write("bgs.json", bgs);
write("spares.json", spares);
write("units.json", units);
write("outages.json", outages);
write("emissions.json", emissions);
write("reservoirs.json", reservoirs);
write("solar.json", solar);
write("incidents.json", incidents);
write("employees.json", employees);
write("labour-contractors.json", labourContractors);
write("drives.json", drives);
write("sanctions.json", sanctions);
write("skill-areas.json", skillAreas);
write("legal-matters.json", legalMatters);
write("tariff-years.json", tariffYears);
write("audit-paras.json", auditParas);
write("inspection-reports.json", inspectionReports);
write("close-tasks.json", closeTasks);
write("data-feeds.json", dataFeeds);

/* ── Search index (client-side global search) ────────────────── */

const entities: SearchEntity[] = [
  ...projects.map((p) => ({ id: p.id, name: p.name, kind: "Project", href: `/projects/${p.id}` })),
  ...contracts.map((c) => ({ id: c.id, name: `${c.id} — ${c.title}`, kind: "Contract", href: `/contracts/${c.id}` })),
  ...legalMatters.map((m) => ({ id: m.id, name: `${m.id} — ${m.title}`, kind: "Case", href: `/legal/${m.id}` })),
  ...vendors.slice(0, 200).map((v) => ({ id: v.id, name: v.name, kind: "Vendor", href: `/contracts/vendors?focus=${v.id}` })),
  ...COLLIERIES.map((c) => ({ id: c.id, name: c.name, kind: "Coal source", href: `/coal/sources` })),
  ...units.map((u) => ({ id: u.id, name: `${u.id} (${u.capacityMW} MW)`, kind: "Unit", href: `/plants/${u.id}` })),
];
fs.writeFileSync(
  path.join(PUBLIC_DIR, "search-index.json"),
  JSON.stringify({ months: MONTHS, entities }),
  "utf8",
);
console.log(`  public/search-index.json  (${entities.length} entities)`);

/* ── Headline sanity print (tune §8: ₹55–90 cr) ──────────────── */

const findings = rakes.map((r) => analyzeRake(r));
const sum = (f: (x: ReturnType<typeof analyzeRake>) => number) =>
  findings.reduce((s, x) => s + f(x), 0) / 1e7;
console.log("\nHeadline sanity:");
console.log(`  rakes: ${rakes.length}, claims: ${claims.length}`);
console.log(`  coal leakage (6 mo): ₹${sum((f) => f.totalLeakage).toFixed(1)} cr`);
console.log(`    overbilling      ₹${sum((f) => f.overbillingValue).toFixed(1)} cr`);
console.log(`    excess transit   ₹${sum((f) => f.excessLossValue).toFixed(1)} cr`);
console.log(`    efficiency loss  ₹${sum((f) => f.efficiencyLossValue).toFixed(1)} cr`);
console.log(`    demurrage        ₹${sum((f) => f.demurrageValue).toFixed(1)} cr`);
console.log(`    idle freight     ₹${sum((f) => f.idleFreightValue).toFixed(1)} cr`);
console.log(`  done — world generated for ${MONTHS[0]} … ${MONTHS[5]} as of ${AS_OF}`);
