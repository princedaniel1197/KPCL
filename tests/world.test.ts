// Story invariants: every §4 injection must be discoverable in the generated
// world, and the MD headline must land in the ₹55–90 cr band.
// Requires `npm run generate-data` to have been run (build pipeline does).

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AuditPara, BankGuarantee, Contract, GenUnit, LabourContractor, LegalMatter, Meta, Outage, Project, Rake, Spare, TariffYear, Vendor, Fsa, Employee } from "@/lib/types";
import { analyzeFsa, analyzeRake, sourceLeague } from "@/lib/engines/coal";
import { bgLedger, paraClock } from "@/lib/engines/obligations";
import { recoverableLd } from "@/lib/engines/legal";
import { prudenceCheck } from "@/lib/engines/tariff";
import { financialPct, physicalPct, projectHealth } from "@/lib/engines/execution";
import { inventorySummary } from "@/lib/engines/inventory";
import { scoreVendor } from "@/lib/engines/vendor";
import { unitHeatRateCost } from "@/lib/engines/plant";
import { spofRoles, clmsFlags } from "@/lib/engines/workforce";

function load<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", name), "utf8")) as T;
}

const meta = load<Meta>("meta.json");
const AS_OF = meta.generatedAt;
const rakes = load<Rake[]>("rakes.json");
const contracts = load<Contract[]>("contracts.json");
const matters = load<LegalMatter[]>("legal-matters.json");
const projects = load<Project[]>("projects.json");

describe("world — coal stories", () => {
  it("~3,200 rakes over six months", () => {
    expect(rakes.length).toBeGreaterThan(2800);
    expect(rakes.length).toBeLessThan(3500);
  });
  it("W-3 slips a full grade on ~40% of rakes; league ranks it first", () => {
    const league = sourceLeague(rakes);
    expect(league[0].source).toBe("W-3");
    expect(league[0].slippedRakePct).toBeGreaterThan(30);
    expect(league[0].slippedRakePct).toBeLessThan(55);
  });
  it("exactly 7 egregious >1,000 kcal rakes, all W-3", () => {
    const egregious = rakes.filter((r) => r.billedGCV - r.receivedGCV > 1000);
    expect(egregious).toHaveLength(7);
    expect(egregious.every((r) => r.source === "W-3")).toBe(true);
  });
  it("M-5 route runs ~2.2% transit loss (norm 1.5%)", () => {
    const league = sourceLeague(rakes);
    const m5 = league.find((s) => s.source === "M-5")!;
    expect(m5.transitLossPct).toBeGreaterThan(1.9);
    expect(m5.transitLossPct).toBeLessThan(2.5);
  });
  it("S-7 siding chronically under-loads ~4%", () => {
    const s7 = rakes.filter((r) => r.source === "S-7");
    const avgLoad = s7.reduce((s, r) => s + r.billedTonnes / (r.wagons * r.wagonCapT), 0) / s7.length;
    expect(avgLoad).toBeGreaterThan(0.94);
    expect(avgLoad).toBeLessThan(0.975);
  });
  it("M-2 FSA lifted at ≈78% of pro-rated ACQ", () => {
    const fsas = load<Fsa[]>("fsas.json");
    const m2 = analyzeFsa(fsas.find((f) => f.source === "M-2")!);
    expect(m2.liftedPct).toBeGreaterThan(76.5);
    expect(m2.liftedPct).toBeLessThan(79.5);
  });
  it("~15% of rakes third-party sampled", () => {
    const pct = (rakes.filter((r) => r.thirdPartySampled).length / rakes.length) * 100;
    expect(pct).toBeGreaterThan(12);
    expect(pct).toBeLessThan(18);
  });
  it("tippler-outage demurrage cluster exists at RTPS", () => {
    const clustered = rakes.filter((r) => r.plant === "RTPS" && r.placementHours > 24);
    expect(clustered.length).toBeGreaterThan(30);
    const months = new Set(clustered.map((r) => r.month));
    expect(months.size).toBe(1); // all in the outage month
  });
});

describe("world — projects & contracts stories", () => {
  it("PSP is gate-blocked with advance out and court contradiction [A2/A4/A7]", () => {
    const psp = projects.find((p) => p.id === "PRJ-PSP-01")!;
    const h = projectHealth(psp, AS_OF);
    expect(h.gateBlocked).toBe(true);
    expect(h.scheduleFictional).toBe(true);
    expect(h.advanceVsFrozenFlag).toBe(true);
    expect(h.courtContradiction).toBe(true);
  });
  it("RTPS U-1 R&M: financial ≈62% vs physical ≈48% [A3]", () => {
    const rm = projects.find((p) => p.id === "PRJ-RM-01")!;
    expect(financialPct(rm)).toBeGreaterThan(59);
    expect(financialPct(rm)).toBeLessThan(65);
    expect(physicalPct(rm)).toBeGreaterThan(44);
    expect(physicalPct(rm)).toBeLessThan(52);
    expect(projectHealth(rm, AS_OF).divergenceFlag).toBe(true);
  });
  it("₹8.1 cr LD accrued and un-pursued across exactly two contracts [A5/E2]", () => {
    const rows = recoverableLd(contracts, matters, AS_OF);
    const unclaimed = rows.filter((r) => r.claimStatus === "NO_CLAIM_FILED");
    expect(unclaimed).toHaveLength(2);
    const total = unclaimed.reduce((s, r) => s + r.accrual.accruedValue, 0);
    expect(total).toBeCloseTo(8.1, 1);
  });
  it("118-drawing backlog on the Deccan FGD [A6]", () => {
    expect(projects.find((p) => p.id === "PRJ-FGD-01")!.drawingsPending).toBe(118);
  });
  it("one work re-tendered 4× [A10]", () => {
    expect(projects.filter((p) => p.retenderCount >= 3)).toHaveLength(1);
  });
  it("3 BGs expiring ≤30 days plus one already expired [D5]", () => {
    const bgs = load<BankGuarantee[]>("bgs.json");
    const ledger = bgLedger(bgs, AS_OF);
    const soon = ledger.filter((b) => b.level === "T7" || b.level === "T30");
    expect(soon).toHaveLength(3);
    expect(ledger.filter((b) => b.level === "EXPIRED")).toHaveLength(1);
  });
  it("Malnad Infra grades E yet holds an award ≤60 days old [D3]", () => {
    const vendors = load<Vendor[]>("vendors.json");
    const malnad = vendors.find((v) => v.name === "Malnad Infra Projects")!;
    expect(scoreVendor(malnad).grade).toBe("E");
    const recent = contracts.filter(
      (c) => c.vendorId === malnad.id && (Date.parse(AS_OF) - Date.parse(c.awardDate)) / 86400000 <= 60,
    );
    expect(recent.length).toBeGreaterThan(0);
  });
  it("Deccan EPC: 3 projects, ≥2 slipping, grade D, 1 live dispute [H3]", () => {
    const vendors = load<Vendor[]>("vendors.json");
    const deccan = vendors.find((v) => v.name === "Deccan EPC Ltd")!;
    expect(scoreVendor(deccan).grade).toBe("D");
    const mine = projects.filter((p) => p.contractorId === deccan.id);
    expect(mine).toHaveLength(3);
    const slipping = mine.filter((p) => {
      const h = projectHealth(p, AS_OF);
      return h.divergenceFlag || h.riskScore > 30;
    });
    expect(slipping.length).toBeGreaterThanOrEqual(2);
    const live = matters.filter(
      (m) => m.status === "OPEN" && (m.linkedContractId === "C-EPC-1042" || m.title.includes("Deccan")),
    );
    expect(live).toHaveLength(1);
  });
  it("dead stock ≈ ₹5 cr and exactly 12 stockout-risk criticals [D2]", () => {
    const spares = load<Spare[]>("spares.json");
    const s = inventorySummary(spares);
    expect(s.deadValue / 1e7).toBeGreaterThan(4.5);
    expect(s.deadValue / 1e7).toBeLessThan(6.5);
    expect(s.stockoutCount).toBe(12);
  });
});

describe("world — plants, workforce, regulatory stories", () => {
  it("RTPS-U2 carries the recurring boiler-tube signature [B2]", () => {
    const outages = load<Outage[]>("outages.json");
    const leaks = outages.filter((o) => o.unitId === "RTPS-U2" && o.cause === "Boiler tube leak");
    expect(leaks.length).toBeGreaterThanOrEqual(5);
  });
  it("boiler tube leaks ≈ half of forced-outage hours", () => {
    const outages = load<Outage[]>("outages.json");
    const forced = outages.filter((o) => o.kind === "FORCED");
    const tube = forced.filter((o) => o.cause === "Boiler tube leak");
    const share = tube.reduce((s, o) => s + o.hours, 0) / forced.reduce((s, o) => s + o.hours, 0);
    expect(share).toBeGreaterThan(0.38);
    expect(share).toBeLessThan(0.62);
  });
  it("heat-rate drift ≈ ₹18 cr annualized on two units [B3]", () => {
    const units = load<GenUnit[]>("units.json");
    const drifting = units
      .map((u) => ({ u, cost: unitHeatRateCost(u) }))
      .filter((x) => x.cost.annualizedCr > 4);
    expect(drifting.length).toBe(2);
    const total = drifting.reduce((s, x) => s + x.cost.annualizedCr, 0);
    expect(total).toBeGreaterThan(13);
    expect(total).toBeLessThan(24);
  });
  it("one FGD past its norm deadline [B9]", () => {
    const units = load<GenUnit[]>("units.json");
    const breached = units.filter((u) => u.fgd.status !== "COMMISSIONED" && u.fgd.normDeadline < AS_OF);
    expect(breached.map((u) => u.id)).toEqual(["RTPS-U5"]);
  });
  it("14 SPOF roles [F1]", () => {
    const employees = load<Employee[]>("employees.json");
    expect(spofRoles(employees, AS_OF)).toHaveLength(14);
  });
  it("RTPS technical cadre ≈27% retiring ≤5 years [F1]", () => {
    const employees = load<Employee[]>("employees.json");
    const pool = employees.filter((e) => e.station === "RTPS" && e.cadre === "Technical");
    const retiring = pool.filter((e) => {
      const retire = new Date(e.dob + "T00:00:00Z");
      retire.setUTCFullYear(retire.getUTCFullYear() + 60);
      return (retire.getTime() - Date.parse(AS_OF)) / (86400000 * 365.25) <= 5;
    });
    const pct = (retiring.length / pool.length) * 100;
    expect(pct).toBeGreaterThan(22);
    expect(pct).toBeLessThan(33);
  });
  it("SLV Enterprises short-pays minimum wage with an EPF mismatch [F2]", () => {
    const lcs = load<LabourContractor[]>("labour-contractors.json");
    const slv = lcs.find((c) => c.name === "SLV Enterprises")!;
    const kinds = new Set(clmsFlags(slv).map((f) => f.kind));
    expect(kinds.has("MIN_WAGE")).toBe(true);
    expect(kinds.has("EPF")).toBe(true);
    expect(kinds.has("MANSHIFT_MISMATCH")).toBe(true);
  });
  it("31 audit paras past the 4-month COPU clock [G2]", () => {
    const paras = load<AuditPara[]>("audit-paras.json");
    const overdue = paras.filter((p) => paraClock(p, AS_OF).bucket === "OVERDUE");
    expect(overdue).toHaveLength(31);
  });
  it("prudence simulator flags ≈ ₹41 cr on the draft filing [G1]", () => {
    const years = load<TariffYear[]>("tariff-years.json");
    const draft = years.filter((y) => y.status === "DRAFT");
    const total = draft.flatMap((y) => prudenceCheck(y)).reduce((s, f) => s + f.atRiskCr, 0);
    expect(total).toBeGreaterThan(40.2);
    expect(total).toBeLessThan(41.8);
  });
});

describe("world — MD headline", () => {
  it("₹ at risk lands in the ₹55–90 cr band", () => {
    const coal = rakes.reduce((s, r) => s + analyzeRake(r).totalLeakage, 0) / 1e7;
    const ld = recoverableLd(contracts, matters, AS_OF)
      .filter((r) => r.claimStatus === "NO_CLAIM_FILED")
      .reduce((s, r) => s + r.accrual.accruedValue, 0);
    const years = load<TariffYear[]>("tariff-years.json");
    const prudence = years
      .filter((y) => y.status === "DRAFT")
      .flatMap((y) => prudenceCheck(y))
      .reduce((s, f) => s + f.atRiskCr, 0);
    const headline = coal + ld + prudence;
    expect(headline).toBeGreaterThan(55);
    expect(headline).toBeLessThan(90);
  });
});
