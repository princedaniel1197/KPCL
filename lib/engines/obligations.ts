// Obligation & deadline register engine [A5, D1, D5, B9, G2].
// LD accrual, BG expiry alerts, statutory clocks. Pure functions.

import type { AuditPara, BankGuarantee, Contract, ContractMilestone } from "@/lib/types";
import { OBLIGATION_NORMS, type ObligationNorms } from "./norms";

export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((Date.parse(bIso) - Date.parse(aIso)) / 86400000);
}

/* ── LD accrual [A5] ─────────────────────────────────────────── */

export interface LdAccrual {
  contractId: string;
  milestoneId: string;
  milestoneName: string;
  due: string;
  daysLate: number;
  accruedPct: number; // min(cap, weeksLate × rate)
  accruedValue: number; // ₹ cr against full contract value
  capped: boolean;
  status: "ACCRUING" | "CAPPED" | "SETTLED_LATE" | "NONE";
}

/**
 * LD = min(capPct, weeksLate × ratePctPerWeek) × contract value.
 * A completed-late milestone accrues from due date to completion; an open one
 * accrues to `asOf`.
 */
export function ldForMilestone(
  contract: Pick<Contract, "id" | "valueCr" | "ldRatePctPerWeek" | "ldCapPct">,
  m: ContractMilestone,
  asOf: string,
): LdAccrual {
  const end = m.completedOn ?? asOf;
  const daysLate = Math.max(0, daysBetween(m.due, end));
  const rawPct = (daysLate / 7) * contract.ldRatePctPerWeek;
  const accruedPct = Math.min(contract.ldCapPct, rawPct);
  const capped = rawPct >= contract.ldCapPct && daysLate > 0;
  return {
    contractId: contract.id,
    milestoneId: m.id,
    milestoneName: m.name,
    due: m.due,
    daysLate,
    accruedPct,
    accruedValue: (accruedPct / 100) * contract.valueCr,
    capped,
    status:
      daysLate === 0 ? "NONE" : m.completedOn ? "SETTLED_LATE" : capped ? "CAPPED" : "ACCRUING",
  };
}

export function ldRegister(contracts: Contract[], asOf: string): LdAccrual[] {
  return contracts
    .flatMap((c) => c.milestones.map((m) => ldForMilestone(c, m, asOf)))
    .filter((l) => l.daysLate > 0)
    .sort((a, b) => b.accruedValue - a.accruedValue);
}

/* ── BG expiry [D5] ──────────────────────────────────────────── */

export type BgAlertLevel = "EXPIRED" | "T7" | "T30" | "T60" | "OK";

export interface BgAlert {
  bgId: string;
  contractId: string;
  vendorId: string;
  valueCr: number;
  expiry: string;
  daysToExpiry: number;
  level: BgAlertLevel;
}

export function bgAlert(
  bg: BankGuarantee,
  asOf: string,
  norms: ObligationNorms = OBLIGATION_NORMS,
): BgAlert {
  const days = daysBetween(asOf, bg.expiry);
  const [t60, t30, t7] = norms.bgAlertDays;
  const level: BgAlertLevel =
    days < 0 ? "EXPIRED" : days <= t7 ? "T7" : days <= t30 ? "T30" : days <= t60 ? "T60" : "OK";
  return {
    bgId: bg.id,
    contractId: bg.contractId,
    vendorId: bg.vendorId,
    valueCr: bg.valueCr,
    expiry: bg.expiry,
    daysToExpiry: days,
    level,
  };
}

export function bgLedger(bgs: BankGuarantee[], asOf: string, norms?: ObligationNorms): BgAlert[] {
  return bgs
    .map((b) => bgAlert(b, asOf, norms))
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

/* ── Statutory clocks: COPU 4-month reply [G2] ───────────────── */

export interface ParaClock {
  paraId: string;
  receivedDate: string;
  deadline: string;
  daysRemaining: number; // negative = overdue
  bucket: "OVERDUE" | "DUE_30" | "DUE_60" | "ON_TIME" | "CLOSED";
}

export function paraClock(
  para: Pick<AuditPara, "id" | "receivedDate" | "status">,
  asOf: string,
  norms: ObligationNorms = OBLIGATION_NORMS,
): ParaClock {
  // Add the COPU months, clamping to the last day of the target month so a
  // month-end receipt (e.g. 31 Oct + 4 mo) does not overflow into March.
  const d = new Date(para.receivedDate + "T00:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + norms.copuReplyMonths);
  const lastOfMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastOfMonth));
  const deadline = d.toISOString().slice(0, 10);
  const daysRemaining = daysBetween(asOf, deadline);
  const closed = para.status === "REPLIED" || para.status === "SETTLED";
  return {
    paraId: para.id,
    receivedDate: para.receivedDate,
    deadline,
    daysRemaining,
    bucket: closed
      ? "CLOSED"
      : daysRemaining < 0
        ? "OVERDUE"
        : daysRemaining <= 30
          ? "DUE_30"
          : daysRemaining <= 60
            ? "DUE_60"
            : "ON_TIME",
  };
}

/* ── FGD / statutory deadline aging [B9] ─────────────────────── */

export interface DeadlineAging {
  daysToDeadline: number;
  bucket: "BREACHED" | "CRITICAL_180" | "WATCH_365" | "ON_TRACK";
}

export function deadlineAging(deadline: string, asOf: string): DeadlineAging {
  const days = daysBetween(asOf, deadline);
  return {
    daysToDeadline: days,
    bucket:
      days < 0 ? "BREACHED" : days <= 180 ? "CRITICAL_180" : days <= 365 ? "WATCH_365" : "ON_TRACK",
  };
}
