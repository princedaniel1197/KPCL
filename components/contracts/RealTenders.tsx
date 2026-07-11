// Real active KPCL tenders, pulled from BidAssist's JSON API (a third-party
// aggregator that re-publishes the public KPCL eProcurement portal, which is
// itself captcha-gated). Server component: reads the committed snapshot, renders
// nothing until the bidassist scraper has run.

import { hasReal, scrapedTenders, type TenderRecord } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead, Chip } from "@/components/ui/Kpi";
import { inrCr, num } from "@/lib/format";

function daysTo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  const now = new Date(scrapedTenders.fetched_at).getTime();
  return Math.round((d - now) / 86_400_000);
}

function rupees(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e7) return inrCr(v);
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${num(v)}`;
}

export function RealTenders({ limit = 25 }: { limit?: number }) {
  if (!hasReal(scrapedTenders)) return null;
  const rows: TenderRecord[] = [...scrapedTenders.records]
    .sort((a, b) => (b.valueRs ?? 0) - (a.valueRs ?? 0))
    .slice(0, limit);
  if (rows.length === 0) return null;

  const totalCr = scrapedTenders.records.reduce((s, t) => s + (t.valueRs ?? 0), 0) / 1e7;
  const closingSoon = scrapedTenders.records.filter((t) => {
    const d = daysTo(t.closingDate);
    return d != null && d >= 0 && d <= 7;
  }).length;

  return (
    <>
      <SectionHead
        title="Real active KPCL tenders"
        right={
          <ProvenanceChip
            provenance="REAL"
            source="KPCL eProcurement (via BidAssist)"
            fetched={scrapedTenders.fetched_at.slice(0, 10)}
          />
        }
      />
      <p className="text-[0.72rem] text-muted mb-2">
        {num(scrapedTenders.records.length)} live tenders · {inrCr(totalCr * 1e7)} total advertised value ·{" "}
        <span className={closingSoon > 0 ? "text-warning" : ""}>{num(closingSoon)} closing within 7 days</span>.
        Real published tender IDs, values and deadlines from KPCL&apos;s eProcurement portal — the state portal is
        captcha-gated, so this comes via the BidAssist aggregator. Showing the {num(rows.length)} highest-value.
      </p>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[720px]">
          <thead>
            <tr>
              <th>Tender ID</th>
              <th>Description</th>
              <th className="num">Value</th>
              <th className="num">EMD</th>
              <th>Location</th>
              <th className="num">Closes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const d = daysTo(t.closingDate);
              return (
                <tr key={t.tenderId}>
                  <td className="text-[0.72rem] font-medium whitespace-nowrap">{t.tenderId}</td>
                  <td className="text-[0.8rem]">{t.title}</td>
                  <td className="num">{rupees(t.valueRs)}</td>
                  <td className="num text-[0.75rem]">{rupees(t.emdRs)}</td>
                  <td className="text-[0.72rem] text-muted whitespace-nowrap">{t.location ?? "—"}</td>
                  <td className="num text-[0.72rem] whitespace-nowrap">
                    {t.closingDate ?? "—"}
                    {d != null && d >= 0 && (
                      <Chip tone={d <= 3 ? "danger" : d <= 7 ? "warning" : "neutral"}>{d}d</Chip>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
