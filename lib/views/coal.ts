// Server-side coal view helpers: scope filtering + aggregates shared by the
// coal pages and the MD dashboard.

import { analyzeRake, sourceLeague, type RakeFindings } from "@/lib/engines/coal";
import { rakes, claims, meta } from "@/lib/data";
import type { Scope } from "@/lib/params";
import type { Rake, ThermalPlant } from "@/lib/types";

export function scopedRakes(scope: Scope): Rake[] {
  return rakes.filter(
    (r) =>
      (scope.plant === "ALL" || r.plant === scope.plant) &&
      (scope.period === "ALL" || r.month === scope.period),
  );
}

export interface CoalAggregates {
  rakeCount: number;
  billedT: number;
  receivedT: number;
  leakage: {
    overbilling: number;
    excessTransit: number;
    efficiency: number;
    demurrage: number;
    idleFreight: number;
    total: number;
  };
  byMonth: { month: string; overbilling: number; transit: number; efficiency: number; logistics: number }[];
  claimPipeline: { status: string; count: number; amount: number }[];
  avgTransitLossPct: number;
  slippedRakes: number;
}

export function coalAggregates(scope: Scope): CoalAggregates {
  const rs = scopedRakes(scope);
  const findings = rs.map((r) => ({ r, f: analyzeRake(r) }));
  const sum = (fn: (f: RakeFindings) => number) => findings.reduce((s, x) => s + fn(x.f), 0);

  const byMonth = meta.months.map((month) => {
    const mine = findings.filter((x) => x.r.month === month);
    const s = (fn: (f: RakeFindings) => number) => Math.round(mine.reduce((a, x) => a + fn(x.f), 0) / 1e5) / 100;
    return {
      month,
      overbilling: s((f) => f.overbillingValue),
      transit: s((f) => f.excessLossValue),
      efficiency: s((f) => f.efficiencyLossValue),
      logistics: s((f) => f.demurrageValue + f.idleFreightValue),
    };
  });

  const scopedClaims = claims.filter(
    (c) =>
      (scope.plant === "ALL" || c.plant === scope.plant) &&
      (scope.period === "ALL" || c.month === scope.period),
  );
  const statuses = ["DRAFT", "ISSUED", "ACKNOWLEDGED", "RECOVERED"];
  const claimPipeline = statuses.map((status) => {
    const mine = scopedClaims.filter((c) => c.status === status);
    return { status, count: mine.length, amount: mine.reduce((s, c) => s + c.amount, 0) };
  });

  const billedT = rs.reduce((s, r) => s + r.billedTonnes, 0);
  const receivedT = rs.reduce((s, r) => s + r.receivedTonnes, 0);

  return {
    rakeCount: rs.length,
    billedT,
    receivedT,
    leakage: {
      overbilling: sum((f) => f.overbillingValue),
      excessTransit: sum((f) => f.excessLossValue),
      efficiency: sum((f) => f.efficiencyLossValue),
      demurrage: sum((f) => f.demurrageValue),
      idleFreight: sum((f) => f.idleFreightValue),
      total: sum((f) => f.totalLeakage),
    },
    byMonth,
    claimPipeline,
    avgTransitLossPct: billedT > 0 ? ((billedT - receivedT) / billedT) * 100 : 0,
    slippedRakes: findings.filter((x) => x.f.gradeSlipped).length,
  };
}

export function scopedLeague(scope: Scope) {
  return sourceLeague(scopedRakes(scope));
}

export function findingsFor(rake: Rake): RakeFindings {
  return analyzeRake(rake);
}

export function isThermalScope(scope: Scope): boolean {
  return scope.plant === "ALL" || (["RTPS", "BTPS", "YTPS"] as ThermalPlant[]).includes(scope.plant as ThermalPlant);
}
