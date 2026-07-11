// Real CEA Daily Coal Stock Report — KPCL thermal stations (via National Power
// Portal, which re-publishes CEA's blocked report). Server component: reads the
// committed snapshot, renders nothing until the cea_coal scraper has run.
//
// Shows each station's actual vs normative coal stock, days of stock, and
// whether it is below normative / depleting (receipt < consumption) — all
// copied verbatim from CEA's report, flags computed from CEA's own numbers.

import { hasReal, scrapedCeaCoal, type CeaCoalStation } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead, Chip } from "@/components/ui/Kpi";
import { num } from "@/lib/format";
import type { Scope } from "@/lib/params";

function inScope(s: CeaCoalStation, scope: Scope): boolean {
  if (scope.plant === "ALL") return true;
  return s.plant === scope.plant;
}

function daysTone(days: number | null): "success" | "warning" | "danger" | "neutral" {
  if (days == null) return "neutral";
  if (days < 7) return "danger";
  if (days < 15) return "warning";
  return "success";
}

export function RealCoalStock({ scope }: { scope: Scope }) {
  if (!hasReal(scrapedCeaCoal)) return null;
  const rows = scrapedCeaCoal.records.filter((s) => inScope(s, scope));
  if (rows.length === 0) return null;

  const reportDate = rows[0].reportDate ?? "";

  return (
    <>
      <SectionHead
        title="Real coal position (CEA daily)"
        right={
          <ProvenanceChip
            provenance="REAL"
            source="CEA Daily Coal Stock Report (via NPP)"
            fetched={scrapedCeaCoal.fetched_at.slice(0, 10)}
          />
        }
      />
      <p className="text-[0.72rem] text-muted mb-2">
        CEA report dated <strong>{reportDate}</strong> — actual vs normative pithead/plant stock, days of coal,
        and daily receipt vs burn. Below-normative and depleting flags are derived from CEA&apos;s own figures.
      </p>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[720px]">
          <thead>
            <tr>
              <th>Station</th>
              <th className="num">Daily PLF</th>
              <th className="num">Stock (kT)</th>
              <th className="num">Normative</th>
              <th className="num">Days</th>
              <th className="num">Receipt / burn</th>
              <th>Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const pctNorm =
                s.actualStockKT != null && s.normativeStockKT
                  ? Math.round((s.actualStockKT / s.normativeStockKT) * 100)
                  : null;
              return (
                <tr key={s.plant}>
                  <td className="font-medium whitespace-nowrap">
                    {s.plant} <span className="text-faint">— {s.station}</span>
                  </td>
                  <td className="num">{s.plfPct != null ? `${s.plfPct}%` : "—"}</td>
                  <td className="num">
                    {s.actualStockKT != null ? num(s.actualStockKT) : "—"}
                    {pctNorm != null && <span className="text-faint"> ({pctNorm}%)</span>}
                  </td>
                  <td className="num">{s.normativeStockKT != null ? num(s.normativeStockKT) : "—"}</td>
                  <td className="num">
                    {s.stockDays != null ? <Chip tone={daysTone(s.stockDays)}>{s.stockDays} d</Chip> : "—"}
                  </td>
                  <td className="num">
                    {s.receiptKT != null && s.consumptionKT != null ? (
                      <span className={s.depleting ? "text-danger" : "text-success"}>
                        {num(s.receiptKT, 1)} / {num(s.consumptionKT, 1)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="text-[0.72rem]">
                    <div className="flex flex-wrap gap-1">
                      {s.critical && <Chip tone="danger">critical</Chip>}
                      {s.belowNormative && <Chip tone="warning">below normative</Chip>}
                      {s.depleting && <Chip tone="warning">depleting</Chip>}
                      {!s.belowNormative && !s.depleting && !s.critical && <Chip tone="success">adequate</Chip>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[0.68rem] text-faint mt-1">
        &ldquo;Days&rdquo; = actual stock ÷ CEA&apos;s stated daily requirement. Receipt/burn in kilo-tonnes for the
        report day; receipt below burn means the pile is drawing down. These are the real fuel-security numbers the
        synthetic rake-level reconciliation below sits underneath.
      </p>
    </>
  );
}
