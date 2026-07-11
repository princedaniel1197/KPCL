// Retirement wave [F1] — age pyramid, cadre exposure, SPOF ledger.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { InterviewChip } from "@/components/workforce/InterviewChip";
import { SimpleBars } from "@/components/charts";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF } from "@/lib/data";
import {
  cadreRetiringPct,
  monthsUntil,
  retirementDate,
  retirementWave,
  spofRoles,
} from "@/lib/engines/workforce";
import { employees } from "@/lib/data";
import {
  ageBandRows,
  cadreExposureRows,
  retiringWithin,
  scopedEmployees,
  scopeQs,
} from "@/lib/views/workforce";
import { dateFmt, num, pct } from "@/lib/format";
import { RealManpower } from "@/components/workforce/RealManpower";

const EXPOSURE_DANGER_PCT = 22;

export default function RetirementWavePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);

  const emps = scopedEmployees(scope);
  const retiring24 = retiringWithin(emps, AS_OF, 24);
  const retiring5y = retiringWithin(emps, AS_OF, 60);
  const spof = spofRoles(emps, AS_OF);

  const pyramid = ageBandRows(emps, AS_OF);
  const wave = retirementWave(emps, AS_OF, 8).map((w) => ({ year: String(w.year), count: w.count }));
  const exposure = cadreExposureRows(scope, AS_OF);

  const rtpsInScope = scope.plant === "ALL" || scope.plant === "RTPS";
  const rtpsTechPct = cadreRetiringPct(employees, "RTPS", "Technical", AS_OF, 5);

  return (
    <>
      <PageHeader title={t(lang, "retirementWave")} subtitle={subtitle(lang, scope, "retirementWave")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Headcount (scoped)" value={num(emps.length)} sub="on rolls, incl. CORP under All plants" />
        <KpiTile label="Retiring ≤24 mo" value={num(retiring24.length)} tone="warning" href={`/workforce/knowledge${qs}`} sub="superannuation within two years" />
        <KpiTile label="Retiring ≤5 yr" value={num(retiring5y.length)} tone="danger" sub={`${pct((retiring5y.length / Math.max(1, emps.length)) * 100, 1)} of scoped headcount`} />
        <KpiTile label="SPOF roles" value={num(spof.length)} tone="danger" sub="sole incumbent · no successor · retiring ≤24 mo" />
      </div>

      <RealManpower />

      <SectionHead title="Age pyramid" right="headcount by five-year band" />
      <div className="panel p-4">
        <SimpleBars data={pyramid} xKey="band" yKey="count" highlightIndices={pyramid.flatMap((r, i) => (r.band === "55–59" ? [i] : []))} />
        <div className="text-[0.7rem] text-muted mt-2">
          The 55–59 band walks out of the gate over the next five years — the wave below is that band converted into superannuation dates.
        </div>
      </div>

      <SectionHead title="Retirement wave" right="superannuations per year, 8-year horizon" />
      <div className="panel p-4">
        <SimpleBars data={wave} xKey="year" yKey="count" />
      </div>

      <SectionHead title="Cadre exposure" right="thermal stations · Technical / Engineering / Operations" />
      {rtpsInScope && (
        <div className="panel p-4 border-l-2 border-danger mb-3">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-danger font-semibold mb-1">Succession cliff</div>
          <p className="text-[0.82rem]">
            <span className="font-semibold">{pct(rtpsTechPct, 0)} of the RTPS Technical cadre retires within 5 years</span> — the
            turbine, boiler and C&amp;I specialists who keep the oldest units on bar. The replacement pipeline for this cadre has
            been stuck before KSAT since 2019 (see <Link className="underline" href={`/workforce/pipeline${qs}`}>Recruitment Pipeline</Link>).
          </p>
        </div>
      )}
      <table className="ledger">
        <thead>
          <tr>
            <th>Station</th><th>Cadre</th>
            <th className="num">Headcount</th><th className="num">Retiring ≤5 yr</th><th className="num">Share</th><th>Signal</th>
          </tr>
        </thead>
        <tbody>
          {exposure.map((r) => (
            <tr key={`${r.station}-${r.cadre}`}>
              <td>{r.station}</td>
              <td>{r.cadre}</td>
              <td className="num">{num(r.headcount)}</td>
              <td className="num">{num(r.retiring5y)}</td>
              <td className={`num ${r.retiringPct > EXPOSURE_DANGER_PCT ? "text-danger font-semibold" : ""}`}>{pct(r.retiringPct, 1)}</td>
              <td>
                {r.retiringPct > EXPOSURE_DANGER_PCT ? (
                  <Chip tone="danger">succession cliff</Chip>
                ) : r.retiringPct > 15 ? (
                  <Chip tone="warning">elevated</Chip>
                ) : (
                  <Chip tone="success">within plan</Chip>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionHead
        title="Single-point-of-failure ledger"
        right={<Link className="underline" href={`/workforce/knowledge${qs}`}>knowledge continuity →</Link>}
      />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[820px]">
          <thead>
            <tr>
              <th>Name</th><th>Role</th><th>Station</th><th>Cadre</th>
              <th>Retires</th><th className="num">Months left</th><th>Successor</th><th>Interview</th>
            </tr>
          </thead>
          <tbody>
            {spof.map((e) => (
              <tr key={e.id}>
                <td className="font-medium">{e.name}</td>
                <td>{e.role}</td>
                <td>{e.station}</td>
                <td>{e.cadre}</td>
                <td className="whitespace-nowrap">{dateFmt(retirementDate(e.dob))}</td>
                <td className="num">{num(Math.max(0, Math.round(monthsUntil(retirementDate(e.dob), AS_OF))))}</td>
                <td><Chip tone="danger">none identified</Chip></td>
                <td><InterviewChip status={e.interviewStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.7rem] text-muted mt-2">
        SPOF = sole incumbent of a role, retiring within 24 months, with no successor identified. Every row is an
        institutional-memory loss with a date on it.
      </p>
    </>
  );
}
