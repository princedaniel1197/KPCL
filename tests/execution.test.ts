import { describe, expect, it } from "vitest";
import { blockingGate, financialPct, physicalPct, projectHealth, retenderFlag, rmStatus } from "@/lib/engines/execution";
import type { Project } from "@/lib/types";

const AS_OF = "2026-07-10";

const base: Project = {
  id: "P-1", name: "Test project", type: "RM", plant: "RTPS", contractorId: "V-1",
  contractValueCr: 100, start: "2025-05-01", scheduledEnd: "2027-01-01",
  gates: null,
  milestones: [
    { id: "M1", name: "a", weightPct: 30, plannedDate: "2025-09-01", completedDate: "2025-09-10", certified: true },
    { id: "M2", name: "b", weightPct: 18, plannedDate: "2026-01-01", completedDate: "2026-02-01", certified: true },
    { id: "M3", name: "c", weightPct: 52, plannedDate: "2026-10-01", completedDate: null, certified: false },
  ],
  raBills: [
    { id: "RA-1", month: "2025-12", amountCr: 40 },
    { id: "RA-2", month: "2026-04", amountCr: 22 },
  ],
  drawingsTotal: 100, drawingsPending: 20,
  drawingsAging: [{ bucket: "<30 d", count: 10 }, { bucket: ">180 d", count: 10 }],
  courtStatus: null, mobilisationAdvance: null, reportedActivity: [],
  retenderCount: 0, ldRatePctPerWeek: 0.5, ldCapPct: 5, rm: null, description: "",
};

describe("execution.projectHealth [A1/A3]", () => {
  it("financial 62% vs physical 48% → 14 pp divergence, flagged (>8 pp)", () => {
    const h = projectHealth(base, AS_OF);
    expect(financialPct(base)).toBeCloseTo(62, 6);
    expect(physicalPct(base)).toBeCloseTo(48, 6);
    expect(h.divergencePp).toBeCloseTo(14, 6);
    expect(h.divergenceFlag).toBe(true);
  });
  it("no flag at ≤8 pp", () => {
    const p = { ...base, raBills: [{ id: "RA-1", month: "2026-01", amountCr: 52 }] };
    expect(projectHealth(p, AS_OF).divergenceFlag).toBe(false);
  });
  it("advance-vs-frozen-site flag [A4]", () => {
    const p = { ...base, mobilisationAdvance: { amountCr: 10, disbursedOn: "2025-06-01", siteActive: false } };
    expect(projectHealth(p, AS_OF).advanceVsFrozenFlag).toBe(true);
  });
  it("court-stay contradiction requires reported activity [A7]", () => {
    const stay = { forum: "HC", caseId: "WP-1", status: "STAY" as const, note: "" };
    expect(projectHealth({ ...base, courtStatus: stay, reportedActivity: ["work ongoing"] }, AS_OF).courtContradiction).toBe(true);
    expect(projectHealth({ ...base, courtStatus: stay, reportedActivity: [] }, AS_OF).courtContradiction).toBe(false);
  });
});

describe("execution.blockingGate [A2/A8]", () => {
  const gates: Project["gates"] = [
    { key: "ToR", label: "ToR", status: "CLEARED", date: "2023-01-01", note: "" },
    { key: "EC", label: "EC", status: "CLEARED", date: "2024-01-01", note: "" },
    { key: "FC1", label: "FC-I", status: "BLOCKED", date: null, note: "" },
    { key: "FC2", label: "FC-II", status: "PENDING", date: null, note: "" },
    { key: "NBWL", label: "NBWL", status: "PENDING", date: null, note: "" },
    { key: "CONSTRUCTION", label: "Start", status: "PENDING", date: null, note: "" },
  ];
  it("returns the first non-cleared gate in statutory order", () => {
    expect(blockingGate(gates)!.key).toBe("FC1");
    expect(blockingGate(null)).toBeNull();
  });
  it("blocked gate marks the schedule fictional and flags segmentation", () => {
    const p = { ...base, gates };
    const h = projectHealth(p, AS_OF);
    expect(h.gateBlocked).toBe(true);
    expect(h.scheduleFictional).toBe(true);
    expect(h.segmentationFlag).toBe(true); // physical progress under a blocked parent
  });
});

describe("execution.rmStatus [A9]", () => {
  it("open chain slips against the planned re-sync date", () => {
    const p = {
      ...base,
      rm: { unitId: "RTPS-U1", rlaDone: "2025-08-01", overhaulDone: null, pgTestDone: null, resyncPlanned: "2026-05-26", resyncActual: null },
    };
    const s = rmStatus(p, AS_OF)!;
    expect(s.slipDays).toBe(45);
    expect(s.currentStage).toBe("Overhaul & Replacement");
    expect(s.stages[0].done).toBe(true);
  });
  it("null for non-R&M projects", () => {
    expect(rmStatus(base, AS_OF)).toBeNull();
  });
});

describe("execution.retenderFlag [A10]", () => {
  it("flags at ≥3 tender cycles", () => {
    expect(retenderFlag({ retenderCount: 4 })).toBe(true);
    expect(retenderFlag({ retenderCount: 2 })).toBe(false);
  });
});
