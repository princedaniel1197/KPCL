// Server-side plant-operations view helpers [B1–B9]: scope filtering,
// fleet aggregates, risk queue, safety clustering, hydro/solar advisories.

import type { Scope } from "@/lib/params";
import { inDateScope, inPlantScope } from "@/lib/params";
import type { EmissionMonth, GenUnit, Incident, Outage, Reservoir, ThermalPlant } from "@/lib/types";
import { AS_OF, emissions, incidents, outages, solar, units } from "@/lib/data";
import { assetRisk, unitHeatRateCost, heatRateFinding, type AssetRisk } from "@/lib/engines/plant";
import { deadlineAging, type DeadlineAging } from "@/lib/engines/obligations";

export type ChipTone = "success" | "danger" | "warning" | "info" | "neutral";

const THERMAL: readonly ThermalPlant[] = ["RTPS", "BTPS", "YTPS"];

export function isThermalScope(scope: Scope): boolean {
  return scope.plant === "ALL" || (THERMAL as readonly string[]).includes(scope.plant);
}

export function isHydroScope(scope: Scope): boolean {
  return scope.plant === "ALL" || scope.plant === "HYDRO";
}

/** Query string that preserves the global plant/period scope (+ extras). */
export function scopeQs(scope: Scope, extra?: Record<string, string>): string {
  const q = new URLSearchParams();
  if (scope.plant !== "ALL") q.set("plant", scope.plant);
  if (scope.period !== "ALL") q.set("period", scope.period);
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Units in plant scope with `monthly` narrowed to the period (never emptied). */
export function scopedUnits(scope: Scope): GenUnit[] {
  return units
    .filter((u) => inPlantScope(u.plant, scope))
    .map((u) => {
      if (scope.period === "ALL") return u;
      const monthly = u.monthly.filter((m) => m.month === scope.period);
      return { ...u, monthly: monthly.length > 0 ? monthly : u.monthly };
    });
}

export function scopedOutages(scope: Scope): Outage[] {
  return outages.filter((o) => inPlantScope(o.plant, scope) && inDateScope(o.start, scope));
}

export function scopedIncidents(scope: Scope): Incident[] {
  return incidents.filter((i) => inPlantScope(i.plant, scope) && inDateScope(i.date, scope));
}

export function scopedEmissions(scope: Scope): EmissionMonth[] {
  return emissions.filter((e) => {
    const plant = e.unitId.split("-")[0];
    return inPlantScope(plant, scope) && (scope.period === "ALL" || e.month === scope.period);
  });
}

/* ── Fleet ledger [B1/B3] ────────────────────────────────────── */

export interface UnitSummary {
  unit: GenUnit; // monthly already narrowed to the scope window
  avgPlf: number;
  avgAvail: number;
  genMU: number;
  hrExtraCr: number; // heat-rate excess ₹ cr over the scoped window
  hrAnnualizedCr: number; // full-window annualized run-rate
  risk: AssetRisk;
  fgdAging: DeadlineAging;
  underRnM: boolean; // near-zero PLF — unit is down for R&M, not failing
}

const mean = (xs: number[]): number => (xs.length > 0 ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function unitSummaries(scope: Scope): UnitSummary[] {
  return scopedUnits(scope).map((u) => {
    const full = units.find((x) => x.id === u.id) ?? u;
    const avgPlf = mean(u.monthly.map((m) => m.plfPct));
    return {
      unit: u,
      avgPlf,
      avgAvail: mean(u.monthly.map((m) => m.availabilityPct)),
      genMU: u.monthly.reduce((s, m) => s + m.genMU, 0),
      hrExtraCr: u.monthly.reduce((s, m) => s + heatRateFinding(u.id, m).extraCostCr, 0),
      hrAnnualizedCr: unitHeatRateCost(full).annualizedCr,
      risk: assetRisk(full, outages),
      fgdAging: deadlineAging(u.fgd.normDeadline, AS_OF),
      underRnM: avgPlf < 10,
    };
  });
}

export interface FleetKpis {
  genMU: number;
  avgPlf: number;
  hrExtraCr: number;
  fgdBreached: number;
  unitCount: number;
}

export function fleetKpis(scope: Scope): FleetKpis {
  const rows = unitSummaries(scope);
  return {
    genMU: rows.reduce((s, r) => s + r.genMU, 0),
    avgPlf: mean(rows.filter((r) => !r.underRnM).map((r) => r.avgPlf)),
    hrExtraCr: rows.reduce((s, r) => s + r.hrExtraCr, 0),
    fgdBreached: rows.filter((r) => r.unit.fgd.required && r.fgdAging.bucket === "BREACHED").length,
    unitCount: rows.length,
  };
}

export function fgdChipMeta(u: GenUnit, aging: DeadlineAging): { tone: ChipTone; label: string } {
  if (!u.fgd.required) return { tone: "neutral", label: "FGD not required" };
  if (u.fgd.status === "COMMISSIONED") return { tone: "success", label: "FGD commissioned" };
  if (aging.bucket === "BREACHED")
    return { tone: "danger", label: `FGD deadline breached · ${u.fgd.status.replace("_", " ")}` };
  if (aging.bucket === "CRITICAL_180") return { tone: "warning", label: `FGD due ≤180 d · ${u.fgd.status.replace("_", " ")}` };
  if (aging.bucket === "WATCH_365") return { tone: "info", label: `FGD due ≤365 d · ${u.fgd.status.replace("_", " ")}` };
  return { tone: "neutral", label: `FGD ${u.fgd.status.replace("_", " ").toLowerCase()}` };
}

/* ── Risk-ranked maintenance queue [B1/B2] ───────────────────── */

export function suggestedAction(riskIndex: number): string {
  if (riskIndex >= 60) return "Advance inspection to next reserve shutdown";
  if (riskIndex >= 35) return "Condition-monitor monthly";
  return "Routine surveillance";
}

export function riskQueue(scope: Scope): UnitSummary[] {
  return [...unitSummaries(scope)].sort((a, b) => b.risk.riskIndex - a.risk.riskIndex);
}

/* ── Safety [B8] ─────────────────────────────────────────────── */

export interface SafetyKpis {
  total: number;
  open: number;
  nearMissSharePct: number;
  ltis: number;
}

export function safetyKpis(scope: Scope): SafetyKpis {
  const rows = scopedIncidents(scope);
  const nearMiss = rows.filter((r) => r.kind === "NEAR_MISS").length;
  return {
    total: rows.length,
    open: rows.filter((r) => r.status === "OPEN").length,
    nearMissSharePct: rows.length > 0 ? (nearMiss / rows.length) * 100 : 0,
    ltis: rows.filter((r) => r.kind === "LTI").length,
  };
}

export interface NearMissCluster {
  plant: ThermalPlant;
  area: string;
  months: [string, string]; // adjacent YYYY-MM pair
  count: number;
  rows: Incident[];
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1)); // month is 0-based → already +1
  return d.toISOString().slice(0, 7);
}

/** Densest two-adjacent-month near-miss cluster at RTPS CHP [B8 story]. */
export function nearMissCluster(): NearMissCluster | null {
  const mine = incidents.filter(
    (i) => i.plant === "RTPS" && i.area === "CHP" && i.kind === "NEAR_MISS",
  );
  if (mine.length === 0) return null;
  const months = [...new Set(mine.map((i) => i.date.slice(0, 7)))].sort();
  let best: NearMissCluster | null = null;
  for (const m of months) {
    const pair: [string, string] = [m, nextMonth(m)];
    const rows = mine
      .filter((i) => i.date.slice(0, 7) === pair[0] || i.date.slice(0, 7) === pair[1])
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!best || rows.length > best.count) {
      best = { plant: "RTPS", area: "CHP", months: pair, count: rows.length, rows };
    }
  }
  return best;
}

/* ── Hydro advisory [B6] ─────────────────────────────────────── */

export function inflowChipMeta(r: Reservoir): { tone: ChipTone; label: string } {
  if (r.inflowCusecs < r.inflow5yrLow) return { tone: "danger", label: "below 5-yr band" };
  if (r.inflowCusecs > r.inflow5yrHigh) return { tone: "info", label: "above 5-yr band" };
  return { tone: "success", label: "within 5-yr band" };
}

/* ── Solar advisory [B7] ─────────────────────────────────────── */

export interface SolarDeviation {
  month: string;
  forecastMU: number;
  actualMU: number;
  deviationPct: number;
}

export function solarDeviations(): SolarDeviation[] {
  return solar.map((m) => ({
    month: m.month,
    forecastMU: m.forecastMU,
    actualMU: m.actualMU,
    deviationPct: m.forecastMU > 0 ? ((m.actualMU - m.forecastMU) / m.forecastMU) * 100 : 0,
  }));
}
