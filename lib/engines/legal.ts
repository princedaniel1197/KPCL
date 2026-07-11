// Legal intelligence engine [E1–E3].
// Case risk scoring, recoverable-LD linkage, hearing clocks. Pure functions.

import type { Contract, LegalMatter, Project } from "@/lib/types";
import { daysBetween, ldRegister, type LdAccrual } from "./obligations";

const STAGE_WEIGHT: Record<string, number> = {
  "Notice": 0.3,
  "Pleadings": 0.45,
  "Evidence": 0.6,
  "Arguments": 0.8,
  "Reserved for orders": 0.95,
  "Appeal": 0.7,
  "Execution": 0.9,
  "Arbitration — claim filed": 0.5,
  "Arbitration — hearings": 0.7,
  "Award challenged": 0.75,
};

export interface CaseRisk {
  matterId: string;
  risk: number; // 0-100
  stageWeight: number;
  exposureCr: number;
  threatensMilestone: boolean;
  drivers: string[];
}

export function caseRisk(m: LegalMatter, linkedProject?: Project | null): CaseRisk {
  const stageWeight = STAGE_WEIGHT[m.stage] ?? 0.5;
  const exposureScore = Math.min(40, m.exposureCr * 0.8);
  const threatensMilestone =
    !!linkedProject &&
    (m.matterType.includes("Injunction") ||
      m.matterType.includes("Stay") ||
      m.claimKind === "LD_RECOVERY" ||
      linkedProject.courtStatus?.caseId === m.id);
  const drivers: string[] = [];
  if (stageWeight >= 0.7) drivers.push(`Advanced stage: ${m.stage}`);
  if (m.exposureCr >= 10) drivers.push(`Exposure ₹${m.exposureCr.toFixed(1)} cr`);
  if (threatensMilestone && linkedProject)
    drivers.push(`Directly linked to ${linkedProject.name} milestones`);
  const risk = Math.min(100, stageWeight * 45 + exposureScore + (threatensMilestone ? 20 : 0));
  if (drivers.length === 0) drivers.push("Routine matter — monitor hearings");
  return { matterId: m.id, risk, stageWeight, exposureCr: m.exposureCr, threatensMilestone, drivers };
}

/* ── Recoverable-LD linkage [E2 × A5/D1] ─────────────────────── */

export interface RecoverableLd {
  accrual: LdAccrual;
  contract: Contract;
  claimStatus: "NO_CLAIM_FILED" | "CLAIM_OPEN";
  matterId: string | null;
}

/**
 * Joins un-levied LD accruals to open recovery claims. LD that has accrued
 * with NO corresponding claim is the recoverable pool the audit will flag.
 */
export function recoverableLd(
  contracts: Contract[],
  matters: LegalMatter[],
  asOf: string,
  minValueCr = 0.05,
): RecoverableLd[] {
  const byId = new Map(contracts.map((c) => [c.id, c]));
  return ldRegister(contracts, asOf)
    .filter((l) => l.accruedValue >= minValueCr)
    .map((accrual) => {
      const matter = matters.find(
        (m) =>
          m.claimKind === "LD_RECOVERY" &&
          m.linkedContractId === accrual.contractId &&
          m.status === "OPEN",
      );
      return {
        accrual,
        contract: byId.get(accrual.contractId)!,
        claimStatus: matter ? ("CLAIM_OPEN" as const) : ("NO_CLAIM_FILED" as const),
        matterId: matter?.id ?? null,
      };
    });
}

/* ── Hearing clocks ──────────────────────────────────────────── */

export function hearingClock(m: LegalMatter, asOf: string): { days: number | null; urgent: boolean } {
  if (!m.nextHearing || m.status === "CLOSED") return { days: null, urgent: false };
  const days = daysBetween(asOf, m.nextHearing);
  return { days, urgent: days >= 0 && days <= 14 };
}
