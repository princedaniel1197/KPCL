// Recruitment pipeline [F3] — sanction vs actual, drive tracker, aging-out gap.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { SimpleBars } from "@/components/charts";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, drives } from "@/lib/data";
import { retirementWave } from "@/lib/engines/workforce";
import { assumedAnnualIntake, pipelineRows, scopedEmployees } from "@/lib/views/workforce";
import { num, pct } from "@/lib/format";

const GAP_DANGER_PCT = 30;
const DRIVE_STUCK_YEARS = 7;
const INTAKE_SPREAD_YEARS = 4;

export default function PipelinePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const rows = pipelineRows(scope);
  const sanctioned = rows.reduce((s, r) => s + r.sanctioned, 0);
  const actual = rows.reduce((s, r) => s + r.actual, 0);
  const vacancyPct = sanctioned > 0 ? ((sanctioned - actual) / sanctioned) * 100 : 0;

  const asOfYear = Number(AS_OF.slice(0, 4));
  const wave = retirementWave(scopedEmployees(scope), AS_OF, 8);
  const waveData = wave.map((w) => ({ year: String(w.year), count: w.count }));
  const avgRetirements = Math.round(wave.reduce((s, w) => s + w.count, 0) / wave.length);
  const intake = assumedAnnualIntake();

  return (
    <>
      <PageHeader title={t(lang, "pipeline")} subtitle={subtitle(lang, scope, "pipeline")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Sanctioned posts" value={num(sanctioned)} sub="approved establishment (scoped)" />
        <KpiTile label="Actual on rolls" value={num(actual)} sub="working strength against sanction" />
        <KpiTile label="Vacancy" value={pct(vacancyPct, 1)} tone={vacancyPct > GAP_DANGER_PCT ? "danger" : "warning"} sub={`${num(sanctioned - actual)} posts unfilled`} />
        <KpiTile label="Active drives" value={num(drives.length)} tone="info" sub={`${num(drives.reduce((s, d) => s + d.posts, 0))} posts under recruitment`} />
      </div>

      <SectionHead title="Sanctioned vs actual" right="station × cadre, widest gap first" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[680px]">
          <thead>
            <tr>
              <th>Station</th><th>Cadre</th>
              <th className="num">Sanctioned</th><th className="num">Actual</th>
              <th className="num">Gap</th><th className="num">Gap %</th><th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.station}-${r.cadre}`}>
                <td>{r.station}</td>
                <td>{r.cadre}</td>
                <td className="num">{num(r.sanctioned)}</td>
                <td className="num">{num(r.actual)}</td>
                <td className="num">{num(r.gap)}</td>
                <td className={`num ${r.gapPct > GAP_DANGER_PCT ? "text-danger font-semibold" : ""}`}>{pct(r.gapPct, 1)}</td>
                <td>
                  {r.gapPct > GAP_DANGER_PCT ? (
                    <Chip tone="danger">hollowed out</Chip>
                  ) : r.gapPct > 20 ? (
                    <Chip tone="warning">thinning</Chip>
                  ) : (
                    <Chip tone="success">near sanction</Chip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead title="Drive tracker" right="every live recruitment drive" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[760px]">
          <thead>
            <tr>
              <th>Drive</th><th>Cadre</th><th className="num">Posts</th>
              <th className="num">Started</th><th className="num">Years elapsed</th><th>Stage</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {drives.map((d) => {
              const elapsed = asOfYear - d.startedYear;
              return (
                <tr key={d.id}>
                  <td className="font-medium">{d.id}</td>
                  <td>{d.cadre}</td>
                  <td className="num">{num(d.posts)}</td>
                  <td className="num">{d.startedYear}</td>
                  <td className="num">
                    {num(elapsed)}{" "}
                    {elapsed >= DRIVE_STUCK_YEARS && <Chip tone="danger">stuck {elapsed} years</Chip>}
                  </td>
                  <td>{d.stage}</td>
                  <td className="text-muted">{d.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHead title="Aging out vs intake" right="retirements per year against realistic recruitment" />
      <div className="panel p-4">
        <SimpleBars
          data={waveData}
          xKey="year"
          yKey="count"
          highlightIndices={waveData.flatMap((r, i) => (Number(r.count) > intake ? [i] : []))}
        />
        <p className="text-[0.7rem] text-muted mt-2">
          Assumed realistic intake ≈ {num(intake)} per year — the {num(drives.reduce((s, d) => s + d.posts, 0))} posts
          across the {num(drives.length)} active drives spread over {INTAKE_SPREAD_YEARS} years, i.e. an optimistic case
          where every drive concludes. Retirements average {num(avgRetirements)} per year over the horizon
          {avgRetirements > intake
            ? ` — the corporation ages out faster than it can recruit, and DR-01 (622 Junior Engineer / Technician posts) has been before KSAT since 2019.`
            : `.`}
        </p>
      </div>
    </>
  );
}
