// KERC filing workspace [G1] — cycle status, form-section builder for the
// DRAFT year, prudence simulator and a print-ready petition annexure.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { PrintButton } from "@/components/ui/PrintButton";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { costBuildUp, prudenceCheck, truingUp } from "@/lib/engines/tariff";
import {
  corporatePrudenceCr, draftYearFor, filedYearFor, isThermalStation,
  scopeQs, stationYears, THERMAL_STATIONS,
} from "@/lib/views/regulatory";
import { inrCr, num, pct } from "@/lib/format";
import type { TariffYear } from "@/lib/types";
import { RealKercNorms } from "@/components/regulatory/RealKercNorms";

function statusChip(status: TariffYear["status"]) {
  if (status === "TRUED_UP") return <Chip tone="success">TRUED_UP</Chip>;
  if (status === "FILED") return <Chip tone="info">FILED</Chip>;
  return <Chip tone="warning">DRAFT</Chip>;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const stationParam = typeof searchParams.station === "string" ? searchParams.station : "";
  const station = isThermalStation(stationParam)
    ? stationParam
    : isThermalStation(scope.plant)
      ? scope.plant
      : "RTPS";

  const cycles = stationYears(station);
  const draft = draftYearFor(station);
  const filed = filedYearFor(station);
  const flags = draft ? prudenceCheck(draft) : [];
  const stationPrudenceCr = flags.reduce((s, f) => s + f.atRiskCr, 0);
  const corporateCr = corporatePrudenceCr();

  const draftBuild = draft ? costBuildUp(draft.actual) : null;
  const filedBuild = filed ? costBuildUp(filed.actual) : null;
  const variance = draft ? truingUp(draft) : [];

  const fixedRows: { item: string; prior: number | null; draftV: number | null }[] = draftBuild
    ? [
        { item: "Return on Equity", prior: filedBuild?.fixed.roe ?? null, draftV: draftBuild.fixed.roe },
        { item: "Interest & finance charges", prior: filedBuild?.fixed.interest ?? null, draftV: draftBuild.fixed.interest },
        { item: "Depreciation", prior: filedBuild?.fixed.depreciation ?? null, draftV: draftBuild.fixed.depreciation },
        { item: "O&M expenses", prior: filedBuild?.fixed.om ?? null, draftV: draftBuild.fixed.om },
        { item: "Total fixed charges", prior: filedBuild?.fixed.totalFixed ?? null, draftV: draftBuild.fixed.totalFixed },
      ]
    : [];

  return (
    <>
      <PageHeader title={t(lang, "tariffFiling")} subtitle={subtitle(lang, scope, "tariffFiling")} />

      {/* ── Station picker ── */}
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        {THERMAL_STATIONS.map((s) => (
          <Link
            key={s}
            href={`/regulatory${scopeQs(scope, { station: s })}`}
            className={`px-3 py-1 text-[0.75rem] rounded-sm border ${station === s ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <RealKercNorms plant={scope.plant} />

      {/* ── Cycle list ── */}
      <SectionHead title={`Tariff cycles — ${station}`} right="three-year window: trued-up · filed · draft" />
      <table className="ledger">
        <thead>
          <tr>
            <th>FY</th><th>Status</th>
            <th className="num">Fixed charges (₹ cr)</th><th className="num">Fuel cost (₹ cr)</th>
            <th className="num">Total (₹ cr)</th><th className="num">₹/kWh</th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((y) => {
            const b = costBuildUp(y.actual);
            return (
              <tr key={y.fy}>
                <td className="font-medium">{y.fy}</td>
                <td>{statusChip(y.status)}</td>
                <td className="num">{num(b.fixed.totalFixed, 1)}</td>
                <td className="num">{num(b.energy.fuelCost, 1)}</td>
                <td className="num">{num(b.totalCr, 1)}</td>
                <td className="num">{num(b.perUnitTotal, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {draft && draftBuild ? (
        <>
          {/* ── Form-section builder for the DRAFT year ── */}
          <SectionHead
            title={`Petition builder — ${station} ${draft.fy} (draft)`}
            right="each head auto-fills from the live sub-ledgers"
          />

          <div className="panel p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-serif text-lg font-semibold">Fixed charges</h3>
              <Chip tone="info">O&M — ERP extracts</Chip>
              <Chip tone="info">interest — asset register</Chip>
            </div>
            <table className="ledger">
              <thead>
                <tr>
                  <th>Head</th>
                  <th className="num">Carry-forward: {filed ? `${filed.fy} filed (₹ cr)` : "—"}</th>
                  <th className="num">{draft.fy} draft (₹ cr)</th>
                </tr>
              </thead>
              <tbody>
                {fixedRows.map((r) => (
                  <tr key={r.item} className={r.item.startsWith("Total") ? "font-semibold" : ""}>
                    <td>{r.item}</td>
                    <td className="num">{r.prior === null ? "—" : num(r.prior, 1)}</td>
                    <td className="num">{r.draftV === null ? "—" : num(r.draftV, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-serif text-lg font-semibold">Energy charges</h3>
              <Chip tone="info">fuel — coal ledger</Chip>
              <Chip tone="info">heat rate — plant engine</Chip>
            </div>
            <table className="ledger">
              <thead>
                <tr><th>Parameter</th><th className="num">Approved norm</th><th className="num">{draft.fy} draft</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Fuel cost (₹ cr)</td>
                  <td className="num">{num(draft.approved.fuelCost, 1)}</td>
                  <td className="num">{num(draft.actual.fuelCost, 1)}</td>
                </tr>
                <tr>
                  <td>Generation (MU)</td>
                  <td className="num">{num(draft.approved.genMU)}</td>
                  <td className="num">{num(draft.actual.genMU)}</td>
                </tr>
                <tr>
                  <td>Station heat rate (kcal/kWh)</td>
                  <td className="num">{num(draft.approved.heatRate)}</td>
                  <td className={`num ${draft.actual.heatRate > draft.approved.heatRate ? "text-danger font-semibold" : ""}`}>{num(draft.actual.heatRate)}</td>
                </tr>
                <tr>
                  <td>Auxiliary consumption</td>
                  <td className="num">{pct(draft.approved.auxPct, 2)}</td>
                  <td className={`num ${draft.actual.auxPct > draft.approved.auxPct ? "text-danger font-semibold" : ""}`}>{pct(draft.actual.auxPct, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-serif text-lg font-semibold">Capex additions</h3>
              <Chip tone="info">capitalization — projects RA bills</Chip>
            </div>
            <table className="ledger">
              <thead>
                <tr><th>Head</th><th className="num">Approved (₹ cr)</th><th className="num">{draft.fy} draft (₹ cr)</th><th>Commissioning certificate</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Capital additions claimed</td>
                  <td className="num">{num(draft.approved.capexAdditions, 1)}</td>
                  <td className="num">{num(draft.actual.capexAdditions, 1)}</td>
                  <td>
                    {draft.actual.capexCertified
                      ? <Chip tone="success">certified</Chip>
                      : <Chip tone="danger">uncertified</Chip>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Prudence simulator ── */}
          <SectionHead
            title="Prudence simulator"
            right="what the Commission is likely to disallow, before it does"
          />
          <div className="panel p-4">
            {flags.length === 0 && (
              <p className="text-sm text-muted">No prudence flags on the {draft.fy} draft for {station}. The filing heads sit within approved norms.</p>
            )}
            <div className="space-y-3">
              {flags.map((f) => (
                <div key={f.key} className="border border-rule rounded-sm p-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="font-medium text-sm">{f.title}</div>
                    <div className="text-danger font-semibold whitespace-nowrap">{inrCr(f.atRiskCr * 1e7)} at risk</div>
                  </div>
                  <p className="text-[0.78rem] mt-1 leading-relaxed">{f.reason}</p>
                  <p className="text-[0.72rem] text-muted mt-1">Fix: {f.fixHint}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-rule text-sm">
              <span className="font-medium">{station} {draft.fy} prudence exposure</span>
              <span className="text-danger font-semibold">{inrCr(stationPrudenceCr * 1e7)}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[0.78rem] text-muted">
              <span>Corporate exposure across RTPS + BTPS + YTPS draft years</span>
              <span className="font-semibold">{inrCr(corporateCr * 1e7)}</span>
            </div>
          </div>

          {/* ── Export: petition annexure ── */}
          <SectionHead title="Export" right={<PrintButton label="Print annexure" />} />
          <div className="report-white panel max-w-[820px] p-8 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
            <div className="text-center border-b-[1.5px] border-gold pb-3 mb-5">
              <div className="font-serif text-xl font-semibold">Karnataka Power Corporation Limited</div>
              <div className="text-[0.7rem] text-muted uppercase tracking-[0.14em] mt-1">
                Petition annexure — {station} · {draft.fy} tariff filing (draft)
              </div>
            </div>

            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Annexure I — cost build-up</div>
            <table className="ledger mb-5">
              <thead>
                <tr><th>Head</th><th className="num">₹ cr</th><th className="num">₹/kWh</th></tr>
              </thead>
              <tbody>
                <tr><td>Return on Equity</td><td className="num">{num(draftBuild.fixed.roe, 1)}</td><td className="num">{num((draftBuild.fixed.roe * 1e7) / (draft.actual.genMU * 1e6), 2)}</td></tr>
                <tr><td>Interest & finance charges</td><td className="num">{num(draftBuild.fixed.interest, 1)}</td><td className="num">{num((draftBuild.fixed.interest * 1e7) / (draft.actual.genMU * 1e6), 2)}</td></tr>
                <tr><td>Depreciation</td><td className="num">{num(draftBuild.fixed.depreciation, 1)}</td><td className="num">{num((draftBuild.fixed.depreciation * 1e7) / (draft.actual.genMU * 1e6), 2)}</td></tr>
                <tr><td>O&M expenses</td><td className="num">{num(draftBuild.fixed.om, 1)}</td><td className="num">{num((draftBuild.fixed.om * 1e7) / (draft.actual.genMU * 1e6), 2)}</td></tr>
                <tr className="font-semibold"><td>Fixed charges</td><td className="num">{num(draftBuild.fixed.totalFixed, 1)}</td><td className="num">{num(draftBuild.perUnitFixed, 2)}</td></tr>
                <tr><td>Fuel (energy charges)</td><td className="num">{num(draftBuild.energy.fuelCost, 1)}</td><td className="num">{num(draftBuild.perUnitEnergy, 2)}</td></tr>
                <tr className="font-semibold"><td>Total cost of generation</td><td className="num">{num(draftBuild.totalCr, 1)}</td><td className="num">{num(draftBuild.perUnitTotal, 2)}</td></tr>
              </tbody>
            </table>

            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Annexure II — variance vs approval</div>
            <table className="ledger mb-5">
              <thead>
                <tr><th>Item</th><th className="num">Approved (₹ cr)</th><th className="num">Draft (₹ cr)</th><th className="num">Variance</th><th className="num">%</th></tr>
              </thead>
              <tbody>
                {variance.map((v) => (
                  <tr key={v.item}>
                    <td>{v.item}</td>
                    <td className="num">{num(v.approved, 1)}</td>
                    <td className="num">{num(v.actual, 1)}</td>
                    <td className={`num ${v.variance > 0 ? "text-danger font-semibold" : ""}`}>{v.variance >= 0 ? "+" : ""}{num(v.variance, 1)}</td>
                    <td className={`num ${v.variance > 0 ? "text-danger" : ""}`}>{v.variancePct >= 0 ? "+" : ""}{num(v.variancePct, 1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
              Synthetic demonstration document — no representation about any actual filing before the Commission.
            </div>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm mt-6">No draft tariff year found for {station}.</p>
      )}
    </>
  );
}
