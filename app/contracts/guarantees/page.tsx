// Bank-guarantee ledger [D5] — every PBG/ABG/retention BG sorted by time to
// expiry, with the lapse-risk callout the audit committee reads first.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { bgSummary, scopeQs, scopedBgs } from "@/lib/views/contracts";
import { AS_OF, contractById, vendorById } from "@/lib/data";
import type { BgAlertLevel } from "@/lib/engines/obligations";
import { dateFmt, inrCr, num } from "@/lib/format";

function LevelChip({ level, days }: { level: BgAlertLevel; days: number }) {
  if (level === "EXPIRED") return <Chip tone="danger">expired {num(-days)} d ago</Chip>;
  if (level === "T7") return <Chip tone="danger">{num(days)} d left</Chip>;
  if (level === "T30") return <Chip tone="warning">{num(days)} d left</Chip>;
  if (level === "T60") return <Chip tone="info">≤60 d</Chip>;
  return <Chip tone="success">current</Chip>;
}

export default function GuaranteesLedger({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const s = bgSummary(scope);
  const bgById = new Map(scopedBgs(scope).map((b) => [b.id, b]));
  const atRisk = [...s.expired, ...s.expiring30];
  const atRiskCr = atRisk.reduce((sum, a) => sum + a.valueCr, 0);
  const qs = scopeQs(scope);

  return (
    <>
      <PageHeader title={t(lang, "guarantees")} subtitle={subtitle(lang, scope, "guarantees")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Guarantees on file" value={num(s.count)} sub="PBG · ABG · retention" />
        <KpiTile label="Total cover" value={inrCr(s.totalValueCr * 1e7)} sub="face value held" />
        <KpiTile
          label="Expiring ≤30 d"
          value={num(s.expiring30.length)}
          tone="danger"
          sub={`${inrCr(s.expiring30.reduce((a, b) => a + b.valueCr, 0) * 1e7)} cover lapsing`}
        />
        <KpiTile
          label="Expired, unrenewed"
          value={num(s.expired.length)}
          tone="danger"
          sub={`${inrCr(s.expired.reduce((a, b) => a + b.valueCr, 0) * 1e7)} already uncovered`}
        />
      </div>

      {atRisk.length > 0 && (
        <>
          <SectionHead title="Lapse risk — act this month" right={`${inrCr(atRiskCr * 1e7)} value at risk if invoked after lapse`} />
          <div className="panel p-4 border-l-2 border-danger">
            <ul className="text-[0.8rem] space-y-1.5">
              {atRisk.map((a) => {
                const c = contractById.get(a.contractId);
                return (
                  <li key={a.bgId} className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.bgId}</span>
                    <LevelChip level={a.level} days={a.daysToExpiry} />
                    <span className="tnum font-medium">{inrCr(a.valueCr * 1e7)}</span>
                    <span className="text-muted">
                      securing <Link className="underline font-medium" href={`/contracts/${a.contractId}${qs}`}>{a.contractId}</Link>
                      {c ? ` — ${c.title}` : ""} · {vendorById.get(a.vendorId)?.name ?? a.vendorId}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[0.72rem] text-muted mt-3">
              A guarantee invoked after lapse recovers nothing — renewal notices must go to the banks before expiry,
              not after the contract file surfaces the gap.
            </p>
          </div>
        </>
      )}

      <SectionHead title="Full ledger" right={`sorted by days to expiry · as of ${dateFmt(AS_OF)} · cumulative register — period scope not applied`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[1000px]">
          <thead>
            <tr>
              <th>BG</th><th>Contract</th><th>Vendor</th><th>Bank</th><th>Type</th>
              <th className="num">Value</th><th>Issued</th><th>Expiry</th><th className="num">Days to expiry</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {s.alerts.map((a) => {
              const bg = bgById.get(a.bgId)!;
              return (
                <tr key={a.bgId}>
                  <td className="font-medium whitespace-nowrap">{a.bgId}</td>
                  <td><Link className="underline whitespace-nowrap" href={`/contracts/${a.contractId}${qs}`}>{a.contractId}</Link></td>
                  <td className="whitespace-nowrap">{vendorById.get(a.vendorId)?.name ?? a.vendorId}</td>
                  <td className="whitespace-nowrap">{bg.bank}</td>
                  <td>{bg.type}</td>
                  <td className="num font-medium">{inrCr(a.valueCr * 1e7)}</td>
                  <td className="whitespace-nowrap">{dateFmt(bg.issued)}</td>
                  <td className="whitespace-nowrap">{dateFmt(a.expiry)}</td>
                  <td className={`num ${a.daysToExpiry < 0 ? "text-danger font-semibold" : a.daysToExpiry <= 30 ? "text-warning font-semibold" : ""}`}>{num(a.daysToExpiry)}</td>
                  <td><LevelChip level={a.level} days={a.daysToExpiry} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
