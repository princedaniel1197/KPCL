// Small horizontal magnitude bar used inside ledger cells (risk index,
// reservoir level). Pure server-renderable markup, token colors only.

type BarTone = "gold" | "danger" | "ink";

const toneBg: Record<BarTone, string> = {
  gold: "bg-gold",
  danger: "bg-danger",
  ink: "bg-ink/70",
};

export function InlineBar({
  value,
  max = 100,
  tone = "gold",
}: {
  value: number;
  max?: number;
  tone?: BarTone;
}) {
  const widthPct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-[7px] bg-wash w-full min-w-[70px] relative overflow-hidden rounded-[1px]">
      <div className={`bar-fill absolute inset-y-0 left-0 ${toneBg[tone]}`} style={{ width: `${widthPct}%` }} />
    </div>
  );
}
