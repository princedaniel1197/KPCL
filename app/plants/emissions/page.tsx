// Emissions & FGD [B9] — per-unit SO₂/NOₓ vs MoEFCC norms, FGD status
// against the statutory deadline, and a per-unit SO₂ trend.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { SimpleLine } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, emissions, unitById } from "@/lib/data";
import { emissionStatus } from "@/lib/engines/plant";
import { deadlineAging } from "@/lib/engines/obligations";
import { fgdChipMeta, isThermalScope, scopedEmissions, scopedUnits, scopeQs } from "@/lib/views/plants";
import { dateFmt, monthFmt, num } from "@/lib/format";

export default function EmissionsPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "emissions")} subtitle={subtitle(lang, scope, "emissions")} />
        <p className="text-muted text-sm">No stack emissions for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const unitsInScope = scopedUnits(scope);
  const emissionsInScope = scopedEmissions(scope);
  const rows = unitsInScope
    .map((u) => ({
      unit: u,
      emi: emissionStatus(u.id, emissionsInScope),
      aging: deadlineAging(u.fgd.normDeadline, AS_OF),
    }))
    .filter((r) => r.emi !== null);

  const requestedUnit = typeof searchParams.unit === "string" ? searchParams.unit : "RTPS-U5";
  const selected =
    unitsInScope.find((u) => u.id === requestedUnit) ?? unitsInScope.find((u) => u.id === "RTPS-U5") ?? unitsInScope[0];
  const trend = selected
    ? emissions
        .filter((e) => e.unitId === selected.id)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((e) => ({ month: monthFmt(e.month), so2: e.so2 }))
    : [];
  const selectedNorm = selected ? emissions.find((e) => e.unitId === selected.id)?.so2Norm : undefined;

  const u5 = unitById.get("RTPS-U5");
  const u5Aging = u5 ? deadlineAging(u5.fgd.normDeadline, AS_OF) : null;
  const showU5Callout =
    u5 && u5Aging && u5Aging.bucket === "BREACHED" && (scope.plant === "ALL" || scope.plant === "RTPS");

  return (
    <>
      <PageHeader title={t(lang, "emissions")} subtitle={subtitle(lang, scope, "emissions")} />

      {showU5Callout && u5 && u5Aging && (
        <div className="panel p-4 border-l-2 border-danger mb-4">
          <div className="font-semibold text-danger text-[0.9rem] mb-1">
            RTPS-U5 — FGD norm deadline already past
          </div>
          <p className="text-[0.8rem] text-muted max-w-3xl">
            The MoEFCC deadline for RTPS-U5 was {dateFmt(u5.fgd.normDeadline)} —{" "}
            {num(Math.abs(u5Aging.daysToDeadline))} days ago — yet the FGD package is still only{" "}
            <span className="font-medium">{u5.fgd.status}</span>. Every month of operation past the deadline
            compounds the compliance exposure; the unit is running against a breached statutory clock.
          </p>
        </div>
      )}

      <SectionHead title="Per-unit emissions vs MoEFCC norms" right="latest month in scope · click a unit to chart its SO₂ trend" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[960px]">
          <thead>
            <tr>
              <th>Unit</th><th className="num">Vintage</th>
              <th className="num">SO₂ latest / norm</th><th className="num">NOₓ latest / norm</th>
              <th>Breach</th><th className="num">Breach months</th>
              <th>FGD status</th><th>Norm deadline</th><th>Deadline clock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ unit, emi, aging }) => {
              const fgd = fgdChipMeta(unit, aging);
              return (
                <tr key={unit.id} className={selected && unit.id === selected.id ? "bg-wash/50" : undefined}>
                  <td>
                    <Link className="underline font-medium" href={`/plants/emissions${scopeQs(scope, { unit: unit.id })}`}>
                      {unit.id}
                    </Link>
                  </td>
                  <td className="num">{unit.commissioned}</td>
                  <td className={`num ${emi!.so2Breach ? "text-danger font-semibold" : ""}`}>
                    {num(emi!.latestSo2)} / {num(emi!.so2Norm)}
                  </td>
                  <td className={`num ${emi!.noxBreach ? "text-danger font-semibold" : ""}`}>
                    {num(emi!.latestNox)} / {num(emi!.noxNorm)}
                  </td>
                  <td className="space-x-1 whitespace-nowrap">
                    {emi!.so2Breach && <Chip tone="danger">SO₂</Chip>}
                    {emi!.noxBreach && <Chip tone="danger">NOₓ</Chip>}
                    {!emi!.so2Breach && !emi!.noxBreach && <Chip tone="success">within norms</Chip>}
                  </td>
                  <td className="num">{num(emi!.breachMonths)}</td>
                  <td>{unit.fgd.status.replace("_", " ")}</td>
                  <td className="whitespace-nowrap">{dateFmt(unit.fgd.normDeadline)}</td>
                  <td><Chip tone={fgd.tone}>{fgd.label}</Chip></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <SectionHead title={`SO₂ trend — ${selected.id}`} right="mg/Nm³, six-month window" />
          <div className="panel p-4">
            <SimpleLine
              data={trend}
              xKey="month"
              unit=" mg/Nm³"
              refY={selectedNorm}
              refLabel="MoEFCC norm"
              series={[{ key: "so2", label: "SO₂", color: PALETTE.ink }]}
            />
          </div>
        </>
      )}
    </>
  );
}
