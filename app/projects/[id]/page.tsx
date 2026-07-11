// Project execution dossier [A1, A2–A8]: divergence, gates, milestones,
// LD register, drawings backlog, contradiction callouts, print abstract.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { SimpleLine } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { GatePipeline } from "@/components/projects/GatePipeline";
import { Callout } from "@/components/projects/Callout";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, legalMatters, projectById } from "@/lib/data";
import { drawingsSummary, projectHealth, retenderFlag } from "@/lib/engines/execution";
import { ldForMilestone, type LdAccrual } from "@/lib/engines/obligations";
import { recoverableLd } from "@/lib/engines/legal";
import {
  contractorName, crToInr, divergenceSeries, flagLines, linkedContracts, scopeQs, spendToDateCr,
} from "@/lib/views/projects";
import { dateFmt, inrCr, monthFmt, num, pct } from "@/lib/format";

export default function ProjectDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);
  const p = projectById.get(params.id);
  if (!p) notFound();

  const h = projectHealth(p, AS_OF);
  const contractor = contractorName(p);
  const linked = linkedContracts(p);
  const chartData = divergenceSeries(p).map((d) => ({ ...d, month: monthFmt(d.month) }));
  const milestones = [...p.milestones].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));

  // LD register rows across linked contracts, joined to claim-window status.
  const ldRows = linked.flatMap((c) =>
    c.milestones
      .map((m) => ({ contract: c, ld: ldForMilestone(c, m, AS_OF) }))
      .filter((x) => x.ld.daysLate > 0),
  );
  const ldTotalCr = ldRows.reduce((s, x) => s + x.ld.accruedValue, 0);
  const claimByKey = new Map(
    recoverableLd(linked, legalMatters, AS_OF).map((r) => [
      `${r.accrual.contractId}:${r.accrual.milestoneId}`,
      r,
    ]),
  );

  const dw = drawingsSummary(p);
  const flags = flagLines(p, h);

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={subtitle(lang, scope, "controlTower")}
        actions={<PrintButton label="Print status summary" />}
      />

      <p className="text-[0.8rem] text-muted -mt-3 mb-4">
        {p.description} · Contractor: <span className="text-ink font-medium">{contractor}</span> ·
        {" "}{dateFmt(p.start)} → {dateFmt(p.scheduledEnd)} declared
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Contract value" value={inrCr(crToInr(p.contractValueCr))} sub={`${inrCr(crToInr(spendToDateCr(p)))} paid to date`} />
        <KpiTile label="Financial progress" value={pct(h.financialPct)} sub="ΣRA bills ÷ contract value" />
        <KpiTile label="Physical progress" value={pct(h.physicalPct)} sub="milestone-weighted completion" />
        <KpiTile label="Divergence" value={`${num(h.divergencePp, 1)} pp`} tone={h.divergenceFlag ? "danger" : "success"} sub={h.divergenceFlag ? "beyond 8 pp norm" : "within norm"} />
        <KpiTile label="Risk score" value={num(h.riskScore)} tone={h.riskScore >= 50 ? "danger" : h.riskScore >= 25 ? "warning" : "success"} sub="composite 0–100" />
      </div>

      {(h.advanceVsFrozenFlag || h.courtContradiction || h.segmentationFlag || h.scheduleFictional) && (
        <div className="space-y-3 mt-5">
          {h.advanceVsFrozenFlag && p.mobilisationAdvance && (
            <Callout title="Mobilisation advance vs frozen site [A4]">
              A mobilisation advance of <span className="font-semibold">{inrCr(crToInr(p.mobilisationAdvance.amountCr))}</span> was
              disbursed on {dateFmt(p.mobilisationAdvance.disbursedOn)} while the site is{" "}
              <span className="font-semibold text-danger">inactive</span>. Public money is out of the treasury and
              earning the contractor float against a site where no work can lawfully proceed.
            </Callout>
          )}
          {h.courtContradiction && p.courtStatus && (
            <Callout title="Court stay vs reported activity [A7]">
              {p.courtStatus.forum}, {p.courtStatus.caseId}: <span className="italic">{p.courtStatus.note}</span>.
              Yet the monthly progress reports still record:
              <ul className="list-none mt-1.5 space-y-1">
                {p.reportedActivity.map((line) => (
                  <li key={line} className="pl-3 border-l border-rule text-muted">&ldquo;{line}&rdquo;</li>
                ))}
              </ul>
              <span className="block mt-1.5">One of the two records is wrong — and both are signed.</span>
            </Callout>
          )}
          {h.segmentationFlag && (
            <Callout title="Segmentation flag [A8]">
              Physical progress of {pct(h.physicalPct)} is accruing on component milestones while the parent
              gate {h.blockedGate ? `(${h.blockedGate.label})` : ""} is blocked — works appear segmented so
              billing continues under a project that cannot lawfully advance.
            </Callout>
          )}
          {h.scheduleFictional && h.blockedGate && (
            <Callout title="Declared schedule is fictional [A2]">
              The declared completion of <span className="font-semibold">{dateFmt(p.scheduledEnd)}</span> presumes a
              construction sequence that cannot begin: <span className="font-semibold">{h.blockedGate.label}</span> is{" "}
              {h.blockedGate.status.toLowerCase()} — {h.blockedGate.note}. Until that gate clears, every
              downstream date in the schedule is fictional.
            </Callout>
          )}
        </div>
      )}

      <SectionHead title="Financial vs physical progress" right="cumulative %, RA-bill months [A3]" />
      <div className="panel p-4">
        <SimpleLine
          data={chartData}
          xKey="month"
          unit="%"
          series={[
            { key: "financial", label: "Financial (ΣRA ÷ value)", color: PALETTE.gold },
            { key: "physical", label: "Physical (milestone weights)", color: PALETTE.ink },
          ]}
        />
        {h.divergenceFlag && (
          <p className="text-[0.72rem] text-danger mt-2">
            Money is moving {num(h.divergencePp, 1)} pp faster than work — beyond the 8 pp divergence norm.
          </p>
        )}
      </div>

      {p.gates && (
        <>
          <SectionHead title="Statutory clearance pipeline" right="six-gate sequence [A2]" />
          <GatePipeline gates={p.gates} />
        </>
      )}

      <SectionHead title="Milestone timeline" right={`${num(milestones.filter((m) => m.completedDate).length)} of ${num(milestones.length)} complete`} />
      <ol className="border-l-2 border-gold pl-5 space-y-3">
        {milestones.map((m) => {
          const late = m.completedDate === null && m.plannedDate < AS_OF;
          return (
            <li key={m.id} className="text-[0.8rem]">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted">· {pct(m.weightPct, 1)} weight</span>
                <span className="text-muted">· planned {dateFmt(m.plannedDate)}</span>
                {m.completedDate ? (
                  <span className="text-success">· completed {dateFmt(m.completedDate)}{m.certified ? " (certified)" : ""}</span>
                ) : (
                  <span className="text-muted">· open</span>
                )}
                {late && <Chip tone="danger">late</Chip>}
              </div>
            </li>
          );
        })}
      </ol>

      <SectionHead title="Liquidated damages register" right={`linked contracts · accrued ${inrCr(crToInr(ldTotalCr))} [A5]`} />
      {ldRows.length === 0 ? (
        <p className="text-[0.8rem] text-muted">No milestone on the linked contracts is running late — no LD accrual.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="ledger min-w-[860px]">
            <thead>
              <tr>
                <th>Contract</th><th>Milestone</th><th>Due</th>
                <th className="num">Days late</th><th className="num">Accrued %</th><th className="num">Accrued ₹</th>
                <th>Status</th><th>Claim window</th>
              </tr>
            </thead>
            <tbody>
              {ldRows.map(({ contract, ld }) => {
                const claim = claimByKey.get(`${ld.contractId}:${ld.milestoneId}`);
                return (
                  <tr key={`${ld.contractId}-${ld.milestoneId}`}>
                    <td className="whitespace-nowrap">{contract.id} <span className="text-muted">· {contract.title}</span></td>
                    <td>{ld.milestoneName}</td>
                    <td className="whitespace-nowrap">{dateFmt(ld.due)}</td>
                    <td className="num">{num(ld.daysLate)}</td>
                    <td className="num">{pct(ld.accruedPct, 2)}</td>
                    <td className="num font-medium">{inrCr(crToInr(ld.accruedValue))}</td>
                    <td>{ldStatusChip(ld)}</td>
                    <td>
                      {claim ? (
                        claim.claimStatus === "NO_CLAIM_FILED" ? (
                          <Chip tone="danger">claim window open — un-pursued</Chip>
                        ) : (
                          <Chip tone="info">claim {claim.matterId}</Chip>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SectionHead title="Drawings backlog" right={`register extract [A6]`} />
      {p.drawingsPending > 100 && (
        <div className="mb-3">
          <Callout title="Engineering approval is the live constraint [A6]">
            {num(p.drawingsPending)} of {num(p.drawingsTotal)} drawings await approval — the oldest sitting in the{" "}
            <span className="font-semibold">{dw.worstBucket}</span> bucket. Site fronts will starve on this backlog
            long before any construction constraint binds.
          </Callout>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 gap-3 content-start">
          <KpiTile label="Drawings total" value={num(p.drawingsTotal)} />
          <KpiTile label="Pending approval" value={num(p.drawingsPending)} tone={p.drawingsPending > 100 ? "danger" : p.drawingsPending > 30 ? "warning" : "neutral"} sub={`worst bucket ${dw.worstBucket}`} />
        </div>
        <div className="md:col-span-2">
          <table className="ledger">
            <thead>
              <tr><th>Aging bucket</th><th className="num">Drawings pending</th></tr>
            </thead>
            <tbody>
              {p.drawingsAging.map((b) => (
                <tr key={b.bucket}>
                  <td>{b.bucket}</td>
                  <td className={`num ${b.bucket.includes(">") && b.count > 0 ? "text-danger font-semibold" : ""}`}>{num(b.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SectionHead title="Evidence" />
      <ul className="text-[0.8rem] space-y-1.5 text-muted">
        <li>· Monthly progress report {p.id}/MPR/{AS_OF.slice(0, 7)} — reported activity and front-wise status (synthetic reference)</li>
        <li>· Milestone completion certificates — {num(p.milestones.filter((m) => m.certified).length)} certified of {num(p.milestones.filter((m) => m.completedDate).length)} completed</li>
        <li>· RA bill abstracts {p.raBills[0]?.id} … {p.raBills[p.raBills.length - 1]?.id} — {inrCr(crToInr(spendToDateCr(p)))} admitted to date</li>
        <li>· Drawings register extract {p.id}/DRG — {num(p.drawingsPending)} pending of {num(p.drawingsTotal)}</li>
        {p.courtStatus && <li>· {p.courtStatus.forum} order in {p.courtStatus.caseId} — {p.courtStatus.note}</li>}
        {p.mobilisationAdvance && <li>· Mobilisation advance voucher — {inrCr(crToInr(p.mobilisationAdvance.amountCr))} disbursed {dateFmt(p.mobilisationAdvance.disbursedOn)}</li>}
      </ul>

      {/* Print-ready one-page abstract */}
      <SectionHead title="Status summary" right={<span className="no-print">prints as a one-page abstract</span>} />
      <div className="report-white panel p-8 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
        <div className="text-center border-b-[1.5px] border-gold pb-3 mb-4">
          <div className="font-serif text-xl font-semibold">Karnataka Power Corporation Limited</div>
          <div className="text-[0.68rem] text-muted uppercase tracking-[0.14em] mt-1">
            Project status abstract · {p.id} · as of {dateFmt(AS_OF)}
          </div>
        </div>
        <p className="text-[0.82rem] leading-relaxed mb-3">
          <span className="font-semibold">{p.name}</span> ({p.type}, {p.plant}) — {contractor}, contract value{" "}
          {inrCr(crToInr(p.contractValueCr))}, {dateFmt(p.start)} to {dateFmt(p.scheduledEnd)} (declared).
        </p>
        <table className="ledger mb-3">
          <tbody>
            <tr><td className="text-muted">Financial progress</td><td className="num">{pct(h.financialPct)}</td><td className="text-muted">Physical progress</td><td className="num">{pct(h.physicalPct)}</td></tr>
            <tr><td className="text-muted">Divergence</td><td className={`num ${h.divergenceFlag ? "text-danger font-semibold" : ""}`}>{num(h.divergencePp, 1)} pp</td><td className="text-muted">Risk score</td><td className="num">{num(h.riskScore)}</td></tr>
            <tr><td className="text-muted">Gate state</td><td>{h.blockedGate ? `${h.blockedGate.label} — ${h.blockedGate.status}` : p.gates ? "all clear" : "no statutory gates"}</td><td className="text-muted">LD accrued</td><td className="num">{ldTotalCr > 0 ? inrCr(crToInr(ldTotalCr)) : "—"}</td></tr>
            <tr><td className="text-muted">Drawings pending</td><td className="num">{num(p.drawingsPending)} / {num(p.drawingsTotal)}</td><td className="text-muted">Next milestone</td><td>{h.nextMilestone ? `${h.nextMilestone.name} · ${dateFmt(h.nextMilestone.plannedDate)}` : "complete"}</td></tr>
            {retenderFlag(p) && (
              <tr><td className="text-muted">Re-tenders</td><td className="num text-danger font-semibold">{num(p.retenderCount)}×</td><td /><td /></tr>
            )}
          </tbody>
        </table>
        <p className="text-[0.82rem] leading-relaxed mb-4">
          <span className="font-semibold">Findings: </span>
          {flags.length > 0 ? flags.join("; ") + "." : "no red flags on the current ledger."}
        </p>
        <div className="flex justify-between text-[0.82rem]">
          <div className="text-muted">Compiled live from the execution ledger</div>
          <div className="text-center">
            <div className="h-9" />
            <div className="border-t border-ink pt-1">Chief Engineer (Projects)</div>
          </div>
        </div>
        <div className="mt-6 pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
          Synthetic demonstration document — no representation about any actual supplier, contractor, railway, or employee.
        </div>
      </div>

      <p className="text-[0.72rem] text-muted mt-4 no-print">
        <Link className="underline" href={`/projects${qs}`}>← back to control tower</Link>
      </p>
    </>
  );
}

function ldStatusChip(ld: LdAccrual) {
  if (ld.status === "CAPPED") return <Chip tone="danger">capped</Chip>;
  if (ld.status === "ACCRUING") return <Chip tone="warning">accruing</Chip>;
  if (ld.status === "SETTLED_LATE") return <Chip tone="neutral">settled late</Chip>;
  return <Chip tone="success">none</Chip>;
}
