// Board Reporting [A12] — one-click compiled Board / CEA / KERC status report,
// print-ready, every value computed live from the execution ledger.

import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF } from "@/lib/data";
import { crToInr, flagLines, portfolioRows } from "@/lib/views/projects";
import { dateFmt, inrCr, num, pct } from "@/lib/format";

export default function BoardReporting({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  // Report reads in ledger order (riskiest first) — same rows as the control tower.
  const rows = portfolioRows(scope);
  const portfolioCr = rows.reduce((s, r) => s + r.p.contractValueCr, 0);

  return (
    <>
      <PageHeader
        title={t(lang, "boardReporting")}
        subtitle={subtitle(lang, scope, "boardReporting")}
        actions={<PrintButton label="Print status report" />}
      />

      <div className="report-white panel max-w-[1080px] mx-auto p-10 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
        <div className="text-center border-b-[1.5px] border-gold pb-4 mb-6">
          <div className="font-serif text-2xl font-semibold">Karnataka Power Corporation Limited</div>
          <div className="text-[0.72rem] text-muted uppercase tracking-[0.14em] mt-1">
            Capital projects status report · Board / CEA / KERC · {dateFmt(AS_OF)}
          </div>
        </div>

        <p className="text-[0.84rem] leading-relaxed mb-5">
          Status of capital projects as of <span className="font-semibold">{dateFmt(AS_OF)}</span> — compiled
          live from the execution ledger. The statement covers {num(rows.length)} project
          {rows.length === 1 ? "" : "s"}{scope.plant !== "ALL" ? ` in the ${scope.plant} scope` : " across the corporation"} with
          a combined contract value of <span className="font-semibold">{inrCr(crToInr(portfolioCr))}</span>. Financial
          progress is ΣRA bills against contract value; physical progress is milestone-weighted completion;
          flags are computed, not reported.
        </p>

        <div className="overflow-x-auto">
          <table className="ledger min-w-[980px] mb-6">
            <thead>
              <tr>
                <th>Project</th><th>Type</th><th>Plant</th><th>Contractor</th>
                <th className="num">Value</th><th className="num">Fin %</th><th className="num">Phy %</th>
                <th className="num">Div. pp</th><th>Gate state</th><th>Next milestone</th><th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, h, contractor }) => {
                const flags = flagLines(p, h);
                return (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.type}</td>
                    <td>{p.plant}</td>
                    <td className="whitespace-nowrap">{contractor}</td>
                    <td className="num">{inrCr(crToInr(p.contractValueCr))}</td>
                    <td className="num">{pct(h.financialPct)}</td>
                    <td className="num">{pct(h.physicalPct)}</td>
                    <td className={`num ${h.divergenceFlag ? "text-danger font-semibold" : ""}`}>{num(h.divergencePp, 1)}</td>
                    <td>{h.blockedGate ? `${h.blockedGate.label} — BLOCKED` : p.gates ? "all clear" : "—"}</td>
                    <td className="whitespace-nowrap">
                      {h.nextMilestone
                        ? `${h.nextMilestone.name} · ${dateFmt(h.nextMilestone.plannedDate)}`
                        : "complete"}
                    </td>
                    <td className={flags.length > 0 ? "text-danger" : "text-muted"}>
                      {flags.length > 0 ? flags.join("; ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[0.82rem] leading-relaxed mb-8">
          This statement is generated from the same ledger that drives the control tower — there is no
          separately typed version to reconcile. Divergence, gate state, liquidated-damages accrual and
          drawings backlog recompute on every compilation.
        </p>

        <div className="flex justify-between text-[0.82rem]">
          <div className="text-muted">
            Compiled {dateFmt(AS_OF)} · Sentinel execution ledger
          </div>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-ink pt-1">Director (Technical)</div>
          </div>
        </div>

        <div className="mt-8 pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
          Synthetic demonstration document — no representation about any actual supplier, contractor, railway, or employee.
        </div>
      </div>
    </>
  );
}
