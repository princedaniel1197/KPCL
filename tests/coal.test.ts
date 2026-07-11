import { describe, expect, it } from "vitest";
import { analyzeFsa, analyzeRake, analyzeStockpile, blend, landedCost, sourceLeague } from "@/lib/engines/coal";
import type { Fsa, Rake, Stockpile } from "@/lib/types";

// Hand-verified reference rake:
//   billed 4,000 t / received 3,900 t → gap 100 t; norm 1.5% = 60 t → excess 40 t
//   G8 pithead ₹2,070 + freight ₹1,000 = landed ₹3,070 → excess value ₹122,800
//   GCV billed 5,100 → received 4,400 (drop 700; beyond 120 norm = 580)
//   received 4,400 = G10 (₹1,700) → overbilling (2070−1700)×3,900 = ₹14,43,000
//   fired 4,200 (drop 200; beyond 85 tolerance = 115) → extra coal 3,900×1.15×0.03
//     = 134.55 t × ₹3,070 = ₹4,13,068.5
//   placement 10 h (4 h beyond free) × 58 wagons × ₹150 = ₹34,800
//   rated 58×66 = 3,828 t < billed 4,000 → underload 0
const rake: Rake = {
  id: "T-1", date: "2026-05-10", month: "2026-05", source: "W-3", plant: "RTPS",
  wagons: 58, wagonCapT: 66, billedTonnes: 4000, receivedTonnes: 3900,
  billedGCV: 5100, receivedGCV: 4400, firedGCV: 4200, billedGrade: "G8",
  freightPerTonne: 1000, placementHours: 10, thirdPartySampled: false, moisturePct: 11,
};

describe("coal.analyzeRake [C1/C2/C5]", () => {
  const f = analyzeRake(rake);
  it("landed cost = pithead + freight", () => {
    expect(landedCost(rake)).toBe(3070);
  });
  it("quantity gap and excess beyond 1.5% norm", () => {
    expect(f.quantityGapT).toBe(100);
    expect(f.excessLossT).toBeCloseTo(40, 6);
    expect(f.excessLossValue).toBeCloseTo(122800, 2);
  });
  it("GCV transit gap beyond 120 kcal norm", () => {
    expect(f.gcvTransitGap).toBe(580);
  });
  it("grade slip → overbilling at the grade price differential", () => {
    expect(f.gradeSlipped).toBe(true);
    expect(f.overbillingValue).toBe((2070 - 1700) * 3900);
  });
  it("unexplained fired gap → 3% extra coal per 100 kcal", () => {
    expect(f.unexplainedFiredGap).toBe(115);
    expect(f.efficiencyLossValue).toBeCloseTo(3900 * 1.15 * 0.03 * 3070, 1);
  });
  it("demurrage beyond 6 h free time at ₹150/wagon-hour", () => {
    expect(f.demurrageHours).toBe(4);
    expect(f.demurrageValue).toBe(4 * 58 * 150);
  });
  it("no idle freight when loaded above rated capacity", () => {
    expect(f.underloadT).toBe(0);
    expect(f.idleFreightValue).toBe(0);
  });
  it("total leakage is the sum of the five legs", () => {
    expect(f.totalLeakage).toBeCloseTo(
      f.excessLossValue + f.overbillingValue + f.efficiencyLossValue + f.demurrageValue + f.idleFreightValue,
      6,
    );
  });
  it("under-loaded rake accrues idle freight", () => {
    const under = analyzeRake({ ...rake, billedTonnes: 3700, receivedTonnes: 3660 });
    expect(under.underloadT).toBe(3828 - 3700);
    expect(under.idleFreightValue).toBe(128 * 1000);
  });
  it("within-norm rake produces zero leakage", () => {
    const clean = analyzeRake({
      ...rake, billedTonnes: 3828, receivedTonnes: 3790, // 0.99% loss
      billedGCV: 5150, receivedGCV: 5070, firedGCV: 5010, placementHours: 5,
    });
    expect(clean.totalLeakage).toBe(0);
  });
});

describe("coal.analyzeFsa [C8]", () => {
  it("78% lifting hits the <80% slab at 20% penalty", () => {
    const fsa: Fsa = {
      id: "F-1", source: "M-2", plant: "YTPS", acqTonnes: 1200000,
      monthlyLifted: Array.from({ length: 6 }, (_, i) => ({ month: `2026-0${i + 1}`, tonnes: 78000 })),
      penaltySlabs: [
        { belowPct: 80, penaltyPctOfValue: 20 },
        { belowPct: 85, penaltyPctOfValue: 10 },
        { belowPct: 90, penaltyPctOfValue: 5 },
      ],
      avgPricePerTonne: 1500,
    };
    const f = analyzeFsa(fsa);
    expect(f.proRatedAcq).toBe(600000);
    expect(f.liftedPct).toBeCloseTo(78, 6);
    expect(f.penaltyPct).toBe(20);
    expect(f.shortfallT).toBe(132000);
    expect(f.claimValue).toBeCloseTo(0.2 * 132000 * 1500, 2);
  });
  it("full lifting → no penalty", () => {
    const f = analyzeFsa({
      id: "F-2", source: "W-1", plant: "RTPS", acqTonnes: 1200000,
      monthlyLifted: Array.from({ length: 6 }, (_, i) => ({ month: `2026-0${i + 1}`, tonnes: 100000 })),
      penaltySlabs: [{ belowPct: 80, penaltyPctOfValue: 20 }],
      avgPricePerTonne: 1500,
    });
    expect(f.penaltyPct).toBe(0);
    expect(f.claimValue).toBe(0);
  });
});

describe("coal.analyzeStockpile [C4]", () => {
  const base: Stockpile = {
    id: "S-1", plant: "RTPS", yard: "A1", bookTonnes: 20000, physicalTonnes: 19500,
    ageDays: 50, gcv: 4200, formedOn: "2026-05-01",
  };
  it("book gap beyond the 0.08%/10-day storage allowance", () => {
    const f = analyzeStockpile(base);
    expect(f.bookGapT).toBe(500);
    // allowance = 20,000 × 0.0008 × 5 = 80 t
    expect(f.allowedStorageLossT).toBeCloseTo(80, 6);
    expect(f.excessGapT).toBeCloseTo(420, 6);
  });
  it("combustion risk needs age > 45 d AND physical > 20k t", () => {
    expect(analyzeStockpile(base).combustionRisk).toBe(false); // 19,500 t
    expect(analyzeStockpile({ ...base, physicalTonnes: 25000, bookTonnes: 25200 }).combustionRisk).toBe(true);
    expect(analyzeStockpile({ ...base, ageDays: 30, physicalTonnes: 25000 }).combustionRisk).toBe(false);
  });
});

describe("coal.blend [C3]", () => {
  it("greedy least-cost mix corrects up to the target GCV", () => {
    const r = blend(
      [
        { id: "A", label: "Imported", gcv: 5000, costPerTonne: 3000, availableT: 100 },
        { id: "B", label: "Domestic", gcv: 4000, costPerTonne: 2000, availableT: 100 },
      ],
      4500,
      100,
    );
    expect(r.feasible).toBe(true);
    expect(r.achievedGcv).toBeCloseTo(4500, 4);
    expect(r.costPerTonne).toBeCloseTo(2500, 4);
    const a = r.mix.find((m) => m.id === "A")!;
    const b = r.mix.find((m) => m.id === "B")!;
    expect(a.tonnes).toBeCloseTo(50, 4);
    expect(b.tonnes).toBeCloseTo(50, 4);
  });
  it("infeasible when nothing can reach the target", () => {
    const r = blend([{ id: "B", label: "Low", gcv: 3500, costPerTonne: 1500, availableT: 500 }], 4500, 100);
    expect(r.feasible).toBe(false);
  });
});

describe("coal.sourceLeague [C5/C6]", () => {
  it("aggregates per-source and sorts by leakage", () => {
    const league = sourceLeague([rake, { ...rake, id: "T-2", source: "W-1", billedGCV: 5150, receivedGCV: 5075, firedGCV: 5020, billedTonnes: 3828, receivedTonnes: 3800, placementHours: 5 }]);
    expect(league[0].source).toBe("W-3");
    expect(league[0].slippedRakePct).toBe(100);
    expect(league[1].totalLeakage).toBe(0);
  });
});
