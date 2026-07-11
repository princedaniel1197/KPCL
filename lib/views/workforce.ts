// Server-side workforce view helpers [F1–F4]: scope filtering + aggregates
// shared by the workforce pages. Employees are aggregated here — pages never
// iterate the full 4,600-row roster in JSX.

import { drives, employees, labourContractors, sanctions } from "@/lib/data";
import {
  cadreRetiringPct,
  clmsFlags,
  monthsUntil,
  retirementDate,
  type ClmsFlag,
} from "@/lib/engines/workforce";
import type { Scope } from "@/lib/params";
import type { Employee, LabourContractor, SanctionRow } from "@/lib/types";

/** Employees in plant scope. CORP staff appear only under the ALL scope. */
export function scopedEmployees(scope: Scope): Employee[] {
  if (scope.plant === "ALL") return employees;
  return employees.filter((e) => e.station === scope.plant);
}

export function scopedContractors(scope: Scope): LabourContractor[] {
  if (scope.plant === "ALL") return labourContractors;
  return labourContractors.filter((c) => c.plant === scope.plant);
}

export function scopedSanctions(scope: Scope): SanctionRow[] {
  if (scope.plant === "ALL") return sanctions;
  return sanctions.filter((s) => s.station === scope.plant);
}

/** Preserve plant/period query params on intra-module links. */
export function scopeQs(scope: Scope): string {
  const q = new URLSearchParams();
  if (scope.plant !== "ALL") q.set("plant", scope.plant);
  if (scope.period !== "ALL") q.set("period", scope.period);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ── Retirement wave [F1] ────────────────────────────────────── */

export function ageOn(dob: string, asOf: string): number {
  const d = new Date(dob + "T00:00:00Z");
  const a = new Date(asOf + "T00:00:00Z");
  const beforeBirthday =
    a.getUTCMonth() < d.getUTCMonth() ||
    (a.getUTCMonth() === d.getUTCMonth() && a.getUTCDate() < d.getUTCDate());
  return a.getUTCFullYear() - d.getUTCFullYear() - (beforeBirthday ? 1 : 0);
}

/** Headcount by five-year age band (25–29 … 55–59). */
export function ageBandRows(emps: Employee[], asOf: string): { band: string; count: number }[] {
  return [25, 30, 35, 40, 45, 50, 55].map((lo) => ({
    band: `${lo}–${lo + 4}`,
    count: emps.filter((e) => {
      const age = ageOn(e.dob, asOf);
      return age >= lo && age <= lo + 4;
    }).length,
  }));
}

/** Employees retiring within `months` of asOf (excludes already retired). */
export function retiringWithin(emps: Employee[], asOf: string, months: number): Employee[] {
  return emps.filter((e) => {
    const m = monthsUntil(retirementDate(e.dob), asOf);
    return m <= months && m > -1;
  });
}

export interface CadreExposureRow {
  station: string;
  cadre: string;
  headcount: number;
  retiring5y: number;
  retiringPct: number;
}

const THERMAL_STATIONS = ["RTPS", "BTPS", "YTPS"] as const;
const EXPOSURE_CADRES = ["Technical", "Engineering", "Operations"] as const;

/** Station × cadre retirement exposure over the thermal fleet. */
export function cadreExposureRows(scope: Scope, asOf: string): CadreExposureRow[] {
  const stations = THERMAL_STATIONS.filter((s) => scope.plant === "ALL" || s === scope.plant);
  return stations.flatMap((station) =>
    EXPOSURE_CADRES.map((cadre) => {
      const pool = employees.filter((e) => e.station === station && e.cadre === cadre);
      const retiring5y = pool.filter(
        (e) => monthsUntil(retirementDate(e.dob), asOf) <= 60,
      ).length;
      return {
        station,
        cadre,
        headcount: pool.length,
        retiring5y,
        retiringPct: cadreRetiringPct(employees, station, cadre, asOf, 5),
      };
    }),
  );
}

/* ── Knowledge continuity [F1] ───────────────────────────────── */

export interface QueueRow {
  e: Employee;
  retire: string;
  monthsLeft: number;
}

/** Legacy-interview queue: everyone retiring within the horizon, soonest first. */
export function interviewQueue(emps: Employee[], asOf: string, horizonMonths = 36): QueueRow[] {
  return emps
    .map((e) => {
      const retire = retirementDate(e.dob);
      return { e, retire, monthsLeft: monthsUntil(retire, asOf) };
    })
    .filter((r) => r.monthsLeft <= horizonMonths && r.monthsLeft > -1)
    .sort((a, b) => a.retire.localeCompare(b.retire));
}

/* ── Contract labour compliance [F2] ─────────────────────────── */

export interface ContractorRow {
  contractor: LabourContractor;
  flags: ClmsFlag[];
  kinds: ClmsFlag["kind"][];
  exposure: number;
}

export function contractorRows(cs: LabourContractor[]): ContractorRow[] {
  return cs.map((c) => {
    const flags = clmsFlags(c);
    const kinds = Array.from(new Set(flags.map((f) => f.kind)));
    return { contractor: c, flags, kinds, exposure: flags.reduce((s, f) => s + f.exposure, 0) };
  });
}

export interface FlagRow extends ClmsFlag {
  contractorName: string;
}

/** All flags over the given contractors, month desc then exposure desc. */
export function flagLedger(cs: LabourContractor[]): FlagRow[] {
  return cs
    .flatMap((c) => clmsFlags(c).map((f) => ({ ...f, contractorName: c.name })))
    .sort((a, b) => b.month.localeCompare(a.month) || b.exposure - a.exposure);
}

/* ── Recruitment pipeline [F3] ───────────────────────────────── */

export interface PipelineRow extends SanctionRow {
  gap: number;
  gapPct: number;
}

export function pipelineRows(scope: Scope): PipelineRow[] {
  return scopedSanctions(scope)
    .map((s) => ({
      ...s,
      gap: s.sanctioned - s.actual,
      gapPct: s.sanctioned > 0 ? ((s.sanctioned - s.actual) / s.sanctioned) * 100 : 0,
    }))
    .sort((a, b) => b.gapPct - a.gapPct);
}

/** Assumed realistic annual intake: posts in active drives spread over 4 years. */
export function assumedAnnualIntake(): number {
  const totalPosts = drives.reduce((s, d) => s + d.posts, 0);
  return Math.round(totalPosts / 4);
}
