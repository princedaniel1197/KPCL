// Knowledge continuity [F1] — legacy-interview queue + captured knowledge base.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { InterviewChip } from "@/components/workforce/InterviewChip";
import { KnowledgeSearch } from "@/components/workforce/KnowledgeSearch";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF } from "@/lib/data";
import { interviewQueue, scopedEmployees, scopeQs } from "@/lib/views/workforce";
import { dateFmt, num } from "@/lib/format";

const QUEUE_ROWS_SHOWN = 60;

export default function KnowledgePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);

  const queue = interviewQueue(scopedEmployees(scope), AS_OF, 36);
  const captured = queue.filter((r) => r.e.interviewStatus === "CAPTURED").length;
  const scheduled = queue.filter((r) => r.e.interviewStatus === "SCHEDULED").length;
  const notQueued = queue.filter((r) => r.e.interviewStatus === "NOT_QUEUED").length;
  const rows = queue.slice(0, QUEUE_ROWS_SHOWN);

  return (
    <>
      <PageHeader title={t(lang, "knowledge")} subtitle={subtitle(lang, scope, "knowledge")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Interview queue" value={num(queue.length)} sub="retiring within 36 months" />
        <KpiTile label="Captured" value={num(captured)} tone="success" sub="legacy interviews on record" />
        <KpiTile label="Scheduled" value={num(scheduled)} tone="info" sub="sessions on the calendar" />
        <KpiTile label="Not queued" value={num(notQueued)} tone="danger" sub="retiring with no capture plan" />
      </div>

      <SectionHead
        title="Legacy-interview queue"
        right={<Link className="underline" href={`/workforce${qs}`}>retirement wave →</Link>}
      />
      <div className="text-[0.72rem] text-muted mb-2">
        {num(queue.length)} employees retire within 36 months · showing the {Math.min(QUEUE_ROWS_SHOWN, queue.length)} soonest
      </div>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[760px]">
          <thead>
            <tr>
              <th>Name</th><th>Role</th><th>Station</th><th>Retires</th><th>Criticality</th><th>Interview</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.e.id}>
                <td className="font-medium">{r.e.name}</td>
                <td>{r.e.role}</td>
                <td>{r.e.station}</td>
                <td className="whitespace-nowrap">{dateFmt(r.retire)}</td>
                <td>
                  {r.e.soleIncumbent ? (
                    <Chip tone="danger">single point of failure</Chip>
                  ) : (
                    <Chip tone="neutral">standard</Chip>
                  )}
                </td>
                <td><InterviewChip status={r.e.interviewStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHead title="Knowledge base" right="captured legacy interviews · full-text search" />
      <KnowledgeSearch />
    </>
  );
}
