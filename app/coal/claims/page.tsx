// Claims & recovery ledger [C1/C8] — every rupee claimed back, by kind and status.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { isThermalScope } from "@/lib/views/coal";
import { claims } from "@/lib/data";
import { inrCr, monthFmt } from "@/lib/format";
import type { ClaimStatus, CoalClaim } from "@/lib/types";

const STATUSES: ClaimStatus[] = ["DRAFT", "ISSUED", "ACKNOWLEDGED", "RECOVERED"];

const KINDS = [
  { key: "all", label: "All kinds" },
  { key: "GRADE_SLIPPAGE", label: "Grade slippage" },
  { key: "TRANSIT_SHORTAGE", label: "Transit shortage" },
  { key: "FSA_SHORT_SUPPLY", label: "FSA short supply" },
] as const;

const STATUS_FILTERS = [{ key: "all", label: "All statuses" }, ...STATUSES.map((s) => ({ key: s, label: s }))];

const statusTone = (s: ClaimStatus) =>
  s === "RECOVERED" ? "success" : s === "DRAFT" ? "warning" : "info";

const kindTone = (k: CoalClaim["kind"]) =>
  k === "GRADE_SLIPPAGE" ? "danger" : k === "TRANSIT_SHORTAGE" ? "warning" : "info";

const kindLabel = (k: CoalClaim["kind"]) =>
  k === "GRADE_SLIPPAGE" ? "grade slippage" : k === "TRANSIT_SHORTAGE" ? "transit shortage" : "FSA short supply";

function truncate(s: string, n = 90): string {
  return s.length > n ? `${s.slice(0, n).trimEnd()}…` : s;
}

export default function ClaimsLedger({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  if (!isThermalScope(scope)) {
    return (
      <>
        <PageHeader title={t(lang, "claims")} subtitle={subtitle(lang, scope, "claims")} />
        <p className="text-muted text-sm">No coal claims for this plant scope. Switch to a thermal station or All plants.</p>
      </>
    );
  }

  const kind = typeof searchParams.kind === "string" ? searchParams.kind : "all";
  const status = typeof searchParams.status === "string" ? searchParams.status : "all";

  const scoped = claims.filter(
    (c) =>
      (scope.plant === "ALL" || c.plant === scope.plant) &&
      (scope.period === "ALL" || c.month === scope.period),
  );

  const rows = scoped
    .filter((c) => kind === "all" || c.kind === kind)
    .filter((c) => status === "all" || c.status === status)
    .sort((a, b) => b.amount - a.amount);

  const totalPipeline = scoped.reduce((s, c) => s + c.amount, 0);
  const byStatus = STATUSES.map((st) => {
    const mine = scoped.filter((c) => c.status === st);
    return { status: st, count: mine.length, amount: mine.reduce((s, c) => s + c.amount, 0) };
  });

  const mkQs = (over: Record<string, string>) => {
    const q = new URLSearchParams();
    if (scope.plant !== "ALL") q.set("plant", scope.plant);
    if (scope.period !== "ALL") q.set("period", scope.period);
    const merged = { kind, status, ...over };
    if (merged.kind !== "all") q.set("kind", merged.kind);
    if (merged.status !== "all") q.set("status", merged.status);
    return `?${q.toString()}`;
  };

  const chipCls = (active: boolean) =>
    `px-3 py-1 text-[0.75rem] rounded-sm border ${active ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`;

  return (
    <>
      <PageHeader title={t(lang, "claims")} subtitle={subtitle(lang, scope, "claims")} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Claims pipeline" value={inrCr(totalPipeline)} tone="info" sub={`${scoped.length} claims in scope`} />
        {byStatus.map((s) => (
          <KpiTile
            key={s.status}
            label={s.status}
            value={inrCr(s.amount)}
            sub={`${s.count} claims`}
            tone={s.status === "RECOVERED" ? "success" : s.status === "DRAFT" ? "warning" : "info"}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-6 mb-3 no-print">
        {KINDS.map((k) => (
          <Link key={k.key} href={mkQs({ kind: k.key })} className={chipCls(kind === k.key)}>
            {k.label}
          </Link>
        ))}
        <span className="mx-2 text-faint">|</span>
        {STATUS_FILTERS.map((s) => (
          <Link key={s.key} href={mkQs({ status: s.key })} className={chipCls(status === s.key)}>
            {s.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="ledger min-w-[900px]">
          <thead>
            <tr>
              <th>Claim</th><th>Kind</th><th>Source</th><th>Plant</th><th>Month</th>
              <th>Basis</th><th className="num">Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><Link className="underline font-medium" href={`/coal/claims/${c.id}`}>{c.id}</Link></td>
                <td><Chip tone={kindTone(c.kind)}>{kindLabel(c.kind)}</Chip></td>
                <td>{c.source}</td>
                <td>{c.plant}</td>
                <td className="whitespace-nowrap">{monthFmt(c.month)}</td>
                <td className="text-muted">{truncate(c.basis)}</td>
                <td className="num font-medium">{inrCr(c.amount)}</td>
                <td><Chip tone={statusTone(c.status)}>{c.status}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.72rem] text-muted mt-3">
        Statuses flow DRAFT → ISSUED → ACKNOWLEDGED → RECOVERED. A claim leaves the pipeline only when the amount is adjusted against a payable bill.
      </p>
    </>
  );
}
