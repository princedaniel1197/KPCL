// Capital Projects Control Tower [A1] — the portfolio ledger, riskiest first.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, TwinBar } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { retenderFlag } from "@/lib/engines/execution";
import { crToInr, portfolioRows, scopeQs } from "@/lib/views/projects";
import { dateFmt, inrCr, num } from "@/lib/format";

export default function ControlTower({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);
  const rows = portfolioRows(scope);

  const portfolioCr = rows.reduce((s, r) => s + r.p.contractValueCr, 0);
  const diverging = rows.filter((r) => r.h.divergenceFlag).length;
  const gateBlocked = rows.filter((r) => r.h.gateBlocked).length;
  const ldAccruedCr = rows.reduce((s, r) => s + r.ldAccruedCr, 0);
  const drawingsPending = rows.reduce((s, r) => s + r.p.drawingsPending, 0);

  return (
    <>
      <PageHeader title={t(lang, "controlTower")} subtitle={subtitle(lang, scope, "controlTower")} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Portfolio value" value={inrCr(crToInr(portfolioCr))} sub={`${num(rows.length)} projects in scope`} />
        <KpiTile label="Projects diverging" value={num(diverging)} tone={diverging > 0 ? "danger" : "success"} sub="financial running ahead of physical" />
        <KpiTile label="Gate-blocked" value={num(gateBlocked)} tone={gateBlocked > 0 ? "danger" : "success"} href={`/projects/clearances${qs}`} sub="statutory clearance sequence" />
        <KpiTile label="LD accrued" value={inrCr(crToInr(ldAccruedCr))} tone={ldAccruedCr > 0 ? "warning" : "success"} sub="on project-linked contracts" />
        <KpiTile label="Drawings pending" value={num(drawingsPending)} tone={drawingsPending > 100 ? "warning" : "neutral"} sub="approval backlog, all projects" />
      </div>

      <p className="text-[0.7rem] text-muted mt-3 mb-2">
        Project ledgers are cumulative to date — the period selector does not filter this view.
      </p>

      <div className="overflow-x-auto">
        <table className="ledger min-w-[1100px]">
          <thead>
            <tr>
              <th>Project</th><th>Type</th><th>Plant</th><th>Contractor</th>
              <th className="num">Value</th><th>Progress</th><th className="num">Divergence</th>
              <th>Gate</th><th className="num">LD accrued</th><th>Next milestone</th><th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, h, contractor, ldAccruedCr: ld }) => (
              <tr key={p.id}>
                <td>
                  <Link className="underline font-medium" href={`/projects/${p.id}${qs}`}>{p.name}</Link>
                </td>
                <td>{p.type}</td>
                <td>{p.plant}</td>
                <td className="whitespace-nowrap">{contractor}</td>
                <td className="num">{inrCr(crToInr(p.contractValueCr))}</td>
                <td><TwinBar a={h.financialPct} b={h.physicalPct} labelA="Fin" labelB="Phy" /></td>
                <td className={`num ${h.divergenceFlag ? "text-danger font-semibold" : ""}`}>
                  {num(h.divergencePp, 1)} pp
                </td>
                <td className="whitespace-nowrap">
                  {h.blockedGate ? (
                    <Chip tone="danger">{h.blockedGate.label}</Chip>
                  ) : (
                    p.gates ? "clear" : "—"
                  )}
                </td>
                <td className="num">{ld > 0 ? inrCr(crToInr(ld)) : "—"}</td>
                <td className="whitespace-nowrap">
                  {h.nextMilestone
                    ? <>{h.nextMilestone.name} <span className="text-muted">· {dateFmt(h.nextMilestone.plannedDate)}</span></>
                    : "complete"}
                </td>
                <td className="space-x-1 whitespace-nowrap">
                  {h.divergenceFlag && <Chip tone="danger">divergence</Chip>}
                  {h.gateBlocked && <Chip tone="danger">gate blocked</Chip>}
                  {h.advanceVsFrozenFlag && <Chip tone="danger">advance vs frozen site</Chip>}
                  {h.courtContradiction && <Chip tone="danger">court contradiction</Chip>}
                  {retenderFlag(p) && <Chip tone="warning">re-tendered {p.retenderCount}×</Chip>}
                  {!h.divergenceFlag && !h.gateBlocked && !h.advanceVsFrozenFlag && !h.courtContradiction && !retenderFlag(p) && (
                    <Chip tone="success">clear</Chip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
