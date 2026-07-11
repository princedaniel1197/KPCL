// Typed reader over the scraper manifest (data/manifest.json). The scraper suite
// writes it; the generator guarantees a baseline exists (so this static import
// never breaks a clean build). This is the single source for provenance display.

import manifestJson from "@/data/manifest.json";

export type Provenance = "REAL" | "CALIBRATED" | "SYNTHETIC";
export type FeedStatus = "LIVE" | "BASELINE" | "PENDING" | "SKIPPED" | "STALE" | "ERROR";

export interface ManifestSource {
  feed: string;
  label: string;
  provenance: Provenance;
  status: FeedStatus;
  powers: string[];
  count: number;
  calibration: boolean;
  note: string;
  source_url?: string;
  robots?: string;
  fetched_at?: string | null;
}

export interface Manifest {
  generatedAt: string;
  note?: string;
  sources: ManifestSource[];
  summary: Record<string, number>;
}

export const manifest = manifestJson as Manifest;

/** Human labels for the three provenance classes. */
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  REAL: "Real · public record",
  CALIBRATED: "Calibrated · real parameter",
  SYNTHETIC: "Synthetic · modelled",
};
