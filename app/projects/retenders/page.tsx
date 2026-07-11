// Re-tenders [A10] — repeated tendering of the same scope as the signature of
// an unresolved underlying problem.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { Callout } from "@/components/projects/Callout";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF } from "@/lib/data";
import { retenderFlag } from "@/lib/engines/execution";
import { daysBetween } from "@/lib/engines/obligations";
import { contractorName, crToInr, scopeQs, scopedProjects, spendToDateCr } from "@/lib/views/projects";
import { dateFmt, inrCr, num } from "@/lib/format";

export default function Retenders({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);
  const rows = scopedProjects(scope)
    .filter((p) => p.retenderCount >= 1)
    .sort((a, b) => b.retenderCount - a.retenderCount);

  return (
    <>
      <PageHeader title={t(lang, "retenders")} subtitle={subtitle(lang, scope, "retenders")} />

      <div className="mb-4">
        <Callout tone="warning" title="Why re-tender counts matter">
          A tender that has to be floated again and again for the same scope is not a procurement statistic —
          it is the signature of an unresolved technical problem. Each cycle resets the clock, re-prices the
          work, and leaves the original defect exactly where it was. A count of three or more is treated as a
          red flag on this ledger.
        </Callout>
      </div>

      <p className="text-[0.7rem] text-muted mb-2">
        Re-tender history is cumulative to date — the period selector does not filter this view.
      </p>

      {rows.length === 0 ? (
        <p className="text-muted text-sm">No re-tendered project in this plant scope.</p>
      ) : (
        <table className="ledger">
          <thead>
            <tr>
              <th>Project</th><th>Contractor</th><th className="num">Re-tenders</th>
              <th>Started</th><th className="num">Elapsed days</th><th className="num">Spend to date</th><th>Status note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="underline font-medium" href={`/projects/${p.id}${qs}`}>{p.name}</Link>
                </td>
                <td className="whitespace-nowrap">{contractorName(p)}</td>
                <td className="num">
                  {retenderFlag(p) ? (
                    <Chip tone="danger">re-tendered {p.retenderCount}×</Chip>
                  ) : (
                    num(p.retenderCount)
                  )}
                </td>
                <td className="whitespace-nowrap">{dateFmt(p.start)}</td>
                <td className="num">{num(daysBetween(p.start, AS_OF))}</td>
                <td className="num">{inrCr(crToInr(spendToDateCr(p)))}</td>
                <td className="text-muted">
                  {retenderFlag(p)
                    ? `Same scope tendered ${p.retenderCount + 1} times — the defect, not the tender, is what remains unresolved.`
                    : "Single re-tender — within routine procurement variation; monitor the next cycle."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionHead title="Reading the pattern" />
      <p className="text-[0.8rem] text-muted leading-relaxed max-w-[70ch]">
        Where a rectification package keeps returning to tender, the ledger reads the count against elapsed
        time and spend to date: money and months accumulate while the underlying system stays broken. The
        remedy is a technical diagnosis before a fourth NIT — not a fourth NIT.
      </p>
    </>
  );
}
