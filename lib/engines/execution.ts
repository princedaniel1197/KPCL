// Capital project execution engine [A1, A3, A4, A6–A10].
// Financial vs physical progress, clearance-gate state machine, contradiction
// flags, drawings backlog, re-tender detection, R&M chain. Pure functions.

import type { Gate, Project } from "@/lib/types";
import { OBLIGATION_NORMS, type ObligationNorms } from "./norms";
import { daysBetween } from "./obligations";

export interface ProjectHealth {
  projectId: string;
  financialPct: number; // ΣRA bills / contract value
  physicalPct: number; // milestone-weighted completion
  divergencePp: number; // financial − physical
  divergenceFlag: boolean; // > norm (8pp)
  gateBlocked: boolean;
  blockedGate: Gate | null;
  scheduleFictional: boolean; // schedule end while a gate is blocked
  advanceVsFrozenFlag: boolean; // mobilisation advance out, site inactive [A4]
  courtContradiction: boolean; // active stay + reported site activity [A7]
  segmentationFlag: boolean; // component works advancing under a blocked parent [A8]
  drawingsPending: number;
  nextMilestone: { name: string; plannedDate: string } | null;
  daysToScheduledEnd: number;
  riskScore: number; // 0-100 composite for sorting
}

export function financialPct(p: Project): number {
  const paid = p.raBills.reduce((s, b) => s + b.amountCr, 0);
  return (paid / p.contractValueCr) * 100;
}

export function physicalPct(p: Project): number {
  return p.milestones
    .filter((m) => m.completedDate !== null)
    .reduce((s, m) => s + m.weightPct, 0);
}

export const GATE_ORDER = ["ToR", "EC", "FC1", "FC2", "NBWL", "CONSTRUCTION"] as const;

/** First non-cleared gate in the statutory sequence; null when all clear. */
export function blockingGate(gates: Gate[] | null): Gate | null {
  if (!gates) return null;
  const ordered = [...gates].sort(
    (a, b) => GATE_ORDER.indexOf(a.key) - GATE_ORDER.indexOf(b.key),
  );
  return ordered.find((g) => g.status !== "CLEARED") ?? null;
}

export function projectHealth(
  p: Project,
  asOf: string,
  norms: ObligationNorms = OBLIGATION_NORMS,
): ProjectHealth {
  const fin = financialPct(p);
  const phy = physicalPct(p);
  const divergence = fin - phy;
  const gate = blockingGate(p.gates);
  const gateBlocked = gate !== null && gate.status === "BLOCKED";
  const stay = p.courtStatus?.status === "STAY";

  // A4: advance disbursed against an inactive/frozen site
  const advanceVsFrozenFlag =
    p.mobilisationAdvance !== null && !p.mobilisationAdvance.siteActive;

  // A7: an active stay while progress reports still claim site activity
  const courtContradiction = stay && p.reportedActivity.length > 0;

  // A8: physical progress accruing on component milestones while parent gate blocked
  const segmentationFlag = gateBlocked && phy > 0;

  const next =
    p.milestones
      .filter((m) => m.completedDate === null)
      .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0] ?? null;

  const late = p.milestones.filter(
    (m) => m.completedDate === null && m.plannedDate < asOf,
  ).length;

  const riskScore = Math.min(
    100,
    Math.max(0, divergence) * 2.5 +
      (gateBlocked ? 30 : 0) +
      (advanceVsFrozenFlag ? 15 : 0) +
      (courtContradiction ? 15 : 0) +
      Math.min(15, p.drawingsPending / 10) +
      Math.min(15, late * 3),
  );

  return {
    projectId: p.id,
    financialPct: fin,
    physicalPct: phy,
    divergencePp: divergence,
    divergenceFlag: divergence > norms.divergenceFlagPp,
    gateBlocked,
    blockedGate: gateBlocked ? gate : null,
    scheduleFictional: gateBlocked,
    advanceVsFrozenFlag,
    courtContradiction,
    segmentationFlag,
    drawingsPending: p.drawingsPending,
    nextMilestone: next ? { name: next.name, plannedDate: next.plannedDate } : null,
    daysToScheduledEnd: daysBetween(asOf, p.scheduledEnd),
    riskScore,
  };
}

/* ── Re-tender detector [A10] ────────────────────────────────── */

export function retenderFlag(p: Pick<Project, "retenderCount">): boolean {
  return p.retenderCount >= 3;
}

/* ── R&M chain [A9] ──────────────────────────────────────────── */

export interface RmStatus {
  projectId: string;
  unitId: string;
  stages: { key: string; label: string; done: boolean; date: string | null }[];
  slipDays: number; // planned vs actual/expected re-sync
  currentStage: string;
}

export function rmStatus(p: Project, asOf: string): RmStatus | null {
  if (!p.rm) return null;
  const stages = [
    { key: "RLA", label: "Residual Life Assessment", done: p.rm.rlaDone !== null, date: p.rm.rlaDone },
    { key: "OVERHAUL", label: "Overhaul & Replacement", done: p.rm.overhaulDone !== null, date: p.rm.overhaulDone },
    { key: "PG", label: "Performance Guarantee Test", done: p.rm.pgTestDone !== null, date: p.rm.pgTestDone },
    { key: "RESYNC", label: "Re-synchronisation", done: p.rm.resyncActual !== null, date: p.rm.resyncActual },
  ];
  const slipDays = p.rm.resyncActual
    ? daysBetween(p.rm.resyncPlanned, p.rm.resyncActual)
    : Math.max(0, daysBetween(p.rm.resyncPlanned, asOf));
  const current = stages.find((s) => !s.done)?.label ?? "Complete";
  return { projectId: p.id, unitId: p.rm.unitId, stages, slipDays, currentStage: current };
}

/* ── Drawings aging [A6] ─────────────────────────────────────── */

export function drawingsSummary(p: Project): { total: number; pending: number; worstBucket: string } {
  const worst =
    [...p.drawingsAging].reverse().find((b) => b.count > 0)?.bucket ?? "current";
  return { total: p.drawingsTotal, pending: p.drawingsPending, worstBucket: worst };
}
