// Matters & cases [E1] — matters ledger, hearing calendar, firm roster.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, legalMatters } from "@/lib/data";
import { hearingClock } from "@/lib/engines/legal";
import { firmRoster, ledgerOrder, openMatters, scopeQs, upcomingHearings, urgentHearingCount } from "@/lib/views/legal";
import { dateFmt, inrCr, num } from "@/lib/format";
import { RealLitigation } from "@/components/legal/RealLitigation";

const LEDGER_ROWS_SHOWN = 80;
const CR = 1e7;
const LAKH = 1e5;

export default function MattersPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);

  const open = openMatters();
  const exposure = open.reduce((s, m) => s + m.exposureCr, 0);
  const fees = legalMatters.reduce((s, m) => s + m.feePaidLakh, 0);
  const rows = ledgerOrder().slice(0, LEDGER_ROWS_SHOWN);
  const hearings = upcomingHearings(20);
  const firms = firmRoster();

  return (
    <>
      <PageHeader title={t(lang, "matters")} subtitle={subtitle(lang, scope, "matters")} />
      <p className="text-[0.7rem] text-muted -mt-4 mb-4">
        Legal matters are held at the corporate level and shown unfiltered by plant scope.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Open matters" value={num(open.length)} sub={`${num(legalMatters.length - open.length)} closed on record`} />
        <KpiTile label="Exposure (open)" value={inrCr(exposure * CR)} tone="danger" href={`/legal/intelligence${qs}`} sub="claimed / contingent value" />
        <KpiTile label="Hearings ≤14 days" value={num(urgentHearingCount())} tone="warning" sub="listed within a fortnight" />
        <KpiTile label="Fees paid" value={inrCr(fees * LAKH)} tone="info" sub="cumulative counsel & firm fees" />
      </div>

      <RealLitigation />

      <SectionHead
        title="Matters ledger"
        right={<Link className="underline" href={`/legal/intelligence${qs}`}>litigation intelligence →</Link>}
      />
      <div className="text-[0.72rem] text-muted mb-2">
        {num(legalMatters.length)} matters on record · open first, exposure descending · showing {rows.length}
      </div>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[960px]">
          <thead>
            <tr>
              <th>Matter</th><th>Title</th><th>Forum</th><th>Stage</th>
              <th>Next hearing</th><th className="num">Exposure</th><th>Counsel</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const clock = hearingClock(m, AS_OF);
              return (
                <tr key={m.id}>
                  <td><Link className="underline font-medium whitespace-nowrap" href={`/legal/${m.id}${qs}`}>{m.id}</Link></td>
                  <td>{m.title}</td>
                  <td>{m.forum}</td>
                  <td>{m.stage}</td>
                  <td className="whitespace-nowrap">
                    {m.nextHearing ? dateFmt(m.nextHearing) : "—"}{" "}
                    {clock.urgent && <Chip tone="danger">{clock.days} d</Chip>}
                  </td>
                  <td className="num font-medium">{inrCr(m.exposureCr * CR)}</td>
                  <td className="whitespace-nowrap">{m.counsel}</td>
                  <td>{m.status === "OPEN" ? <Chip tone="warning">open</Chip> : <Chip tone="neutral">closed</Chip>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionHead title="Hearing calendar" right="next 20 listings across open matters" />
      <table className="ledger">
        <thead>
          <tr>
            <th>Date</th><th>Matter</th><th>Forum</th><th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {hearings.map((h) => (
            <tr key={`${h.m.id}-${h.date}`}>
              <td className="whitespace-nowrap font-medium">{dateFmt(h.date)}</td>
              <td><Link className="underline" href={`/legal/${h.m.id}${qs}`}>{h.m.id}</Link></td>
              <td>{h.m.forum}</td>
              <td>{h.m.stage}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionHead title="Counsel & firm roster" right="aggregated by empanelled firm" />
      <table className="ledger">
        <thead>
          <tr>
            <th>Firm</th><th className="num">Matters</th><th className="num">Open</th><th className="num">Fees paid</th>
          </tr>
        </thead>
        <tbody>
          {firms.map((f) => (
            <tr key={f.firm}>
              <td className="font-medium">{f.firm}</td>
              <td className="num">{num(f.matters)}</td>
              <td className="num">{num(f.openMatters)}</td>
              <td className="num">{inrCr(f.feesLakh * LAKH)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
