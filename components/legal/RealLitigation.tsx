// Real KPCL litigation scraped from Indian Kanoon (public judgment database).
// Server component — reads the committed snapshot; empty until the scraper runs.

import { hasReal, scrapedCases } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead } from "@/components/ui/Kpi";
import { num } from "@/lib/format";

const ROWS_SHOWN = 30;

export function RealLitigation() {
  if (!hasReal(scrapedCases)) return null;
  const reported = scrapedCases.records.filter((r) => r.docId);
  const byForum = new Map<string, number>();
  for (const r of reported) byForum.set(r.forum, (byForum.get(r.forum) ?? 0) + 1);
  const forums = [...byForum.entries()].sort((a, b) => b[1] - a[1]);
  const rows = [...reported].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, ROWS_SHOWN);

  return (
    <>
      <SectionHead
        title="Reported litigation — real"
        right={<ProvenanceChip provenance="REAL" source="Indian Kanoon" fetched={scrapedCases.fetched_at.slice(0, 10)} />}
      />
      <p className="text-[0.72rem] text-muted mb-2">
        {num(reported.length)} reported KPCL/RPCL matters pulled from the public judgment database, across{" "}
        {forums.map(([f, n], i) => (
          <span key={f}>
            {i > 0 && " · "}
            <span className="font-medium text-ink">{f}</span> {n}
          </span>
        ))}
        . Real parties, forums and dates — distinct from the synthetic matters ledger below (which models live
        exposure and hearing clocks KPCL's internal CMS would carry).
      </p>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[820px]">
          <thead>
            <tr>
              <th className="w-14">Year</th><th>Parties</th><th>Forum</th><th>KPCL role</th><th className="w-20">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.docId}>
                <td className="tnum">{r.year ?? "—"}</td>
                <td>{r.parties}</td>
                <td className="whitespace-nowrap">{r.forum}</td>
                <td className="text-muted whitespace-nowrap">{r.kpclRole}</td>
                <td>
                  {r.url ? (
                    <a className="underline text-[0.75rem]" href={r.url} target="_blank" rel="noopener noreferrer">
                      judgment →
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reported.length > ROWS_SHOWN && (
        <p className="text-[0.68rem] text-faint mt-1">
          Showing {ROWS_SHOWN} most recent of {num(reported.length)}. Refresh with{" "}
          <code>python scrapers/run_all.py --only cases</code>.
        </p>
      )}
    </>
  );
}
