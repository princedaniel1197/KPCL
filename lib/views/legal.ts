// Server-side legal view helpers [E1–E3]: risk ranking, hearing calendar,
// firm roster and recoverable-LD linkage shared by the legal pages.
// Legal matters carry no plant tag — they are shown unfiltered by scope.

import { AS_OF, contracts, legalMatters, projectById } from "@/lib/data";
import { caseRisk, hearingClock, recoverableLd, type CaseRisk, type RecoverableLd } from "@/lib/engines/legal";
import type { Scope } from "@/lib/params";
import type { LegalMatter, Project } from "@/lib/types";

export const matterById = new Map(legalMatters.map((m) => [m.id, m]));

/** Preserve plant/period query params on intra-module links. */
export function scopeQs(scope: Scope): string {
  const q = new URLSearchParams();
  if (scope.plant !== "ALL") q.set("plant", scope.plant);
  if (scope.period !== "ALL") q.set("period", scope.period);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function openMatters(): LegalMatter[] {
  return legalMatters.filter((m) => m.status === "OPEN");
}

export function linkedProject(m: LegalMatter): Project | null {
  return m.linkedProjectId ? projectById.get(m.linkedProjectId) ?? null : null;
}

export interface RiskedMatter {
  m: LegalMatter;
  risk: CaseRisk;
  project: Project | null;
}

/** Open matters ranked by case risk, highest first. */
export function riskRanked(): RiskedMatter[] {
  return openMatters()
    .map((m) => {
      const project = linkedProject(m);
      return { m, risk: caseRisk(m, project), project };
    })
    .sort((a, b) => b.risk.risk - a.risk.risk);
}

/** Matters ledger order: open first, then exposure desc. */
export function ledgerOrder(): LegalMatter[] {
  return [...legalMatters].sort((a, b) => {
    if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
    return b.exposureCr - a.exposureCr;
  });
}

export interface HearingRow {
  date: string;
  m: LegalMatter;
}

/** Upcoming hearings on open matters, soonest first. */
export function upcomingHearings(limit: number): HearingRow[] {
  return openMatters()
    .filter((m) => m.nextHearing && m.nextHearing >= AS_OF)
    .map((m) => ({ date: m.nextHearing as string, m }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export interface FirmRow {
  firm: string;
  matters: number;
  openMatters: number;
  feesLakh: number;
}

/** Counsel & firm roster aggregated by firm, fees desc. */
export function firmRoster(): FirmRow[] {
  const byFirm = new Map<string, FirmRow>();
  for (const m of legalMatters) {
    const prev = byFirm.get(m.firm) ?? { firm: m.firm, matters: 0, openMatters: 0, feesLakh: 0 };
    byFirm.set(m.firm, {
      firm: m.firm,
      matters: prev.matters + 1,
      openMatters: prev.openMatters + (m.status === "OPEN" ? 1 : 0),
      feesLakh: prev.feesLakh + m.feePaidLakh,
    });
  }
  return Array.from(byFirm.values()).sort((a, b) => b.feesLakh - a.feesLakh);
}

/** Recoverable-LD linkage over the full contract book. */
export function ldLinkage(): RecoverableLd[] {
  return recoverableLd(contracts, legalMatters, AS_OF);
}

export function urgentHearingCount(): number {
  return openMatters().filter((m) => hearingClock(m, AS_OF).urgent).length;
}
