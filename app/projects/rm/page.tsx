// R&M Tracker [A9] — RLA → Overhaul → PG test → Re-sync chains, slip against
// the planned re-synchronisation date, and the unit each chain is holding down.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { AS_OF, unitById } from "@/lib/data";
import { rmStatus } from "@/lib/engines/execution";
import { contractorName, crToInr, linkedContracts, scopeQs, scopedProjects } from "@/lib/views/projects";
import { dateFmt, inrCr, monthFmt, num, pct } from "@/lib/format";

export default function RmTracker({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const qs = scopeQs(scope);
  const rmProjects = scopedProjects(scope).filter((p) => p.rm !== null);

  return (
    <>
      <PageHeader title={t(lang, "rmTracker")} subtitle={subtitle(lang, scope, "rmTracker")} />

      <p className="text-[0.7rem] text-muted mb-2">
        R&M chains are cumulative to date — the period selector does not filter this view.
      </p>

      {rmProjects.length === 0 && (
        <p className="text-muted text-sm">No renovation & modernisation chain in this plant scope.</p>
      )}

      {rmProjects.map((p) => {
        const rm = rmStatus(p, AS_OF)!;
        const unit = unitById.get(rm.unitId);
        const latest = unit?.monthly[unit.monthly.length - 1];
        const linked = linkedContracts(p);
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
              <span className="text-muted">
                {contractorName(p)} · {inrCr(crToInr(p.contractValueCr))} · re-sync planned {dateFmt(p.rm!.resyncPlanned)}
              </span>
              {rm.slipDays > 0 ? (
                <Chip tone="danger">{num(rm.slipDays)} days past planned re-sync</Chip>
              ) : (
                <Chip tone="success">on plan</Chip>
              )}
              <Chip tone="neutral">current stage: {rm.currentStage}</Chip>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {rm.stages.map((s, i) => (
                <div key={s.key} className={`panel px-3 py-2.5 ${!s.done && rm.currentStage === s.label ? "border-warning" : ""}`}>
                  <div className="text-[0.6rem] uppercase tracking-[0.12em] text-muted mb-1">
                    {i + 1} · {s.key}
                  </div>
                  <div className="text-[0.76rem] font-medium leading-snug mb-1.5 min-h-[2.1em]">{s.label}</div>
                  {s.done ? <Chip tone="success">done</Chip> : <Chip tone="neutral">pending</Chip>}
                  <div className="text-[0.64rem] text-muted mt-1.5">{s.date ? dateFmt(s.date) : "no date"}</div>
                </div>
              ))}
            </div>

            <div className="text-[0.78rem] mt-3 space-y-1">
              {unit && latest && (
                <p className={rm.slipDays > 0 ? "text-danger" : "text-muted"}>
                  Linked unit <span className="font-medium">{rm.unitId}</span> ({num(unit.capacityMW)} MW) ran at{" "}
                  <span className="font-semibold">{pct(latest.plfPct)}</span> PLF in {monthFmt(latest.month)}
                  {rm.slipDays > 0
                    ? <> — every day of the {num(rm.slipDays)}-day slip extends the outage and the replacement-power exposure it drags behind it.</>
                    : <> — chain on plan; outage window holding.</>}
                </p>
              )}
              {linked.length > 0 && (
                <p className="text-muted">
                  Linked contract{linked.length > 1 ? "s" : ""}:{" "}
                  {linked.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ", "}
                      <Link className="underline" href={`/contracts/${c.id}${qs}`}>{c.id}</Link>
                      <span> — {c.title} ({inrCr(crToInr(c.valueCr))})</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
