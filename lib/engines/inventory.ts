// Spares & inventory intelligence [D2].
// Forecast = 6-month moving average of issues. Stockout risk for V-class when
// on-hand < forecast × lead time. Dead stock = no issue in 24 months.

import type { Spare } from "@/lib/types";
import { PLANT_NORMS, type PlantNorms } from "./norms";

export interface SpareFinding {
  sku: string;
  forecastPerMonth: number;
  monthsOfCover: number; // Infinity-safe: 999 when no consumption
  stockoutRisk: boolean;
  dead: boolean;
  deadValue: number;
  emergencyPremiumEst: number; // 30% premium on a lead-time buy at risk
}

export function analyzeSpare(s: Spare, norms: PlantNorms = PLANT_NORMS): SpareFinding {
  const forecast = s.monthlyIssues.reduce((a, b) => a + b, 0) / s.monthlyIssues.length;
  const cover = forecast > 0 ? s.onHand / forecast : 999;
  const stockoutRisk = s.ved === "V" && forecast > 0 && s.onHand < forecast * s.leadTimeMonths;
  const dead = s.monthsSinceLastIssue >= norms.deadStockMonths;
  return {
    sku: s.sku,
    forecastPerMonth: forecast,
    monthsOfCover: Math.min(999, cover),
    stockoutRisk,
    dead,
    deadValue: dead ? s.onHand * s.unitCost : 0,
    emergencyPremiumEst: stockoutRisk
      ? Math.max(0, forecast * s.leadTimeMonths - s.onHand) * s.unitCost * 0.3
      : 0,
  };
}

export function inventorySummary(spares: Spare[], norms?: PlantNorms) {
  const findings = spares.map((s) => analyzeSpare(s, norms));
  const bySku = new Map(findings.map((f) => [f.sku, f]));
  return {
    findings,
    bySku,
    stockoutCount: findings.filter((f) => f.stockoutRisk).length,
    deadCount: findings.filter((f) => f.dead).length,
    deadValue: findings.reduce((s, f) => s + f.deadValue, 0),
    emergencyPremium: findings.reduce((s, f) => s + f.emergencyPremiumEst, 0),
  };
}
