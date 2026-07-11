// Server-side regulatory view helpers [G1–G4]: tariff cycles per station,
// prudence roll-ups and the audit-para register with COPU clocks.

import { AS_OF, auditParas, tariffYears } from "@/lib/data";
import { paraClock, type ParaClock } from "@/lib/engines/obligations";
import { prudenceCheck, type PrudenceFlag } from "@/lib/engines/tariff";
import type { Scope } from "@/lib/params";
import type { AuditPara, TariffYear, ThermalPlant } from "@/lib/types";

export const THERMAL_STATIONS: readonly ThermalPlant[] = ["RTPS", "BTPS", "YTPS"];

export function isThermalStation(x: string): x is ThermalPlant {
  return (THERMAL_STATIONS as readonly string[]).includes(x);
}

/** Tariff cycles for one station, oldest FY first. */
export function stationYears(station: ThermalPlant): TariffYear[] {
  return tariffYears
    .filter((y) => y.station === station)
    .slice()
    .sort((a, b) => a.fy.localeCompare(b.fy));
}

export function draftYearFor(station: ThermalPlant): TariffYear | undefined {
  return stationYears(station).find((y) => y.status === "DRAFT");
}

export function filedYearFor(station: ThermalPlant): TariffYear | undefined {
  const filed = stationYears(station).filter((y) => y.status === "FILED");
  return filed[filed.length - 1];
}

/* ── Prudence roll-up [G1] ───────────────────────────────────── */

export interface StationPrudence {
  station: ThermalPlant;
  fy: string | null;
  flags: PrudenceFlag[];
  totalCr: number;
}

export function prudenceByStation(): StationPrudence[] {
  return THERMAL_STATIONS.map((station) => {
    const draft = draftYearFor(station);
    const flags = draft ? prudenceCheck(draft) : [];
    return {
      station,
      fy: draft?.fy ?? null,
      flags,
      totalCr: flags.reduce((s, f) => s + f.atRiskCr, 0),
    };
  });
}

export function corporatePrudenceCr(): number {
  return prudenceByStation().reduce((s, x) => s + x.totalCr, 0);
}

/* ── Audit-para register [G2] ────────────────────────────────── */

export interface ParaRow {
  para: AuditPara;
  clock: ParaClock;
}

/** Scoped register, most urgent first (daysRemaining ascending). */
export function paraRegister(scope: Scope): ParaRow[] {
  return auditParas
    .filter((p) => scope.plant === "ALL" || p.station === scope.plant)
    .map((para) => ({ para, clock: paraClock(para, AS_OF) }))
    .sort((a, b) => a.clock.daysRemaining - b.clock.daysRemaining);
}

/** Paras past the COPU reply clock, most overdue first (unscoped). */
export function overdueParaRows(): ParaRow[] {
  return auditParas
    .map((para) => ({ para, clock: paraClock(para, AS_OF) }))
    .filter((x) => x.clock.bucket === "OVERDUE")
    .sort((a, b) => a.clock.daysRemaining - b.clock.daysRemaining);
}

/* ── Scope-preserving query strings ──────────────────────────── */

export function scopeQs(scope: Scope, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  if (scope.plant !== "ALL") q.set("plant", scope.plant);
  if (scope.period !== "ALL") q.set("period", scope.period);
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}
