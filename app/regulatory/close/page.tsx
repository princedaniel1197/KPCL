// Close-the-books checklist [G3] — per-entity task status and the
// consolidation-readiness view across KPCL and its JVs.

import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { closeTasks } from "@/lib/data";
import { num, pct } from "@/lib/format";
import type { CloseTask } from "@/lib/types";

function statusChip(status: CloseTask["status"]) {
  if (status === "DONE") return <Chip tone="success">DONE</Chip>;
  if (status === "IN_PROGRESS") return <Chip tone="info">IN_PROGRESS</Chip>;
  return <Chip tone="danger">BLOCKED</Chip>;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  // Group tasks by entity, preserving the order they first appear in.
  const entities = closeTasks.reduce<string[]>(
    (acc, task) => (acc.includes(task.entity) ? acc : [...acc, task.entity]),
    [],
  );
  const groups = entities.map((entity) => {
    const tasks = closeTasks.filter((task) => task.entity === entity);
    const done = tasks.filter((task) => task.status === "DONE").length;
    const blocked = tasks.filter((task) => task.status === "BLOCKED").length;
    return { entity, tasks, done, blocked, total: tasks.length };
  });

  const jvGroups = groups.filter((g) => g.entity !== "KPCL (standalone)");
  const jvBlocked = jvGroups.reduce((s, g) => s + g.blocked, 0);
  const allDone = groups.reduce((s, g) => s + g.done, 0);
  const allTotal = groups.reduce((s, g) => s + g.total, 0);

  return (
    <>
      <PageHeader title={t(lang, "closeBooks")} subtitle={subtitle(lang, scope, "closeBooks")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="Overall completion"
          value={pct((allDone / allTotal) * 100, 0)}
          tone={allDone === allTotal ? "success" : "info"}
          sub={`${num(allDone)} of ${num(allTotal)} tasks done`}
        />
        {groups.map((g) => (
          <KpiTile
            key={g.entity}
            label={g.entity}
            value={pct((g.done / g.total) * 100, 0)}
            tone={g.blocked > 0 ? "danger" : g.done === g.total ? "success" : "info"}
            sub={`${num(g.done)}/${num(g.total)} done · ${num(g.blocked)} blocked`}
          />
        ))}
      </div>

      {groups.map((g) => (
        <div key={g.entity}>
          <SectionHead
            title={g.entity}
            right={`${num(g.done)} of ${num(g.total)} complete${g.blocked > 0 ? ` · ${num(g.blocked)} blocked` : ""}`}
          />
          <table className="ledger">
            <thead>
              <tr><th>Task</th><th>Owner</th><th>Status</th><th>Note</th></tr>
            </thead>
            <tbody>
              {g.tasks.map((task) => (
                <tr key={`${g.entity}-${task.task}`}>
                  <td>{task.task}</td>
                  <td className="whitespace-nowrap">{task.owner}</td>
                  <td>{statusChip(task.status)}</td>
                  <td className="text-muted">{task.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <SectionHead title="Consolidation readiness" right="Ind-AS group close" />
      <div className="panel p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Blocked tasks across JV entities</span>
          <span className={`font-semibold ${jvBlocked > 0 ? "text-danger" : "text-success"}`}>{num(jvBlocked)}</span>
        </div>
        <p className="text-[0.78rem] text-muted mt-2 leading-relaxed">
          Ind-AS consolidation cannot proceed until every JV close pack lands: the group financial statements
          take the JVs by line-by-line / equity pickup, so a single blocked reconciliation upstream stalls the
          consolidated trial balance. The blockers above ({jvGroups.map((g) => `${g.entity}: ${g.blocked}`).join(" · ")})
          are the critical path to the audited group accounts.
        </p>
      </div>
    </>
  );
}
