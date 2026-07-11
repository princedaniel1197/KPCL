// MD Dashboard [H2] — the corporation on one screen.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { StackedBars } from "@/components/charts";
import { CountUp } from "@/components/ui/CountUp";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { t } from "@/lib/i18n";
import { buildOverview } from "@/lib/views/overview";
import { inrCr, monthFmt, num } from "@/lib/format";

export default function MdDashboard({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const o = buildOverview(scope);

  return (
    <>
      <PageHeader title={t(lang, "mdDashboard")} subtitle={subtitle(lang, scope, "mdDashboard")} />

      {/* Hero: ₹ at risk */}
      <div className="panel px-6 py-6 md:flex items-end justify-between gap-8">
        <div>
          <div className="text-[0.66rem] uppercase tracking-[0.14em] text-muted">{t(lang, "atRisk")}</div>
          <div className="hero-numeral text-[4rem] md:text-[5rem] text-danger leading-none mt-1">
            <CountUp value={o.headlineCr} decimals={1} prefix="₹" suffix=" cr" />
          </div>
          <div className="text-[0.72rem] text-faint mt-2">
            Reconciliation gaps, un-pursued claims and prudence exposure discoverable in this window — each rupee traces to a ledger line.
          </div>
        </div>
        <div className="mt-5 md:mt-0 space-y-2 min-w-[260px]">
          {o.split.map((s) => (
            <Link key={s.label} href={s.href} className="flex items-center justify-between gap-6 rule-hair pb-1.5 hover:bg-wash px-1">
              <span className="text-[0.78rem] text-muted">{s.label}</span>
              <span className="tnum font-semibold text-[0.9rem]">{inrCr(s.amountCr * 1e7, 1)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Module KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
        <KpiTile label={t(lang, "coalLeakage")} value={inrCr(o.kpis.coalLeakageCr * 1e7, 1)} tone="danger" href="/coal" />
        <KpiTile label={t(lang, "projectDivergence")} value={num(o.kpis.projectsDiverging)} tone={o.kpis.projectsDiverging > 0 ? "danger" : "success"} href="/projects" />
        <KpiTile label={t(lang, "ldUnclaimed")} value={inrCr(o.kpis.ldUnclaimedCr * 1e7, 1)} tone="danger" href="/legal/intelligence" />
        <KpiTile label={t(lang, "bgsExpiring")} value={num(o.kpis.bgsExpiring30)} sub={inrCr(o.kpis.bgsExpiringValueCr * 1e7, 1)} tone="warning" href="/contracts/guarantees" />
        <KpiTile label={t(lang, "parasOverdue")} value={num(o.kpis.parasOverdue)} tone="warning" href="/regulatory/audit-paras" />
        <KpiTile label={t(lang, "retirements24")} value={num(o.kpis.retirements24mo)} sub={`${o.kpis.spofRoles} SPOF roles`} tone="info" href="/workforce" />
        <KpiTile label={t(lang, "prudenceAtRisk")} value={inrCr(o.kpis.prudenceCr * 1e7, 1)} tone="warning" href="/regulatory" />
        <KpiTile label="Heat-rate drift /yr" value={inrCr(o.kpis.heatRateAnnualizedCr * 1e7, 1)} tone="warning" href="/plants" />
      </div>

      {/* Leakage by month */}
      <SectionHead title="Coal leakage by month" right="₹ cr by reconciliation leg" />
      <div className="panel p-4">
        <StackedBars
          data={o.byMonth.map((m) => ({ ...m, month: monthFmt(m.month) }))}
          xKey="month"
          unit=" cr"
          series={[
            { key: "overbilling", label: "Grade overbilling", color: PALETTE.ink },
            { key: "transit", label: "Excess transit", color: PALETTE.gold },
            { key: "efficiency", label: "Efficiency", color: PALETTE.muted },
            { key: "logistics", label: "Demurrage + idle freight", color: PALETTE.faint },
          ]}
        />
      </div>

      {/* Cross-module alert ledger */}
      <SectionHead title="Alert ledger" right={`${o.alerts.length} live flags`} />
      <div className="overflow-x-auto">
      <table className="ledger min-w-[640px]">
        <thead>
          <tr><th className="w-24">Severity</th><th className="w-40">Module</th><th>Finding</th><th className="w-20"></th></tr>
        </thead>
        <tbody>
          {o.alerts.map((a, i) => (
            <tr key={i}>
              <td><Chip tone={a.severity}>{a.severity === "danger" ? "red flag" : a.severity === "warning" ? "watch" : "note"}</Chip></td>
              <td className="text-muted">{a.module}</td>
              <td>{a.text}</td>
              <td><Link className="underline text-[0.75rem]" href={a.href}>open →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
