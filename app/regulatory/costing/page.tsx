// Station costing [G4] — ₹/kWh build-up per station from the draft-year
// actuals, with the allocation rules that distribute common costs.

import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHead } from "@/components/ui/Kpi";
import { StackedBars } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { costBuildUp } from "@/lib/engines/tariff";
import { draftYearFor, THERMAL_STATIONS } from "@/lib/views/regulatory";
import { num } from "@/lib/format";

const ALLOCATION_RULES = [
  { rule: "Corporate O&M overheads", basis: "Installed-capacity ratio across stations" },
  { rule: "Interest & finance charges", basis: "Direct asset-register mapping to the borrowing station" },
  { rule: "Common township costs", basis: "Headcount ratio (sanctioned strength per station)" },
  { rule: "Hydro common works", basis: "Energy-share ratio of the beneficiary stations" },
  { rule: "Corporate office establishment", basis: "Gross generation (MU) ratio, trued up annually" },
] as const;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const stations = THERMAL_STATIONS.map((station) => {
    const draft = draftYearFor(station);
    return draft ? { station, fy: draft.fy, block: draft.actual, build: costBuildUp(draft.actual) } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const chartData = stations.map((s) => ({
    station: s.station,
    fixed: Number(s.build.perUnitFixed.toFixed(2)),
    energy: Number(s.build.perUnitEnergy.toFixed(2)),
  }));

  return (
    <>
      <PageHeader title={t(lang, "costing")} subtitle={subtitle(lang, scope, "costing")} />

      {/* ── Hero: ₹/kWh per station ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {stations.map((s) => (
          <div key={s.station} className="panel px-5 py-4">
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
              {s.station} · {s.fy} draft
            </div>
            <div className="hero-numeral text-4xl mt-1">₹{num(s.build.perUnitTotal, 2)}</div>
            <div className="text-[0.68rem] text-muted mt-1">per kWh, all-in cost of generation</div>
            <div className="flex justify-between text-[0.72rem] mt-3 pt-2 border-t border-rule">
              <span>Fixed ₹{num(s.build.perUnitFixed, 2)}</span>
              <span>Energy ₹{num(s.build.perUnitEnergy, 2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Fixed vs energy split ── */}
      <SectionHead title="Fixed vs energy split" right="₹/kWh, draft-year actuals" />
      <div className="panel p-4">
        <StackedBars
          data={chartData}
          xKey="station"
          unit=" ₹/kWh"
          series={[
            { key: "fixed", label: "Fixed charges", color: PALETTE.ink },
            { key: "energy", label: "Energy (fuel)", color: PALETTE.gold },
          ]}
        />
      </div>

      {/* ── Build-up waterfall per station ── */}
      {stations.map((s) => {
        const kwh = s.block.genMU * 1e6;
        const perUnit = (cr: number) => (kwh > 0 ? (cr * 1e7) / kwh : 0);
        const rows = [
          { item: "Return on Equity", cr: s.build.fixed.roe, bold: false },
          { item: "Interest & finance charges", cr: s.build.fixed.interest, bold: false },
          { item: "Depreciation", cr: s.build.fixed.depreciation, bold: false },
          { item: "O&M expenses", cr: s.build.fixed.om, bold: false },
          { item: "Fixed charges subtotal", cr: s.build.fixed.totalFixed, bold: true },
          { item: "Fuel (energy charges)", cr: s.build.energy.fuelCost, bold: false },
          { item: "Total cost of generation", cr: s.build.totalCr, bold: true },
        ];
        return (
          <div key={s.station}>
            <SectionHead title={`${s.station} build-up`} right={`${s.fy} draft · ${num(s.block.genMU)} MU`} />
            <table className="ledger">
              <thead>
                <tr><th>Head</th><th className="num">₹ cr</th><th className="num">₹/kWh</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.item} className={r.bold ? "font-semibold" : ""}>
                    <td>{r.item}</td>
                    <td className="num">{num(r.cr, 1)}</td>
                    <td className="num">{num(perUnit(r.cr), 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ── Allocation rules ── */}
      <SectionHead title="Allocation rules" right="how common costs reach each station's books" />
      <table className="ledger">
        <thead>
          <tr><th>Rule</th><th>Basis</th></tr>
        </thead>
        <tbody>
          {ALLOCATION_RULES.map((r) => (
            <tr key={r.rule}>
              <td className="font-medium">{r.rule}</td>
              <td>{r.basis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
