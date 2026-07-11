import { describe, expect, it } from "vitest";
import { bgAlert, daysBetween, deadlineAging, ldForMilestone, ldRegister, paraClock } from "@/lib/engines/obligations";
import type { BankGuarantee, Contract } from "@/lib/types";

const AS_OF = "2026-07-10";

const contract: Contract = {
  id: "C-1", title: "Test", vendorId: "V-1", plant: "RTPS", category: "EPC",
  valueCr: 84, awardDate: "2025-05-01", endDate: "2026-12-31",
  ldRatePctPerWeek: 0.5, ldCapPct: 5,
  milestones: [], tenderMode: "OPEN", cycleDays: { indentToNit: 30, nitToAward: 60 },
  projectId: null, correspondence: [],
};

describe("obligations.ldForMilestone [A5]", () => {
  it("caps at 5% — the ₹4.2 cr flagship case (84 days late on ₹84 cr)", () => {
    const l = ldForMilestone(contract, { id: "M1", name: "x", due: "2026-04-17", completedOn: null, valueCr: 30 }, AS_OF);
    expect(l.daysLate).toBe(84); // 12 weeks → raw 6% → capped 5%
    expect(l.accruedPct).toBe(5);
    expect(l.accruedValue).toBeCloseTo(4.2, 6);
    expect(l.status).toBe("CAPPED");
  });
  it("70 days late on ₹78 cr = exactly 5% = ₹3.9 cr", () => {
    const l = ldForMilestone({ ...contract, valueCr: 78 }, { id: "M1", name: "x", due: "2026-05-01", completedOn: null, valueCr: 30 }, AS_OF);
    expect(l.daysLate).toBe(70);
    expect(l.accruedValue).toBeCloseTo(3.9, 6);
  });
  it("accrues pro-rata by week when under the cap", () => {
    const l = ldForMilestone(contract, { id: "M1", name: "x", due: "2026-06-26", completedOn: null, valueCr: 30 }, AS_OF);
    expect(l.daysLate).toBe(14);
    expect(l.accruedPct).toBeCloseTo(1.0, 6); // 2 weeks × 0.5%
    expect(l.accruedValue).toBeCloseTo(0.84, 6);
    expect(l.status).toBe("ACCRUING");
  });
  it("completed-late milestone accrues to completion date and settles", () => {
    const l = ldForMilestone(contract, { id: "M1", name: "x", due: "2026-05-01", completedOn: "2026-05-15", valueCr: 30 }, AS_OF);
    expect(l.daysLate).toBe(14);
    expect(l.status).toBe("SETTLED_LATE");
  });
  it("on-time milestone accrues nothing", () => {
    const l = ldForMilestone(contract, { id: "M1", name: "x", due: "2026-05-01", completedOn: "2026-04-20", valueCr: 30 }, AS_OF);
    expect(l.daysLate).toBe(0);
    expect(l.status).toBe("NONE");
  });
  it("register sorts by accrued value and drops on-time rows", () => {
    const reg = ldRegister(
      [{
        ...contract,
        milestones: [
          { id: "M1", name: "late", due: "2026-04-17", completedOn: null, valueCr: 30 },
          { id: "M2", name: "ok", due: "2026-08-01", completedOn: null, valueCr: 30 },
        ],
      }],
      AS_OF,
    );
    expect(reg).toHaveLength(1);
    expect(reg[0].milestoneId).toBe("M1");
  });
});

describe("obligations.bgAlert [D5]", () => {
  const bg = (expiry: string): BankGuarantee => ({
    id: "BG-1", contractId: "C-1", vendorId: "V-1", bank: "Canara Bank",
    type: "PBG", valueCr: 8.4, issued: "2025-01-01", expiry,
  });
  it("T-7 / T-30 / T-60 / OK / EXPIRED banding", () => {
    expect(bgAlert(bg("2026-07-15"), AS_OF).level).toBe("T7"); // 5 days
    expect(bgAlert(bg("2026-07-26"), AS_OF).level).toBe("T30"); // 16 days
    expect(bgAlert(bg("2026-08-24"), AS_OF).level).toBe("T60"); // 45 days
    expect(bgAlert(bg("2026-12-01"), AS_OF).level).toBe("OK");
    expect(bgAlert(bg("2026-06-28"), AS_OF).level).toBe("EXPIRED");
    expect(bgAlert(bg("2026-06-28"), AS_OF).daysToExpiry).toBe(-12);
  });
});

describe("obligations.paraClock [G2]", () => {
  it("4-month COPU clock — overdue when past deadline and still open", () => {
    const c = paraClock({ id: "14/2025", receivedDate: "2026-01-10", status: "OPEN" }, AS_OF);
    expect(c.deadline).toBe("2026-05-10");
    expect(c.daysRemaining).toBe(-61);
    expect(c.bucket).toBe("OVERDUE");
  });
  it("replied paras are CLOSED regardless of age", () => {
    expect(paraClock({ id: "1/2024", receivedDate: "2025-01-01", status: "REPLIED" }, AS_OF).bucket).toBe("CLOSED");
  });
  it("inside the window buckets by days remaining", () => {
    expect(paraClock({ id: "2/2026", receivedDate: "2026-06-20", status: "OPEN" }, AS_OF).bucket).toBe("ON_TIME");
    expect(paraClock({ id: "3/2026", receivedDate: "2026-04-01", status: "OPEN" }, AS_OF).bucket).toBe("DUE_30");
  });
});

describe("obligations.deadlineAging [B9]", () => {
  it("buckets statutory deadlines", () => {
    expect(deadlineAging("2026-03-10", AS_OF).bucket).toBe("BREACHED");
    expect(deadlineAging("2026-10-01", AS_OF).bucket).toBe("CRITICAL_180");
    expect(deadlineAging("2027-05-01", AS_OF).bucket).toBe("WATCH_365");
    expect(deadlineAging("2028-05-01", AS_OF).bucket).toBe("ON_TRACK");
  });
});

describe("obligations.daysBetween", () => {
  it("computes calendar-day gaps", () => {
    expect(daysBetween("2026-07-01", "2026-07-10")).toBe(9);
    expect(daysBetween("2026-07-10", "2026-07-01")).toBe(-9);
  });
});
