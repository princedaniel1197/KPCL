// Blending optimizer [C3] — server page derives per-colliery blend components
// from scoped receipts; the interactive lab runs client-side.

import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHead } from "@/components/ui/Kpi";
import { BlendingLab } from "@/components/coal/BlendingLab";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { isThermalScope, scopedRakes } from "@/lib/views/coal";
import { collieries } from "@/lib/data";
import { gradeByName } from "@/lib/engines/norms";
import { inr, kcal, num } from "@/lib/format";
import type { BlendComponent } from "@/lib/engines/coal";

export default function BlendingPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "blending")} subtitle={subtitle(lang, scope, "blending")} />
        <p className="text-muted text-sm">No coal stock to blend for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const rakes = scopedRakes(scope);

  const components: BlendComponent[] = collieries
    .map((c) => {
      const band = gradeByName(c.typicalGrade);
      const receivedT = rakes
        .filter((r) => r.source === c.id)
        .reduce((s, r) => s + r.receivedTonnes, 0);
      return {
        id: c.id,
        label: c.name,
        gcv: Math.round((band.minGcv + band.maxGcv) / 2),
        costPerTonne: band.pitheadPrice + c.freightPerTonne,
        availableT: Math.round(receivedT / 3),
      };
    })
    .filter((c) => c.availableT > 0);

  return (
    <>
      <PageHeader title={t(lang, "blending")} subtitle={subtitle(lang, scope, "blending")} />

      <SectionHead title="Available components" right="landed ₹/t = pithead + freight · availability ⅓ of scoped receipts" />
      <table className="ledger mb-6">
        <thead>
          <tr>
            <th>Source</th><th>Grade</th><th className="num">GCV (band mid)</th>
            <th className="num">Landed ₹/t</th><th className="num">Available t</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => {
            const col = collieries.find((x) => x.id === c.id);
            return (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>{col?.typicalGrade ?? "—"}</td>
                <td className="num">{kcal(c.gcv)}</td>
                <td className="num">{inr(c.costPerTonne)}</td>
                <td className="num">{num(c.availableT)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SectionHead title="Blend lab" right="adjust target GCV and required tonnage" />
      <BlendingLab components={components} />
    </>
  );
}
