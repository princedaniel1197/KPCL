// Print-ready PSU-tone claim letter [C1/C8] — content varies by claim kind.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/ui/PrintButton";
import { Chip } from "@/components/ui/Kpi";
import { findingsFor } from "@/lib/views/coal";
import { claims, collieryById, fsas, rakes, AS_OF } from "@/lib/data";
import { analyzeFsa } from "@/lib/engines/coal";
import { COAL_NORMS, gradeByName, gradeForGcv } from "@/lib/engines/norms";
import { dateFmt, inr, kcal, monthFmt, num, pct } from "@/lib/format";
import type { ClaimStatus, CoalClaim, Rake } from "@/lib/types";

const statusTone = (s: ClaimStatus) =>
  s === "RECOVERED" ? "success" : s === "DRAFT" ? "warning" : "info";

function GradeSlippageBody({ claim, rake }: { claim: CoalClaim; rake: Rake }) {
  const f = findingsFor(rake);
  const billedBand = gradeByName(rake.billedGrade);
  const receivedBand = gradeForGcv(rake.receivedGCV);
  const col = collieryById.get(rake.source);
  return (
    <>
      <p className="text-[0.82rem] leading-relaxed mb-4">
        Sub: <span className="font-medium">Claim towards grade slippage — rake {rake.id} ex {col?.siding ?? rake.source}, received {dateFmt(rake.date)}.</span>
      </p>
      <p className="text-[0.82rem] leading-relaxed mb-4">
        Sir, the subject rake was billed as grade {rake.billedGrade} with a declared GCV of {kcal(rake.billedGCV)}. The as-received GCV determined at {rake.plant} per the sampling protocol in force was {kcal(rake.receivedGCV)}{rake.thirdPartySampled ? ", corroborated by the loading-end third-party sample" : ""}, corresponding to grade {receivedBand.grade}. The grade differential is accordingly claimed as under:
      </p>
      <table className="ledger mb-4">
        <thead>
          <tr><th>Particulars</th><th className="num">Qty / rate</th><th className="num">Amount (₹)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Grade differential: billed {rake.billedGrade} @ {inr(billedBand.pitheadPrice)}/t vs assessed {receivedBand.grade} @ {inr(receivedBand.pitheadPrice)}/t</td>
            <td className="num">{num(rake.receivedTonnes)} t × {inr(billedBand.pitheadPrice - receivedBand.pitheadPrice)}/t</td>
            <td className="num">{num(Math.round(f.overbillingValue))}</td>
          </tr>
          <tr>
            <td className="font-semibold">Claim amount</td><td />
            <td className="num font-semibold">{num(claim.amount)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function TransitShortageBody({ claim }: { claim: CoalClaim }) {
  const monthRakes = rakes.filter(
    (r) => r.source === claim.source && r.plant === claim.plant && r.month === claim.month,
  );
  const billedT = monthRakes.reduce((s, r) => s + r.billedTonnes, 0);
  const receivedT = monthRakes.reduce((s, r) => s + r.receivedTonnes, 0);
  const gapT = Math.max(0, billedT - receivedT);
  const normT = (COAL_NORMS.transitQuantityLossPct / 100) * billedT;
  const excessT = Math.max(0, gapT - normT);
  const avgLanded = monthRakes.length
    ? Math.round(monthRakes.reduce((s, r) => s + findingsFor(r).landedCostPerTonne, 0) / monthRakes.length)
    : 0;
  return (
    <>
      <p className="text-[0.82rem] leading-relaxed mb-4">
        Sub: <span className="font-medium">Claim towards transit shortage beyond the {COAL_NORMS.transitQuantityLossPct}% rail norm — {claim.source} → {claim.plant}, {monthFmt(claim.month)}.</span>
      </p>
      <p className="text-[0.82rem] leading-relaxed mb-4">
        Sir, across {num(monthRakes.length)} rakes despatched during {monthFmt(claim.month)}, {num(Math.round(billedT))} t stood billed against {num(Math.round(receivedT))} t received at the plant weighbridge — a shortage of {num(Math.round(gapT))} t ({pct(billedT > 0 ? (gapT / billedT) * 100 : 0, 2)}). After allowing the {COAL_NORMS.transitQuantityLossPct}% transit norm ({num(Math.round(normT))} t), the excess shortage of {num(Math.round(excessT))} t is claimed at the average landed cost as under:
      </p>
      <table className="ledger mb-4">
        <thead>
          <tr><th>Particulars</th><th className="num">Qty / rate</th><th className="num">Amount (₹)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Shortage beyond norm across {num(monthRakes.length)} rakes ({monthFmt(claim.month)})</td>
            <td className="num">{num(Math.round(excessT))} t × {inr(avgLanded)}/t</td>
            <td className="num">{num(Math.round(excessT * avgLanded))}</td>
          </tr>
          <tr>
            <td className="font-semibold">Claim amount</td><td />
            <td className="num font-semibold">{num(claim.amount)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function FsaShortSupplyBody({ claim }: { claim: CoalClaim }) {
  const fsa = fsas.find((f) => f.source === claim.source && f.plant === claim.plant);
  if (!fsa) {
    return <p className="text-[0.82rem] leading-relaxed mb-4">FSA record not found for this source.</p>;
  }
  const finding = analyzeFsa(fsa);
  return (
    <>
      <p className="text-[0.82rem] leading-relaxed mb-4">
        Sub: <span className="font-medium">Claim towards short supply under FSA {fsa.id} — lifting at {pct(finding.liftedPct, 1)} of pro-rated ACQ.</span>
      </p>
      <p className="text-[0.82rem] leading-relaxed mb-4">
        Sir, against a pro-rated Annual Contracted Quantity of {num(Math.round(finding.proRatedAcq))} t for the {fsa.monthlyLifted.length}-month window, actual lifting stood at {num(Math.round(finding.liftedTonnes))} t — {pct(finding.liftedPct, 1)} of the commitment. Under the penalty slabs of the Fuel Supply Agreement, lifting below 80% attracts a penalty of {pct(finding.penaltyPct, 0)} of the value of the shortfall. The computation is placed as under:
      </p>
      <table className="ledger mb-4">
        <thead>
          <tr><th>Particulars</th><th className="num">Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Pro-rated ACQ ({fsa.monthlyLifted.length} months of {num(fsa.acqTonnes)} t annual)</td><td className="num">{num(Math.round(finding.proRatedAcq))} t</td></tr>
          <tr><td>Quantity lifted</td><td className="num">{num(Math.round(finding.liftedTonnes))} t</td></tr>
          <tr><td>Lifting vs pro-rated ACQ</td><td className="num">{pct(finding.liftedPct, 1)}</td></tr>
          <tr><td>Shortfall</td><td className="num">{num(Math.round(finding.shortfallT))} t</td></tr>
          <tr><td>Applicable slab (below 80%)</td><td className="num">{pct(finding.penaltyPct, 0)} of shortfall value</td></tr>
          <tr><td>Average FSA price</td><td className="num">{inr(fsa.avgPricePerTonne)}/t</td></tr>
          <tr>
            <td className="font-semibold">Claim amount ({pct(finding.penaltyPct, 0)} × {num(Math.round(finding.shortfallT))} t × {inr(fsa.avgPricePerTonne)}/t)</td>
            <td className="num font-semibold">{num(Math.round(finding.claimValue))}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

export default function ClaimLetter({ params }: { params: { claimId: string } }) {
  const claim = claims.find((c) => c.id === params.claimId);
  if (!claim) notFound();
  const col = collieryById.get(claim.source);

  const subjectLine =
    claim.kind === "GRADE_SLIPPAGE" ? "grade slippage" : claim.kind === "TRANSIT_SHORTAGE" ? "transit shortage" : "FSA short supply";
  const rake = claim.rakeId ? rakes.find((r) => r.id === claim.rakeId) : undefined;

  return (
    <>
      <div className="no-print flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/coal/claims" className="text-[0.8rem] underline text-muted">← back to claims</Link>
          {claim.kind === "GRADE_SLIPPAGE" && rake && (
            <Link href={`/coal/ledger/${rake.id}`} className="text-[0.8rem] underline text-muted">view rake {rake.id} →</Link>
          )}
        </div>
        <PrintButton label="Print claim letter" />
      </div>

      <div className="report-white panel max-w-[820px] mx-auto p-10 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
        <div className="text-center border-b-[1.5px] border-gold pb-4 mb-6">
          <div className="font-serif text-2xl font-semibold">Karnataka Power Corporation Limited</div>
          <div className="text-[0.72rem] text-muted uppercase tracking-[0.14em] mt-1">Office of the General Manager (Fuel) · {claim.plant}</div>
        </div>

        <div className="flex justify-between text-[0.82rem] mb-6">
          <div>
            <div className="font-semibold">CLAIM No. {claim.id}/{claim.plant}/{AS_OF.slice(0, 4)}</div>
            <div className="text-muted mt-1">
              Towards {subjectLine} · {monthFmt(claim.month)} · drafted {dateFmt(claim.draftedOn)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted">Date: {dateFmt(AS_OF)}</div>
            <div className="mt-1"><Chip tone={statusTone(claim.status)}>{claim.status}</Chip></div>
          </div>
        </div>

        <div className="text-[0.82rem] mb-4">
          To,<br />
          The Area Sales Manager,<br />
          {col?.company ?? claim.source},<br />
          {col ? `${col.name}, ${col.state}.` : ""}
        </div>

        {claim.kind === "GRADE_SLIPPAGE" && rake && <GradeSlippageBody claim={claim} rake={rake} />}
        {claim.kind === "TRANSIT_SHORTAGE" && <TransitShortageBody claim={claim} />}
        {claim.kind === "FSA_SHORT_SUPPLY" && <FsaShortSupplyBody claim={claim} />}

        <p className="text-[0.82rem] leading-relaxed mb-4">
          The amount of {inr(claim.amount)} shall be adjusted against the next payable bill under the Fuel Supply Agreement. Supporting documents — weighbridge tickets, laboratory register extracts and reconciliation statements — are enclosed.
        </p>
        <p className="text-[0.82rem] leading-relaxed mb-10">
          This claim is raised without prejudice to the Corporation&apos;s other rights and remedies under the Fuel Supply Agreement.
        </p>

        <div className="flex justify-between text-[0.82rem]">
          <div className="text-muted">Encl: as above</div>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-ink pt-1">General Manager (Fuel), {claim.plant}</div>
          </div>
        </div>

        <div className="mt-8 pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
          Synthetic demonstration document — no representation about any actual supplier, contractor, railway, or employee.
        </div>
      </div>
    </>
  );
}
