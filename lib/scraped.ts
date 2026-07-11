// Typed readers over the REAL scraped snapshots (data/scraped/*.json). The
// generator guarantees these files exist (empty until scrapers run), so these
// static imports never break a clean build. When scrapers/run_all.py runs, these
// carry genuine public-record data (Sharavathi clearances, HC PIL, CAG findings,
// reservoir levels) — tagged REAL, with source citations.

import clearancesJson from "@/data/scraped/clearances.json";
import casesJson from "@/data/scraped/cases.json";
import cagJson from "@/data/scraped/cag.json";
import reservoirsJson from "@/data/scraped/reservoirs.json";
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

export const scrapedClearances = env<ClearanceRecord>(clearancesJson);
export const scrapedCases = env<CaseRecord>(casesJson);
export const scrapedCag = env<CagRecord>(cagJson);
export const scrapedReservoirs = env(reservoirsJson);

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
export interface AnnualReport {
  fy: string | null;
  stations: StationGen[];
  thermal: ThermalUnitReal[];
  reservoirs: { name: string; fullLevel: string; highestLevel: string; pctCapacity: number | null }[];
  financials: AnnualFinancials;
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
