// Litigation intelligence [E2] — milestone threats, risk ranking,
// recoverable-LD linkage, settlement-vs-fight economics.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, vendorById } from "@/lib/data";
import { hearingClock } from "@/lib/engines/legal";
import { ldLinkage, riskRanked, scopeQs } from "@/lib/views/legal";
import { dateFmt, inrCr, num } from "@/lib/format";

const HIGH_RISK = 60;
const RISK_ROWS_SHOWN = 30;
const DEFENCE_COST_MULTIPLE = 3;
const CR = 1e7;
const LAKH = 1e5;

export default function IntelligencePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);

  const ranked = riskRanked();
  const highRisk = ranked.filter((r) => r.risk.risk >= HIGH_RISK);
  const exposure = ranked.reduce((s, r) => s + r.m.exposureCr, 0);
  const milestoneThreats = ranked.filter((r) => r.m.linkedProjectId !== null);

  const ld = ldLinkage();
  const unpursued = ld.filter((l) => l.claimStatus === "NO_CLAIM_FILED");
  const unpursuedCr = unpursued.reduce((s, l) => s + l.accrual.accruedValue, 0);

  const top5 = [...ranked].sort((a, b) => b.m.exposureCr - a.m.exposureCr).slice(0, 5);

  return (
    <>
      <PageHeader title={t(lang, "legalIntel")} subtitle={subtitle(lang, scope, "legalIntel")} />
      <p className="text-[0.7rem] text-muted -mt-4 mb-4">
        Legal matters are held at the corporate level and shown unfiltered by plant scope.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="High-risk disputes" value={num(highRisk.length)} tone="danger" sub={`case risk ≥ ${HIGH_RISK} of 100`} />
        <KpiTile label="Exposure (open disputes)" value={inrCr(exposure * CR)} tone="warning" href={`/legal${qs}`} sub={`${num(ranked.length)} open matters`} />
        <KpiTile label="Recoverable LD un-pursued" value={inrCr(unpursuedCr * CR)} tone="danger" sub={`${num(unpursued.length)} contracts with no claim filed`} />
        <KpiTile label="Milestone-threatening" value={num(milestoneThreats.length)} tone="danger" sub="open cases linked to live projects" />
      </div>

      <SectionHead title="Cases that threaten milestones" right="open matters linked to live projects" />
      <div className="grid md:grid-cols-2 gap-4">
        {milestoneThreats.map(({ m, risk, project }) => {
          const clock = hearingClock(m, AS_OF);
          return (
            <div key={m.id} className="panel p-4 border-l-2 border-danger">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link className="underline font-medium" href={`/legal/${m.id}${qs}`}>{m.id}</Link>
                  <div className="text-[0.82rem] mt-0.5">{m.title}</div>
                </div>
                <Chip tone="danger">risk {num(risk.risk, 1)}</Chip>
              </div>
              <dl className="text-[0.78rem] mt-2 space-y-1">
                <div className="flex justify-between gap-4"><dt className="text-muted">Stage</dt><dd>{m.stage}</dd></div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Next hearing</dt>
                  <dd>
                    {m.nextHearing ? dateFmt(m.nextHearing) : "—"}{" "}
                    {clock.urgent && <Chip tone="danger">{clock.days} d</Chip>}
                  </dd>
                </div>
                {project && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Linked project</dt>
                    <dd><Link className="underline" href={`/projects/${project.id}${qs}`}>{project.name}</Link></dd>
                  </div>
                )}
              </dl>
              <div className="text-[0.72rem] text-muted mt-2 pt-2 border-t border-rule">
                <span className="uppercase tracking-[0.12em] text-[0.62rem] font-semibold text-danger">What it blocks</span>
                <ul className="mt-1 space-y-0.5">
                  {risk.drivers.map((d) => (
                    <li key={d}>· {d}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <SectionHead title="Risk-ranked matters" right={`open matters by case risk · top ${RISK_ROWS_SHOWN}`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[900px]">
          <thead>
            <tr>
              <th className="num">Risk</th><th>Matter</th><th>Forum</th><th>Stage</th>
              <th className="num">Exposure</th><th>Milestone threat</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, RISK_ROWS_SHOWN).map(({ m, risk }) => (
              <tr key={m.id}>
                <td className={`num font-semibold ${risk.risk >= HIGH_RISK ? "text-danger" : ""}`}>{num(risk.risk, 1)}</td>
                <td>
                  <Link className="underline font-medium whitespace-nowrap" href={`/legal/${m.id}${qs}`}>{m.id}</Link>{" "}
                  <span className="text-muted">{m.title}</span>
                </td>
                <td>{m.forum}</td>
                <td>{m.stage}</td>
                <td className="num font-medium">{inrCr(m.exposureCr * CR)}</td>
                <td>{risk.threatensMilestone ? <Chip tone="danger">threatens milestone</Chip> : <Chip tone="neutral">no</Chip>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead title="Recoverable-LD linkage" right="accrued liquidated damages vs recovery claims filed" />
      <div className="panel p-4 border-l-2 border-danger mb-3">
        <div className="text-[0.62rem] uppercase tracking-[0.12em] text-danger font-semibold mb-1">
          Money on the table
        </div>
        <p className="text-[0.82rem]">
          <span className="font-semibold">{inrCr(unpursuedCr * CR)} of accrued LD sits un-pursued across {num(unpursued.length)} contracts</span>
          {" "}({unpursued.map((l) => l.contract.id).join(", ")}) — the milestones are late, the LD clauses have accrued,
          and no recovery claim has been filed. Every other accrual in the register already has a suit running.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[900px]">
          <thead>
            <tr>
              <th>Contract</th><th>Vendor</th><th>Milestone</th>
              <th className="num">Days late</th><th className="num">Accrued</th><th>Claim status</th>
            </tr>
          </thead>
          <tbody>
            {ld.map((l) => (
              <tr key={`${l.contract.id}-${l.accrual.milestoneId}`}>
                <td><Link className="underline font-medium whitespace-nowrap" href={`/contracts/${l.contract.id}${qs}`}>{l.contract.id}</Link></td>
                <td>{vendorById.get(l.contract.vendorId)?.name ?? l.contract.vendorId}</td>
                <td>{l.accrual.milestoneName}</td>
                <td className="num">{num(l.accrual.daysLate)}</td>
                <td className="num font-medium">{inrCr(l.accrual.accruedValue * CR)}</td>
                <td>
                  {l.claimStatus === "NO_CLAIM_FILED" ? (
                    <Chip tone="danger">un-pursued</Chip>
                  ) : (
                    <Link href={`/legal/${l.matterId}${qs}`}>
                      <Chip tone="info">claim open · {l.matterId}</Chip>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead title="Settlement vs fight" right="top 5 open disputes by exposure" />
      <table className="ledger">
        <thead>
          <tr>
            <th>Matter</th><th className="num">Exposure</th><th className="num">Fees to date</th>
            <th className="num">Projected defence cost</th><th>Note</th>
          </tr>
        </thead>
        <tbody>
          {top5.map(({ m, risk }) => {
            const projected = m.feePaidLakh * DEFENCE_COST_MULTIPLE;
            const costShare = m.exposureCr > 0 ? ((projected * LAKH) / (m.exposureCr * CR)) * 100 : 0;
            return (
              <tr key={m.id}>
                <td>
                  <Link className="underline font-medium whitespace-nowrap" href={`/legal/${m.id}${qs}`}>{m.id}</Link>{" "}
                  <span className="text-muted">{m.title}</span>
                </td>
                <td className="num font-medium">{inrCr(m.exposureCr * CR)}</td>
                <td className="num">{inrCr(m.feePaidLakh * LAKH)}</td>
                <td className="num">{inrCr(projected * LAKH)}</td>
                <td className="text-muted">
                  {costShare < 5
                    ? `Defence cost ≈ ${num(costShare, 1)}% of exposure — contesting is cheap relative to the claim${risk.threatensMilestone ? ", but the schedule impact is the real cost" : ""}.`
                    : `Defence cost ≈ ${num(costShare, 1)}% of exposure — worth a settlement-range review.`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[0.7rem] text-muted mt-2">
        Projected defence cost = fees paid to date × {DEFENCE_COST_MULTIPLE} — an illustrative heuristic, not a fee
        estimate from counsel.
      </p>
    </>
  );
}
