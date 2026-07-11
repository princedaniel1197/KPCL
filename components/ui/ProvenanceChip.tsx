// Provenance chip — THE honesty surface. Every real/calibrated/synthetic value
// can carry one. Green ● Real, gold ◐ Calibrated, grey ○ Synthetic.

import type { Provenance } from "@/lib/manifest";

const DOT: Record<Provenance, string> = { REAL: "●", CALIBRATED: "◐", SYNTHETIC: "○" };
const TONE: Record<Provenance, string> = {
  REAL: "text-success",
  CALIBRATED: "text-gold",
  SYNTHETIC: "text-faint",
};
const BG: Record<Provenance, string> = {
  REAL: "bg-success/10",
  CALIBRATED: "bg-gold/10",
  SYNTHETIC: "bg-wash",
};

export function ProvenanceChip({
  provenance,
  source,
  fetched,
}: {
  provenance: Provenance;
  source?: string;
  fetched?: string | null;
}) {
  const label =
    provenance === "REAL" ? "Real" : provenance === "CALIBRATED" ? "Calibrated" : "Synthetic";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[0.62rem] font-semibold ${BG[provenance]} ${TONE[provenance]}`}
      title={source ? `${label} · ${source}${fetched ? ` · fetched ${fetched}` : ""}` : label}
    >
      <span aria-hidden>{DOT[provenance]}</span>
      {label}
      {source && <span className="font-normal opacity-80">· {source}</span>}
    </span>
  );
}

/** Small legend used at the top of provenance-tagged screens. */
export function ProvenanceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[0.66rem] text-muted">
      <span className="text-success">● Real — public record, real names</span>
      <span className="text-gold">◐ Calibrated — real parameter shaping synthetic instances</span>
      <span className="text-faint">○ Synthetic — modelled, fictional counterparties</span>
    </div>
  );
}
