// Bordered narrative callout for red-flag findings. Server component.

type Tone = "danger" | "warning" | "info";

const toneClasses: Record<Tone, string> = {
  danger: "border-danger/60 bg-danger/5 text-danger",
  warning: "border-warning/60 bg-warning/5 text-warning",
  info: "border-info/60 bg-info/5 text-info",
};

export function Callout({
  tone = "danger",
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-l-2 pl-4 pr-3 py-3 ${toneClasses[tone]}`}>
      <div className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] mb-1">{title}</div>
      <div className="text-[0.8rem] leading-relaxed text-ink">{children}</div>
    </div>
  );
}
