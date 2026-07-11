// Real recent KPCL contract awards (Award-of-Contract results), pulled from
// BidAssist's bidaward API — a companion to the active-tenders feed. Server
// component: renders nothing until the bidaward scraper has run.
//
// The winning bidder's name lives inside the AOC PDF (not the list API), so this
// shows what was awarded and at what value, not who won.

import { hasReal, scrapedAwards, type AwardRecord } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead } from "@/components/ui/Kpi";
import { inrCr, num } from "@/lib/format";

function rupees(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e7) return inrCr(v);
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${num(v)}`;
}

export function RealAwards({ limit = 20 }: { limit?: number }) {
  if (!hasReal(scrapedAwards)) return null;
  const rows: AwardRecord[] = [...scrapedAwards.records]
    .sort((a, b) => (b.awardedValueRs ?? 0) - (a.awardedValueRs ?? 0))
    .slice(0, limit);
  if (rows.length === 0) return null;

  const totalCr = scrapedAwards.records.reduce((s, a) => s + (a.awardedValueRs ?? 0), 0) / 1e7;

  return (
    <>
      <SectionHead
        title="Real recent KPCL contract awards"
        right={
          <ProvenanceChip
            provenance="REAL"
            source="KPCL eProcurement AOC (via BidAssist)"
            fetched={scrapedAwards.fetched_at.slice(0, 10)}
          />
        }
      />
      <p className="text-[0.72rem] text-muted mb-2">
        {num(scrapedAwards.records.length)} most-recent Award-of-Contract results · {inrCr(totalCr * 1e7)} awarded
        value. Real published AOC references, awarded values and contract dates from KPCL&apos;s eProcurement portal
        (via BidAssist). The winning bidder is inside each AOC document, not the summary. Showing the{" "}
        {num(rows.length)} highest-value.
      </p>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[720px]">
          <thead>
            <tr>
              <th>Award Ref</th>
              <th>What was awarded</th>
              <th className="num">Awarded value</th>
              <th>Location</th>
              <th className="num">Contract date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.awardRef}>
                <td className="text-[0.72rem] font-medium whitespace-nowrap">{a.awardRef}</td>
                <td className="text-[0.8rem]">{a.title}</td>
                <td className="num">{rupees(a.awardedValueRs)}</td>
                <td className="text-[0.72rem] text-muted whitespace-nowrap">{a.location ?? "—"}</td>
                <td className="num text-[0.72rem] whitespace-nowrap">{a.contractDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
