// Server-side capital-projects view helpers [A1–A10, A12].
// Scope filtering, portfolio rows, LD roll-ups, divergence series, flag text.

import type { Contract, Project } from "@/lib/types";
import type { Scope } from "@/lib/params";
import { AS_OF, contracts, vendorById, projects } from "@/lib/data";
import { projectHealth, retenderFlag, type ProjectHealth } from "@/lib/engines/execution";
import { ldRegister } from "@/lib/engines/obligations";

const CR = 1e7;

/** ₹ cr → raw ₹ for the format helpers. */
export function crToInr(cr: number): number {
  return cr * CR;
}

/** Query string preserving plant/period scope on internal links. */
export function scopeQs(scope: Scope): string {
  const q = new URLSearchParams();
  if (scope.plant !== "ALL") q.set("plant", scope.plant);
  if (scope.period !== "ALL") q.set("period", scope.period);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function scopedProjects(scope: Scope): Project[] {
  return projects.filter((p) => scope.plant === "ALL" || p.plant === scope.plant);
}

export function linkedContracts(p: Pick<Project, "id">): Contract[] {
  return contracts.filter((c) => c.projectId === p.id);
}

/** LD accrued (₹ cr) across a project's linked contracts as of `asOf`. */
export function projectLdAccruedCr(p: Pick<Project, "id">, asOf: string = AS_OF): number {
  return ldRegister(linkedContracts(p), asOf).reduce((s, l) => s + l.accruedValue, 0);
}

/** ΣRA bills to date, ₹ cr. */
export function spendToDateCr(p: Project): number {
  return p.raBills.reduce((s, b) => s + b.amountCr, 0);
}

export function contractorName(p: Project): string {
  return vendorById.get(p.contractorId)?.name ?? p.contractorId;
}

export interface PortfolioRow {
  p: Project;
  h: ProjectHealth;
  contractor: string;
  ldAccruedCr: number;
}

/** Portfolio ledger rows, riskiest first. */
export function portfolioRows(scope: Scope, asOf: string = AS_OF): PortfolioRow[] {
  return scopedProjects(scope)
    .map((p) => ({
      p,
      h: projectHealth(p, asOf),
      contractor: contractorName(p),
      ldAccruedCr: projectLdAccruedCr(p, asOf),
    }))
    .sort((a, b) => b.h.riskScore - a.h.riskScore);
}

export interface DivergencePoint {
  month: string; // YYYY-MM
  financial: number; // cumulative ΣRA ÷ value, %
  physical: number; // cumulative milestone weight, %
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Cumulative financial vs physical % across the months present in raBills [A3]. */
export function divergenceSeries(p: Project): DivergencePoint[] {
  const months = [...new Set(p.raBills.map((b) => b.month))].sort();
  let cumCr = 0;
  return months.map((month) => {
    cumCr += p.raBills.filter((b) => b.month === month).reduce((s, b) => s + b.amountCr, 0);
    const physical = p.milestones
      .filter((m) => m.completedDate !== null && m.completedDate.slice(0, 7) <= month)
      .reduce((s, m) => s + m.weightPct, 0);
    return {
      month,
      financial: round1((cumCr / p.contractValueCr) * 100),
      physical: round1(physical),
    };
  });
}

/** Short flag phrases for the compiled board report [A12]. */
export function flagLines(p: Project, h: ProjectHealth): string[] {
  const out: string[] = [];
  if (h.divergenceFlag)
    out.push(`financial ${h.financialPct.toFixed(0)}% vs physical ${h.physicalPct.toFixed(0)}%`);
  if (h.gateBlocked && h.blockedGate) out.push(`${h.blockedGate.label} blocked`);
  if (h.advanceVsFrozenFlag && p.mobilisationAdvance)
    out.push(`₹${p.mobilisationAdvance.amountCr} cr advance vs frozen site`);
  if (h.courtContradiction && p.courtStatus)
    out.push(`${p.courtStatus.caseId} stay vs reported activity`);
  else if (p.courtStatus && p.courtStatus.status === "STAY") out.push(`${p.courtStatus.caseId} stay`);
  if (h.segmentationFlag) out.push("segmented works under blocked gate");
  if (retenderFlag(p)) out.push(`re-tendered ${p.retenderCount}×`);
  if (p.drawingsPending > 100) out.push(`${p.drawingsPending} drawings pending`);
  return out;
}
