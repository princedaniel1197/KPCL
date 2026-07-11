import { describe, expect, it } from "vitest";
import { assetRisk, emissionStatus, heatRateFinding, outagePareto, recurrenceFlags } from "@/lib/engines/plant";
import { cadreRetiringPct, clmsFlags, monthsUntil, retirementDate, skillCoverage, spofRoles } from "@/lib/engines/workforce";
import type { Employee, GenUnit, LabourContractor, Outage, UnitMonth } from "@/lib/types";

const AS_OF = "2026-07-10";

describe("plant.heatRateFinding [B3]", () => {
  it("extra cost = (actual−norm)/norm × month fuel cost", () => {
    const m: UnitMonth = {
      month: "2026-05", plfPct: 70, availabilityPct: 90, heatRate: 2400, normHeatRate: 2350,
      auxPct: 6, normAuxPct: 6, genMU: 100, landedFuelCostPerKg: 0.7,
    };
    const f = heatRateFinding("U-1", m);
    expect(f.deviationKcalPerKwh).toBe(50);
    // month fuel = 100e6 kWh × 2400 kcal × ₹0.0007/kcal = ₹16.8 cr
    // extra = 50/2350 × 16.8 = 0.35745 cr
    expect(f.extraCostCr).toBeCloseTo((50 / 2350) * 16.8, 4);
  });
  it("no extra cost when at/below norm", () => {
    const m: UnitMonth = {
      month: "2026-05", plfPct: 70, availabilityPct: 90, heatRate: 2300, normHeatRate: 2350,
      auxPct: 6, normAuxPct: 6, genMU: 100, landedFuelCostPerKg: 0.7,
    };
    expect(heatRateFinding("U-1", m).extraCostCr).toBe(0);
  });
});

const outage = (unitId: string, cause: string, hours: number): Outage => ({
  id: "O-1", unitId, plant: "RTPS", start: "2026-03-01", hours,
  kind: "FORCED", cause, equipment: "x", note: "",
});

describe("plant.outagePareto & recurrence [B5]", () => {
  it("shares by forced-outage hours", () => {
    const p = outagePareto([outage("U-1", "Boiler tube leak", 60), outage("U-2", "Mill outage", 40)]);
    expect(p[0].cause).toBe("Boiler tube leak");
    expect(p[0].sharePct).toBeCloseTo(60, 6);
  });
  it("recurrence = same cause on same unit ≥3 times", () => {
    const flags = recurrenceFlags([
      outage("U-2", "Boiler tube leak", 60),
      outage("U-2", "Boiler tube leak", 50),
      outage("U-2", "Boiler tube leak", 70),
      outage("U-1", "Mill outage", 10),
    ]);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ unitId: "U-2", events: 3, hours: 180 });
  });
});

describe("plant.assetRisk [B1/B2 — concept]", () => {
  it("recurring tube leaks drive risk with plain-English drivers", () => {
    const u = { id: "U-2", plant: "RTPS", capacityMW: 210, commissioned: 1986, monthly: [], fgd: { required: true, status: "NOT_AWARDED", normDeadline: "2028-01-01" }, sensorHealth: 58, tubeLeakCount12mo: 7 } as unknown as GenUnit;
    const r = assetRisk(u, [
      outage("U-2", "Boiler tube leak", 60),
      outage("U-2", "Boiler tube leak", 80),
      outage("U-2", "Boiler tube leak", 90),
    ]);
    expect(r.riskIndex).toBeGreaterThan(50);
    expect(r.drivers.join(" ")).toContain("boiler tube leak");
  });
});

describe("plant.emissionStatus [B9]", () => {
  it("flags breach against the unit's norm", () => {
    const s = emissionStatus("U-1", [
      { unitId: "U-1", month: "2026-05", so2: 1100, so2Norm: 600, nox: 280, noxNorm: 300 },
      { unitId: "U-1", month: "2026-06", so2: 1200, so2Norm: 600, nox: 310, noxNorm: 300 },
    ])!;
    expect(s.so2Breach).toBe(true);
    expect(s.noxBreach).toBe(true);
    expect(s.breachMonths).toBe(2);
  });
});

const emp = (over: Partial<Employee>): Employee => ({
  id: "E-1", name: "Test", dob: "1970-03-15", doj: "1995-01-01", cadre: "Technical",
  designation: "Officer", station: "RTPS", role: "Boiler operator",
  soleIncumbent: false, successorIdentified: false, interviewStatus: "NOT_QUEUED",
  ...over,
});

describe("workforce.retirement [F1]", () => {
  it("retirement = DOB + 60 years", () => {
    expect(retirementDate("1970-03-15")).toBe("2030-03-15");
  });
  it("SPOF = sole incumbent, retiring ≤24 mo, no successor", () => {
    const soon = emp({ dob: "1967-01-15", soleIncumbent: true }); // retires 2027-01-15 (~18 mo)
    const far = emp({ id: "E-2", dob: "1972-01-15", soleIncumbent: true });
    const succ = emp({ id: "E-3", dob: "1967-01-15", soleIncumbent: true, successorIdentified: true });
    const notSole = emp({ id: "E-4", dob: "1967-01-15" });
    expect(spofRoles([soon, far, succ, notSole], AS_OF).map((e) => e.id)).toEqual(["E-1"]);
  });
  it("cadre retiring % within a horizon", () => {
    const pool = [
      emp({ id: "A", dob: "1967-01-01" }), // retires 2027 — inside 5 yr
      emp({ id: "B", dob: "1975-01-01" }), // 2035 — outside
      emp({ id: "C", dob: "1968-06-01" }), // 2028 — inside
      emp({ id: "D", dob: "1980-01-01" }),
    ];
    expect(cadreRetiringPct(pool, "RTPS", "Technical", AS_OF, 5)).toBeCloseTo(50, 6);
  });
  it("monthsUntil is signed", () => {
    expect(monthsUntil("2027-07-10", AS_OF)).toBeCloseTo(12, 0);
  });
});

describe("workforce.clmsFlags [F2]", () => {
  it("min-wage, EPF and manshift-mismatch flags with ₹ exposure", () => {
    const c: LabourContractor = {
      id: "LC-1", name: "SLV Enterprises", plant: "RTPS", workers: 100,
      licenceExpiry: "2026-12-01",
      months: [{
        month: "2026-06", manshiftsBilled: 1070, manshiftsAttendance: 1000,
        wagePaidPerDay: 380, minWagePerDay: 421, basicPerDay: 250, epfPaidPctOfBasic: 9,
      }],
    };
    const flags = clmsFlags(c);
    const byKind = Object.fromEntries(flags.map((f) => [f.kind, f]));
    expect(byKind.MIN_WAGE.exposure).toBe(41 * 1000);
    expect(byKind.EPF.exposure).toBeCloseTo(0.03 * 250 * 1000, 6);
    expect(byKind.MANSHIFT_MISMATCH.exposure).toBe(70 * 380); // 7% > 3% threshold
  });
  it("compliant month raises nothing", () => {
    const c: LabourContractor = {
      id: "LC-2", name: "Clean", plant: "RTPS", workers: 50, licenceExpiry: "2027-01-01",
      months: [{ month: "2026-06", manshiftsBilled: 1010, manshiftsAttendance: 1000, wagePaidPerDay: 450, minWagePerDay: 421, basicPerDay: 280, epfPaidPctOfBasic: 12 }],
    };
    expect(clmsFlags(c)).toHaveLength(0);
  });
});

describe("workforce.skillCoverage [F4]", () => {
  it("coverage % and gap", () => {
    const c = skillCoverage({ key: "psp", label: "PSP", need: 80, have: 11, trainingPlanned: 8 });
    expect(c.coveragePct).toBeCloseTo(13.75, 4);
    expect(c.gap).toBe(69);
  });
});
