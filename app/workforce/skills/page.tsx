// Skills matrix [F4] — new-technology coverage vs a subcritical-era workforce.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { skillAreas } from "@/lib/data";
import { skillCoverage } from "@/lib/engines/workforce";
import { num, pct } from "@/lib/format";

const COVERAGE_DANGER_PCT = 40;

export default function SkillsPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const rows = skillAreas
    .map((a) => ({ a, ...skillCoverage(a) }))
    .sort((x, y) => x.coveragePct - y.coveragePct);
  const worst = rows[0];
  const totalGap = rows.reduce((s, r) => s + r.gap, 0);
  const totalTraining = rows.reduce((s, r) => s + r.a.trainingPlanned, 0);

  return (
    <>
      <PageHeader title={t(lang, "skills")} subtitle={subtitle(lang, scope, "skills")} />

      <div className="panel p-4 border-l-2 border-danger">
        <div className="text-[0.62rem] uppercase tracking-[0.12em] text-danger font-semibold mb-1">
          New machines, old certificates
        </div>
        <p className="text-[0.82rem]">
          The build-out is supercritical units, a pumped-storage plant, utility solar and FGD chemistry — but the
          workforce was certified on subcritical thermal. The worst gap is{" "}
          <span className="font-semibold">
            {worst.a.label.toLowerCase()}: {num(worst.a.have)} certified against {num(worst.a.need)} needed
            ({pct(worst.coveragePct, 0)} coverage)
          </span>
          . Across all areas the certified-headcount shortfall is {num(totalGap)}, while training plans cover only{" "}
          {num(totalTraining)} seats — training allocation is not aligned to where the gaps are.
        </p>
      </div>

      <SectionHead title="Coverage by skill area" right="worst coverage first · corporate-wide (skill pools are not plant-scoped)" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[760px]">
          <thead>
            <tr>
              <th>Area</th><th className="num">Need</th><th className="num">Have</th>
              <th>Coverage</th><th className="num">Gap</th><th className="num">Training planned</th><th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.a.key}>
                <td className="font-medium">{r.a.label}</td>
                <td className="num">{num(r.a.need)}</td>
                <td className="num">{num(r.a.have)}</td>
                <td>
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <div className="h-[7px] bg-wash flex-1 relative">
                      <div
                        className={`absolute inset-y-0 left-0 ${r.coveragePct < COVERAGE_DANGER_PCT ? "bg-danger" : "bg-gold"}`}
                        style={{ width: `${Math.min(100, r.coveragePct)}%` }}
                      />
                    </div>
                    <span className={`num text-[0.72rem] w-12 shrink-0 ${r.coveragePct < COVERAGE_DANGER_PCT ? "text-danger font-semibold" : ""}`}>
                      {pct(r.coveragePct, 0)}
                    </span>
                  </div>
                </td>
                <td className="num">{num(r.gap)}</td>
                <td className="num">{num(r.a.trainingPlanned)}</td>
                <td>
                  {r.coveragePct < COVERAGE_DANGER_PCT ? (
                    <Chip tone="danger">critical gap</Chip>
                  ) : r.coveragePct < 70 ? (
                    <Chip tone="warning">under-covered</Chip>
                  ) : (
                    <Chip tone="success">adequate</Chip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.7rem] text-muted mt-2">
        Training alignment: planned seats close {pct(totalGap > 0 ? (totalTraining / totalGap) * 100 : 100, 0)} of the
        certified-headcount gap even if every trainee qualifies — the balance must come from recruitment or lateral
        certification, both of which run through the stalled pipeline.
      </p>
    </>
  );
}
