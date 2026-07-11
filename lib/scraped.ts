// Typed readers over the REAL scraped snapshots (data/scraped/*.json). The
// generator guarantees these files exist (empty until scrapers run), so these
// static imports never break a clean build. When scrapers/run_all.py runs, these
// carry genuine public-record data (Sharavathi clearances, HC PIL, CAG findings,
// reservoir levels) — tagged REAL, with source citations.

import clearancesJson from "@/data/scraped/clearances.json";
import casesJson from "@/data/scraped/cases.json";
import cagJson from "@/data/scraped/cag.json";
import reservoirsJson from "@/data/scraped/reservoirs.json";

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

export const scrapedClearances = env<ClearanceRecord>(clearancesJson);
export const scrapedCases = env(casesJson);
export const scrapedCag = env<CagRecord>(cagJson);
export const scrapedReservoirs = env(reservoirsJson);

export function hasReal<T>(e: ScrapedEnvelope<T>): boolean {
  return e.status === "LIVE" && e.records.length > 0;
}
