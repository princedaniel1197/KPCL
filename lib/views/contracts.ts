// Server-side contracts view helpers [D1–D5]: scope filtering + aggregates
// shared by the Contracts & Procurement pages.

import { AS_OF, bgs, contractById, contracts, spares, vendors } from "@/lib/data";
import {
  bgLedger,
  daysBetween,
  ldForMilestone,
  ldRegister,
  type BgAlert,
  type LdAccrual,
} from "@/lib/engines/obligations";
import { analyzeSpare, inventorySummary, type SpareFinding } from "@/lib/engines/inventory";
import { scoreVendor, type VendorScore } from "@/lib/engines/vendor";
import type { Scope } from "@/lib/params";
import { inPlantScope } from "@/lib/params";
import type { BankGuarantee, Contract, Spare, ThermalPlant, Vendor } from "@/lib/types";

const THERMAL: readonly ThermalPlant[] = ["RTPS", "BTPS", "YTPS"];

/* ── Scope filters (cumulative registers — period scope not applied) ── */

export function scopedContracts(scope: Scope): Contract[] {
  return contracts.filter((c) => inPlantScope(c.plant, scope));
}

/** BGs scoped via their contract's plant. */
export function scopedBgs(scope: Scope): BankGuarantee[] {
  return bgs.filter((b) => {
    const c = contractById.get(b.contractId);
    return c ? inPlantScope(c.plant, scope) : scope.plant === "ALL";
  });
}

export function scopedSpares(scope: Scope): Spare[] {
  if (scope.plant === "ALL") return spares;
  if (!(THERMAL as readonly string[]).includes(scope.plant)) return [];
  return spares.filter((s) => s.plant === scope.plant);
}

/* ── Repository aggregates [D1] ──────────────────────────────── */

export interface MilestoneFlags {
  open: number;
  late: number; // open + past due
}

export function milestoneFlags(c: Contract, asOf: string = AS_OF): MilestoneFlags {
  const open = c.milestones.filter((m) => !m.completedOn);
  return {
    open: open.length,
    late: open.filter((m) => daysBetween(m.due, asOf) > 0).length,
  };
}

export interface RepoAggregates {
  count: number;
  portfolioValueCr: number;
  obligationsDue60: number; // open milestones falling due within 60 days
  ldAccruingCr: number; // ACCRUING + CAPPED (open milestones) only
  bgExpiring30Cr: number;
  bgExpiring30Count: number;
}

export function repoAggregates(scope: Scope): RepoAggregates {
  const cs = scopedContracts(scope);
  const register = ldRegister(cs, AS_OF);
  const alerts = bgLedger(scopedBgs(scope), AS_OF);
  const expiring30 = alerts.filter((a) => a.daysToExpiry >= 0 && a.daysToExpiry <= 30);
  return {
    count: cs.length,
    portfolioValueCr: cs.reduce((s, c) => s + c.valueCr, 0),
    obligationsDue60: cs.reduce(
      (s, c) =>
        s +
        c.milestones.filter((m) => {
          if (m.completedOn) return false;
          const d = daysBetween(AS_OF, m.due);
          return d >= 0 && d <= 60;
        }).length,
      0,
    ),
    ldAccruingCr: register
      .filter((l) => l.status === "ACCRUING" || l.status === "CAPPED")
      .reduce((s, l) => s + l.accruedValue, 0),
    bgExpiring30Cr: expiring30.reduce((s, a) => s + a.valueCr, 0),
    bgExpiring30Count: expiring30.length,
  };
}

/* ── BG ledger [D5] ──────────────────────────────────────────── */

export interface BgSummary {
  alerts: BgAlert[]; // sorted by daysToExpiry asc
  count: number;
  totalValueCr: number;
  expiring30: BgAlert[]; // 0–30 days out
  expired: BgAlert[]; // lapsed, unrenewed
}

export function bgSummary(scope: Scope): BgSummary {
  const alerts = bgLedger(scopedBgs(scope), AS_OF);
  return {
    alerts,
    count: alerts.length,
    totalValueCr: alerts.reduce((s, a) => s + a.valueCr, 0),
    expiring30: alerts.filter((a) => a.daysToExpiry >= 0 && a.daysToExpiry <= 30),
    expired: alerts.filter((a) => a.level === "EXPIRED"),
  };
}

/* ── Vendor scorecards [D3] ──────────────────────────────────── */

export interface ScoredVendor {
  vendor: Vendor;
  score: VendorScore;
}

/** All vendors with at least one contract, scored, worst-first. */
export function scoredVendors(): ScoredVendor[] {
  return vendors
    .filter((v) => v.contractsCount >= 1)
    .map((vendor) => ({ vendor, score: scoreVendor(vendor) }))
    .sort((a, b) => a.score.score - b.score.score);
}

export interface RecentEAward {
  vendor: Vendor;
  score: VendorScore;
  contract: Contract;
  daysAgo: number;
}

/** Grade-E vendors holding an award made within the last `windowDays`. */
export function gradeEAwards(windowDays = 60): RecentEAward[] {
  const eVendors = new Map(
    scoredVendors()
      .filter((s) => s.score.grade === "E")
      .map((s) => [s.vendor.id, s]),
  );
  return contracts
    .filter((c) => {
      const d = daysBetween(c.awardDate, AS_OF);
      return eVendors.has(c.vendorId) && d >= 0 && d <= windowDays;
    })
    .map((contract) => {
      const s = eVendors.get(contract.vendorId)!;
      return { vendor: s.vendor, score: s.score, contract, daysAgo: daysBetween(contract.awardDate, AS_OF) };
    })
    .sort((a, b) => a.daysAgo - b.daysAgo);
}

/* ── Spend analytics [D4] ────────────────────────────────────── */

export interface SpendAggregates {
  totalCr: number;
  byCategory: { category: string; valueCr: number; count: number }[]; // value desc
  byMode: { mode: Contract["tenderMode"]; count: number; valueCr: number; sharePct: number }[];
  cycleByCategory: { category: string; avgIndentToNit: number; avgNitToAward: number; avgTotal: number; count: number }[];
  avgCycleDays: number; // indent → award, portfolio-wide
  singleSharePct: number; // by value
  limitedSharePct: number; // by value
}

export function spendAggregates(scope: Scope): SpendAggregates {
  const cs = scopedContracts(scope);
  const totalCr = cs.reduce((s, c) => s + c.valueCr, 0);

  const catMap = new Map<string, { valueCr: number; count: number; itn: number; nta: number }>();
  for (const c of cs) {
    const cur = catMap.get(c.category) ?? { valueCr: 0, count: 0, itn: 0, nta: 0 };
    catMap.set(c.category, {
      valueCr: cur.valueCr + c.valueCr,
      count: cur.count + 1,
      itn: cur.itn + c.cycleDays.indentToNit,
      nta: cur.nta + c.cycleDays.nitToAward,
    });
  }
  const byCategory = [...catMap.entries()]
    .map(([category, v]) => ({ category, valueCr: v.valueCr, count: v.count }))
    .sort((a, b) => b.valueCr - a.valueCr);
  const cycleByCategory = [...catMap.entries()]
    .map(([category, v]) => ({
      category,
      avgIndentToNit: v.count > 0 ? v.itn / v.count : 0,
      avgNitToAward: v.count > 0 ? v.nta / v.count : 0,
      avgTotal: v.count > 0 ? (v.itn + v.nta) / v.count : 0,
      count: v.count,
    }))
    .sort((a, b) => b.avgTotal - a.avgTotal);

  const modes: Contract["tenderMode"][] = ["OPEN", "LIMITED", "SINGLE"];
  const byMode = modes.map((mode) => {
    const mine = cs.filter((c) => c.tenderMode === mode);
    const valueCr = mine.reduce((s, c) => s + c.valueCr, 0);
    return { mode, count: mine.length, valueCr, sharePct: totalCr > 0 ? (valueCr / totalCr) * 100 : 0 };
  });

  const cycleSum = cs.reduce((s, c) => s + c.cycleDays.indentToNit + c.cycleDays.nitToAward, 0);
  const share = (mode: Contract["tenderMode"]) => byMode.find((m) => m.mode === mode)?.sharePct ?? 0;

  return {
    totalCr,
    byCategory,
    byMode,
    cycleByCategory,
    avgCycleDays: cs.length > 0 ? cycleSum / cs.length : 0,
    singleSharePct: share("SINGLE"),
    limitedSharePct: share("LIMITED"),
  };
}

/* ── Spares intelligence [D2] ────────────────────────────────── */

export type ActivityBand = "ACTIVE" | "SLOW" | "DEAD";

export function activityBand(s: Spare): ActivityBand {
  if (s.monthsSinceLastIssue >= 24) return "DEAD";
  if (s.monthlyIssues.some((n) => n > 0)) return "ACTIVE";
  return "SLOW";
}

export interface SpareRow {
  spare: Spare;
  finding: SpareFinding;
}

export interface InventoryView {
  skuCount: number;
  summary: ReturnType<typeof inventorySummary>;
  stockoutRows: SpareRow[]; // V-class at risk, thinnest cover first
  deadRows: SpareRow[]; // dead stock, biggest value first
  matrix: Record<Spare["ved"], Record<ActivityBand, number>>;
}

export function inventoryView(scope: Scope): InventoryView {
  const ss = scopedSpares(scope);
  const summary = inventorySummary(ss);
  const rows: SpareRow[] = ss.map((spare) => ({ spare, finding: analyzeSpare(spare) }));

  const matrix: InventoryView["matrix"] = {
    V: { ACTIVE: 0, SLOW: 0, DEAD: 0 },
    E: { ACTIVE: 0, SLOW: 0, DEAD: 0 },
    D: { ACTIVE: 0, SLOW: 0, DEAD: 0 },
  };
  for (const s of ss) matrix[s.ved][activityBand(s)] += 1;

  return {
    skuCount: ss.length,
    summary,
    stockoutRows: rows
      .filter((r) => r.finding.stockoutRisk)
      .sort((a, b) => a.finding.monthsOfCover - b.finding.monthsOfCover),
    deadRows: rows
      .filter((r) => r.finding.dead)
      .sort((a, b) => b.finding.deadValue - a.finding.deadValue),
    matrix,
  };
}

/* ── Shared helpers ──────────────────────────────────────────── */

/** Scope-preserving query string ("" when at defaults). */
export function scopeQs(scope: Scope): string {
  const q = new URLSearchParams();
  if (scope.plant !== "ALL") q.set("plant", scope.plant);
  if (scope.period !== "ALL") q.set("period", scope.period);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function ldClause(c: Contract): string {
  return `${c.ldRatePctPerWeek}%/wk cap ${c.ldCapPct}%`;
}

export type { LdAccrual, BgAlert };
