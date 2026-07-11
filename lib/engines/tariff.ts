// Tariff & regulatory engine [G1–G4].
// Cost build-up, truing-up variance, prudence-check simulator, ATN template.

import type { TariffBlock, TariffYear } from "@/lib/types";
import { PLANT_NORMS, type PlantNorms } from "./norms";

/* ── Cost build-up [G4] ──────────────────────────────────────── */

export interface CostBuildUp {
  fixed: { roe: number; interest: number; depreciation: number; om: number; totalFixed: number };
  energy: { fuelCost: number };
  totalCr: number;
  perUnitFixed: number; // ₹/kWh
  perUnitEnergy: number;
  perUnitTotal: number;
}

export function costBuildUp(b: TariffBlock): CostBuildUp {
  const totalFixed = b.roe + b.interest + b.depreciation + b.om;
  const totalCr = totalFixed + b.fuelCost;
  const kwh = b.genMU * 1e6;
  return {
    fixed: { roe: b.roe, interest: b.interest, depreciation: b.depreciation, om: b.om, totalFixed },
    energy: { fuelCost: b.fuelCost },
    totalCr,
    perUnitFixed: kwh > 0 ? (totalFixed * 1e7) / kwh : 0,
    perUnitEnergy: kwh > 0 ? (b.fuelCost * 1e7) / kwh : 0,
    perUnitTotal: kwh > 0 ? (totalCr * 1e7) / kwh : 0,
  };
}

/* ── Truing-up variance ──────────────────────────────────────── */

export interface VarianceRow {
  item: string;
  approved: number;
  actual: number;
  variance: number;
  variancePct: number;
}

export function truingUp(y: TariffYear): VarianceRow[] {
  const items: [string, number, number][] = [
    ["Return on Equity", y.approved.roe, y.actual.roe],
    ["Interest & finance charges", y.approved.interest, y.actual.interest],
    ["Depreciation", y.approved.depreciation, y.actual.depreciation],
    ["O&M expenses", y.approved.om, y.actual.om],
    ["Fuel cost", y.approved.fuelCost, y.actual.fuelCost],
    ["Capex additions", y.approved.capexAdditions, y.actual.capexAdditions],
  ];
  return items.map(([item, approved, actual]) => ({
    item,
    approved,
    actual,
    variance: actual - approved,
    variancePct: approved !== 0 ? ((actual - approved) / approved) * 100 : 0,
  }));
}

/* ── Prudence-check simulator [G1] ───────────────────────────── */

export interface PrudenceFlag {
  key: string;
  title: string;
  reason: string; // plain-English, officer-readable
  atRiskCr: number;
  fixHint: string;
}

export function prudenceCheck(y: TariffYear, norms: PlantNorms = PLANT_NORMS): PrudenceFlag[] {
  const flags: PrudenceFlag[] = [];
  const a = y.actual;
  const ap = y.approved;

  // 1. Heat rate above norm → fuel delta disallowed
  if (a.heatRate > ap.heatRate) {
    const excessPct = (a.heatRate - ap.heatRate) / ap.heatRate;
    const atRisk = a.fuelCost * excessPct;
    flags.push({
      key: "HEAT_RATE",
      title: "Station heat rate above approved norm",
      reason: `Actual heat rate ${a.heatRate.toFixed(0)} kcal/kWh vs approved ${ap.heatRate.toFixed(0)}. The Commission routinely disallows the fuel cost attributable to the excess (${(excessPct * 100).toFixed(1)}% of fuel cost).`,
      atRiskCr: atRisk,
      fixHint:
        "Substantiate with unit-wise degradation studies and part-load duty data, or absorb the delta before filing.",
    });
  }

  // 2. Auxiliary consumption above norm
  if (a.auxPct > ap.auxPct) {
    const excessShare = (a.auxPct - ap.auxPct) / 100;
    const atRisk = a.fuelCost * excessShare;
    flags.push({
      key: "AUX",
      title: "Auxiliary consumption above norm",
      reason: `Actual auxiliary consumption ${a.auxPct.toFixed(2)}% vs norm ${ap.auxPct.toFixed(2)}%. Energy sent out shrinks; the fuel supporting the excess auxiliaries is at risk of disallowance.`,
      atRiskCr: atRisk,
      fixHint: "File the reasons unit-wise (R&M outages, FGD auxiliaries) with CEA benchmark citations.",
    });
  }

  // 3. O&M growth beyond the escalation norm
  const allowedOm = ap.om * (1 + norms.omEscalationPct / 100);
  if (a.om > allowedOm) {
    flags.push({
      key: "OM",
      title: `O&M growth beyond the ${norms.omEscalationPct}% escalation norm`,
      reason: `Actual O&M ₹${a.om.toFixed(1)} cr vs allowable ₹${allowedOm.toFixed(1)} cr (approved ₹${ap.om.toFixed(1)} cr + ${norms.omEscalationPct}%). The excess is presumptively disallowed unless shown as uncontrollable.`,
      atRiskCr: a.om - allowedOm,
      fixHint: "Segregate one-time/statutory O&M (biennial overhauls, insurance revisions) into a separate claim head.",
    });
  }

  // 4. Capitalization without commissioning certificate
  if (a.capexAdditions > 0 && !a.capexCertified) {
    flags.push({
      key: "CAPEX_CERT",
      title: "Capitalization claimed without commissioning certificate",
      reason: `₹${a.capexAdditions.toFixed(1)} cr of capex additions lack a commissioning/completion certificate. The Commission defers such capitalization to the year of certification.`,
      atRiskCr: a.capexAdditions * 0.16, // carrying-cost + RoE/depreciation impact proxy
      fixHint: "Attach unit-wise commissioning certificates or move the claim to the next truing-up.",
    });
  }

  // 5. Un-substantiated capex growth vs approval
  if (a.capexAdditions > ap.capexAdditions * 1.1 && ap.capexAdditions > 0) {
    flags.push({
      key: "CAPEX_OVERRUN",
      title: "Capex additions exceed approved plan by >10%",
      reason: `Actual additions ₹${a.capexAdditions.toFixed(1)} cr vs approved ₹${ap.capexAdditions.toFixed(1)} cr. Un-approved overruns need a separate prudence justification.`,
      atRiskCr: a.capexAdditions - ap.capexAdditions,
      fixHint: "File a deviation statement with Board approvals and competitive-bidding evidence for the overrun.",
    });
  }

  return flags.sort((x, z) => z.atRiskCr - x.atRiskCr);
}

/* ── ATN drafting template [G2] ──────────────────────────────── */

export function atnDraft(para: {
  id: string;
  title: string;
  valueCr: number;
  station: string;
  category: string;
}): string {
  return [
    `ACTION TAKEN NOTE — Para ${para.id}`,
    ``,
    `Subject: ${para.title}`,
    `Station: ${para.station} · Category: ${para.category} · Money value: ₹${para.valueCr.toFixed(2)} cr`,
    ``,
    `1. The observation of Audit has been examined in detail.`,
    ``,
    `2. Factual position: The records for the period under audit have been reviewed. ` +
      `[Set out the transaction-wise position from the linked evidence in the register.]`,
    ``,
    `3. Corrective action: Responsibility has been fixed and the following corrective ` +
      `measures instituted — (i) reconciliation of the underlying records; (ii) revision ` +
      `of the relevant SOP; (iii) recovery/adjustment where applicable.`,
    ``,
    `4. Preventive action: The control gap identified has been mapped into the corporation's ` +
      `obligation register with an owner and a recurring review, so that recurrence is flagged automatically.`,
    ``,
    `5. In view of the above, Audit is requested to recommend the para for settlement.`,
  ].join("\n");
}
