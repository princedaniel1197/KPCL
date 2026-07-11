// Spares & inventory intelligence [D2] — stockout risk on V-class criticals,
// dead stock echoing the DG-spares write-off, emergency-purchase premium.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { inventoryView, scopedSpares } from "@/lib/views/contracts";
import { inr, inrCr, num } from "@/lib/format";

const VED_LABEL = { V: "V — vital", E: "E — essential", D: "D — desirable" } as const;

export default function SparesInventory({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (scopedSpares(scope).length === 0) {
    return (
      <>
        <PageHeader title={t(lang, "inventory")} subtitle={subtitle(lang, scope, "inventory")} />
        <p className="text-muted text-sm">No spares inventory for this plant scope. Stores registers cover the thermal stations — switch to RTPS, BTPS, YTPS or All plants.</p>
      </>
    );
  }

  const v = inventoryView(scope);
  const deadTotal = v.summary.deadValue;
  const deadRows = v.deadRows.slice(0, 20);
  const deadShownValue = deadRows.reduce((s, r) => s + r.finding.deadValue, 0);

  return (
    <>
      <PageHeader title={t(lang, "inventory")} subtitle={subtitle(lang, scope, "inventory")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="SKUs on register" value={num(v.skuCount)} sub="stores master, scoped" />
        <KpiTile label="Stockout-risk criticals" value={num(v.summary.stockoutCount)} tone="danger" sub="V-class, cover below lead time" />
        <KpiTile label="Dead stock" value={inrCr(deadTotal)} tone="warning" sub={`${num(v.summary.deadCount)} SKUs, no issue ≥24 mo`} />
        <KpiTile label="Emergency-purchase premium" value={inrCr(v.summary.emergencyPremium)} tone="danger" sub="est. 30% premium on lead-time buys" />
      </div>

      <SectionHead title="VED × activity matrix" right="SKU counts · Active = issued in window · Dead = no issue ≥24 mo" />
      <table className="ledger">
        <thead>
          <tr><th>Criticality</th><th className="num">Active</th><th className="num">Slow</th><th className="num">Dead</th><th className="num">Total</th></tr>
        </thead>
        <tbody>
          {(["V", "E", "D"] as const).map((ved) => {
            const row = v.matrix[ved];
            const total = row.ACTIVE + row.SLOW + row.DEAD;
            return (
              <tr key={ved}>
                <td className="font-medium">{VED_LABEL[ved]}</td>
                <td className="num">{num(row.ACTIVE)}</td>
                <td className="num">{num(row.SLOW)}</td>
                <td className={`num ${row.DEAD > 0 ? "text-warning font-medium" : ""}`}>{num(row.DEAD)}</td>
                <td className="num font-medium">{num(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SectionHead title="Stockout risk — V-class criticals" right={`${num(v.stockoutRows.length)} SKUs where on-hand cover < procurement lead time`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[980px]">
          <thead>
            <tr>
              <th>SKU</th><th>Description</th><th>Plant</th>
              <th className="num">On hand</th><th className="num">Forecast /mo</th><th className="num">Lead time (mo)</th>
              <th className="num">Months of cover</th><th className="num">Emergency premium ₹</th><th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {v.stockoutRows.map(({ spare: s, finding: f }) => (
              <tr key={s.sku}>
                <td className="font-medium whitespace-nowrap">{s.sku}</td>
                <td className="max-w-[280px]">{s.description}</td>
                <td>{s.plant}</td>
                <td className="num">{num(s.onHand)}</td>
                <td className="num">{num(f.forecastPerMonth, 1)}</td>
                <td className="num">{num(s.leadTimeMonths)}</td>
                <td className="num text-danger font-semibold">{num(f.monthsOfCover, 1)}</td>
                <td className="num font-medium">{inr(Math.round(f.emergencyPremiumEst))}</td>
                <td><Chip tone="danger">order now</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.72rem] text-muted mt-2">
        Cover shorter than lead time means the next failure is bought at emergency-purchase rates — the premium column
        is what waiting costs.
      </p>

      <SectionHead title="Dead-stock ledger" right={`top 20 by value of ${num(v.summary.deadCount)} dead SKUs`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[900px]">
          <thead>
            <tr>
              <th>SKU</th><th>Description</th><th>Plant</th>
              <th className="num">On hand</th><th className="num">Unit cost</th><th className="num">Value</th><th className="num">Months since last issue</th>
            </tr>
          </thead>
          <tbody>
            {deadRows.map(({ spare: s, finding: f }) => (
              <tr key={s.sku}>
                <td className="font-medium whitespace-nowrap">{s.sku}</td>
                <td className="max-w-[300px]">{s.description}</td>
                <td>{s.plant}</td>
                <td className="num">{num(s.onHand)}</td>
                <td className="num">{inr(s.unitCost)}</td>
                <td className="num font-medium">{inrCr(f.deadValue)}</td>
                <td className="num text-warning font-medium">{num(s.monthsSinceLastIssue)}</td>
              </tr>
            ))}
            <tr>
              <td className="font-semibold" colSpan={5}>Total dead stock ({num(v.summary.deadCount)} SKUs · top 20 shown carry {inrCr(deadShownValue)})</td>
              <td className="num font-semibold">{inrCr(deadTotal)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[0.72rem] text-muted mt-2">
        Dead stock echoes the DG-spares write-off pattern — items bought, shelved, and surrendered years later at
        scrap value. Flag the ledger above for NRV review before the next physical verification, not after.
      </p>
    </>
  );
}
