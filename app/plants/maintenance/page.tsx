// Maintenance queue [B1/B2] — units ranked by the rule-based asset risk
// index, with plain-English drivers and a suggested action. Explicitly a
// concept surface on synthetic data.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { InlineBar } from "@/components/plants/InlineBar";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { isThermalScope, riskQueue, scopeQs, suggestedAction } from "@/lib/views/plants";
import { num } from "@/lib/format";

export default function MaintenanceQueue({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "maintenance")} subtitle={subtitle(lang, scope, "maintenance")} />
        <p className="text-muted text-sm">No thermal maintenance queue for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const rows = riskQueue(scope);
  const qs = scopeQs(scope);

  return (
    <>
      <PageHeader title={t(lang, "maintenance")} subtitle={subtitle(lang, scope, "maintenance")} />

      <div className="mb-3">
        <Chip tone="neutral">concept — illustrative on synthetic data</Chip>
      </div>
      <p className="text-[0.8rem] text-muted max-w-3xl mb-4">
        The risk index is a rule-based composite of sensor-health, forced-outage recurrence and unit
        vintage — not a trained model. It exists to show how a risk-ranked inspection queue would read;
        the weights are illustrative and every driver is spelled out in plain English so it can be argued with.
      </p>

      <SectionHead title="Risk-ranked asset queue" right="sorted by risk index, highest first" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[820px]">
          <thead>
            <tr>
              <th>Unit</th><th className="num">Capacity MW</th><th>Risk index</th>
              <th>Drivers</th><th>Suggested action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.unit.id}>
                <td>
                  <Link className="underline font-medium" href={`/plants/${r.unit.id}${qs}`}>{r.unit.id}</Link>
                  {r.underRnM && <span className="ml-2"><Chip tone="info">under R&M</Chip></span>}
                </td>
                <td className="num">{num(r.unit.capacityMW)}</td>
                <td className="min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <InlineBar value={r.risk.riskIndex} tone={r.risk.riskIndex >= 60 ? "danger" : "gold"} />
                    <span className="tnum font-medium w-8 text-right">{num(r.risk.riskIndex, 0)}</span>
                  </div>
                </td>
                <td>
                  <ul className="list-disc pl-4 space-y-0.5 text-[0.78rem] text-muted">
                    {r.risk.drivers.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </td>
                <td className={r.risk.riskIndex >= 60 ? "font-medium text-danger" : ""}>{suggestedAction(r.risk.riskIndex)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
