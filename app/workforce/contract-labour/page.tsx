// Contract labour [F2] — CLMS compliance roster and flag ledger.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF } from "@/lib/data";
import { daysBetween } from "@/lib/engines/obligations";
import type { ClmsFlag } from "@/lib/engines/workforce";
import { contractorRows, flagLedger, scopedContractors } from "@/lib/views/workforce";
import { dateFmt, inr, inrCr, monthFmt, num, pct } from "@/lib/format";

const FLAG_ROWS_SHOWN = 80;
const LICENCE_WARN_DAYS = 60;

type Tone = "success" | "danger" | "warning" | "info" | "neutral";

const KIND_CHIP: Record<ClmsFlag["kind"], { tone: Tone; label: string }> = {
  MIN_WAGE: { tone: "danger", label: "min wage" },
  EPF: { tone: "danger", label: "EPF short" },
  MANSHIFT_MISMATCH: { tone: "warning", label: "manshift mismatch" },
};

export default function ContractLabourPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const contractors = scopedContractors(scope);
  const rows = contractorRows(contractors);
  const flagged = rows.filter((r) => r.flags.length > 0);
  const exposure = flagged.reduce((s, r) => s + r.exposure, 0);
  const workers = contractors.reduce((s, c) => s + c.workers, 0);
  const ledger = flagLedger(contractors).slice(0, FLAG_ROWS_SHOWN);

  // Story callout: the worst offender (all three flag kinds, month after month).
  const worst = [...flagged].sort((a, b) => b.exposure - a.exposure)[0];
  const worstMonths = worst?.contractor.months ?? [];
  const wageMin = Math.min(...worstMonths.map((m) => m.wagePaidPerDay));
  const wageMax = Math.max(...worstMonths.map((m) => m.wagePaidPerDay));
  const epfMin = Math.min(...worstMonths.map((m) => m.epfPaidPctOfBasic));
  const epfMax = Math.max(...worstMonths.map((m) => m.epfPaidPctOfBasic));
  const avgMismatch =
    worstMonths.length > 0
      ? worstMonths.reduce(
          (s, m) =>
            s + (m.manshiftsAttendance > 0 ? ((m.manshiftsBilled - m.manshiftsAttendance) / m.manshiftsAttendance) * 100 : 0),
          0,
        ) / worstMonths.length
      : 0;

  return (
    <>
      <PageHeader title={t(lang, "contractLabour")} subtitle={subtitle(lang, scope, "contractLabour")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Contractors (scoped)" value={num(contractors.length)} sub="licensed agencies on rolls" />
        <KpiTile label="Workers on rolls" value={num(workers)} sub="contract workmen deployed" />
        <KpiTile label="Flagged contractors" value={num(flagged.length)} tone={flagged.length > 0 ? "danger" : "success"} sub="any CLMS compliance flag" />
        <KpiTile label="Compliance exposure" value={inrCr(exposure)} tone={exposure > 0 ? "danger" : "success"} sub="understated wages + EPF + overbilled shifts" />
      </div>

      {worst && (
        <div className="panel p-4 border-l-2 border-danger mt-4">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-danger font-semibold mb-1">
            Pattern, not accident — {worst.contractor.name} ({worst.contractor.plant})
          </div>
          <p className="text-[0.82rem]">
            All three flag kinds, every month on record: wages paid at {inr(wageMin)}–{inr(wageMax)}/day against the
            notified minimum of {inr(worstMonths[0]?.minWagePerDay ?? 0)}/day; EPF remitted at {pct(epfMin, 1)}–{pct(epfMax, 1)} of
            basic against the statutory 12%; and manshifts billed running ~{pct(avgMismatch, 0)} ahead of the biometric
            attendance it is billed against. Combined exposure {inrCr(worst.exposure)} across {num(worstMonths.length)} months —
            the month-wise ledger below carries every line.
          </p>
        </div>
      )}

      <SectionHead title="Contractor roster" right="licence status · flag summary" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[760px]">
          <thead>
            <tr>
              <th>Contractor</th><th>Plant</th><th className="num">Workers</th>
              <th>Licence expiry</th><th>Flags</th><th className="num">Exposure ₹</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const daysToExpiry = daysBetween(AS_OF, r.contractor.licenceExpiry);
              return (
                <tr key={r.contractor.id}>
                  <td className="font-medium">{r.contractor.name}</td>
                  <td>{r.contractor.plant}</td>
                  <td className="num">{num(r.contractor.workers)}</td>
                  <td className="whitespace-nowrap">
                    {dateFmt(r.contractor.licenceExpiry)}{" "}
                    {daysToExpiry < LICENCE_WARN_DAYS && (
                      <Chip tone="warning">{daysToExpiry < 0 ? "expired" : `${daysToExpiry} d left`}</Chip>
                    )}
                  </td>
                  <td className="space-x-1 whitespace-nowrap">
                    {r.kinds.length === 0 ? (
                      <Chip tone="success">clean</Chip>
                    ) : (
                      r.kinds.map((k) => (
                        <Chip key={k} tone={KIND_CHIP[k].tone}>{KIND_CHIP[k].label}</Chip>
                      ))
                    )}
                  </td>
                  <td className="num font-medium">{r.exposure > 0 ? inrCr(r.exposure) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHead title="Flag ledger" right="month-wise CLMS findings, latest first" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[820px]">
          <thead>
            <tr>
              <th>Contractor</th><th>Month</th><th>Kind</th><th>Detail</th><th className="num">Exposure ₹</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((f, i) => (
              <tr key={`${f.contractorId}-${f.month}-${f.kind}-${i}`}>
                <td className="font-medium">{f.contractorName}</td>
                <td className="whitespace-nowrap">{monthFmt(f.month)}</td>
                <td><Chip tone={KIND_CHIP[f.kind].tone}>{KIND_CHIP[f.kind].label}</Chip></td>
                <td className="text-muted">{f.detail}</td>
                <td className="num font-medium">{inr(Math.round(f.exposure))}</td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">No CLMS flags in this scope — wages, EPF and manshifts reconcile.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
