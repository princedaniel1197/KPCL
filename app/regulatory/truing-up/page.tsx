// Truing-up variance ledgers [G1] — approved vs actual per station-year.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { truingUp } from "@/lib/engines/tariff";
import { isThermalStation, stationYears, THERMAL_STATIONS } from "@/lib/views/regulatory";
import { inrCr, num } from "@/lib/format";
import type { TariffYear, ThermalPlant } from "@/lib/types";

function statusChip(status: TariffYear["status"]) {
  if (status === "TRUED_UP") return <Chip tone="success">TRUED_UP</Chip>;
  if (status === "FILED") return <Chip tone="info">FILED</Chip>;
  return <Chip tone="warning">DRAFT</Chip>;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const stations: ThermalPlant[] = isThermalStation(scope.plant)
    ? [scope.plant]
    : [...THERMAL_STATIONS];

  const blocks = stations.flatMap((station) =>
    stationYears(station)
      .filter((y) => y.status !== "DRAFT")
      .map((y) => ({ station, y, rows: truingUp(y) })),
  );

  // Adverse = actual exceeds approved on a cost head (positive variance).
  const totalAdverseCr = blocks.reduce(
    (s, b) => s + b.rows.reduce((a, r) => a + Math.max(0, r.variance), 0),
    0,
  );
  const adverseRows = blocks.reduce(
    (s, b) => s + b.rows.filter((r) => r.variance > 0).length,
    0,
  );

  return (
    <>
      <PageHeader title={t(lang, "truingUp")} subtitle={subtitle(lang, scope, "truingUp")} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiTile label="Station-years shown" value={num(blocks.length)} sub={stations.join(" · ")} />
        <KpiTile label="Adverse variance ₹ (total)" value={inrCr(totalAdverseCr * 1e7)} tone="danger" sub="actual above approved, cost heads" />
        <KpiTile label="Adverse line items" value={num(adverseRows)} tone="warning" sub="across all shown variance ledgers" />
      </div>

      {blocks.map(({ station, y, rows }) => {
        const adverseCr = rows.reduce((a, r) => a + Math.max(0, r.variance), 0);
        return (
          <div key={`${station}-${y.fy}`}>
            <SectionHead
              title={`${station} · ${y.fy}`}
              right={
                <span className="flex items-center gap-2">
                  {statusChip(y.status)}
                  <span>adverse {inrCr(adverseCr * 1e7)}</span>
                </span>
              }
            />
            <table className="ledger">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Approved (₹ cr)</th>
                  <th className="num">Actual (₹ cr)</th>
                  <th className="num">Variance (₹ cr)</th>
                  <th className="num">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.item}>
                    <td>{r.item}</td>
                    <td className="num">{num(r.approved, 1)}</td>
                    <td className="num">{num(r.actual, 1)}</td>
                    <td className={`num ${r.variance > 0 ? "text-danger font-semibold" : ""}`}>
                      {r.variance >= 0 ? "+" : ""}{num(r.variance, 1)}
                    </td>
                    <td className={`num ${r.variance > 0 ? "text-danger" : ""}`}>
                      {r.variancePct >= 0 ? "+" : ""}{num(r.variancePct, 1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <p className="text-[0.72rem] text-muted mt-6">
        Adverse (red) rows are cost heads where actuals exceeded the approved figure — the delta is what the
        truing-up petition must justify, or absorb.
      </p>
    </>
  );
}
