// Solar [B7 — light] — forecast vs actual MU for the Pavagada-style block.
// Advisory placeholder; day-ahead solar forecasting is a commodity service.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { SimpleLine } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { solarDeviations } from "@/lib/views/plants";
import { monthFmt, num, pct } from "@/lib/format";

const DEVIATION_FLAG_PCT = 8;

export default function SolarPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const rows = solarDeviations();
  const chart = rows.map((r) => ({
    month: monthFmt(r.month),
    forecast: r.forecastMU,
    actual: r.actualMU,
  }));

  return (
    <>
      <PageHeader title={t(lang, "solar")} subtitle={subtitle(lang, scope, "solar")} />

      <div className="mb-3">
        <Chip tone="neutral">advisory — illustrative</Chip>
      </div>

      <SectionHead title="Forecast vs actual" right="MU by month" />
      <div className="panel p-4">
        <SimpleLine
          data={chart}
          xKey="month"
          unit=" MU"
          series={[
            { key: "forecast", label: "Forecast", color: PALETTE.muted, dashed: true },
            { key: "actual", label: "Actual", color: PALETTE.gold },
          ]}
        />
      </div>

      <SectionHead title="Deviation ledger" right={`flag when |deviation| > ${DEVIATION_FLAG_PCT}%`} />
      <table className="ledger">
        <thead>
          <tr>
            <th>Month</th><th className="num">Forecast MU</th><th className="num">Actual MU</th>
            <th className="num">Deviation</th><th>Flag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <td className="whitespace-nowrap">{monthFmt(r.month)}</td>
              <td className="num">{num(r.forecastMU, 1)}</td>
              <td className="num">{num(r.actualMU, 1)}</td>
              <td className={`num ${Math.abs(r.deviationPct) > DEVIATION_FLAG_PCT ? "text-warning font-semibold" : ""}`}>
                {r.deviationPct > 0 ? "+" : ""}{pct(r.deviationPct)}
              </td>
              <td>{Math.abs(r.deviationPct) > DEVIATION_FLAG_PCT ? <Chip tone="warning">forecast miss</Chip> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[0.78rem] text-muted mt-4 max-w-3xl">
        Day-ahead solar forecasting is a commoditized service — every scheduling desk already buys it.
        This surface is a placeholder fed by the Pavagada-style block so the deviation ledger has a home;
        it is not where the oversight value of this system lies.
      </p>
    </>
  );
}
