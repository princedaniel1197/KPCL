// Demurrage & logistics [C2] — free-time breaches, the tippler-outage cluster,
// and chronic under-loading (idle freight) by source.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { SimpleBars } from "@/components/charts";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { findingsFor, isThermalScope, scopedRakes } from "@/lib/views/coal";
import { collieryById, meta } from "@/lib/data";
import { COAL_NORMS } from "@/lib/engines/norms";
import { dateFmt, inrCr, monthFmt, num, pct } from "@/lib/format";

export default function DemurragePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "demurrage")} subtitle={subtitle(lang, scope, "demurrage")} />
        <p className="text-muted text-sm">No rake logistics for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const rows = scopedRakes(scope).map((r) => ({ r, f: findingsFor(r) }));

  const totalDemurrage = rows.reduce((s, x) => s + x.f.demurrageValue, 0);
  const totalIdleFreight = rows.reduce((s, x) => s + x.f.idleFreightValue, 0);
  const avgTurnaround = rows.length
    ? rows.reduce((s, x) => s + x.r.placementHours, 0) / rows.length
    : 0;
  const beyondFreeTime = rows.filter((x) => x.r.placementHours > COAL_NORMS.freeTimeHours).length;

  const byMonth = meta.months.map((month) => ({
    month: monthFmt(month),
    demurrage:
      Math.round(
        rows.filter((x) => x.r.month === month).reduce((s, x) => s + x.f.demurrageValue, 0) / 1e3,
      ) / 100, // ₹ lakh, 2dp
  }));

  // Wagon-tippler outage story: rakes stuck at the tippler beyond 24 h.
  const cluster = rows
    .filter((x) => x.r.placementHours > 24)
    .sort((a, b) => a.r.date.localeCompare(b.r.date));
  const clusterDemurrage = cluster.reduce((s, x) => s + x.f.demurrageValue, 0);
  const clusterPlants = [...new Set(cluster.map((x) => x.r.plant))];
  const clusterMonths = [...new Set(cluster.map((x) => x.r.month))];

  // Idle freight per source.
  const sources = [...new Set(rows.map((x) => x.r.source))];
  const bySource = sources
    .map((source) => {
      const mine = rows.filter((x) => x.r.source === source);
      const billedT = mine.reduce((s, x) => s + x.r.billedTonnes, 0);
      const ratedT = mine.reduce((s, x) => s + x.r.wagons * x.r.wagonCapT, 0);
      return {
        source,
        rakes: mine.length,
        loadFactorPct: ratedT > 0 ? (billedT / ratedT) * 100 : 0,
        underloadT: mine.reduce((s, x) => s + x.f.underloadT, 0),
        idleFreight: mine.reduce((s, x) => s + x.f.idleFreightValue, 0),
      };
    })
    .sort((a, b) => b.idleFreight - a.idleFreight);

  return (
    <>
      <PageHeader title={t(lang, "demurrage")} subtitle={subtitle(lang, scope, "demurrage")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Demurrage (window)" value={inrCr(totalDemurrage)} tone="danger" sub={`beyond ${COAL_NORMS.freeTimeHours} h free time`} />
        <KpiTile label="Idle freight" value={inrCr(totalIdleFreight)} tone="warning" sub="freight paid on empty rated capacity" />
        <KpiTile label="Avg turnaround" value={`${num(avgTurnaround, 1)} h`} tone="info" sub="placement to release at the tippler" />
        <KpiTile label="Rakes beyond free time" value={num(beyondFreeTime)} tone="warning" sub={`of ${num(rows.length)} rakes in scope`} />
      </div>

      <SectionHead title="Demurrage by month" right="₹ lakh" />
      <div className="panel p-4">
        <SimpleBars data={byMonth} xKey="month" yKey="demurrage" unit=" lakh" />
      </div>

      <SectionHead title="Wagon-tippler outage — 9-day demurrage cluster" right={`${num(cluster.length)} rakes held > 24 h`} />
      {cluster.length > 0 && (
        <div className="panel p-4 border-l-2 border-danger mb-3">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-danger mb-1">Finding</div>
          <p className="text-[0.8rem] text-muted leading-relaxed">
            {num(cluster.length)} rakes were held at the tippler for more than 24 hours — all at{" "}
            {clusterPlants.join(", ")} within {clusterMonths.map(monthFmt).join(", ")}. The dates cluster around a
            single wagon-tippler outage: with the tippler down, arriving rakes queued on the plant siding and ran
            up {inrCr(clusterDemurrage)} in demurrage at {num(COAL_NORMS.demurragePerWagonHour)}/wagon-hour. A
            stand-by unloading protocol (or diverting rakes to the second tippler line) would have avoided
            substantially all of this charge.
          </p>
        </div>
      )}
      <table className="ledger">
        <thead>
          <tr>
            <th>Rake</th><th>Date</th><th>Source</th><th className="num">Wagons</th>
            <th className="num">Turnaround h</th><th className="num">Demurrage ₹</th>
          </tr>
        </thead>
        <tbody>
          {cluster.map(({ r, f }) => (
            <tr key={r.id}>
              <td><Link className="underline font-medium" href={`/coal/ledger/${r.id}`}>{r.id}</Link></td>
              <td className="whitespace-nowrap">{dateFmt(r.date)}</td>
              <td>{collieryById.get(r.source)?.name ?? r.source}</td>
              <td className="num">{num(r.wagons)}</td>
              <td className="num text-danger font-semibold">{num(r.placementHours, 1)}</td>
              <td className="num font-medium">{num(Math.round(f.demurrageValue))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionHead title="Idle freight by source" right="freight paid on under-loaded wagon capacity" />
      <table className="ledger">
        <thead>
          <tr>
            <th>Source</th><th className="num">Rakes</th><th className="num">Avg load factor</th>
            <th className="num">Underload t</th><th className="num">Idle freight ₹</th><th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {bySource.map((s) => (
            <tr key={s.source}>
              <td>{collieryById.get(s.source)?.name ?? s.source}</td>
              <td className="num">{num(s.rakes)}</td>
              <td className={`num ${s.loadFactorPct < 97 ? "text-danger font-semibold" : ""}`}>{pct(s.loadFactorPct)}</td>
              <td className="num">{num(Math.round(s.underloadT))}</td>
              <td className="num font-medium">{s.idleFreight > 0 ? inrCr(s.idleFreight) : "—"}</td>
              <td>
                {s.loadFactorPct < 97 ? (
                  <Chip tone="danger">chronic under-loading</Chip>
                ) : (
                  <Chip tone="success">loaded to capacity</Chip>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[0.72rem] text-muted mt-3">
        Load factor = billed tonnes ÷ (wagons × rated wagon capacity). Freight is paid on rated capacity, so every
        under-loaded tonne is freight spent moving air — a loading-end supervision issue at the colliery siding.
      </p>
    </>
  );
}
