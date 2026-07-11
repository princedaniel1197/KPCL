// Fleet ledger [B1/B3] — every generating unit as a stat block: PLF,
// availability, heat-rate ₹ drift, rule-based risk index, FGD clock.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { InlineBar } from "@/components/plants/InlineBar";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { fgdChipMeta, fleetKpis, isThermalScope, scopeQs, unitSummaries } from "@/lib/views/plants";
import { inrCr, num, pct } from "@/lib/format";

export default function FleetLedger({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "fleet")} subtitle={subtitle(lang, scope, "fleet")} />
        <p className="text-muted text-sm">No thermal units in this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const kpis = fleetKpis(scope);
  const rows = unitSummaries(scope);
  const qs = scopeQs(scope);

  return (
    <>
      <PageHeader title={t(lang, "fleet")} subtitle={subtitle(lang, scope, "fleet")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Fleet generation" value={`${num(kpis.genMU)} MU`} sub={`${num(kpis.unitCount)} units in scope`} />
        <KpiTile label="Average PLF" value={pct(kpis.avgPlf)} sub="units under R&M excluded" />
        <KpiTile label="Heat-rate excess cost" value={inrCr(kpis.hrExtraCr * 1e7)} tone="danger" sub="actual vs norm, scoped window" />
        <KpiTile
          label="FGD deadlines breached"
          value={num(kpis.fgdBreached)}
          tone={kpis.fgdBreached > 0 ? "danger" : "success"}
          href={`/plants/emissions${qs}`}
          sub="MoEFCC norm deadline past"
        />
      </div>

      <SectionHead title="Generating units" right="click a unit for its historian, outages and emissions" />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => {
          const fgd = fgdChipMeta(r.unit, r.fgdAging);
          const hrDanger = !r.underRnM && r.hrExtraCr > 1;
          return (
            <div key={r.unit.id} className="panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/plants/${r.unit.id}${qs}`} className="font-serif text-xl font-semibold underline">
                    {r.unit.id}
                  </Link>
                  <div className="text-[0.68rem] text-muted mt-0.5">
                    {num(r.unit.capacityMW)} MW · commissioned {r.unit.commissioned}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.underRnM && <Chip tone="info">under R&M</Chip>}
                  <Chip tone={fgd.tone}>{fgd.label}</Chip>
                </div>
              </div>

              <dl className="text-[0.8rem] mt-3 space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-muted">Avg PLF</dt>
                  <dd className="tnum font-medium">{r.underRnM ? `${pct(r.avgPlf)} · R&M outage` : pct(r.avgPlf)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Avg availability</dt>
                  <dd className="tnum font-medium">{pct(r.avgAvail)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Heat-rate drift ₹ (window)</dt>
                  <dd className={`tnum font-medium ${hrDanger ? "text-danger" : ""}`}>
                    {r.hrExtraCr > 0 ? inrCr(r.hrExtraCr * 1e7) : "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">
                  <span>Risk index</span>
                  <span className="tnum">{num(r.risk.riskIndex, 0)}/100</span>
                </div>
                <InlineBar value={r.risk.riskIndex} tone={r.risk.riskIndex >= 60 ? "danger" : "gold"} />
                <div className="mt-1.5">
                  <Chip tone="neutral">concept — illustrative on synthetic data</Chip>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
