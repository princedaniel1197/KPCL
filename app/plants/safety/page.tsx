// Safety & incidents [B8] — incident ledger with the RTPS CHP near-miss
// cluster surfaced as a leading indicator, not a lagging statistic.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { nearMissCluster, safetyKpis, scopedIncidents, type ChipTone } from "@/lib/views/plants";
import type { Incident } from "@/lib/types";
import { dateFmt, monthFmt, num, pct } from "@/lib/format";

const KIND_CHIP: Record<Incident["kind"], { tone: ChipTone; label: string }> = {
  NEAR_MISS: { tone: "info", label: "near miss" },
  FIRST_AID: { tone: "warning", label: "first aid" },
  LTI: { tone: "danger", label: "LTI" },
  PROPERTY: { tone: "neutral", label: "property" },
};

export default function SafetyLedger({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const kpis = safetyKpis(scope);
  const rows = [...scopedIncidents(scope)].sort((a, b) => b.date.localeCompare(a.date));
  const cluster = nearMissCluster();
  const showCluster = cluster !== null && (scope.plant === "ALL" || scope.plant === "RTPS");

  return (
    <>
      <PageHeader title={t(lang, "safety")} subtitle={subtitle(lang, scope, "safety")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Incidents (window)" value={num(kpis.total)} />
        <KpiTile label="Open" value={num(kpis.open)} tone={kpis.open > 0 ? "warning" : "success"} />
        <KpiTile label="Near-miss share" value={pct(kpis.nearMissSharePct, 0)} tone="info" sub="of all incidents in scope" />
        <KpiTile label="Lost-time injuries" value={num(kpis.ltis)} tone={kpis.ltis > 0 ? "danger" : "success"} />
      </div>

      {showCluster && cluster && (
        <div className="panel p-4 border-l-2 border-danger mt-4">
          <div className="font-semibold text-danger text-[0.9rem] mb-1">
            Near-miss cluster — {cluster.plant} {cluster.area}, {monthFmt(cluster.months[0])}–{monthFmt(cluster.months[1])}
          </div>
          <p className="text-[0.8rem] text-muted mb-2 max-w-3xl">
            {num(cluster.count)} near-misses at the same coal handling plant in two adjacent months. Clusters
            like this are the classic precursor pattern before a serious injury — the same conditions keep
            repeating until one of them connects. The cluster, latest first:
          </p>
          <ul className="text-[0.78rem] space-y-1">
            {cluster.rows.map((i) => (
              <li key={i.id}>
                <span className="tnum text-muted">{dateFmt(i.date)}</span> · <span className="font-medium">{i.id}</span> — {i.description}
                {i.status === "OPEN" && <span className="ml-2"><Chip tone="warning">open</Chip></span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <SectionHead title="Incident ledger" right={`${num(rows.length)} incidents in the scoped window, latest first`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[860px]">
          <thead>
            <tr>
              <th>Incident</th><th>Plant</th><th>Area</th><th>Date</th><th>Kind</th>
              <th className="num">Severity</th><th>Description</th><th>Status</th><th className="num">Open actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const kind = KIND_CHIP[i.kind];
              return (
                <tr key={i.id}>
                  <td className="font-medium">{i.id}</td>
                  <td>{i.plant}</td>
                  <td>{i.area}</td>
                  <td className="whitespace-nowrap">{dateFmt(i.date)}</td>
                  <td><Chip tone={kind.tone}>{kind.label}</Chip></td>
                  <td className="num">{num(i.severity)}</td>
                  <td className="text-muted">{i.description}</td>
                  <td>{i.status === "OPEN" ? <Chip tone="warning">open</Chip> : <Chip tone="success">closed</Chip>}</td>
                  <td className="num">{i.actionsOpen > 0 ? num(i.actionsOpen) : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="text-muted">No incidents recorded in this scope.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
