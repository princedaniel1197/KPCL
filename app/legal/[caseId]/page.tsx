// Matter detail [E1/E3] — case file: provenance, hearing clock, linkage, risk.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, contractById } from "@/lib/data";
import { caseRisk, hearingClock } from "@/lib/engines/legal";
import { linkedProject, matterById, scopeQs } from "@/lib/views/legal";
import { dateFmt, inrCr, num } from "@/lib/format";

const CR = 1e7;
const LAKH = 1e5;

export default function MatterDetail({
  params,
  searchParams,
}: {
  params: { caseId: string };
  searchParams: SearchParams;
}) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);

  const m = matterById.get(params.caseId);
  if (!m) notFound();

  const project = linkedProject(m);
  const contract = m.linkedContractId ? contractById.get(m.linkedContractId) ?? null : null;
  const risk = caseRisk(m, project);
  const clock = hearingClock(m, AS_OF);
  const timeline = [...m.hearings].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader title={m.id} subtitle={subtitle(lang, scope, "matters")} />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-4 md:col-span-2">
          <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">Matter details</div>
          <dl className="text-[0.82rem] space-y-1.5">
            <div className="flex justify-between gap-4"><dt className="text-muted">Title</dt><dd className="font-medium text-right">{m.title}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Forum</dt><dd>{m.forum}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Matter type</dt><dd>{m.matterType}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Stage</dt><dd>{m.stage}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Filed</dt><dd>{dateFmt(m.filed)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Exposure</dt><dd className="font-medium">{inrCr(m.exposureCr * CR)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Counsel</dt><dd>{m.counsel}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Firm</dt><dd>{m.firm}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Fees paid</dt><dd>{inrCr(m.feePaidLakh * LAKH)}</dd></div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Status</dt>
              <dd>{m.status === "OPEN" ? <Chip tone="warning">open</Chip> : <Chip tone="neutral">closed</Chip>}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Provenance</dt>
              <dd>
                {m.source === "eCourts" ? (
                  <Chip tone="info">synced from eCourts</Chip>
                ) : (
                  <Chip tone="neutral">manual entry</Chip>
                )}
              </dd>
            </div>
          </dl>
          {(project || contract || m.claimKind) && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-rule">
              {project && (
                <Link href={`/projects/${project.id}${qs}`}>
                  <Chip tone="info">project · {project.name}</Chip>
                </Link>
              )}
              {contract && (
                <Link href={`/contracts/${contract.id}${qs}`}>
                  <Chip tone="info">contract · {contract.id}</Chip>
                </Link>
              )}
              {m.claimKind && <Chip tone="neutral">claim · {m.claimKind.replace(/_/g, " ").toLowerCase()}</Chip>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">Next-hearing clock</div>
            {clock.days === null ? (
              <div className="hero-numeral text-[1.7rem] text-muted">—</div>
            ) : (
              <div className={`hero-numeral text-[1.7rem] ${clock.urgent ? "text-danger" : "text-ink"}`}>
                {num(clock.days)} days
              </div>
            )}
            <div className="text-[0.68rem] text-faint mt-0.5">
              {m.nextHearing ? `listed ${dateFmt(m.nextHearing)} · ${m.forum}` : "no hearing listed"}
            </div>
          </div>

          <div className="panel p-4">
            <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">Case risk</div>
            <div className={`hero-numeral text-[1.7rem] ${risk.risk >= 60 ? "text-danger" : risk.risk >= 40 ? "text-warning" : "text-ink"}`}>
              {num(risk.risk, 1)} / 100
            </div>
            <ul className="text-[0.72rem] text-muted mt-2 space-y-1">
              {risk.drivers.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
            {risk.threatensMilestone && (
              <div className="mt-2">
                <Chip tone="danger">threatens project milestones</Chip>
              </div>
            )}
          </div>
        </div>
      </div>

      <SectionHead title="Hearing & order timeline" right="most recent first" />
      <div className="border-l-2 border-gold pl-4 space-y-4">
        {timeline.map((h) => (
          <div key={`${h.date}-${h.note}`}>
            <div className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">{dateFmt(h.date)}</div>
            <div className="text-[0.85rem]">{h.note}</div>
          </div>
        ))}
        {timeline.length === 0 && <p className="text-sm text-muted">No hearings recorded yet.</p>}
      </div>
    </>
  );
}
