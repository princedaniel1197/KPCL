// Real KPCL corporate financials, parsed from the Annual Report P&L highlights.
// Server component — renders nothing until the annual-report parser has run.

import { hasAnnualReport, scrapedAnnualReport } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead } from "@/components/ui/Kpi";
import { inrCr } from "@/lib/format";

function Stat({ label, cr, prev }: { label: string; cr?: number; prev?: number }) {
  if (cr == null) return null;
  const yoy = prev && prev > 0 ? ((cr - prev) / prev) * 100 : null;
  return (
    <div className="panel px-4 py-3">
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="hero-numeral text-[1.5rem] mt-1">{inrCr(cr * 1e7, 0)}</div>
      {yoy != null && (
        <div className={`text-[0.68rem] mt-0.5 ${yoy >= 0 ? "text-success" : "text-danger"}`}>
          {yoy >= 0 ? "+" : ""}{yoy.toFixed(1)}% YoY
        </div>
      )}
    </div>
  );
}

export function RealFinancials() {
  if (!hasAnnualReport()) return null;
  const ar = scrapedAnnualReport.records;
  const f = ar.financials;
  if (!f || f.totalIncomeCr == null) return null;

  return (
    <>
      <SectionHead
        title={`Real KPCL financials — FY ${ar.fy}`}
        right={<ProvenanceChip provenance="REAL" source="KPCL Annual Report (audited P&L)" fetched={scrapedAnnualReport.fetched_at.slice(0, 10)} />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Income from energy" cr={f.saleOfEnergyCr} prev={f.saleOfEnergyPrevCr} />
        <Stat label="Total income" cr={f.totalIncomeCr} prev={f.totalIncomePrevCr} />
        <Stat label="Operating profit" cr={f.operatingProfitCr} prev={f.operatingProfitPrevCr} />
        <Stat label="Profit before tax" cr={f.pbtCr} prev={f.pbtPrevCr} />
      </div>
      <p className="text-[0.68rem] text-faint mt-2">
        Audited standalone figures from KPCL&apos;s published Annual Report — the real corporate ledger behind
        the synthetic module detail. PBT fell {f.pbtPrevCr && f.pbtCr ? `${Math.round((1 - f.pbtCr / f.pbtPrevCr) * 100)}%` : ""} YoY.
      </p>
    </>
  );
}
