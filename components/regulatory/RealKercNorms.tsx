// Real KERC-approved tariff norms, OCR-parsed from the scanned tariff orders.
// Server component — renders nothing until the KERC scraper has run.

import { hasReal, scrapedKerc, scrapedKercCharges } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead } from "@/components/ui/Kpi";
import { num } from "@/lib/format";

export function RealKercNorms({ plant }: { plant?: string }) {
  const norms = hasReal(scrapedKerc)
    ? scrapedKerc.records.filter((r) => !plant || plant === "ALL" || r.plant === plant)
    : [];
  const charges = hasReal(scrapedKercCharges)
    ? scrapedKercCharges.records.filter((r) => !plant || plant === "ALL" || r.plant === plant)
    : [];
  if (norms.length === 0 && charges.length === 0) return null;

  return (
    <>
      {norms.length > 0 && (
      <RealKercNormsTable rows={norms} />
      )}
      {charges.length > 0 && (
        <>
          <SectionHead
            title="Real KERC-approved charges (₹/unit)"
            right={<ProvenanceChip provenance="REAL" source="KERC FY24 tariff order — Approved Power Purchase" fetched={scrapedKercCharges.fetched_at.slice(0, 10)} />}
          />
          <p className="text-[0.72rem] text-muted mb-2">
            KERC-approved capacity and variable (fuel) charges per KPCL thermal station, read from the FY24 tariff
            order&apos;s power-purchase annexure. Only complete table rows are shown — station-to-rate mapping is exact.
          </p>
          <div className="overflow-x-auto">
            <table className="ledger min-w-[600px]">
              <thead>
                <tr>
                  <th>Station</th>
                  <th className="num">Variable ₹/unit</th>
                  <th className="num">Total ₹/unit</th>
                  <th className="num">Capacity chg (₹cr)</th>
                  <th className="num">Energy (MU)</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((r) => (
                  <tr key={`${r.plant}-${r.station}`}>
                    <td className="font-medium whitespace-nowrap">{r.station}</td>
                    <td className="num">₹{r.variableChargePerUnit.toFixed(2)}</td>
                    <td className="num">₹{r.totalCostPerUnit.toFixed(2)}</td>
                    <td className="num">{num(r.capacityChargesCr)}</td>
                    <td className="num">{num(r.energyMU)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.68rem] text-faint mt-1 mb-4">
            The variable ₹/unit is the KERC-approved fuel-cost rate the coal-leakage engine ultimately feeds; total
            ₹/unit is the approved landed cost per station. Both are real approved rates, not modelled.
          </p>
        </>
      )}
    </>
  );
}

function RealKercNormsTable({ rows }: { rows: typeof scrapedKerc.records }) {
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
