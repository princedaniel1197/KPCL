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
import { hasReal, scrapedClearances } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

const gateTone = (s: string) =>
  s === "CLEARED" ? "success" : s === "BLOCKED" || s === "ON_HOLD" ? "danger" : "warning";

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

      {hasReal(scrapedClearances) &&
        scrapedClearances.records.map((r) => (
          <section key={r.proposalTitle} className="panel p-4 mb-6 border-l-2 border-success">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
              <h2 className="font-serif text-xl font-semibold">{r.proposalTitle}</h2>
              <ProvenanceChip provenance="REAL" source="Parivesh export" fetched={scrapedClearances.fetched_at.slice(0, 10)} />
            </div>
            {r.proposalNo && (
              <div className="flex flex-wrap items-center gap-2 mb-2 text-[0.75rem]">
                <span className="chip chip-neutral tnum">Parivesh {r.proposalNo}</span>
                {r.officialStatus && <span className="chip chip-info">{r.officialStatus}</span>}
                {r.submitted && <span className="text-faint">submitted {r.submitted}</span>}
              </div>
            )}
            <p className="text-[0.78rem] text-muted mb-3">
              {r.proponent} · {num(r.capacityMW)} MW
              {r.forestDiversionAcres ? ` · ${num(r.forestDiversionAcres)} acres forest diversion` : ""}
              {r.forestHectares ? ` (${num(r.forestHectares)} ha)` : ""}
              {r.sanctuary ? ` · ${r.sanctuary}` : ""}
            </p>
            <div className="overflow-x-auto">
              <table className="ledger min-w-[640px]">
                <thead>
                  <tr><th>Gate</th><th>Status</th><th>Date</th><th>Note (public record)</th></tr>
                </thead>
                <tbody>
                  {r.gates.map((g) => (
                    <tr key={g.key}>
                      <td className="font-medium whitespace-nowrap">{g.label}</td>
                      <td><Chip tone={gateTone(g.status)}>{g.status.replace("_", " ").toLowerCase()}</Chip></td>
                      <td className="whitespace-nowrap">{g.date}</td>
                      <td className="text-muted text-[0.75rem]">{g.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.litigation && (
              <p className="text-[0.75rem] text-muted mt-2">
                <span className="font-semibold text-ink">Litigation:</span> {r.litigation}
              </p>
            )}
            <p className="text-[0.68rem] text-faint mt-2">
              Real public record — this is the actual Sharavathi PSP, its NBWL approval granted while
              Forest Clearance was rejected and the project put on hold. The synthetic portfolio below
              demonstrates the same detector on modelled projects.
              {r.sources?.length ? (
                <>
                  {" "}Sources:{" "}
                  {r.sources.map((s, i) => (
                    <span key={s}>
                      {i > 0 && ", "}
                      <a className="underline" href={s} target="_blank" rel="noopener noreferrer">[{i + 1}]</a>
                    </span>
                  ))}
                </>
              ) : null}
            </p>
          </section>
        ))}

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
