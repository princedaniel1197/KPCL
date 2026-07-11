// Hydro [B6 — light] — reservoir levels and inflow vs the 5-year band.
// Advisory surface only.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { InlineBar } from "@/components/plants/InlineBar";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { reservoirs } from "@/lib/data";
import { inflowChipMeta, isHydroScope } from "@/lib/views/plants";
import { num, pct } from "@/lib/format";

export default function HydroPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isHydroScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "hydro")} subtitle={subtitle(lang, scope, "hydro")} />
        <p className="text-muted text-sm">Hydro reservoirs sit outside this plant scope. Switch scope to Hydro or All plants.</p>
      </>
    );
  }

  const avgLevel = reservoirs.reduce((s, r) => s + r.levelPct, 0) / (reservoirs.length || 1);
  const gen6mo = reservoirs.reduce((s, r) => s + r.genMU6mo, 0);
  const stations = reservoirs.filter((r) => r.stationMW > 0).length;

  return (
    <>
      <PageHeader title={t(lang, "hydro")} subtitle={subtitle(lang, scope, "hydro")} />

      <div className="mb-3">
        <Chip tone="neutral">advisory — illustrative</Chip>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Reservoirs" value={num(reservoirs.length)} />
        <KpiTile label="Average level" value={pct(avgLevel)} tone={avgLevel < 50 ? "warning" : "success"} />
        <KpiTile label="Hydro generation (6 mo)" value={`${num(gen6mo)} MU`} />
        <KpiTile label="Stations" value={num(stations)} sub="powerhouse-bearing reservoirs" />
      </div>

      <SectionHead title="Reservoir ledger" right="inflow judged against each reservoir's 5-year seasonal band" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[860px]">
          <thead>
            <tr>
              <th>Reservoir</th><th>River</th><th className="num">Station MW</th>
              <th>Level</th><th className="num">Inflow cusecs</th><th className="num">5-yr band</th>
              <th>Inflow signal</th><th className="num">Gen 6 mo MU</th>
            </tr>
          </thead>
          <tbody>
            {reservoirs.map((r) => {
              const inflow = inflowChipMeta(r);
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.river}</td>
                  <td className="num">{r.stationMW > 0 ? num(r.stationMW) : "—"}</td>
                  <td className="min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <InlineBar value={r.levelPct} tone={r.levelPct < 40 ? "danger" : "gold"} />
                      <span className="tnum w-12 text-right">{pct(r.levelPct, 0)}</span>
                    </div>
                  </td>
                  <td className="num">{num(r.inflowCusecs)}</td>
                  <td className="num text-muted">{num(r.inflow5yrLow)}–{num(r.inflow5yrHigh)}</td>
                  <td><Chip tone={inflow.tone}>{inflow.label}</Chip></td>
                  <td className="num">{num(r.genMU6mo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
