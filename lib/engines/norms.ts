// Every operative norm and price table in one place. The Settings page edits a
// client-side copy of this object; engines take norms as a parameter so edits
// visibly recompute flags. These are the defaults ("reset to norms").

export interface CoalNorms {
  transitQuantityLossPct: number; // rail norm
  transitCvLossKcal: number; // acceptable billed→received GCV drop
  storageLossPctPer10Days: number;
  storageCvToleranceKcal: number; // acceptable received→fired drop
  extraCoalPctPer100Kcal: number; // CEA: 100 kcal/kg ≈ 3% extra coal
  freeTimeHours: number;
  demurragePerWagonHour: number; // ₹
  combustionRiskAgeDays: number;
  combustionRiskTonnes: number;
}

export interface GradeBand {
  grade: string;
  minGcv: number;
  maxGcv: number;
  pitheadPrice: number; // ₹/tonne
}

export const GRADE_BANDS: GradeBand[] = [
  { grade: "G6", minGcv: 5500, maxGcv: 5800, pitheadPrice: 2450 },
  { grade: "G7", minGcv: 5200, maxGcv: 5500, pitheadPrice: 2260 },
  { grade: "G8", minGcv: 4900, maxGcv: 5200, pitheadPrice: 2070 },
  { grade: "G9", minGcv: 4600, maxGcv: 4900, pitheadPrice: 1890 },
  { grade: "G10", minGcv: 4300, maxGcv: 4600, pitheadPrice: 1700 },
  { grade: "G11", minGcv: 4000, maxGcv: 4300, pitheadPrice: 1510 },
  { grade: "G12", minGcv: 3700, maxGcv: 4000, pitheadPrice: 1320 },
  { grade: "G13", minGcv: 3400, maxGcv: 3700, pitheadPrice: 1140 },
  { grade: "G14", minGcv: 3100, maxGcv: 3400, pitheadPrice: 950 },
];

export const COAL_NORMS: CoalNorms = {
  transitQuantityLossPct: 1.5,
  transitCvLossKcal: 120,
  storageLossPctPer10Days: 0.08,
  storageCvToleranceKcal: 85,
  extraCoalPctPer100Kcal: 3,
  freeTimeHours: 6,
  demurragePerWagonHour: 150,
  combustionRiskAgeDays: 45,
  combustionRiskTonnes: 20000,
};

export interface ObligationNorms {
  bgAlertDays: number[]; // T-60/30/7
  copuReplyMonths: number; // audit para reply clock
  divergenceFlagPp: number; // financial-vs-physical percentage points
}

export const OBLIGATION_NORMS: ObligationNorms = {
  bgAlertDays: [60, 30, 7],
  copuReplyMonths: 4,
  divergenceFlagPp: 8,
};

export interface PlantNorms {
  omEscalationPct: number; // KERC O&M escalation norm
  spofRetireMonths: number; // sole-incumbent retiring within N months
  deadStockMonths: number; // no issue in N months = dead stock
  retirementAge: number;
}

export const PLANT_NORMS: PlantNorms = {
  omEscalationPct: 5.72,
  spofRetireMonths: 24,
  deadStockMonths: 24,
  retirementAge: 60,
};

export interface VendorWeights {
  onTime: number;
  rejection: number;
  ld: number;
  dispute: number;
}

export const VENDOR_WEIGHTS: VendorWeights = {
  onTime: 0.4,
  rejection: 0.25,
  ld: 0.2,
  dispute: 0.15,
};

export function gradeForGcv(gcv: number): GradeBand {
  for (const b of GRADE_BANDS) {
    if (gcv >= b.minGcv) return b; // bands sorted high→low; first floor match
  }
  return GRADE_BANDS[GRADE_BANDS.length - 1];
}

export function gradeByName(grade: string): GradeBand {
  return GRADE_BANDS.find((b) => b.grade === grade) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}
