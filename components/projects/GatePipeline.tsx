// Statutory clearance pipeline strip [A2]: the six-gate sequence rendered as
// horizontal steps. Server component — pure markup over engine ordering.

import { Chip } from "@/components/ui/Kpi";
import { GATE_ORDER } from "@/lib/engines/execution";
import type { Gate, GateStatus } from "@/lib/types";
import { dateFmt } from "@/lib/format";

const TONE: Record<GateStatus, "success" | "danger" | "neutral"> = {
  CLEARED: "success",
  BLOCKED: "danger",
  PENDING: "neutral",
};

export function GatePipeline({ gates }: { gates: Gate[] }) {
  const ordered = [...gates].sort(
    (a, b) => GATE_ORDER.indexOf(a.key) - GATE_ORDER.indexOf(b.key),
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {ordered.map((g, i) => (
        <div
          key={g.key}
          className={`panel px-3 py-2.5 ${g.status === "BLOCKED" ? "border-danger" : ""}`}
        >
          <div className="text-[0.6rem] uppercase tracking-[0.12em] text-muted mb-1">
            {i + 1} · {g.key}
          </div>
          <div className="text-[0.76rem] font-medium leading-snug mb-1.5 min-h-[2.1em]">
            {g.label}
          </div>
          <Chip tone={TONE[g.status]}>{g.status.toLowerCase()}</Chip>
          <div className="text-[0.64rem] text-muted mt-1.5">
            {g.date ? dateFmt(g.date) : "no date"}
          </div>
          <div className="text-[0.64rem] text-faint mt-0.5 leading-snug">{g.note}</div>
        </div>
      ))}
    </div>
  );
}
