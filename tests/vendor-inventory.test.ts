import { describe, expect, it } from "vitest";
import { gradeFor, scoreVendor } from "@/lib/engines/vendor";
import { analyzeSpare, inventorySummary } from "@/lib/engines/inventory";
import type { Spare, Vendor } from "@/lib/types";

describe("vendor.scoreVendor [D3]", () => {
  it("Deccan EPC reference: 40%×50 + 25%×88 + 20%×50 + 15%×66.7 = 62 → D", () => {
    const v: Vendor = {
      id: "V-1", name: "Deccan EPC Ltd", category: "EPC", city: "Bengaluru",
      onTimePct: 50, rejectionRatePct: 12, ldIncidents: 3, contractsCount: 6,
      disputeCount: 2, registeredSince: 2011,
    };
    const s = scoreVendor(v);
    expect(s.components.onTime).toBeCloseTo(20, 6);
    expect(s.components.rejection).toBeCloseTo(22, 6);
    expect(s.components.ld).toBeCloseTo(10, 6); // (1 − 3/6) × 100 × 0.2
    expect(s.components.dispute).toBeCloseTo(10, 6); // (1 − 2/6) × 100 × 0.15
    expect(s.score).toBeCloseTo(62, 6);
    expect(s.grade).toBe("D");
  });
  it("clean vendor grades A", () => {
    const s = scoreVendor({
      id: "V-2", name: "Clean Co", category: "O&M Services", city: "Mysuru",
      onTimePct: 95, rejectionRatePct: 1, ldIncidents: 0, contractsCount: 8,
      disputeCount: 0, registeredSince: 2010,
    });
    expect(s.score).toBeCloseTo(0.4 * 95 + 0.25 * 99 + 20 + 15, 6); // 97.75
    expect(s.grade).toBe("A");
  });
  it("grade boundaries", () => {
    expect(gradeFor(85)).toBe("A");
    expect(gradeFor(84.9)).toBe("B");
    expect(gradeFor(65)).toBe("C");
    expect(gradeFor(55)).toBe("D");
    expect(gradeFor(54.9)).toBe("E");
  });
});

describe("inventory.analyzeSpare [D2]", () => {
  const base: Spare = {
    sku: "SKU-1", description: "Mill — Bearing DE", plant: "RTPS", ved: "V",
    unitCost: 100000, onHand: 20, leadTimeMonths: 4,
    monthlyIssues: [6, 6, 6, 6, 6, 6], monthsSinceLastIssue: 0,
  };
  it("forecast = 6-month moving average", () => {
    expect(analyzeSpare(base).forecastPerMonth).toBe(6);
  });
  it("V-class stockout when on-hand < forecast × lead time (20 < 24)", () => {
    expect(analyzeSpare(base).stockoutRisk).toBe(true);
    expect(analyzeSpare({ ...base, onHand: 30 }).stockoutRisk).toBe(false);
    expect(analyzeSpare({ ...base, ved: "D" }).stockoutRisk).toBe(false);
  });
  it("emergency premium = 30% of the shortfall buy", () => {
    // shortfall = 24 − 20 = 4 × ₹1,00,000 × 0.3 = ₹1,20,000
    expect(analyzeSpare(base).emergencyPremiumEst).toBeCloseTo(120000, 2);
  });
  it("dead stock at ≥24 months without an issue, valued at cost", () => {
    const dead = analyzeSpare({ ...base, ved: "D", monthlyIssues: [0, 0, 0, 0, 0, 0], monthsSinceLastIssue: 30 });
    expect(dead.dead).toBe(true);
    expect(dead.deadValue).toBe(20 * 100000);
    expect(analyzeSpare({ ...base, monthsSinceLastIssue: 12 }).dead).toBe(false);
  });
  it("summary totals count stockouts and dead value", () => {
    const s = inventorySummary([
      base,
      { ...base, sku: "SKU-2", ved: "D", monthlyIssues: [0, 0, 0, 0, 0, 0], monthsSinceLastIssue: 40, onHand: 10 },
    ]);
    expect(s.stockoutCount).toBe(1);
    expect(s.deadCount).toBe(1);
    expect(s.deadValue).toBe(10 * 100000);
  });
});
