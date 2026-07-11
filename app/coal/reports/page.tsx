// Monthly coal reconciliation report — print-ready document of record.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Kpi";
import { PrintButton } from "@/components/ui/PrintButton";
import { getLang, getScope, type SearchParams, type Scope } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { coalAggregates, isThermalScope, scopedLeague } from "@/lib/views/coal";
import { claims, collieryById, meta, AS_OF } from "@/lib/data";
import { COAL_NORMS } from "@/lib/engines/norms";
import { dateFmt, inrCr, monthFmt, num, pct } from "@/lib/format";
import type { ClaimStatus } from "@/lib/types";

const statusTone = (s: ClaimStatus) =>
  s === "RECOVERED" ? "success" : s === "DRAFT" ? "warning" : "info";

export default function MonthlyReport({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "coalReports")} subtitle={subtitle(lang, scope, "coalReports")} />
        <p className="text-muted text-sm">No coal reconciliation for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const latest = meta.months[meta.months.length - 1];
  const rawMonth = typeof searchParams.month === "string" ? searchParams.month : latest;
  const month = meta.months.includes(rawMonth) ? rawMonth : latest;

  const reportScope: Scope = { plant: scope.plant, period: month };
  const agg = coalAggregates(reportScope);
  const league = scopedLeague(reportScope);
  const monthClaims = claims
    .filter((c) => c.month === month && (scope.plant === "ALL" || c.plant === scope.plant))
    .sort((a, b) => b.amount - a.amount);

  const mkQs = (m: string) => {
    const q = new URLSearchParams();
    if (scope.plant !== "ALL") q.set("plant", scope.plant);
    q.set("month", m);
    return `?${q.toString()}`;
  };

  const scopeLabel = scope.plant === "ALL" ? "All thermal stations" : scope.plant;

  return (
    <>
      <PageHeader title={t(lang, "coalReports")} subtitle={subtitle(lang, scope, "coalReports")} />

      <div className="flex flex-wrap items-center gap-2 mb-4 no-print">
        {meta.months.map((m) => (
          <Link
            key={m}
            href={mkQs(m)}
            className={`px-3 py-1 text-[0.75rem] rounded-sm border ${month === m ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`}
          >
            {monthFmt(m)}
          </Link>
        ))}
        <span className="flex-1" />
        <PrintButton label="Print report" />
      </div>

      <div className="report-white panel max-w-[880px] mx-auto p-10 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
        <div className="text-center border-b-[1.5px] border-gold pb-4 mb-6">
          <div className="font-serif text-2xl font-semibold">Karnataka Power Corporation Limited</div>
          <div className="text-[0.72rem] text-muted uppercase tracking-[0.14em] mt-1">Office of the General Manager (Fuel)</div>
          <div className="font-serif text-lg mt-3">Monthly Coal Reconciliation — {monthFmt(month)}</div>
          <div className="text-[0.72rem] text-muted mt-1">Scope: {scopeLabel} · Compiled {dateFmt(AS_OF)}</div>
        </div>

        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted mb-2">1 · Headline reconciliation</div>
        <table className="ledger mb-6">
          <thead>
            <tr><th>Measure</th><th className="num">Value</th><th>Remark</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Rakes reconciled</td>
              <td className="num">{num(agg.rakeCount)}</td>
              <td className="text-muted">billed → received → fired, all legs</td>
            </tr>
            <tr>
              <td>Billed / received quantity</td>
              <td className="num">{num(Math.round(agg.billedT))} t / {num(Math.round(agg.receivedT))} t</td>
              <td className="text-muted">plant weighbridge vs UTTAM declarations</td>
            </tr>
            <tr>
              <td>Transit loss</td>
              <td className={`num ${agg.avgTransitLossPct > COAL_NORMS.transitQuantityLossPct ? "text-danger font-semibold" : ""}`}>{pct(agg.avgTransitLossPct, 2)}</td>
              <td className="text-muted">against the {COAL_NORMS.transitQuantityLossPct}% rail norm</td>
            </tr>
            <tr>
              <td>Grade overbilling</td>
              <td className="num">{inrCr(agg.leakage.overbilling)}</td>
              <td className="text-muted">{num(agg.slippedRakes)} rakes slipped a full grade</td>
            </tr>
            <tr>
              <td>Excess transit shortage</td>
              <td className="num">{inrCr(agg.leakage.excessTransit)}</td>
              <td className="text-muted">tonnage beyond norm at landed cost</td>
            </tr>
            <tr>
              <td>Efficiency loss</td>
              <td className="num">{inrCr(agg.leakage.efficiency)}</td>
              <td className="text-muted">unexplained yard-to-boiler kcal</td>
            </tr>
            <tr>
              <td>Demurrage + idle freight</td>
              <td className="num">{inrCr(agg.leakage.demurrage + agg.leakage.idleFreight)}</td>
              <td className="text-muted">logistics leg</td>
            </tr>
            <tr>
              <td className="font-semibold">Total leakage for the month</td>
              <td className="num font-semibold">{inrCr(agg.leakage.total)}</td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted mb-2">2 · Source league — {monthFmt(month)}</div>
        <table className="ledger mb-6">
          <thead>
            <tr>
              <th>Source</th><th className="num">Rakes</th><th className="num">Billed t</th>
              <th className="num">Received t</th><th className="num">Transit loss</th>
              <th className="num">Avg GCV slip</th><th className="num">Leakage ₹</th>
            </tr>
          </thead>
          <tbody>
            {league.map((s) => (
              <tr key={s.source}>
                <td>{collieryById.get(s.source)?.name ?? s.source}</td>
                <td className="num">{num(s.rakes)}</td>
                <td className="num">{num(Math.round(s.billedT))}</td>
                <td className="num">{num(Math.round(s.receivedT))}</td>
                <td className={`num ${s.transitLossPct > COAL_NORMS.transitQuantityLossPct ? "text-danger font-semibold" : ""}`}>{pct(s.transitLossPct, 2)}</td>
                <td className="num">{num(Math.round(s.avgGcvSlip))} kcal</td>
                <td className="num font-medium">{inrCr(s.totalLeakage)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted mb-2">3 · Claims raised in {monthFmt(month)}</div>
        {monthClaims.length === 0 ? (
          <p className="text-[0.8rem] text-muted mb-6">No claims were raised during the month for this scope.</p>
        ) : (
          <table className="ledger mb-6">
            <thead>
              <tr><th>Claim</th><th>Kind</th><th>Source</th><th>Plant</th><th className="num">Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {monthClaims.map((c) => (
                <tr key={c.id}>
                  <td><Link className="underline font-medium" href={`/coal/claims/${c.id}`}>{c.id}</Link></td>
                  <td className="text-muted">{c.kind.replaceAll("_", " ").toLowerCase()}</td>
                  <td>{c.source}</td>
                  <td>{c.plant}</td>
                  <td className="num font-medium">{inrCr(c.amount)}</td>
                  <td><Chip tone={statusTone(c.status)}>{c.status}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-between text-[0.82rem] mt-10">
          <div className="text-muted">Annexures: rake-wise reconciliation ledger, laboratory register extracts, claim files.</div>
          <div className="text-center">
            <div className="h-10" />
            <div className="border-t border-ink pt-1">General Manager (Fuel)</div>
          </div>
        </div>

        <div className="mt-8 pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
          Synthetic demonstration document — no representation about any actual supplier, contractor, railway, or employee.
        </div>
      </div>
    </>
  );
}
