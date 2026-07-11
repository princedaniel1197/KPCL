// Clearance Gates [A2] — statutory gate pipelines with the declared-timeline
// vs binding-gate contradiction stated plainly.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { GatePipeline } from "@/components/projects/GatePipeline";
import { Callout } from "@/components/projects/Callout";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF } from "@/lib/data";
import { projectHealth } from "@/lib/engines/execution";
import { contractorName, crToInr, scopeQs, scopedProjects } from "@/lib/views/projects";
import { dateFmt, inrCr, num } from "@/lib/format";

export default function Clearances({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);
  const scoped = scopedProjects(scope);
  const gated = scoped.filter((p) => p.gates !== null);
  const ungated = scoped.filter((p) => p.gates === null);

  return (
    <>
      <PageHeader title={t(lang, "clearances")} subtitle={subtitle(lang, scope, "clearances")} />

      <p className="text-[0.7rem] text-muted mb-2">
        Clearance gates are cumulative statutory state — the period selector does not filter this view.
      </p>

      {gated.length === 0 && (
        <p className="text-muted text-sm">No project with statutory gates in this plant scope.</p>
      )}

      {gated.map((p) => {
        const h = projectHealth(p, AS_OF);
        return (
          <section key={p.id}>
            <SectionHead
              title={p.name}
              right={
                <Link className="underline" href={`/projects/${p.id}${qs}`}>
                  project dossier →
                </Link>
              }
            />
            <div className="flex flex-wrap items-center gap-2 mb-3 text-[0.78rem]">
              <span className="text-muted">{p.type} · {p.plant} · {contractorName(p)} · {inrCr(crToInr(p.contractValueCr))}</span>
              {p.courtStatus ? (
                <Chip tone={p.courtStatus.status === "STAY" ? "danger" : "warning"}>
                  {p.courtStatus.forum} · {p.courtStatus.caseId} · {p.courtStatus.status}
                </Chip>
              ) : (
                <Chip tone="success">no court exposure</Chip>
              )}
            </div>

            {h.gateBlocked && h.blockedGate && (
              <div className="mb-3">
                <Callout title="Declared timeline vs binding gate">
                  The board papers carry a commissioning date of{" "}
                  <span className="font-semibold">{dateFmt(p.scheduledEnd)}</span>. The binding constraint is not the
                  construction schedule — it is <span className="font-semibold">{h.blockedGate.label}</span>, currently
                  blocked: {h.blockedGate.note}.
                  {p.courtStatus?.status === "STAY" && (
                    <> Overlaid on it, {p.courtStatus.forum} in {p.courtStatus.caseId} has ordered:{" "}
                    <span className="italic">{p.courtStatus.note}</span>.</>
                  )}{" "}
                  Until the gate clears, every downstream date in the schedule — including the declared{" "}
                  {p.scheduledEnd.slice(0, 4)} commissioning — is fictional.
                </Callout>
              </div>
            )}

            <GatePipeline gates={p.gates!} />
          </section>
        );
      })}

      {ungated.length > 0 && (
        <>
          <SectionHead title="No clearance exposure" right={`${num(ungated.length)} projects`} />
          <ul className="text-[0.8rem] space-y-1.5 text-muted">
            {ungated.map((p) => (
              <li key={p.id}>
                · <Link className="underline" href={`/projects/${p.id}${qs}`}>{p.name}</Link>{" "}
                — {p.type}, {p.plant} · no statutory gate sequence applies
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
