// Legacy-interview status chip [F1] — one visual grammar on both the
// retirement-wave and knowledge-continuity pages.

import { Chip } from "@/components/ui/Kpi";
import type { Employee } from "@/lib/types";

type Tone = "success" | "danger" | "warning" | "info" | "neutral";

const STATUS_CHIP: Record<Employee["interviewStatus"], { tone: Tone; label: string }> = {
  CAPTURED: { tone: "success", label: "captured" },
  SCHEDULED: { tone: "info", label: "scheduled" },
  QUEUED: { tone: "warning", label: "queued" },
  NOT_QUEUED: { tone: "danger", label: "not queued" },
};

export function InterviewChip({ status }: { status: Employee["interviewStatus"] }) {
  const { tone, label } = STATUS_CHIP[status];
  return <Chip tone={tone}>{label}</Chip>;
}
