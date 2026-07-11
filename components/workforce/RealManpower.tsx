// Real KPCL manpower, parsed from the Annual Report 'Employees Strength' table.
// Server component — renders nothing until the annual-report parser has run.

import { hasAnnualReport, scrapedAnnualReport } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead, KpiTile } from "@/components/ui/Kpi";
import { num } from "@/lib/format";

export function RealManpower() {
  if (!hasAnnualReport()) return null;
  const ar = scrapedAnnualReport.records;
  const m = ar.manpower;
  if (!m || m.totalStrength == null) return null;

  const netChange = m.totalStrengthPrev != null ? m.totalStrength - m.totalStrengthPrev : null;
  const attrition =
    m.exits != null && m.totalStrengthPrev ? (m.exits / m.totalStrengthPrev) * 100 : null;

  return (
    <>
      <SectionHead
        title={`Real manpower — FY ${ar.fy}`}
        right={<ProvenanceChip provenance="REAL" source="KPCL Annual Report" fetched={scrapedAnnualReport.fetched_at.slice(0, 10)} />}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Total strength"
          value={num(m.totalStrength)}
          tone={netChange != null && netChange < 0 ? "danger" : "neutral"}
          sub={netChange != null ? `${netChange >= 0 ? "+" : ""}${num(netChange)} vs prev FY` : undefined}
        />
        <KpiTile label="Corporate / Workmen" value={`${num(m.corporate ?? 0)} / ${num(m.workmen ?? 0)}`} sub="cadre split" />
        <KpiTile
          label="Exits this year"
          value={num(m.exits ?? 0)}
          tone="warning"
          sub={attrition != null ? `${attrition.toFixed(1)}% · ${num(m.entries ?? 0)} joined` : undefined}
        />
        <KpiTile
          label="SC / ST / PwD"
          value={`${m.scPct ?? "—"}% / ${m.stPct ?? "—"}%`}
          tone="info"
          sub={m.pwdPct != null ? `PwD ${m.pwdPct}%` : undefined}
        />
      </div>
      <p className="text-[0.68rem] text-faint mt-2">
        Actual published strength from KPCL&apos;s Annual Report — {num(m.exits ?? 0)} exits vs {num(m.entries ?? 0)} entries
        this year underlines the retirement-wave and single-point-of-failure risk the synthetic detail below models.
      </p>
    </>
  );
}
