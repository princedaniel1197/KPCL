// Typed readers over the REAL scraped snapshots (data/scraped/*.json). The
// generator guarantees these files exist (empty until scrapers run), so these
// static imports never break a clean build. When scrapers/run_all.py runs, these
// carry genuine public-record data (Sharavathi clearances, HC PIL, CAG findings,
// reservoir levels) — tagged REAL, with source citations.

import clearancesJson from "@/data/scraped/clearances.json";
import casesJson from "@/data/scraped/cases.json";
import cagJson from "@/data/scraped/cag.json";
import reservoirsJson from "@/data/scraped/reservoirs.json";
import kercJson from "@/data/scraped/kerc.json";
import ceaDgrJson from "@/data/scraped/cea_dgr.json";
import ceaCoalJson from "@/data/scraped/cea_coal.json";
import kercChargesJson from "@/data/scraped/kerc_charges.json";
import bidassistJson from "@/data/scraped/bidassist.json";
import kpclEnvJson from "@/data/scraped/kpcl_env.json";
import bidawardJson from "@/data/scraped/bidaward.json";
import annualReportJson from "@/data/scraped/annual_report.json";

export interface ScrapedEnvelope<T = Record<string, unknown>> {
  feed: string;
  provenance: "REAL" | "CALIBRATED" | "SYNTHETIC";
  source_url: string;
  fetched_at: string;
  status: string;
  note: string;
  records: T[];
}

function env<T>(j: unknown): ScrapedEnvelope<T> {
  return j as ScrapedEnvelope<T>;
}

export interface ClearanceRecord {
  proposalTitle: string;
  proponent: string;
  capacityMW: number;
  forestDiversionAcres?: number;
  forestHectares?: number;
  treesAffected?: number;
  sanctuary?: string;
  proposalNo?: string;
  officialStatus?: string;
  submitted?: string;
  gates: { key: string; label: string; status: string; date: string; note: string }[];
  kpclProposals?: {
    proposalNo: string;
    gate: string;
    clearanceType: string;
    projectName: string;
    submitted: string;
    officialStatus: string;
    area?: string;
  }[];
  litigation?: string;
  sources?: string[];
}

export interface CagRecord {
  entity: string;
  subject: string;
  detail?: string;
  figureCr: number | null;
  citation: string;
  sourceUrl?: string;
}

export interface CaseRecord {
  label: string;
  forum: string;
  court?: string;
  year: number | null;
  date: string;
  docId: string | null;
  url: string | null;
  parties: string;
  kpclRole: string;
  note?: string;
  source: string;
}

export interface KercNorm {
  station: string;
  plant: string;
  orderDate?: string;
  kercRef?: string;
  roePct?: number;
  grossStationHeatRate?: number;
  source: string;
}

export interface CeaDgrUnit {
  unit: string;
  capacityMW: number | null;
  todayActualMU: number | null;
  outageMW: number | null;
  outageDate?: string | null;
  remark?: string | null;
}
export interface CeaDgrStation {
  plant: string; // BTPS | RTPS | YTPS
  station: string;
  capacityMW: number | null;
  todayProgMU: number | null;
  todayActualMU: number | null;
  fytdProgMU: number | null;
  fytdActualMU: number | null;
  coalStockDays: number | null;
  outageMW: number | null;
  units: CeaDgrUnit[];
  reportDate?: string;
  source?: string;
}

export const scrapedClearances = env<ClearanceRecord>(clearancesJson);
export const scrapedCases = env<CaseRecord>(casesJson);
export const scrapedCag = env<CagRecord>(cagJson);
export const scrapedReservoirs = env(reservoirsJson);
export const scrapedKerc = env<KercNorm>(kercJson);

export interface KercCharge {
  plant: string; // RTPS | BTPS | YTPS
  station: string;
  energyMU: number;
  capacityChargesCr: number;
  variableChargeCr: number;
  variableChargePerUnit: number;
  totalCostCr: number;
  totalCostPerUnit: number;
  source: string;
}
export const scrapedKercCharges = env<KercCharge>(kercChargesJson);

export interface TenderRecord {
  tenderId: string;
  title: string;
  valueRs: number | null;
  emdRs: number | null;
  postedDate: string | null;
  closingDate: string | null;
  location: string | null;
  category: string | null;
  contractType: string | null;
  noticeNo: string | null;
  docCount: number | null;
  source: string;
}
export const scrapedTenders = env<TenderRecord>(bidassistJson);

export interface EcDocRecord {
  title: string;
  url: string;
  docType: string; // HALF_YEARLY_COMPLIANCE | SIX_MONTHLY_COMPLIANCE | COMPLIANCE | EC_GRANT | EC_DOC
  project: string | null;
  period?: string | null;
  source: string;
}
export const scrapedKpclEnv = env<EcDocRecord>(kpclEnvJson);

export interface AwardRecord {
  awardRef: string;
  title: string;
  awardedValueRs: number | null;
  contractDate: string | null;
  contractPeriod: string | null;
  location: string | null;
  category: string | null;
  contractType: string | null;
  stage: string | null;
  aocDocAvailable: boolean;
  source: string;
}
export const scrapedAwards = env<AwardRecord>(bidawardJson);
export const scrapedCeaDgr = env<CeaDgrStation>(ceaDgrJson);

export interface CeaCoalStation {
  plant: string; // BTPS | RTPS | YTPS
  station: string;
  reportDate?: string;
  capacityMW: number | null;
  plfPct: number | null;
  dailyRequirementKT: number | null;
  normativeStockKT: number | null;
  actualStockKT: number | null;
  stockDays: number | null;
  belowNormative: boolean;
  receiptKT: number | null;
  consumptionKT: number | null;
  depleting: boolean;
  critical: boolean;
}
export const scrapedCeaCoal = env<CeaCoalStation>(ceaCoalJson);

export function hasReal<T>(e: ScrapedEnvelope<T>): boolean {
  return e.status === "LIVE" && e.records.length > 0;
}

/* ── KPCL Annual Report: real station generation (records is an object) ── */

export interface StationGen {
  station: string;
  plant: string; // RTPS | BTPS | YTPS | HYDRO
  genMU: number;
  genPrevMU: number | null;
}
export interface ThermalUnitReal {
  plant: string; // RTPS | BTPS
  unit: string; // U1-7 | U8 | U1 | U2 | U3
  plfPct?: number;
  auxPct?: number;
  specificCoal?: number;
  pafPct?: number;
}
export interface AnnualFinancials {
  saleOfEnergyCr?: number;
  saleOfEnergyPrevCr?: number;
  totalIncomeCr?: number;
  totalIncomePrevCr?: number;
  operatingProfitCr?: number;
  operatingProfitPrevCr?: number;
  pbtCr?: number;
  pbtPrevCr?: number;
}
export interface AnnualManpower {
  totalStrength?: number;
  totalStrengthPrev?: number;
  corporate?: number;
  corporatePrev?: number;
  workmen?: number;
  workmenPrev?: number;
  entries?: number;
  entriesPrev?: number;
  exits?: number;
  exitsPrev?: number;
  scPct?: number;
  stPct?: number;
  pwdPct?: number;
}
export interface AnnualReport {
  fy: string | null;
  stations: StationGen[];
  thermal: ThermalUnitReal[];
  reservoirs: { name: string; fullLevel: string; highestLevel: string; pctCapacity: number | null }[];
  financials: AnnualFinancials;
  manpower: AnnualManpower;
}

export const scrapedAnnualReport = annualReportJson as {
  status: string;
  fetched_at: string;
  note: string;
  records: AnnualReport;
};

export function hasAnnualReport(): boolean {
  const r = scrapedAnnualReport.records;
  return scrapedAnnualReport.status === "LIVE" && !!r && Array.isArray(r.stations) && r.stations.length > 0;
}
