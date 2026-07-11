// Print-ready debit note for a grade-slipped rake [C1].

import { notFound } from "next/navigation";
import Link from "next/link";
import { PrintButton } from "@/components/ui/PrintButton";
import { findingsFor } from "@/lib/views/coal";
import { collieryById, rakes, AS_OF } from "@/lib/data";
import { gradeByName, gradeForGcv } from "@/lib/engines/norms";
import { dateFmt, inr, kcal, num } from "@/lib/format";

export default function DebitNote({ params }: { params: { rakeId: string } }) {
  const rake = rakes.find((r) => r.id === params.rakeId);
  if (!rake) notFound();
  const f = findingsFor(rake);
  const col = collieryById.get(rake.source)!;
  const billedBand = gradeByName(rake.billedGrade);
  const receivedBand = gradeForGcv(rake.receivedGCV);
  const total = Math.round(f.overbillingValue + f.excessLossValue);

  return (
    <>
      <div className="no-print flex items-center justify-between mb-4">
        <Link href={`/coal/ledger/${rake.id}`} className="text-[0.8rem] underline text-muted">← back to rake</Link>
        <PrintButton label="Print debit note" />
      </div>

      <div className="report-white panel max-w-[820px] mx-auto p-10 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
        <div className="text-center border-b-[1.5px] border-gold pb-4 mb-6">
          <div className="font-serif text-2xl font-semibold">Karnataka Power Corporation Limited</div>
          <div className="text-[0.72rem] text-muted uppercase tracking-[0.14em] mt-1">Office of the General Manager (Fuel) · {rake.plant}</div>
        </div>

        <div className="flex justify-between text-[0.82rem] mb-6">
          <div>
            <div className="font-semibold">DEBIT NOTE No. DN/{rake.plant}/{rake.id.slice(3)}/{AS_OF.slice(0, 4)}</div>
            <div className="text-muted mt-1">Against consignment {rake.id} dated {dateFmt(rake.date)}</div>
          </div>
          <div className="text-right text-muted">Date: {dateFmt(AS_OF)}</div>
        </div>

        <div className="text-[0.82rem] mb-4">
          To,<br />
          The Area Sales Manager,<br />
          {col.company},<br />
          {col.name}, {col.state}.
        </div>

        <p className="text-[0.82rem] leading-relaxed mb-4">
          Sub: <span className="font-medium">Debit note towards grade slippage and transit shortage — rake {rake.id} ex {col.siding}.</span>
        </p>
        <p className="text-[0.82rem] leading-relaxed mb-4">
          Sir, the subject rake, billed as grade {rake.billedGrade} with a declared GCV of {kcal(rake.billedGCV)}, was received at {rake.plant} with an as-received GCV of {kcal(rake.receivedGCV)} determined per the sampling protocol in force{rake.thirdPartySampled ? " and corroborated by the loading-end third-party sample" : ""}. The received quality corresponds to grade {receivedBand.grade}. The consignment is accordingly re-graded and the price differential debited as under:
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
            {f.excessLossValue > 0 && (
              <tr>
                <td>Transit shortage beyond 1.5% rail norm ({num(Math.round(f.excessLossT))} t at landed cost)</td>
                <td className="num">{num(Math.round(f.excessLossT))} t × {inr(f.landedCostPerTonne)}/t</td>
                <td className="num">{num(Math.round(f.excessLossValue))}</td>
              </tr>
            )}
            <tr>
              <td className="font-semibold">Total debit</td><td />
              <td className="num font-semibold">{num(total)}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-[0.82rem] leading-relaxed mb-4">
          The amount of {inr(total)} (Rupees in words as per annexure) shall be adjusted against the next payable bill under the FSA. Supporting documents — UTTAM declaration, railway receipt, weighbridge ticket, laboratory register extract{rake.thirdPartySampled ? ", third-party sampling certificate" : ""} and bunker analysis — are enclosed.
        </p>
        <p className="text-[0.82rem] leading-relaxed mb-10">
          This debit is raised without prejudice to the Corporation's other rights and remedies under the Fuel Supply Agreement.
        </p>

        <div className="flex justify-between text-[0.82rem]">
          <div className="text-muted">Encl: as above</div>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-ink pt-1">General Manager (Fuel), {rake.plant}</div>
          </div>
        </div>

        <div className="mt-8 pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
          Synthetic demonstration document — no representation about any actual supplier, contractor, railway, or employee.
        </div>
      </div>
    </>
  );
}
