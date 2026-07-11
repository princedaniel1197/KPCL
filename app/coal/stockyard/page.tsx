// Stockyard [C4] — book vs physical reconciliation and combustion-risk watch.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { findingsFor, isThermalScope, scopedRakes } from "@/lib/views/coal";
import { stockpiles } from "@/lib/data";
import { analyzeStockpile } from "@/lib/engines/coal";
import { COAL_NORMS } from "@/lib/engines/norms";
import { inr, inrCr, num, pct } from "@/lib/format";

const FALLBACK_LANDED_COST = 2900; // ₹/t when no rakes fall in scope

export default function StockyardPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "stockyard")} subtitle={subtitle(lang, scope, "stockyard")} />
        <p className="text-muted text-sm">No coal stockyards for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  // Stockpiles carry plant only — period scope does not apply.
  const piles = stockpiles
    .filter((sp) => scope.plant === "ALL" || sp.plant === scope.plant)
    .map((sp) => ({ sp, f: analyzeStockpile(sp) }));

  const bookT = piles.reduce((s, x) => s + x.sp.bookTonnes, 0);
  const physicalT = piles.reduce((s, x) => s + x.sp.physicalTonnes, 0);
  const gapT = piles.reduce((s, x) => s + x.f.bookGapT, 0);

  const rakes = scopedRakes(scope);
  const avgLanded = rakes.length
    ? Math.round(rakes.reduce((s, r) => s + findingsFor(r).landedCostPerTonne, 0) / rakes.length)
    : FALLBACK_LANDED_COST;
  const gapValue = gapT * avgLanded;

  const riskPiles = piles.filter((x) => x.f.combustionRisk);

  return (
    <>
      <PageHeader title={t(lang, "stockyard")} subtitle={subtitle(lang, scope, "stockyard")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Book stock" value={`${num(Math.round(bookT))} t`} tone="neutral" sub={`${num(piles.length)} piles in scope`} />
        <KpiTile label="Physical stock" value={`${num(Math.round(physicalT))} t`} tone="info" sub="latest volumetric survey" />
        <KpiTile label="Book-vs-physical gap" value={inrCr(gapValue)} tone="danger" sub={`${num(Math.round(gapT))} t × ${inr(avgLanded)}/t landed`} />
        <KpiTile label="Combustion risk" value={num(riskPiles.length)} tone={riskPiles.length > 0 ? "danger" : "success"} sub={`piles aged > ${COAL_NORMS.combustionRiskAgeDays} d and > ${num(COAL_NORMS.combustionRiskTonnes)} t`} />
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="ledger min-w-[980px]">
          <thead>
            <tr>
              <th>Yard</th><th>Plant</th>
              <th className="num">Book t</th><th className="num">Physical t</th>
              <th className="num">Gap t</th><th className="num">Gap %</th>
              <th className="num">Allowed loss t</th><th className="num">Excess gap t</th>
              <th className="num">Age d</th><th className="num">GCV</th><th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {piles
              .sort((a, b) => b.f.excessGapT - a.f.excessGapT)
              .map(({ sp, f }) => (
                <tr key={sp.id}>
                  <td className="font-medium">{sp.yard}</td>
                  <td>{sp.plant}</td>
                  <td className="num">{num(sp.bookTonnes)}</td>
                  <td className="num">{num(sp.physicalTonnes)}</td>
                  <td className="num">{num(Math.round(f.bookGapT))}</td>
                  <td className="num">{pct(f.bookGapPct, 2)}</td>
                  <td className="num">{num(Math.round(f.allowedStorageLossT))}</td>
                  <td className={`num ${f.excessGapT > 0 ? "text-danger font-semibold" : ""}`}>{f.excessGapT > 0 ? num(Math.round(f.excessGapT)) : "—"}</td>
                  <td className={`num ${sp.ageDays > COAL_NORMS.combustionRiskAgeDays ? "text-warning font-semibold" : ""}`}>{num(sp.ageDays)}</td>
                  <td className="num">{num(sp.gcv)}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {f.combustionRisk && <Chip tone="danger">combustion risk</Chip>}
                    {f.excessGapT > 0 && <Chip tone="warning">book gap</Chip>}
                    {!f.combustionRisk && f.excessGapT <= 0 && <Chip tone="success">clear</Chip>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.72rem] text-muted mt-3">
        Allowed loss = {COAL_NORMS.storageLossPctPer10Days}% of book stock per 10 days of age (windage and
        oxidation). Gaps beyond that allowance point to weighment or book-entry issues, not physics. Piles older
        than {COAL_NORMS.combustionRiskAgeDays} days above {num(COAL_NORMS.combustionRiskTonnes)} t are flagged for
        spontaneous-combustion watch — first-in-first-out rotation and temperature probing indicated. Stock GCV in
        kcal/kg.
      </p>
    </>
  );
}
