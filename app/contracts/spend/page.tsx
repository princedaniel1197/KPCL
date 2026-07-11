// Spend analytics [D4] — where the procurement rupee goes, how it was
// tendered, and how long the cycle took.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { SimpleBars } from "@/components/charts";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { scopeQs, spendAggregates } from "@/lib/views/contracts";
import { inrCr, num, pct } from "@/lib/format";

const SINGLE_TENDER_WATCH_PCT = 8;

export default function SpendAnalytics({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const agg = spendAggregates(scope);
  const chartData = agg.byCategory.map((c) => ({ category: c.category, value: Math.round(c.valueCr * 100) / 100 }));
  const singleOveruse = agg.singleSharePct > SINGLE_TENDER_WATCH_PCT;

  return (
    <>
      <PageHeader title={t(lang, "spend")} subtitle={subtitle(lang, scope, "spend")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Total spend" value={inrCr(agg.totalCr * 1e7)} sub="awarded value, cumulative register" />
        <KpiTile
          label="Single-tender share"
          value={pct(agg.singleSharePct, 1)}
          tone={singleOveruse ? "danger" : "success"}
          sub={`by value · watch level ${SINGLE_TENDER_WATCH_PCT}%`}
        />
        <KpiTile label="Limited-tender share" value={pct(agg.limitedSharePct, 1)} tone="info" sub="by value" />
        <KpiTile label="Avg cycle" value={`${num(agg.avgCycleDays, 0)} d`} sub="indent → award, all contracts" />
      </div>

      <SectionHead title="Spend by category" right="₹ cr, awarded value" />
      <div className="panel p-4">
        <SimpleBars data={chartData} xKey="category" yKey="value" unit=" cr" height={240} />
      </div>

      <SectionHead title="Tender mode mix" right="KTPP exception routes vs open tender" />
      <table className="ledger">
        <thead>
          <tr><th>Mode</th><th className="num">Contracts</th><th className="num">Value</th><th className="num">Share by value</th><th>Signal</th></tr>
        </thead>
        <tbody>
          {agg.byMode.map((m) => (
            <tr key={m.mode}>
              <td className="font-medium">{m.mode}</td>
              <td className="num">{num(m.count)}</td>
              <td className="num">{inrCr(m.valueCr * 1e7)}</td>
              <td className="num font-medium">{pct(m.sharePct, 1)}</td>
              <td>
                {m.mode === "SINGLE"
                  ? m.sharePct > SINGLE_TENDER_WATCH_PCT
                    ? <Chip tone="danger">above {SINGLE_TENDER_WATCH_PCT}% watch level</Chip>
                    : <Chip tone="success">within watch level</Chip>
                  : m.mode === "LIMITED"
                    ? <Chip tone="info">exception route — justification on file</Chip>
                    : <Chip tone="neutral">default route</Chip>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {singleOveruse && (
        <p className="text-[0.75rem] text-danger mt-2">
          Single-tender awards carry {pct(agg.singleSharePct, 1)} of spend by value — above the {SINGLE_TENDER_WATCH_PCT}%
          watch level. Each 4(g)/single-source justification should be re-verified against the KTPP exception register.
        </p>
      )}

      <SectionHead title="Procurement cycle time by category" right="days, average per contract" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[720px]">
          <thead>
            <tr><th>Category</th><th className="num">Contracts</th><th className="num">Indent → NIT</th><th className="num">NIT → award</th><th className="num">Total cycle</th></tr>
          </thead>
          <tbody>
            {agg.cycleByCategory.map((c) => (
              <tr key={c.category}>
                <td className="whitespace-nowrap">{c.category}</td>
                <td className="num">{num(c.count)}</td>
                <td className="num">{num(c.avgIndentToNit, 0)}</td>
                <td className="num">{num(c.avgNitToAward, 0)}</td>
                <td className={`num font-medium ${c.avgTotal > agg.avgCycleDays * 1.25 ? "text-warning" : ""}`}>{num(c.avgTotal, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.72rem] text-muted mt-3">
        Long award cycles feed the re-tender spiral tracked under Capital Projects —{" "}
        <Link className="underline" href={`/projects/retenders${scopeQs(scope)}`}>re-tender register →</Link>
      </p>
    </>
  );
}
