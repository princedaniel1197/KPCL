// Real CEA Daily Generation Report — KPCL thermal stations (via National Power
// Portal, which re-publishes CEA's blocked report). Server component: reads the
// committed snapshot, renders nothing until the cea_dgr scraper has run.
//
// Shows today's actual vs scheduled generation, coal-stock days, and live unit
// outages with CEA's own stated reason — all copied verbatim from the report.

import { hasReal, scrapedCeaDgr, type CeaDgrStation } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead, Chip } from "@/components/ui/Kpi";
import { num } from "@/lib/format";
import type { Scope } from "@/lib/params";

function inScope(s: CeaDgrStation, scope: Scope): boolean {
  if (scope.plant === "ALL") return true;
  return s.plant === scope.plant; // RTPS / BTPS / YTPS
}

function coalTone(days: number | null): "success" | "warning" | "danger" | "neutral" {
  if (days == null) return "neutral";
  if (days < 7) return "danger";
  if (days < 15) return "warning";
  return "success";
}

export function RealDailyGeneration({ scope }: { scope: Scope }) {
  if (!hasReal(scrapedCeaDgr)) return null;
  const stations = scrapedCeaDgr.records.filter((s) => inScope(s, scope));
  if (stations.length === 0) return null;

  const reportDate = stations[0].reportDate ?? "";
  const outages = stations.flatMap((s) =>
    s.units.filter((u) => u.outageMW).map((u) => ({ plant: s.plant, ...u })),
  );

  return (
    <>
      <SectionHead
        title="Real daily generation & unit outages"
        right={
          <ProvenanceChip
            provenance="REAL"
            source="CEA Daily Generation Report (via NPP)"
            fetched={scrapedCeaDgr.fetched_at.slice(0, 10)}
          />
        }
      />
      <p className="text-[0.72rem] text-muted mb-2">
        CEA daily report dated <strong>{reportDate}</strong> — station-wise scheduled vs actual generation, coal
        stock in days, and units under forced outage with CEA&apos;s stated reason. Actual figures from the
        national report, not modelled.
      </p>

      <div className="overflow-x-auto">
        <table className="ledger min-w-[640px]">
          <thead>
            <tr>
              <th>Station</th>
              <th className="num">Capacity</th>
              <th className="num">Today (MU)</th>
              <th className="num">Schedule</th>
              <th className="num">FY-to-date (MU)</th>
              <th className="num">Coal stock</th>
              <th className="num">Under outage</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => {
              const adh =
                s.todayProgMU && s.todayActualMU != null && s.todayProgMU > 0
                  ? (s.todayActualMU / s.todayProgMU - 1) * 100
                  : null;
              return (
                <tr key={s.plant}>
                  <td className="font-medium">{s.plant} <span className="text-faint">— {s.station}</span></td>
                  <td className="num">{s.capacityMW != null ? `${num(s.capacityMW)} MW` : "—"}</td>
                  <td className="num">{s.todayActualMU != null ? num(s.todayActualMU, 2) : "—"}</td>
                  <td className="num">
                    {adh != null ? (
                      <span className={adh >= -2 ? "text-success" : adh >= -15 ? "text-warning" : "text-danger"}>
                        {adh >= 0 ? "+" : ""}{adh.toFixed(0)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="num">
                    {s.fytdActualMU != null ? num(s.fytdActualMU) : "—"}
                    {s.fytdProgMU != null && (
                      <span className="text-faint"> / {num(s.fytdProgMU)}</span>
                    )}
                  </td>
                  <td className="num">
                    {s.coalStockDays != null ? (
                      <Chip tone={coalTone(s.coalStockDays)}>{num(s.coalStockDays)} d</Chip>
                    ) : "—"}
                  </td>
                  <td className="num">
                    {s.outageMW ? <span className="text-danger">{num(s.outageMW)} MW</span> : <span className="text-success">nil</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {outages.length > 0 && (
        <div className="mt-3">
          <div className="text-[0.72rem] text-muted mb-1">Units under forced outage (CEA-stated reason):</div>
          <div className="overflow-x-auto">
            <table className="ledger min-w-[520px]">
              <thead>
                <tr>
                  <th>Unit</th><th className="num">Capacity out</th><th>Since</th><th>Reason (CEA)</th>
                </tr>
              </thead>
              <tbody>
                {outages.map((u) => (
                  <tr key={`${u.plant}-${u.unit}`}>
                    <td className="font-medium whitespace-nowrap">{u.plant} {u.unit}</td>
                    <td className="num text-danger">{num(u.outageMW ?? 0)} MW</td>
                    <td className="text-[0.72rem] text-muted whitespace-nowrap">{u.outageDate || "—"}</td>
                    <td className="text-[0.78rem]">{u.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
