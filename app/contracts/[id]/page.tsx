// Contract detail [D1 × A5/E2/D5] — milestones with LD accrual, claim-window
// status, guarantee cover, and the correspondence trail.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, bgs, contracts, legalMatters, vendorById } from "@/lib/data";
import { bgLedger, ldForMilestone } from "@/lib/engines/obligations";
import { recoverableLd } from "@/lib/engines/legal";
import { scopeQs, ldClause } from "@/lib/views/contracts";
import { dateFmt, inrCr, num, pct } from "@/lib/format";

export default function ContractDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const contract = contracts.find((c) => c.id === params.id);
  if (!contract) notFound();

  const vendor = vendorById.get(contract.vendorId);
  const accruals = contract.milestones.map((m) => ldForMilestone(contract, m, AS_OF));
  const ldTotalCr = accruals.reduce((s, a) => s + a.accruedValue, 0);
  const openLdCr = accruals
    .filter((a) => a.status === "ACCRUING" || a.status === "CAPPED")
    .reduce((s, a) => s + a.accruedValue, 0);
  const recoverable = recoverableLd([contract], legalMatters, AS_OF);
  const unPursued = recoverable.filter((r) => r.claimStatus === "NO_CLAIM_FILED");
  const claimed = recoverable.find((r) => r.claimStatus === "CLAIM_OPEN");
  const contractBgs = bgs.filter((b) => b.contractId === contract.id);
  const bgById = new Map(contractBgs.map((b) => [b.id, b]));
  const myBgs = bgLedger(contractBgs, AS_OF);
  const correspondence = [...contract.correspondence].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader title={`Contract ${contract.id}`} subtitle={subtitle(lang, scope, "contractsRepo")} />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-4 md:col-span-2">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">Overview</div>
          <div className="font-serif text-lg font-semibold mb-2">{contract.title}</div>
          <dl className="text-[0.82rem] space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted">Vendor</dt><dd className="font-medium">{vendor?.name ?? contract.vendorId}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Plant</dt><dd>{contract.plant}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Category</dt><dd>{contract.category}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Value</dt><dd className="font-medium">{inrCr(contract.valueCr * 1e7)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Awarded</dt><dd>{dateFmt(contract.awardDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Contractual end</dt><dd>{dateFmt(contract.endDate)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Tender mode</dt><dd>{contract.tenderMode === "SINGLE" ? <Chip tone="warning">SINGLE</Chip> : contract.tenderMode === "LIMITED" ? <Chip tone="info">LIMITED</Chip> : <Chip tone="neutral">OPEN</Chip>}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Procurement cycle</dt><dd className="tnum">indent → NIT {num(contract.cycleDays.indentToNit)} d · NIT → award {num(contract.cycleDays.nitToAward)} d</dd></div>
            <div className="flex justify-between"><dt className="text-muted">LD clause</dt><dd>{ldClause(contract)} of contract value</dd></div>
            {contract.projectId && (
              <div className="flex justify-between">
                <dt className="text-muted">Linked project</dt>
                <dd><Link href={`/projects/${contract.projectId}${scopeQs(scope)}`}><Chip tone="info">{contract.projectId}</Chip></Link></dd>
              </div>
            )}
          </dl>
        </div>

        <div className="panel p-4">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">LD position</div>
          <div className="hero-numeral text-[1.7rem] text-danger">{ldTotalCr > 0 ? inrCr(ldTotalCr * 1e7) : "—"}</div>
          <div className="text-[0.72rem] text-muted mt-1 mb-3">
            {ldTotalCr > 0
              ? `accrued across ${num(accruals.filter((a) => a.daysLate > 0).length)} late milestone(s) · ${inrCr(openLdCr * 1e7)} still accruing on open work`
              : "no milestone has slipped past its due date"}
          </div>
          {unPursued.length > 0 && (
            <div className="space-y-1.5 text-[0.78rem]">
              <div><Chip tone="danger">un-pursued — no recovery claim filed</Chip></div>
              <p className="text-muted">
                {inrCr(unPursued.reduce((s, r) => s + r.accrual.accruedValue, 0) * 1e7)} of accrued LD has no
                corresponding recovery matter. The claim window runs while the contract is live — flag before final bill.
              </p>
            </div>
          )}
          {claimed && (
            <div className="space-y-1.5 text-[0.78rem]">
              <div><Chip tone="info">recovery claim open</Chip></div>
              <p className="text-muted">
                Matter <Link className="underline font-medium" href={`/legal${scopeQs(scope)}`}>{claimed.matterId}</Link> covers this contract&apos;s LD recovery.
              </p>
            </div>
          )}
          {ldTotalCr > 0 && unPursued.length === 0 && !claimed && (
            <div className="text-[0.78rem] text-muted">Accrued LD below the claim-register threshold.</div>
          )}
        </div>
      </div>

      <SectionHead title="Milestones & LD accrual" right={`as of ${dateFmt(AS_OF)}`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[860px]">
          <thead>
            <tr>
              <th>Milestone</th><th>Due</th><th>Completed</th>
              <th className="num">Days late</th><th className="num">LD accrued %</th><th className="num">LD accrued ₹</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contract.milestones.map((m) => {
              const a = ldForMilestone(contract, m, AS_OF);
              return (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="whitespace-nowrap">{dateFmt(m.due)}</td>
                  <td className="whitespace-nowrap">{m.completedOn ? dateFmt(m.completedOn) : <span className="text-muted">open</span>}</td>
                  <td className={`num ${a.daysLate > 0 ? "text-danger font-semibold" : ""}`}>{a.daysLate > 0 ? num(a.daysLate) : "—"}</td>
                  <td className="num">{a.accruedPct > 0 ? pct(a.accruedPct, 2) : "—"}</td>
                  <td className="num font-medium">{a.accruedValue > 0 ? inrCr(a.accruedValue * 1e7) : "—"}</td>
                  <td>
                    {a.status === "CAPPED" ? <Chip tone="danger">capped at {pct(contract.ldCapPct, 0)}</Chip>
                      : a.status === "ACCRUING" ? <Chip tone="danger">accruing</Chip>
                      : a.status === "SETTLED_LATE" ? <Chip tone="warning">completed late</Chip>
                      : <Chip tone="success">on time</Chip>}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="font-semibold">Total LD</td><td /><td /><td />
              <td />
              <td className="num font-semibold">{ldTotalCr > 0 ? inrCr(ldTotalCr * 1e7) : "—"}</td>
              <td>{unPursued.length > 0 ? <Chip tone="danger">un-pursued</Chip> : claimed ? <Chip tone="info">claim {claimed.matterId}</Chip> : ldTotalCr > 0 ? <Chip tone="warning">review</Chip> : <Chip tone="success">clear</Chip>}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHead title="Bank guarantees" right={<Link className="underline" href={`/contracts/guarantees${scopeQs(scope)}`}>full BG ledger →</Link>} />
      {myBgs.length === 0 ? (
        <p className="text-muted text-sm">No guarantee on file for this contract.</p>
      ) : (
        <table className="ledger">
          <thead>
            <tr><th>BG</th><th>Type</th><th>Bank</th><th className="num">Value</th><th>Issued</th><th>Expiry</th><th className="num">Days to expiry</th><th>Status</th></tr>
          </thead>
          <tbody>
            {myBgs.map((a) => {
              const bg = bgById.get(a.bgId)!;
              return (
                <tr key={a.bgId}>
                  <td className="font-medium">{a.bgId}</td>
                  <td>{bg.type}</td>
                  <td className="whitespace-nowrap">{bg.bank}</td>
                  <td className="num font-medium">{inrCr(a.valueCr * 1e7)}</td>
                  <td className="whitespace-nowrap">{dateFmt(bg.issued)}</td>
                  <td className="whitespace-nowrap">{dateFmt(a.expiry)}</td>
                  <td className={`num ${a.daysToExpiry < 0 ? "text-danger font-semibold" : ""}`}>{num(a.daysToExpiry)}</td>
                  <td>
                    {a.level === "EXPIRED" ? <Chip tone="danger">expired</Chip>
                      : a.level === "T7" ? <Chip tone="danger">≤7 d</Chip>
                      : a.level === "T30" ? <Chip tone="warning">≤30 d</Chip>
                      : a.level === "T60" ? <Chip tone="info">≤60 d</Chip>
                      : <Chip tone="success">current</Chip>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <SectionHead title="Correspondence log" right={`${num(correspondence.length)} entries`} />
      {correspondence.length === 0 ? (
        <p className="text-muted text-sm">No correspondence recorded against this contract.</p>
      ) : (
        <table className="ledger">
          <thead>
            <tr><th>Date</th><th>From</th><th>Subject</th></tr>
          </thead>
          <tbody>
            {correspondence.map((c, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap">{dateFmt(c.date)}</td>
                <td className="whitespace-nowrap">{c.from}</td>
                <td>{c.subject}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
