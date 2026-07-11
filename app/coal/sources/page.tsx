// Source league [C5/C6] — full colliery league, transit-loss trend, third-party
// sampling evidence, and billed → received → fired reconciliation by source.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { SimpleLine } from "@/components/charts";
import { PALETTE } from "@/lib/palette";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { isThermalScope, scopedLeague, scopedRakes } from "@/lib/views/coal";
import { collieryById, meta } from "@/lib/data";
import { COAL_NORMS } from "@/lib/engines/norms";
import { dateFmt, inrCr, monthFmt, num, pct } from "@/lib/format";

const FIRED_YIELD = 0.995; // yard-handling estimate: fired ≈ received × 0.995
const EGREGIOUS_GCV_GAP = 1000; // kcal billed − received

const TREND_COLORS = [PALETTE.ink, PALETTE.gold, PALETTE.muted];

export default function SourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "coalSources")} subtitle={subtitle(lang, scope, "coalSources")} />
        <p className="text-muted text-sm">No coal sources for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const league = scopedLeague(scope);
  const rakes = scopedRakes(scope);

  // Transit-loss trend for the top 3 sources by leakage.
  const top3 = league.slice(0, 3).map((s) => s.source);
  const trendData = meta.months.map((month) => {
    const row: Record<string, string | number> = { month: monthFmt(month) };
    for (const src of top3) {
      const mine = rakes.filter((r) => r.source === src && r.month === month);
      const billed = mine.reduce((s, r) => s + r.billedTonnes, 0);
      const received = mine.reduce((s, r) => s + r.receivedTonnes, 0);
      row[src] = billed > 0 ? Math.round(((billed - received) / billed) * 10000) / 100 : 0;
    }
    return row;
  });

  // Reconciliation + egregious rakes [C6].
  const egregious = rakes
    .filter((r) => r.billedGCV - r.receivedGCV > EGREGIOUS_GCV_GAP)
    .sort((a, b) => (b.billedGCV - b.receivedGCV) - (a.billedGCV - a.receivedGCV));

  return (
    <>
      <PageHeader title={t(lang, "coalSources")} subtitle={subtitle(lang, scope, "coalSources")} />

      <SectionHead title="Source league" right="sorted by total leakage ₹" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[1100px]">
          <thead>
            <tr>
              <th>Source</th><th className="num">Rakes</th>
              <th className="num">Billed t</th><th className="num">Received t</th>
              <th className="num">Transit loss</th><th className="num">Avg GCV slip</th>
              <th className="num">Slipped rakes</th><th className="num">Overbilling ₹</th>
              <th className="num">Excess transit ₹</th><th className="num">3P sampled</th>
              <th className="num">3P GCV gap</th><th className="num">Leakage ₹</th>
            </tr>
          </thead>
          <tbody>
            {league.map((s) => {
              const isW3 = s.source === "W-3";
              return (
                <tr key={s.source}>
                  <td className="whitespace-nowrap">
                    {isW3 ? (
                      <Chip tone="danger">grade slippage source</Chip>
                    ) : null}{" "}
                    <span className={isW3 ? "font-semibold" : ""}>{collieryById.get(s.source)?.name ?? s.source}</span>
                  </td>
                  <td className="num">{num(s.rakes)}</td>
                  <td className="num">{num(Math.round(s.billedT))}</td>
                  <td className="num">{num(Math.round(s.receivedT))}</td>
                  <td className={`num ${s.transitLossPct > COAL_NORMS.transitQuantityLossPct ? "text-warning font-semibold" : ""}`}>{pct(s.transitLossPct, 2)}</td>
                  <td className={`num ${isW3 ? "text-danger font-semibold" : ""}`}>{num(Math.round(s.avgGcvSlip))} kcal</td>
                  <td className="num">{pct(s.slippedRakePct, 0)}</td>
                  <td className="num">{s.overbillingValue > 0 ? inrCr(s.overbillingValue) : "—"}</td>
                  <td className="num">{s.excessTransitValue > 0 ? inrCr(s.excessTransitValue) : "—"}</td>
                  <td className="num">{pct(s.thirdPartySampledPct, 0)}</td>
                  <td className="num">{num(Math.round(s.avgThirdPartyGap))} kcal</td>
                  <td className="num font-medium">{inrCr(s.totalLeakage)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHead title="Transit-loss trend" right="monthly billed−received %, top 3 sources by leakage" />
      <div className="panel p-4">
        <SimpleLine
          data={trendData}
          xKey="month"
          unit="%"
          refY={COAL_NORMS.transitQuantityLossPct}
          refLabel="rail norm"
          series={top3.map((src, i) => ({ key: src, label: src, color: TREND_COLORS[i % TREND_COLORS.length] }))}
        />
      </div>

      <SectionHead title="Third-party sampling" right="loading-end samples vs plant weighbridge lab" />
      <table className="ledger">
        <thead>
          <tr>
            <th>Source</th><th className="num">Sampled rakes</th>
            <th className="num">Avg billed→received GCV gap (sampled)</th><th>Reading</th>
          </tr>
        </thead>
        <tbody>
          {league.map((s) => (
            <tr key={s.source}>
              <td>{collieryById.get(s.source)?.name ?? s.source}</td>
              <td className="num">{pct(s.thirdPartySampledPct, 0)}</td>
              <td className={`num ${s.avgThirdPartyGap > COAL_NORMS.transitCvLossKcal ? "text-danger font-semibold" : ""}`}>{num(Math.round(s.avgThirdPartyGap))} kcal</td>
              <td>
                {s.avgThirdPartyGap > COAL_NORMS.transitCvLossKcal
                  ? <Chip tone="danger">gap opens in transit</Chip>
                  : <Chip tone="success">within CV norm</Chip>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[0.72rem] text-muted mt-2">
        On third-party-sampled rakes the loading-end certificate matched the billed grade — yet the plant
        weighbridge lab still recorded the GCV gap shown above. The sampled rakes therefore prove the quality gap
        opens <span className="font-medium">in transit</span>, not at the loading end: pilferage-and-substitution
        en route rather than mis-declaration at the colliery.
      </p>

      <SectionHead title="Reconciliation summary" right={`fired estimated at received × ${FIRED_YIELD}`} />
      <table className="ledger">
        <thead>
          <tr>
            <th>Source</th><th className="num">Billed t</th><th className="num">Received t</th>
            <th className="num">Est. fired t</th><th className="num">Billed → fired shrinkage</th>
          </tr>
        </thead>
        <tbody>
          {league.map((s) => {
            const firedT = s.receivedT * FIRED_YIELD;
            return (
              <tr key={s.source}>
                <td>{collieryById.get(s.source)?.name ?? s.source}</td>
                <td className="num">{num(Math.round(s.billedT))}</td>
                <td className="num">{num(Math.round(s.receivedT))}</td>
                <td className="num">{num(Math.round(firedT))}</td>
                <td className="num">{pct(s.billedT > 0 ? ((s.billedT - firedT) / s.billedT) * 100 : 0, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {egregious.length > 0 && (
        <div className="panel p-4 border-l-2 border-danger mt-4">
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-danger mb-1">
            {num(egregious.length)} egregious rakes — GCV gap beyond {num(EGREGIOUS_GCV_GAP)} kcal
          </div>
          <p className="text-[0.8rem] text-muted leading-relaxed mb-2">
            The following rakes lost more than {num(EGREGIOUS_GCV_GAP)} kcal/kg between billing and receipt — a
            full two grades, far beyond any transit physics. All trace to the same source, and each carries its
            own debit trail.
          </p>
          <ul className="text-[0.8rem] space-y-1">
            {egregious.map((r) => (
              <li key={r.id}>
                · <Link className="underline font-medium" href={`/coal/ledger/${r.id}`}>{r.id}</Link>{" "}
                <span className="text-muted">
                  {r.source} → {r.plant}, {dateFmt(r.date)} — billed {num(r.billedGCV)} vs received {num(r.receivedGCV)} kcal/kg
                  ({num(r.billedGCV - r.receivedGCV)} kcal gap)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
