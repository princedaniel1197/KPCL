// Coal reconciliation engine [C1–C8].
// Pure functions: (rake, norms) → rupee-quantified findings. No I/O.

import type { Fsa, Rake, Stockpile } from "@/lib/types";
import { COAL_NORMS, gradeByName, gradeForGcv, type CoalNorms } from "./norms";

export interface RakeFindings {
  rakeId: string;
  landedCostPerTonne: number; // pithead + freight
  // Quantity leg
  quantityGapT: number; // billed − received
  quantityGapPct: number;
  excessLossT: number; // beyond the transit norm
  excessLossValue: number; // ₹ at landed cost
  // Billed→received GCV leg
  gcvTransitGap: number; // kcal beyond CV transit norm (0 if within)
  gradeSlipped: boolean; // received GCV falls a full grade below billed grade
  overbillingValue: number; // ₹ (billed grade price − received grade price) × received tonnes
  // Received→fired leg
  unexplainedFiredGap: number; // kcal beyond storage tolerance
  efficiencyLossValue: number; // extra coal ₹ from the unexplained drop
  // Logistics leg
  demurrageHours: number;
  demurrageValue: number;
  underloadT: number;
  idleFreightValue: number;
  totalLeakage: number;
}

export function landedCost(rake: Pick<Rake, "billedGrade" | "freightPerTonne">): number {
  return gradeByName(rake.billedGrade).pitheadPrice + rake.freightPerTonne;
}

export function analyzeRake(rake: Rake, norms: CoalNorms = COAL_NORMS): RakeFindings {
  const landed = landedCost(rake);

  // ── Quantity: billed vs received, norm 1.5% ──
  const quantityGapT = Math.max(0, rake.billedTonnes - rake.receivedTonnes);
  const quantityGapPct = (quantityGapT / rake.billedTonnes) * 100;
  const normLossT = (norms.transitQuantityLossPct / 100) * rake.billedTonnes;
  const excessLossT = Math.max(0, quantityGapT - normLossT);
  const excessLossValue = excessLossT * landed;

  // ── GCV billed → received: overbilling when a full grade slips ──
  const transitDrop = rake.billedGCV - rake.receivedGCV;
  const gcvTransitGap = Math.max(0, transitDrop - norms.transitCvLossKcal);
  const billedBand = gradeByName(rake.billedGrade);
  const receivedBand = gradeForGcv(rake.receivedGCV);
  const gradeSlipped = receivedBand.pitheadPrice < billedBand.pitheadPrice;
  const overbillingValue = gradeSlipped
    ? (billedBand.pitheadPrice - receivedBand.pitheadPrice) * rake.receivedTonnes
    : 0;

  // ── GCV received → fired: unexplained loss ⇒ efficiency ₹ ──
  const firedDrop = rake.receivedGCV - rake.firedGCV;
  const unexplainedFiredGap = Math.max(0, firedDrop - norms.storageCvToleranceKcal);
  // 100 kcal/kg drop ⇒ extraCoalPctPer100Kcal % more coal for the same generation
  const extraCoalT =
    rake.receivedTonnes * (unexplainedFiredGap / 100) * (norms.extraCoalPctPer100Kcal / 100);
  const efficiencyLossValue = extraCoalT * landed;

  // ── Demurrage: hours beyond free time × wagons × ₹/wagon-hour ──
  const demurrageHours = Math.max(0, rake.placementHours - norms.freeTimeHours);
  const demurrageValue = demurrageHours * rake.wagons * norms.demurragePerWagonHour;

  // ── Idle freight: under-loading vs rated wagon capacity ──
  const ratedT = rake.wagons * rake.wagonCapT;
  const underloadT = Math.max(0, ratedT - rake.billedTonnes);
  const idleFreightValue = underloadT * rake.freightPerTonne;

  return {
    rakeId: rake.id,
    landedCostPerTonne: landed,
    quantityGapT,
    quantityGapPct,
    excessLossT,
    excessLossValue,
    gcvTransitGap,
    gradeSlipped,
    overbillingValue,
    unexplainedFiredGap,
    efficiencyLossValue,
    demurrageHours,
    demurrageValue,
    underloadT,
    idleFreightValue,
    totalLeakage:
      excessLossValue + overbillingValue + efficiencyLossValue + demurrageValue + idleFreightValue,
  };
}

/* ── FSA short-supply penalty [C8] ───────────────────────────── */

export interface FsaFinding {
  fsaId: string;
  liftedTonnes: number;
  liftedPct: number; // of pro-rated ACQ for the window
  proRatedAcq: number;
  penaltyPct: number; // % of shortfall value claimable
  shortfallT: number;
  claimValue: number;
}

export function analyzeFsa(fsa: Fsa): FsaFinding {
  const lifted = fsa.monthlyLifted.reduce((s, m) => s + m.tonnes, 0);
  const proRatedAcq = (fsa.acqTonnes / 12) * fsa.monthlyLifted.length;
  const liftedPct = (lifted / proRatedAcq) * 100;
  // slabs sorted descending by belowPct threshold; first slab whose threshold exceeds lifted%
  let penaltyPct = 0;
  for (const slab of [...fsa.penaltySlabs].sort((a, b) => a.belowPct - b.belowPct)) {
    if (liftedPct < slab.belowPct) {
      penaltyPct = slab.penaltyPctOfValue;
      break;
    }
  }
  const shortfallT = Math.max(0, proRatedAcq - lifted);
  const claimValue = (penaltyPct / 100) * shortfallT * fsa.avgPricePerTonne;
  return { fsaId: fsa.id, liftedTonnes: lifted, liftedPct, proRatedAcq, penaltyPct, shortfallT, claimValue };
}

/* ── Stockpile [C4] ──────────────────────────────────────────── */

export interface StockpileFinding {
  stockpileId: string;
  bookGapT: number; // book − physical
  bookGapPct: number;
  allowedStorageLossT: number;
  excessGapT: number;
  combustionRisk: boolean;
}

export function analyzeStockpile(sp: Stockpile, norms: CoalNorms = COAL_NORMS): StockpileFinding {
  const bookGapT = Math.max(0, sp.bookTonnes - sp.physicalTonnes);
  const allowedStorageLossT =
    sp.bookTonnes * (norms.storageLossPctPer10Days / 100) * (sp.ageDays / 10);
  return {
    stockpileId: sp.id,
    bookGapT,
    bookGapPct: (bookGapT / sp.bookTonnes) * 100,
    allowedStorageLossT,
    excessGapT: Math.max(0, bookGapT - allowedStorageLossT),
    combustionRisk: sp.ageDays > norms.combustionRiskAgeDays && sp.physicalTonnes > norms.combustionRiskTonnes,
  };
}

/* ── Blending [C3]: greedy least-cost mix to a target GCV ────── */

export interface BlendComponent {
  id: string;
  label: string;
  gcv: number;
  costPerTonne: number; // landed
  availableT: number;
}

export interface BlendResult {
  target: number;
  achievedGcv: number;
  costPerTonne: number;
  mix: { id: string; label: string; tonnes: number; sharePct: number }[];
  feasible: boolean;
}

/**
 * Greedy least-cost blend: sort by ₹ per kcal-tonne, take the cheapest source
 * first, then correct the weighted GCV back to target with the cheapest
 * higher-GCV source available. Simple, explainable, good enough for a demo.
 */
export function blend(
  components: BlendComponent[],
  targetGcv: number,
  requiredT: number,
): BlendResult {
  const byValue = [...components].sort(
    (a, b) => a.costPerTonne / a.gcv - b.costPerTonne / b.gcv,
  );
  let taken: { c: BlendComponent; t: number }[] = [];
  let remaining = requiredT;
  for (const c of byValue) {
    if (remaining <= 0) break;
    const t = Math.min(c.availableT, remaining);
    taken.push({ c, t });
    remaining -= t;
  }
  const total = taken.reduce((s, x) => s + x.t, 0);
  if (total <= 0) return { target: targetGcv, achievedGcv: 0, costPerTonne: 0, mix: [], feasible: false };

  let achieved = taken.reduce((s, x) => s + x.c.gcv * x.t, 0) / total;

  // If below target, swap low-GCV tonnage for the cheapest source above target.
  // Total tonnage is conserved (we displace, never add), and no enricher is ever
  // allocated beyond its availableT — `headroom` is decremented as we consume it.
  if (achieved < targetGcv) {
    const enrichers = byValue.filter((c) => c.gcv > targetGcv);
    for (const e of enrichers) {
      if (achieved >= targetGcv) break;
      // One mutable entry per enricher; create it once, then only grow it.
      let entry = taken.find((x) => x.c.id === e.id);
      let headroom = e.availableT - (entry?.t ?? 0);
      if (headroom <= 0.01) continue;
      // Displace the lowest-GCV taken tonnage first.
      const sortedLow = [...taken].sort((a, b) => a.c.gcv - b.c.gcv);
      for (const low of sortedLow) {
        if (achieved >= targetGcv || headroom <= 0.01 || low.c.id === e.id) continue;
        const den = e.gcv - low.c.gcv;
        if (den <= 0) continue;
        // tonnes of `low` to replace with `e` to reach target exactly:
        const needed = ((targetGcv - achieved) * total) / den;
        const swap = Math.min(low.t, headroom, needed);
        if (swap <= 0) continue;
        low.t -= swap;
        headroom -= swap;
        if (entry) {
          entry.t += swap;
        } else {
          entry = { c: e, t: swap };
          taken.push(entry);
        }
        achieved = taken.reduce((s, x) => s + x.c.gcv * x.t, 0) / total;
      }
    }
    taken = taken.filter((x) => x.t > 0.01);
  }

  const cost = taken.reduce((s, x) => s + x.c.costPerTonne * x.t, 0) / total;
  return {
    target: targetGcv,
    achievedGcv: achieved,
    costPerTonne: cost,
    mix: taken.map((x) => ({
      id: x.c.id,
      label: x.c.label,
      tonnes: x.t,
      sharePct: (x.t / total) * 100,
    })),
    feasible: achieved >= targetGcv - 25 && total >= requiredT - 1,
  };
}

/* ── Source league [C5/C6]: aggregate rakes by colliery ──────── */

export interface SourceStats {
  source: string;
  rakes: number;
  billedT: number;
  receivedT: number;
  transitLossPct: number;
  avgGcvSlip: number; // billed − received
  slippedRakePct: number; // % of rakes with a full grade slip
  overbillingValue: number;
  excessTransitValue: number;
  thirdPartySampledPct: number;
  avgThirdPartyGap: number; // avg billed−received GCV on sampled rakes
  totalLeakage: number;
}

export function sourceLeague(rakes: Rake[], norms: CoalNorms = COAL_NORMS): SourceStats[] {
  const bySource = new Map<string, Rake[]>();
  for (const r of rakes) {
    const arr = bySource.get(r.source) ?? [];
    bySource.set(r.source, [...arr, r]);
  }
  return [...bySource.entries()]
    .map(([source, rs]) => {
      const findings = rs.map((r) => analyzeRake(r, norms));
      const billedT = rs.reduce((s, r) => s + r.billedTonnes, 0);
      const receivedT = rs.reduce((s, r) => s + r.receivedTonnes, 0);
      const sampled = rs.filter((r) => r.thirdPartySampled);
      return {
        source,
        rakes: rs.length,
        billedT,
        receivedT,
        transitLossPct: ((billedT - receivedT) / billedT) * 100,
        avgGcvSlip: rs.reduce((s, r) => s + (r.billedGCV - r.receivedGCV), 0) / rs.length,
        slippedRakePct: (findings.filter((f) => f.gradeSlipped).length / rs.length) * 100,
        overbillingValue: findings.reduce((s, f) => s + f.overbillingValue, 0),
        excessTransitValue: findings.reduce((s, f) => s + f.excessLossValue, 0),
        thirdPartySampledPct: (sampled.length / rs.length) * 100,
        avgThirdPartyGap: sampled.length
          ? sampled.reduce((s, r) => s + (r.billedGCV - r.receivedGCV), 0) / sampled.length
          : 0,
        totalLeakage: findings.reduce((s, f) => s + f.totalLeakage, 0),
      };
    })
    .sort((a, b) => b.totalLeakage - a.totalLeakage);
}
