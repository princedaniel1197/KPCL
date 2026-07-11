import { describe, expect, it } from "vitest";
import { caseRisk, hearingClock, recoverableLd } from "@/lib/engines/legal";
import { atnDraft, costBuildUp, prudenceCheck, truingUp } from "@/lib/engines/tariff";
import type { Contract, LegalMatter, TariffYear } from "@/lib/types";

const AS_OF = "2026-07-10";

const matter = (over: Partial<LegalMatter>): LegalMatter => ({
  id: "WP-1", title: "Test", forum: "High Court of Karnataka", matterType: "Writ",
  stage: "Arguments", filed: "2025-06-01", exposureCr: 10, counsel: "Adv X", firm: "Firm Y",
  feePaidLakh: 5, hearings: [], nextHearing: "2026-07-20", linkedProjectId: null,
  linkedContractId: null, claimKind: "OTHER", status: "OPEN", source: "eCourts",
  ...over,
});

describe("legal.caseRisk [E1/E2]", () => {
  it("risk = stage weight + exposure component", () => {
    const r = caseRisk(matter({}));
    // Arguments 0.8 × 45 + min(40, 10×0.8) = 36 + 8 = 44
    expect(r.risk).toBeCloseTo(44, 6);
    expect(r.threatensMilestone).toBe(false);
  });
  it("hearing clock flags ≤14 days", () => {
    expect(hearingClock(matter({}), AS_OF).urgent).toBe(true);
    expect(hearingClock(matter({ nextHearing: "2026-09-01" }), AS_OF).urgent).toBe(false);
    expect(hearingClock(matter({ status: "CLOSED" }), AS_OF).days).toBeNull();
  });
});

const ldContract = (id: string, valueCr: number, dueDaysAgo: number): Contract => ({
  id, title: "t", vendorId: "V-1", plant: "RTPS", category: "EPC", valueCr,
  awardDate: "2025-01-01", endDate: "2027-01-01", ldRatePctPerWeek: 0.5, ldCapPct: 5,
  milestones: [{ id: "M1", name: "m", due: new Date(Date.parse(AS_OF) - dueDaysAgo * 86400000).toISOString().slice(0, 10), completedOn: null, valueCr: 10 }],
  tenderMode: "OPEN", cycleDays: { indentToNit: 30, nitToAward: 60 }, projectId: null, correspondence: [],
});

describe("legal.recoverableLd [E2 × A5]", () => {
  it("splits accruals into claimed vs un-pursued", () => {
    const contracts = [ldContract("C-A", 84, 84), ldContract("C-B", 30, 30)];
    const matters = [matter({ id: "OS-1", linkedContractId: "C-B", claimKind: "LD_RECOVERY", status: "OPEN" })];
    const rows = recoverableLd(contracts, matters, AS_OF);
    const a = rows.find((r) => r.accrual.contractId === "C-A")!;
    const b = rows.find((r) => r.accrual.contractId === "C-B")!;
    expect(a.claimStatus).toBe("NO_CLAIM_FILED");
    expect(a.accrual.accruedValue).toBeCloseTo(4.2, 6);
    expect(b.claimStatus).toBe("CLAIM_OPEN");
    expect(b.matterId).toBe("OS-1");
  });
});

const block = (over: Partial<TariffYear["approved"]>): TariffYear["approved"] => ({
  roe: 100, interest: 50, depreciation: 50, om: 100, fuelCost: 700, genMU: 2000,
  heatRate: 2400, auxPct: 8.5, capexAdditions: 100, capexCertified: true, ...over,
});

describe("tariff.costBuildUp [G4]", () => {
  it("fixed + energy → ₹/kWh", () => {
    const c = costBuildUp(block({}));
    expect(c.fixed.totalFixed).toBe(300);
    expect(c.totalCr).toBe(1000);
    // 1,000 cr over 2,000 MU = ₹5.00/kWh
    expect(c.perUnitTotal).toBeCloseTo(5, 6);
    expect(c.perUnitFixed).toBeCloseTo(1.5, 6);
  });
});

describe("tariff.truingUp [G1]", () => {
  it("variance rows approved vs actual", () => {
    const rows = truingUp({
      fy: "FY25", station: "RTPS", status: "FILED",
      approved: block({}), actual: block({ om: 110, fuelCost: 680 }),
    });
    const om = rows.find((r) => r.item === "O&M expenses")!;
    expect(om.variance).toBe(10);
    expect(om.variancePct).toBeCloseTo(10, 6);
  });
});

describe("tariff.prudenceCheck [G1] — the ₹41 cr draft", () => {
  it("heat rate above norm → fuel delta at risk (RTPS leg: ₹13.40 cr)", () => {
    const flags = prudenceCheck({
      fy: "FY26", station: "RTPS", status: "DRAFT",
      approved: block({ heatRate: 2400, fuelCost: 2680 }),
      actual: block({ heatRate: 2412, fuelCost: 2680 }),
    });
    const hr = flags.find((f) => f.key === "HEAT_RATE")!;
    expect(hr.atRiskCr).toBeCloseTo(2680 * (12 / 2400), 2); // 13.40
  });
  it("aux above norm (RTPS leg: ₹5.36 cr)", () => {
    const flags = prudenceCheck({
      fy: "FY26", station: "RTPS", status: "DRAFT",
      approved: block({ auxPct: 8.5, fuelCost: 2680 }),
      actual: block({ auxPct: 8.7, fuelCost: 2680 }),
    });
    expect(flags.find((f) => f.key === "AUX")!.atRiskCr).toBeCloseTo(2680 * 0.002, 4); // 5.36
  });
  it("O&M beyond 5.72% escalation", () => {
    const flags = prudenceCheck({
      fy: "FY26", station: "BTPS", status: "DRAFT",
      approved: block({ om: 290 }),
      actual: block({ om: 290 * 1.0572 + 8.54 }),
    });
    expect(flags.find((f) => f.key === "OM")!.atRiskCr).toBeCloseTo(8.54, 4);
  });
  it("uncertified capitalization at 16% carrying proxy", () => {
    const flags = prudenceCheck({
      fy: "FY26", station: "BTPS", status: "DRAFT",
      approved: block({}),
      actual: block({ capexAdditions: 45, capexCertified: false }),
    });
    expect(flags.find((f) => f.key === "CAPEX_CERT")!.atRiskCr).toBeCloseTo(7.2, 6);
  });
  it("capex overrun >10% of approval", () => {
    const flags = prudenceCheck({
      fy: "FY26", station: "YTPS", status: "DRAFT",
      approved: block({ capexAdditions: 60 }),
      actual: block({ capexAdditions: 66.5 }),
    });
    expect(flags.find((f) => f.key === "CAPEX_OVERRUN")!.atRiskCr).toBeCloseTo(6.5, 6);
  });
  it("clean draft raises no flags", () => {
    expect(prudenceCheck({ fy: "FY26", station: "RTPS", status: "DRAFT", approved: block({}), actual: block({}) })).toHaveLength(0);
  });
});

describe("tariff.atnDraft [G2]", () => {
  it("produces a PSU-tone ATN referencing the para", () => {
    const text = atnDraft({ id: "14/2025", title: "Non-levy of LD", valueCr: 4.2, station: "RTPS", category: "Contracts" });
    expect(text).toContain("ACTION TAKEN NOTE — Para 14/2025");
    expect(text).toContain("₹4.20 cr");
    expect(text).toContain("recommend the para for settlement");
  });
});
