import Link from "next/link";

type Tone = "success" | "danger" | "warning" | "info" | "neutral";

const toneText: Record<Tone, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  neutral: "text-ink",
};

const toneAccent: Record<Tone, string> = {
  success: "#5B6E3A",
  danger: "#8C3B2E",
  warning: "#A9762B",
  info: "#5C6B7A",
  neutral: "#C9A84C",
};

export function KpiTile({
  label,
  value,
  sub,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div className="panel px-4 py-3 h-full relative overflow-hidden">
      {/* tone accent stripe on the left edge */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: toneAccent[tone] }}
        aria-hidden
      />
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className={`hero-numeral text-[1.7rem] mt-1 ${toneText[tone]}`}>{value}</div>
      {sub && <div className="text-[0.68rem] text-faint mt-0.5">{sub}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block group">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mt-8 mb-2 pb-1.5 rule-master">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {right && <div className="text-[0.7rem] text-muted">{right}</div>}
    </div>
  );
}

/** Horizontal comparison bar (financial vs physical progress etc.) */
export function TwinBar({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number; // 0-100
  b: number;
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex items-center gap-1.5">
        <div className="h-[7px] bg-wash flex-1 relative overflow-hidden rounded-[1px]">
          <div className="bar-fill absolute inset-y-0 left-0 bg-gold" style={{ width: `${Math.min(100, a)}%` }} />
        </div>
        <span className="text-[0.62rem] text-muted w-16 shrink-0 tnum">
          {labelA} {a.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-[7px] bg-wash flex-1 relative overflow-hidden rounded-[1px]">
          <div className="bar-fill absolute inset-y-0 left-0 bg-ink/70" style={{ width: `${Math.min(100, b)}%` }} />
        </div>
        <span className="text-[0.62rem] text-muted w-16 shrink-0 tnum">
          {labelB} {b.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
