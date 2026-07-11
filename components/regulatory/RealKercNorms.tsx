// Real KERC-approved tariff norms, OCR-parsed from the scanned tariff orders.
// Server component — renders nothing until the KERC scraper has run.

import { hasReal, scrapedKerc } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead } from "@/components/ui/Kpi";
import { num } from "@/lib/format";

export function RealKercNorms({ plant }: { plant?: string }) {
  if (!hasReal(scrapedKerc)) return null;
  const rows = scrapedKerc.records.filter(
    (r) => !plant || plant === "ALL" || r.plant === plant,
  );
  if (rows.length === 0) return null;

  return (
    <>
      <SectionHead
        title="Real KERC-approved norms"
        right={<ProvenanceChip provenance="REAL" source="KERC tariff order (OCR)" fetched={scrapedKerc.fetched_at.slice(0, 10)} />}
      />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[560px]">
          <thead>
            <tr>
              <th>Station</th><th className="num">RoE</th>
              <th className="num">Gross Station Heat Rate</th><th>KERC order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.station}>
                <td className="font-medium whitespace-nowrap">{r.station}</td>
                <td className="num">{r.roePct != null ? `${r.roePct}%` : "—"}</td>
                <td className="num">{r.grossStationHeatRate != null ? `${num(r.grossStationHeatRate)} kCal/kWh` : "—"}</td>
                <td className="text-[0.72rem] text-muted whitespace-nowrap">
                  {r.orderDate ? `${r.orderDate}` : ""} {r.kercRef ? `· ${r.kercRef}` : ""}
                  {r.source?.startsWith("http") && (
                    <>
                      {" "}
                      <a className="underline" href={r.source} target="_blank" rel="noopener noreferrer">order →</a>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.68rem] text-faint mt-1">
        Approved norms read straight from KERC&apos;s scanned tariff order (OCR) — only the prose-stated figures
        are shown (no jumbled scanned-table numbers). These are the real thresholds the prudence simulator below
        should fire against.
      </p>
    </>
  );
}
