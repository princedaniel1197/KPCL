// Rake detail [C1]: GCV waterfall, evidence panel, findings, debit-note action.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { findingsFor } from "@/lib/views/coal";
import { claims, collieryById, rakes } from "@/lib/data";
import { COAL_NORMS, gradeByName, gradeForGcv } from "@/lib/engines/norms";
import { dateFmt, inr, inrCr, kcal, num, pct } from "@/lib/format";

export default function RakeDetail({ params, searchParams }: { params: { rakeId: string }; searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const rake = rakes.find((r) => r.id === params.rakeId);
  if (!rake) notFound();
  const f = findingsFor(rake);
  const col = collieryById.get(rake.source)!;
  const claim = claims.find((c) => c.rakeId === rake.id);
  const billedBand = gradeByName(rake.billedGrade);
  const receivedBand = gradeForGcv(rake.receivedGCV);

  // GCV waterfall geometry (billed → received → fired against a kcal scale).
  const max = rake.billedGCV;
  const min = Math.min(rake.firedGCV, rake.receivedGCV) - 250;
  const w = (v: number) => `${Math.max(2, ((v - min) / (max - min)) * 100)}%`;

  return (
    <>
      <PageHeader
        title={`Rake ${rake.id}`}
        subtitle={subtitle(lang, scope, "rakeLedger")}
        actions={
          f.overbillingValue > 0 ? (
            <Link href={`/coal/ledger/${rake.id}/debit-note`} className="btn-gold">
              Generate debit note
            </Link>
          ) : undefined
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-4">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">Consignment</div>
          <dl className="text-[0.82rem] space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted">Source</dt><dd className="font-medium">{col.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Siding</dt><dd>{col.siding}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Destination</dt><dd>{rake.plant}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Placed</dt><dd>{dateFmt(rake.date)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Wagons</dt><dd className="tnum">{rake.wagons} × {rake.wagonCapT} t</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Billed grade</dt><dd>{rake.billedGrade} ({inr(billedBand.pitheadPrice)}/t pithead)</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Freight</dt><dd>{inr(rake.freightPerTonne)}/t</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Landed cost</dt><dd className="font-medium">{inr(f.landedCostPerTonne)}/t</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Moisture</dt><dd>{pct(rake.moisturePct)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Sampling</dt><dd>{rake.thirdPartySampled ? <Chip tone="success">third-party at loading end</Chip> : <Chip tone="neutral">departmental</Chip>}</dd></div>
          </dl>
        </div>

        <div className="panel p-4 md:col-span-2">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-3">GCV waterfall — billed → received → fired</div>
          <div className="space-y-4 text-[0.78rem]">
            <div>
              <div className="flex justify-between mb-1"><span>Billed (UTTAM declaration)</span><span className="tnum font-medium">{kcal(rake.billedGCV)} · {rake.billedGrade}</span></div>
              <div className="h-4 bg-wash"><div className="h-full bg-ink/80" style={{ width: w(rake.billedGCV) }} /></div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Received (weighbridge lab{rake.thirdPartySampled ? " · gap opened in transit — loading-end sample matched billing" : ""})</span>
                <span className={`tnum font-medium ${f.gradeSlipped ? "text-danger" : ""}`}>{kcal(rake.receivedGCV)} · {receivedBand.grade}</span>
              </div>
              <div className="h-4 bg-wash relative">
                <div className="h-full bg-gold" style={{ width: w(rake.receivedGCV) }} />
              </div>
              <div className="text-[0.68rem] text-muted mt-0.5">
                Drop {num(rake.billedGCV - rake.receivedGCV)} kcal vs {COAL_NORMS.transitCvLossKcal} kcal transit norm
                {f.gcvTransitGap > 0 && <span className="text-danger font-medium"> → {num(f.gcvTransitGap)} kcal beyond physics</span>}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Fired (bunker analysis)</span><span className="tnum font-medium">{kcal(rake.firedGCV)}</span></div>
              <div className="h-4 bg-wash"><div className="h-full bg-muted" style={{ width: w(rake.firedGCV) }} /></div>
              <div className="text-[0.68rem] text-muted mt-0.5">
                Drop {num(rake.receivedGCV - rake.firedGCV)} kcal vs {COAL_NORMS.storageCvToleranceKcal} kcal storage tolerance
                {f.unexplainedFiredGap > 0 && <span className="text-warning font-medium"> → {num(f.unexplainedFiredGap)} kcal unexplained</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionHead title="Rupee findings" />
      <table className="ledger">
        <thead>
          <tr><th>Leg</th><th>Computation</th><th className="num">Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium">Grade overbilling</td>
            <td className="text-muted">
              {f.gradeSlipped
                ? `Billed ${billedBand.grade} @ ${inr(billedBand.pitheadPrice)}/t, received quality is ${receivedBand.grade} @ ${inr(receivedBand.pitheadPrice)}/t × ${num(rake.receivedTonnes)} t`
                : "Received GCV holds the billed grade — no differential"}
            </td>
            <td className="num font-medium">{f.overbillingValue > 0 ? inr(Math.round(f.overbillingValue)) : "—"}</td>
            <td>{f.overbillingValue > 0 ? (claim ? <Chip tone="info">claim {claim.status}</Chip> : <Chip tone="danger">debit note due</Chip>) : <Chip tone="success">clear</Chip>}</td>
          </tr>
          <tr>
            <td className="font-medium">Excess transit shortage</td>
            <td className="text-muted">
              Gap {num(Math.round(f.quantityGapT))} t ({pct(f.quantityGapPct)}) vs {COAL_NORMS.transitQuantityLossPct}% norm → {num(Math.round(f.excessLossT))} t excess × {inr(f.landedCostPerTonne)}/t landed
            </td>
            <td className="num font-medium">{f.excessLossValue > 0 ? inr(Math.round(f.excessLossValue)) : "—"}</td>
            <td>{f.excessLossValue > 0 ? <Chip tone="warning">claimable</Chip> : <Chip tone="success">within norm</Chip>}</td>
          </tr>
          <tr>
            <td className="font-medium">Efficiency loss</td>
            <td className="text-muted">
              {f.unexplainedFiredGap > 0
                ? `${num(f.unexplainedFiredGap)} unexplained kcal → ${COAL_NORMS.extraCoalPctPer100Kcal}% extra coal per 100 kcal on ${num(rake.receivedTonnes)} t`
                : "Yard-to-boiler drop within storage tolerance"}
            </td>
            <td className="num font-medium">{f.efficiencyLossValue > 0 ? inr(Math.round(f.efficiencyLossValue)) : "—"}</td>
            <td>{f.efficiencyLossValue > 0 ? <Chip tone="warning">stock rotation</Chip> : <Chip tone="success">clear</Chip>}</td>
          </tr>
          <tr>
            <td className="font-medium">Demurrage</td>
            <td className="text-muted">
              Turnaround {num(rake.placementHours)} h vs {COAL_NORMS.freeTimeHours} h free time → {num(f.demurrageHours, 1)} h × {rake.wagons} wagons × {inr(COAL_NORMS.demurragePerWagonHour)}/wagon-h
            </td>
            <td className="num font-medium">{f.demurrageValue > 0 ? inr(Math.round(f.demurrageValue)) : "—"}</td>
            <td>{f.demurrageValue > 0 ? <Chip tone="info">avoidable</Chip> : <Chip tone="success">clear</Chip>}</td>
          </tr>
          <tr>
            <td className="font-medium">Idle freight</td>
            <td className="text-muted">
              {f.underloadT > 0
                ? `Under-loaded ${num(Math.round(f.underloadT))} t vs rated ${num(rake.wagons * rake.wagonCapT)} t × ${inr(rake.freightPerTonne)}/t freight`
                : "Loaded to rated capacity"}
            </td>
            <td className="num font-medium">{f.idleFreightValue > 0 ? inr(Math.round(f.idleFreightValue)) : "—"}</td>
            <td>{f.idleFreightValue > 0 ? <Chip tone="warning">siding pattern</Chip> : <Chip tone="success">clear</Chip>}</td>
          </tr>
          <tr>
            <td className="font-semibold">Total leakage</td>
            <td />
            <td className="num font-semibold">{f.totalLeakage > 0 ? inr(Math.round(f.totalLeakage)) : "—"}</td>
            <td>{f.totalLeakage > 0 ? <Chip tone="danger">{inrCr(f.totalLeakage)}</Chip> : <Chip tone="success">clean rake</Chip>}</td>
          </tr>
        </tbody>
      </table>

      <SectionHead title="Evidence" />
      <ul className="text-[0.8rem] space-y-1.5 text-muted">
        <li>· UTTAM declaration {rake.id}/UT — billed {rake.billedGrade}, {kcal(rake.billedGCV)} (synthetic reference)</li>
        <li>· Railway receipt RR/{rake.id.slice(3)} — {rake.wagons} BOXN wagons ex {col.siding}</li>
        <li>· Weighbridge ticket WB/{rake.plant}/{rake.id.slice(3)} — {num(rake.receivedTonnes)} t received</li>
        <li>· Lab register {rake.plant}-LAB/{rake.date} — as-received GCV {kcal(rake.receivedGCV)}, moisture {pct(rake.moisturePct)}</li>
        {rake.thirdPartySampled && <li>· Third-party sampler certificate — loading-end GCV within band of billed grade</li>}
        <li>· Bunker composite analysis — as-fired GCV {kcal(rake.firedGCV)}</li>
      </ul>
    </>
  );
}
