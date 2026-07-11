// Unit detail [B2/B3/B4/B9] — mini-historian, outage history, boiler-tube
// early-warning panel and emissions/FGD status for one generating unit.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { SimpleLine } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, inDateScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, emissions, outages, unitById } from "@/lib/data";
import { emissionStatus, recurrenceFlags, unitHeatRateCost } from "@/lib/engines/plant";
import { deadlineAging } from "@/lib/engines/obligations";
import { fgdChipMeta, scopeQs, unitSummaries } from "@/lib/views/plants";
import { dateFmt, inrCr, monthFmt, num, pct } from "@/lib/format";

export default function UnitDetail({
  params,
  searchParams,
}: {
  params: { unit: string };
  searchParams: SearchParams;
}) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const unit = unitById.get(params.unit);
  if (!unit) notFound();

  const summary = unitSummaries({ ...scope, plant: unit.plant }).find((s) => s.unit.id === unit.id);
  if (!summary) notFound();
  const qs = scopeQs(scope);

  const historian = summary.unit.monthly.map((m) => ({
    month: monthFmt(m.month),
    heatRate: m.heatRate,
    normHeatRate: m.normHeatRate,
    plf: m.plfPct,
    availability: m.availabilityPct,
    aux: m.auxPct,
    normAux: m.normAuxPct,
  }));

  const unitOutages = outages
    .filter((o) => o.unitId === unit.id && inDateScope(o.start, scope))
    .sort((a, b) => b.start.localeCompare(a.start));

  const tubeFlags = recurrenceFlags(outages.filter((o) => o.unitId === unit.id));
  const tubeSignature = tubeFlags.find((f) => f.cause === "Boiler tube leak" && f.events >= 5);
  const hrCost = unitHeatRateCost(unit);

  const emi = emissionStatus(unit.id, emissions);
  const fgdAging = deadlineAging(unit.fgd.normDeadline, AS_OF);
  const fgd = fgdChipMeta(unit, fgdAging);

  return (
    <>
      <PageHeader
        title={`${unit.id} — ${num(unit.capacityMW)} MW`}
        subtitle={subtitle(lang, scope, "fleet")}
        actions={
          <Link href={`/plants${qs}`} className="text-[0.75rem] underline text-muted">
            ← fleet ledger
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Capacity" value={`${num(unit.capacityMW)} MW`} sub={`commissioned ${unit.commissioned} · ${unit.plant}`} />
        <KpiTile
          label="Avg PLF (window)"
          value={pct(summary.avgPlf)}
          tone={summary.underRnM ? "info" : "neutral"}
          sub={summary.underRnM ? "under R&M — planned rebuild, not failure" : undefined}
        />
        <KpiTile
          label="Heat-rate drift ₹ (window)"
          value={summary.hrExtraCr > 0 ? inrCr(summary.hrExtraCr * 1e7) : "—"}
          tone={!summary.underRnM && summary.hrExtraCr > 1 ? "danger" : "neutral"}
          sub={hrCost.annualizedCr > 4 ? `≈ ${inrCr(hrCost.annualizedCr * 1e7)} annualized run-rate` : undefined}
        />
        <KpiTile label="Avg availability" value={pct(summary.avgAvail)} />
      </div>

      <SectionHead title="Mini-historian" right="monthly operating signals vs norms [B4]" />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="panel p-4">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">Heat rate vs norm — kcal/kWh</div>
          <SimpleLine
            data={historian}
            xKey="month"
            unit=" kcal/kWh"
            series={[
              { key: "heatRate", label: "Actual", color: PALETTE.ink },
              { key: "normHeatRate", label: "Norm", color: PALETTE.muted, dashed: true },
            ]}
          />
        </div>
        <div className="panel p-4">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">PLF & availability — %</div>
          <SimpleLine
            data={historian}
            xKey="month"
            unit="%"
            series={[
              { key: "plf", label: "PLF", color: PALETTE.gold },
              { key: "availability", label: "Availability", color: PALETTE.ink },
            ]}
          />
        </div>
        <div className="panel p-4">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">Auxiliary consumption vs norm — %</div>
          <SimpleLine
            data={historian}
            xKey="month"
            unit="%"
            series={[
              { key: "aux", label: "Aux %", color: PALETTE.ink },
              { key: "normAux", label: "Norm", color: PALETTE.muted, dashed: true },
            ]}
          />
        </div>
      </div>

      <SectionHead title="Boiler-tube early warning" right={<Chip tone="neutral">concept — illustrative on synthetic data</Chip>} />
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.82rem]">
          <div>
            <span className="text-muted">Tube-leak trips, trailing 12 months:</span>{" "}
            <span className="tnum font-semibold">{num(unit.tubeLeakCount12mo)}</span>
          </div>
          <div>
            <span className="text-muted">Sensor-health composite:</span>{" "}
            <span className="tnum font-semibold">{num(unit.sensorHealth)}/100</span>
          </div>
        </div>
        {tubeSignature ? (
          <div className="border-l-2 border-danger bg-wash/60 p-3 mt-3 text-[0.8rem]">
            <div className="font-semibold text-danger mb-1">
              Recurring failure signature — same cause ≥5 events in six months
            </div>
            <p className="text-muted">
              {unit.id} has tripped {num(tubeSignature.events)} times on boiler tube leaks in the window,
              costing {num(tubeSignature.hours)} forced-outage hours. The leaks recur in the same superheater
              zone — a pattern that ordinarily justifies pulling the tube-thickness survey forward rather than
              waiting for the next scheduled overhaul.
            </p>
          </div>
        ) : tubeFlags.length > 0 ? (
          <div className="mt-3 text-[0.8rem] text-muted">
            Repeat forced-outage causes on this unit:{" "}
            {tubeFlags.map((f) => `${f.cause} (${f.events} events, ${num(f.hours)} h)`).join("; ")}.
          </div>
        ) : (
          <div className="mt-3 text-[0.8rem] text-muted">No repeat forced-outage cause (≥3 events) in the window.</div>
        )}
      </div>

      <SectionHead title="Outage history" right={`${num(unitOutages.length)} outages in the scoped window`} />
      <table className="ledger">
        <thead>
          <tr>
            <th>Date</th><th>Kind</th><th>Cause</th><th>Equipment</th><th className="num">Hours</th><th>Note</th>
          </tr>
        </thead>
        <tbody>
          {unitOutages.map((o) => (
            <tr key={o.id}>
              <td className="whitespace-nowrap">{dateFmt(o.start)}</td>
              <td>{o.kind === "FORCED" ? <Chip tone="danger">forced</Chip> : <Chip tone="info">planned</Chip>}</td>
              <td>{o.cause}</td>
              <td>{o.equipment}</td>
              <td className="num">{num(o.hours)}</td>
              <td className="text-muted">{o.note}</td>
            </tr>
          ))}
          {unitOutages.length === 0 && (
            <tr><td colSpan={6} className="text-muted">No outages recorded in this window.</td></tr>
          )}
        </tbody>
      </table>

      <SectionHead title="Emissions & FGD status" right={<Link className="underline" href={`/plants/emissions${scopeQs(scope, { unit: unit.id })}`}>emissions module →</Link>} />
      <div className="panel p-4">
        {emi ? (
          <div className="grid md:grid-cols-3 gap-4 text-[0.82rem]">
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">SO₂ — latest vs norm</div>
              <div className="tnum font-semibold text-lg">{num(emi.latestSo2)} / {num(emi.so2Norm)} mg/Nm³</div>
              <div className="mt-1">{emi.so2Breach ? <Chip tone="danger">above MoEFCC norm</Chip> : <Chip tone="success">within norm</Chip>}</div>
            </div>
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">NOₓ — latest vs norm</div>
              <div className="tnum font-semibold text-lg">{num(emi.latestNox)} / {num(emi.noxNorm)} mg/Nm³</div>
              <div className="mt-1">{emi.noxBreach ? <Chip tone="danger">above MoEFCC norm</Chip> : <Chip tone="success">within norm</Chip>}</div>
            </div>
            <div>
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">FGD — norm deadline {dateFmt(unit.fgd.normDeadline)}</div>
              <div className="text-[0.8rem]">
                Status <span className="font-medium">{unit.fgd.status.replace("_", " ")}</span>
                {" · "}
                {fgdAging.daysToDeadline < 0
                  ? `${num(Math.abs(fgdAging.daysToDeadline))} days past deadline`
                  : `${num(fgdAging.daysToDeadline)} days to deadline`}
              </div>
              <div className="mt-1"><Chip tone={fgd.tone}>{fgd.label}</Chip></div>
              <div className="text-[0.68rem] text-faint mt-1">{num(emi.breachMonths)} breach month(s) in the window</div>
            </div>
          </div>
        ) : (
          <p className="text-muted text-sm">No emissions telemetry for this unit.</p>
        )}
      </div>
    </>
  );
}
