// Plant operations engine [B1–B5, B9].
// Heat-rate deviation ₹, outage taxonomy, rule-based asset risk index
// (explicitly a CONCEPT on synthetic data — tag in UI), emissions status.

import type { EmissionMonth, GenUnit, Outage, UnitMonth } from "@/lib/types";

/* ── Heat-rate deviation ₹ [B3] ──────────────────────────────── */

export interface HeatRateFinding {
  unitId: string;
  month: string;
  deviationKcalPerKwh: number;
  deviationPct: number;
  extraCostCr: number; // (actual−norm)/norm × fuel cost of the month
}

/**
 * Fuel cost of the month ≈ genMU × heatRate × landedFuelCost/kg ÷ fired GCV…
 * simplified for the demo to: fuelCost = genMU(1e6 kWh) × heatRate(kcal/kWh)
 * ÷ assumed GCV(kcal/kg) × ₹/kg. We fold GCV into landedFuelCostPerKg by
 * expressing it as ₹ per 1000 kcal delivered: cost = gen × heatRate ×
 * costPer1000Kcal / 1000. Generator emits landedFuelCostPerKg as ₹/1000 kcal.
 */
export function heatRateFinding(unitId: string, m: UnitMonth): HeatRateFinding {
  const deviation = m.heatRate - m.normHeatRate;
  const monthFuelCostCr =
    (m.genMU * 1e6 * m.heatRate * (m.landedFuelCostPerKg / 1000)) / 1e7;
  const extraCostCr = deviation > 0 ? (deviation / m.normHeatRate) * monthFuelCostCr : 0;
  return {
    unitId,
    month: m.month,
    deviationKcalPerKwh: deviation,
    deviationPct: (deviation / m.normHeatRate) * 100,
    extraCostCr,
  };
}

export function unitHeatRateCost(u: GenUnit): { totalExtraCr: number; annualizedCr: number; findings: HeatRateFinding[] } {
  const findings = u.monthly.map((m) => heatRateFinding(u.id, m));
  const total = findings.reduce((s, f) => s + f.extraCostCr, 0);
  return { totalExtraCr: total, annualizedCr: (total / u.monthly.length) * 12, findings };
}

/* ── Outage taxonomy [B5] ────────────────────────────────────── */

export interface OutagePareto {
  cause: string;
  events: number;
  hours: number;
  sharePct: number;
}

export function outagePareto(outages: Outage[]): OutagePareto[] {
  const forced = outages.filter((o) => o.kind === "FORCED");
  const totalH = forced.reduce((s, o) => s + o.hours, 0) || 1;
  const byCause = new Map<string, { events: number; hours: number }>();
  for (const o of forced) {
    const cur = byCause.get(o.cause) ?? { events: 0, hours: 0 };
    byCause.set(o.cause, { events: cur.events + 1, hours: cur.hours + o.hours });
  }
  return [...byCause.entries()]
    .map(([cause, v]) => ({ cause, ...v, sharePct: (v.hours / totalH) * 100 }))
    .sort((a, b) => b.hours - a.hours);
}

/** Recurrence: same cause on the same unit ≥3 times in the window. */
export function recurrenceFlags(outages: Outage[]): { unitId: string; cause: string; events: number; hours: number }[] {
  const key = (o: Outage) => `${o.unitId}|${o.cause}`;
  const map = new Map<string, { unitId: string; cause: string; events: number; hours: number }>();
  for (const o of outages.filter((x) => x.kind === "FORCED")) {
    const cur = map.get(key(o)) ?? { unitId: o.unitId, cause: o.cause, events: 0, hours: 0 };
    map.set(key(o), { ...cur, events: cur.events + 1, hours: cur.hours + o.hours });
  }
  return [...map.values()].filter((v) => v.events >= 3).sort((a, b) => b.events - a.events);
}

/* ── Asset risk index [B1/B2] — rule-based CONCEPT ───────────── */

export interface AssetRisk {
  unitId: string;
  riskIndex: number; // 0-100, higher = worse
  drivers: string[]; // plain-English reasons
}

export function assetRisk(u: GenUnit, outages: Outage[]): AssetRisk {
  const unitForced = outages.filter((o) => o.unitId === u.id && o.kind === "FORCED");
  const tubeLeaks = unitForced.filter((o) => o.cause === "Boiler tube leak").length;
  const age = new Date().getFullYear() - u.commissioned;
  const drivers: string[] = [];
  let risk = 0;

  const sensorPenalty = (100 - u.sensorHealth) * 0.35;
  risk += sensorPenalty;
  if (u.sensorHealth < 70) drivers.push(`Sensor-health composite at ${u.sensorHealth.toFixed(0)}/100`);

  risk += Math.min(30, tubeLeaks * 8);
  if (tubeLeaks >= 2) drivers.push(`${tubeLeaks} boiler tube leak trips in the window — recurring signature`);

  risk += Math.min(20, unitForced.length * 3);
  if (unitForced.length >= 4) drivers.push(`${unitForced.length} forced outages in six months`);

  risk += Math.min(15, Math.max(0, age - 25) * 1.5);
  if (age > 30) drivers.push(`Unit vintage ${u.commissioned} (${age} years)`);

  if (drivers.length === 0) drivers.push("No adverse signals; routine monitoring");
  return { unitId: u.id, riskIndex: Math.min(100, risk), drivers };
}

/* ── Emissions [B9] ──────────────────────────────────────────── */

export interface EmissionStatus {
  unitId: string;
  latestSo2: number;
  so2Norm: number;
  so2Breach: boolean;
  latestNox: number;
  noxNorm: number;
  noxBreach: boolean;
  breachMonths: number;
}

export function emissionStatus(unitId: string, rows: EmissionMonth[]): EmissionStatus | null {
  const mine = rows.filter((r) => r.unitId === unitId).sort((a, b) => a.month.localeCompare(b.month));
  if (mine.length === 0) return null;
  const last = mine[mine.length - 1];
  return {
    unitId,
    latestSo2: last.so2,
    so2Norm: last.so2Norm,
    so2Breach: last.so2 > last.so2Norm,
    latestNox: last.nox,
    noxNorm: last.noxNorm,
    noxBreach: last.nox > last.noxNorm,
    breachMonths: mine.filter((m) => m.so2 > m.so2Norm || m.nox > m.noxNorm).length,
  };
}
