// Workforce engine [F1–F4]: retirement wave, SPOF roles, contract-labour
// compliance checks, skills coverage. Pure functions.

import type { Employee, LabourContractor, SkillArea } from "@/lib/types";
import { PLANT_NORMS, type PlantNorms } from "./norms";

export function retirementDate(dob: string, norms: PlantNorms = PLANT_NORMS): string {
  const d = new Date(dob + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + norms.retirementAge);
  return d.toISOString().slice(0, 10);
}

export function monthsUntil(iso: string, asOf: string): number {
  return (Date.parse(iso) - Date.parse(asOf)) / (86400000 * 30.44);
}

export interface RetirementWaveRow {
  year: number;
  count: number;
}

export function retirementWave(
  employees: Employee[],
  asOf: string,
  horizonYears = 8,
  norms?: PlantNorms,
): RetirementWaveRow[] {
  const startYear = Number(asOf.slice(0, 4));
  const rows: RetirementWaveRow[] = [];
  for (let y = startYear; y < startYear + horizonYears; y++) {
    rows.push({
      year: y,
      count: employees.filter((e) => retirementDate(e.dob, norms).slice(0, 4) === String(y)).length,
    });
  }
  return rows;
}

/** SPOF = sole incumbent of a role retiring within the norm window, no successor. */
export function spofRoles(
  employees: Employee[],
  asOf: string,
  norms: PlantNorms = PLANT_NORMS,
): Employee[] {
  return employees
    .filter(
      (e) =>
        e.soleIncumbent &&
        !e.successorIdentified &&
        monthsUntil(retirementDate(e.dob, norms), asOf) <= norms.spofRetireMonths &&
        monthsUntil(retirementDate(e.dob, norms), asOf) > -1,
    )
    .sort((a, b) => retirementDate(a.dob, norms).localeCompare(retirementDate(b.dob, norms)));
}

/** Share of a station's cadre retiring within N years. */
export function cadreRetiringPct(
  employees: Employee[],
  station: string,
  cadre: string,
  asOf: string,
  years: number,
  norms?: PlantNorms,
): number {
  const pool = employees.filter((e) => e.station === station && e.cadre === cadre);
  if (pool.length === 0) return 0;
  const retiring = pool.filter(
    (e) => monthsUntil(retirementDate(e.dob, norms), asOf) <= years * 12,
  );
  return (retiring.length / pool.length) * 100;
}

/* ── Contract labour compliance [F2] ─────────────────────────── */

export interface ClmsFlag {
  contractorId: string;
  month: string;
  kind: "MIN_WAGE" | "EPF" | "MANSHIFT_MISMATCH";
  detail: string;
  exposure: number; // ₹ understated / overbilled for the month
}

export function clmsFlags(c: LabourContractor): ClmsFlag[] {
  const flags: ClmsFlag[] = [];
  for (const m of c.months) {
    if (m.wagePaidPerDay < m.minWagePerDay) {
      flags.push({
        contractorId: c.id,
        month: m.month,
        kind: "MIN_WAGE",
        detail: `Paid ₹${m.wagePaidPerDay}/day vs minimum ₹${m.minWagePerDay}/day`,
        exposure: (m.minWagePerDay - m.wagePaidPerDay) * m.manshiftsAttendance,
      });
    }
    if (m.epfPaidPctOfBasic < 12) {
      flags.push({
        contractorId: c.id,
        month: m.month,
        kind: "EPF",
        detail: `EPF remitted ${m.epfPaidPctOfBasic.toFixed(1)}% of basic vs statutory 12%`,
        exposure: ((12 - m.epfPaidPctOfBasic) / 100) * m.basicPerDay * m.manshiftsAttendance,
      });
    }
    const mismatchPct =
      m.manshiftsAttendance > 0
        ? ((m.manshiftsBilled - m.manshiftsAttendance) / m.manshiftsAttendance) * 100
        : 0;
    if (mismatchPct > 3) {
      flags.push({
        contractorId: c.id,
        month: m.month,
        kind: "MANSHIFT_MISMATCH",
        detail: `Billed ${m.manshiftsBilled} manshifts vs ${m.manshiftsAttendance} on attendance (+${mismatchPct.toFixed(1)}%)`,
        exposure: (m.manshiftsBilled - m.manshiftsAttendance) * m.wagePaidPerDay,
      });
    }
  }
  return flags;
}

/* ── Skills coverage [F4] ────────────────────────────────────── */

export function skillCoverage(a: SkillArea): { coveragePct: number; gap: number } {
  const coverage = a.need > 0 ? (a.have / a.need) * 100 : 100;
  return { coveragePct: Math.min(100, coverage), gap: Math.max(0, a.need - a.have) };
}
