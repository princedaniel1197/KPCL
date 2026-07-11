// Real KPCL station-wise generation, parsed from the KPCL Annual Report PDF.
// Server component — reads the committed snapshot; renders nothing until the
// annual-report parser has run.

import { hasAnnualReport, scrapedAnnualReport, type StationGen } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead, Chip } from "@/components/ui/Kpi";
import { num } from "@/lib/format";
import type { Scope } from "@/lib/params";

function inScope(s: StationGen, scope: Scope): boolean {
  if (scope.plant === "ALL") return true;
  if (scope.plant === "HYDRO" || scope.plant === "PSP") return s.plant === "HYDRO";
  return s.plant === scope.plant; // RTPS / BTPS / YTPS
}

export function RealGeneration({ scope }: { scope: Scope }) {
  if (!hasAnnualReport()) return null;
  const ar = scrapedAnnualReport.records;
  const stations = ar.stations.filter((s) => inScope(s, scope)).sort((a, b) => b.genMU - a.genMU);
  if (stations.length === 0) return null;

  const total = stations.reduce((t, s) => t + s.genMU, 0);
  const prevTotal = stations.reduce((t, s) => t + (s.genPrevMU ?? 0), 0);
  const yoy = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

  return (
    <>
      <SectionHead
        title={`Real generation — FY ${ar.fy}`}
        right={<ProvenanceChip provenance="REAL" source="KPCL Annual Report" fetched={scrapedAnnualReport.fetched_at.slice(0, 10)} />}
      />
      <p className="text-[0.72rem] text-muted mb-2">
        {num(stations.length)} stations · {num(Math.round(total))} MU generated ({ar.fy}) ·{" "}
        <span className={yoy >= 0 ? "text-success" : "text-danger"}>
          {yoy >= 0 ? "+" : ""}{yoy.toFixed(1)}% YoY
        </span>{" "}
        — actual audited figures from KPCL's published report, alongside the synthetic per-unit modelling below.
      </p>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[560px]">
          <thead>
            <tr>
              <th>Station</th><th className="w-16">Plant</th>
              <th className="num">Generation ({ar.fy})</th>
              <th className="num">Prev FY</th><th className="num">YoY</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => {
              const g = s.genPrevMU && s.genPrevMU > 0 ? ((s.genMU - s.genPrevMU) / s.genPrevMU) * 100 : null;
              return (
                <tr key={s.station}>
                  <td>{s.station}</td>
                  <td>
                    <Chip tone={s.plant === "HYDRO" ? "info" : "neutral"}>{s.plant}</Chip>
                  </td>
                  <td className="num font-medium">{num(s.genMU)} MU</td>
                  <td className="num text-muted">{s.genPrevMU != null ? `${num(s.genPrevMU)}` : "—"}</td>
                  <td className="num">
                    {g != null ? (
                      <span className={g >= 0 ? "text-success" : "text-danger"}>
                        {g >= 0 ? "+" : ""}{g.toFixed(0)}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
