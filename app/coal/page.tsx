// Coal & Fuel dashboard [C1–C8 overview].

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { StackedBars } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { coalAggregates, isThermalScope, scopedLeague } from "@/lib/views/coal";
import { collieryById } from "@/lib/data";
import { inrCr, monthFmt, num, pct } from "@/lib/format";
import { RealCoalStock } from "@/components/coal/RealCoalStock";

export default function CoalDashboard({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "coalDashboard")} subtitle={subtitle(lang, scope, "coalDashboard")} />
        <p className="text-muted text-sm">No coal movement for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const agg = coalAggregates(scope);
  const league = scopedLeague(scope).slice(0, 5);
  const chartData = agg.byMonth.map((m) => ({ ...m, month: monthFmt(m.month) }));
  const claimTotal = agg.claimPipeline.reduce((s, c) => s + c.amount, 0);
  const recovered = agg.claimPipeline.find((c) => c.status === "RECOVERED");

  return (
    <>
      <PageHeader title={t(lang, "coalDashboard")} subtitle={subtitle(lang, scope, "coalDashboard")} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile label="Leakage (window)" value={inrCr(agg.leakage.total)} tone="danger" href="/coal/ledger" sub={`${num(agg.rakeCount)} rakes reconciled`} />
        <KpiTile label="Grade overbilling" value={inrCr(agg.leakage.overbilling)} tone="danger" href="/coal/sources" sub={`${num(agg.slippedRakes)} slipped rakes`} />
        <KpiTile label="Excess transit loss" value={inrCr(agg.leakage.excessTransit)} tone="warning" href="/coal/sources" sub={`avg ${pct(agg.avgTransitLossPct)} vs 1.5% norm`} />
        <KpiTile label="Efficiency loss" value={inrCr(agg.leakage.efficiency)} tone="warning" href="/coal/stockyard" sub="unexplained yard-to-boiler kcal" />
        <KpiTile label="Demurrage + idle freight" value={inrCr(agg.leakage.demurrage + agg.leakage.idleFreight)} tone="warning" href="/coal/demurrage" />
        <KpiTile label="Claims pipeline" value={inrCr(claimTotal)} tone="info" href="/coal/claims" sub={`${inrCr(recovered?.amount ?? 0)} recovered`} />
      </div>

      <RealCoalStock scope={scope} />

      <SectionHead title="Leakage by month" right="₹ cr, by reconciliation leg" />
      <div className="panel p-4">
        <StackedBars
          data={chartData}
          xKey="month"
          unit=" cr"
          series={[
            { key: "overbilling", label: "Grade overbilling", color: PALETTE.ink },
            { key: "transit", label: "Excess transit", color: PALETTE.gold },
            { key: "efficiency", label: "Efficiency", color: PALETTE.muted },
            { key: "logistics", label: "Demurrage + idle freight", color: PALETTE.faint },
          ]}
        />
      </div>

      <SectionHead title="Source watchlist" right={<Link className="underline" href="/coal/sources">full league →</Link>} />
      <div className="overflow-x-auto">
      <table className="ledger min-w-[720px]">
        <thead>
          <tr>
            <th>Source</th><th className="num">Rakes</th><th className="num">Transit loss</th>
            <th className="num">Avg GCV slip</th><th className="num">Slipped rakes</th><th className="num">Leakage ₹</th><th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {league.map((s) => (
            <tr key={s.source}>
              <td>{collieryById.get(s.source)?.name ?? s.source}</td>
              <td className="num">{num(s.rakes)}</td>
              <td className="num">{pct(s.transitLossPct)}</td>
              <td className="num">{num(s.avgGcvSlip)} kcal</td>
              <td className="num">{pct(s.slippedRakePct, 0)}</td>
              <td className="num">{inrCr(s.totalLeakage)}</td>
              <td>
                {s.slippedRakePct > 25 ? <Chip tone="danger">grade slippage</Chip>
                  : s.transitLossPct > 1.8 ? <Chip tone="warning">transit loss</Chip>
                  : <Chip tone="success">within norms</Chip>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <SectionHead title="Claims pipeline" right={<Link className="underline" href="/coal/claims">claims ledger →</Link>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {agg.claimPipeline.map((c) => (
          <KpiTile
            key={c.status}
            label={c.status}
            value={inrCr(c.amount)}
            sub={`${c.count} claims`}
            tone={c.status === "RECOVERED" ? "success" : c.status === "DRAFT" ? "warning" : "info"}
            href="/coal/claims"
          />
        ))}
      </div>
    </>
  );
}
