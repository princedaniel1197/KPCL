// Outage register [B5] — forced-outage root-cause pareto, recurrence
// signatures, and the full scoped register.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { SimpleBars } from "@/components/charts";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { outagePareto, recurrenceFlags } from "@/lib/engines/plant";
import { isThermalScope, scopedOutages, scopeQs } from "@/lib/views/plants";
import { dateFmt, num, pct } from "@/lib/format";

export default function OutageRegister({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "outages")} subtitle={subtitle(lang, scope, "outages")} />
        <p className="text-muted text-sm">No thermal outage register for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const rows = scopedOutages(scope);
  const forced = rows.filter((o) => o.kind === "FORCED");
  const planned = rows.filter((o) => o.kind === "PLANNED");
  const forcedHours = forced.reduce((s, o) => s + o.hours, 0);
  const pareto = outagePareto(rows);
  const topCause = pareto[0];
  const flags = recurrenceFlags(rows);
  const register = [...rows].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 80);
  const qs = scopeQs(scope);

  return (
    <>
      <PageHeader title={t(lang, "outages")} subtitle={subtitle(lang, scope, "outages")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Forced outages" value={num(forced.length)} tone="danger" sub="scoped window" />
        <KpiTile label="Forced-outage hours" value={num(forcedHours)} tone="danger" />
        <KpiTile
          label="Top cause share"
          value={topCause ? pct(topCause.sharePct, 0) : "—"}
          tone="warning"
          sub={topCause ? `${topCause.cause} — ${num(topCause.hours)} h` : undefined}
        />
        <KpiTile label="Planned outages" value={num(planned.length)} tone="info" />
      </div>

      <SectionHead title="Forced-outage hours by cause" right="pareto of the scoped window — boiler tube leaks highlighted" />
      <div className="panel p-4">
        <SimpleBars
          data={pareto.map((p) => ({ cause: p.cause, hours: Math.round(p.hours) }))}
          xKey="cause"
          yKey="hours"
          unit=" h"
          height={240}
          highlightIndices={pareto.flatMap((p, i) => (p.cause === "Boiler tube leak" ? [i] : []))}
        />
      </div>

      <SectionHead title="Recurrence signatures" right="same cause on the same unit ≥3 forced trips" />
      <table className="ledger">
        <thead>
          <tr>
            <th>Unit</th><th>Cause</th><th className="num">Events</th><th className="num">Hours lost</th><th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <tr key={`${f.unitId}|${f.cause}`}>
              <td><Link className="underline font-medium" href={`/plants/${f.unitId}${qs}`}>{f.unitId}</Link></td>
              <td>{f.cause}</td>
              <td className="num font-medium">{num(f.events)}</td>
              <td className="num">{num(f.hours)}</td>
              <td>
                {f.events >= 5
                  ? <Chip tone="danger">recurring failure signature</Chip>
                  : <Chip tone="warning">repeat cause</Chip>}
              </td>
            </tr>
          ))}
          {flags.length === 0 && (
            <tr><td colSpan={5} className="text-muted">No repeat-cause pattern in this window.</td></tr>
          )}
        </tbody>
      </table>

      <SectionHead
        title="Full register"
        right={`${num(rows.length)} outages in scope · showing latest ${num(register.length)}`}
      />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[820px]">
          <thead>
            <tr>
              <th>Outage</th><th>Unit</th><th>Date</th><th>Kind</th><th>Cause</th><th>Equipment</th>
              <th className="num">Hours</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {register.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.id}</td>
                <td><Link className="underline" href={`/plants/${o.unitId}${qs}`}>{o.unitId}</Link></td>
                <td className="whitespace-nowrap">{dateFmt(o.start)}</td>
                <td>{o.kind === "FORCED" ? <Chip tone="danger">forced</Chip> : <Chip tone="info">planned</Chip>}</td>
                <td>{o.cause}</td>
                <td>{o.equipment}</td>
                <td className="num">{num(o.hours)}</td>
                <td className="text-muted">{o.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
