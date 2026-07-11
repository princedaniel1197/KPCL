// Contract lifecycle repository [D1] — every live contract as a ledger of
// obligations: milestones, LD clauses, tender mode, linked guarantees.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { milestoneFlags, ldClause, repoAggregates, scopeQs, scopedContracts } from "@/lib/views/contracts";
import { vendorById } from "@/lib/data";
import { dateFmt, inrCr, num } from "@/lib/format";
import { RealTenders } from "@/components/contracts/RealTenders";

const MODES = ["all", "OPEN", "LIMITED", "SINGLE"] as const;

export default function ContractsRepo({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const cat = typeof searchParams.cat === "string" ? searchParams.cat : "all";
  const mode = typeof searchParams.mode === "string" ? searchParams.mode : "all";

  const all = scopedContracts(scope);
  const agg = repoAggregates(scope);
  const categories = [...new Set(all.map((c) => c.category))].sort();

  const filtered = all
    .filter((c) => cat === "all" || c.category === cat)
    .filter((c) => mode === "all" || c.tenderMode === mode)
    .sort((a, b) => b.valueCr - a.valueCr);
  const total = filtered.length;
  const rows = filtered.slice(0, 80);

  const mkQs = (over: Record<string, string>) => {
    const q = new URLSearchParams();
    if (scope.plant !== "ALL") q.set("plant", scope.plant);
    if (scope.period !== "ALL") q.set("period", scope.period);
    const merged = { cat, mode, ...over };
    if (merged.cat !== "all") q.set("cat", merged.cat);
    if (merged.mode !== "all") q.set("mode", merged.mode);
    const s = q.toString();
    return s ? `?${s}` : "?";
  };
  const chipCls = (active: boolean) =>
    `px-3 py-1 text-[0.75rem] rounded-sm border ${active ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`;

  return (
    <>
      <PageHeader title={t(lang, "contractsRepo")} subtitle={subtitle(lang, scope, "contractsRepo")} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Contracts" value={num(agg.count)} sub="live in repository" />
        <KpiTile label="Portfolio value" value={inrCr(agg.portfolioValueCr * 1e7)} sub="awarded value, cumulative" />
        <KpiTile label="Obligations due ≤60 d" value={num(agg.obligationsDue60)} tone="warning" sub="open milestones falling due" />
        <KpiTile label="LD accruing" value={inrCr(agg.ldAccruingCr * 1e7)} tone="danger" sub="open late milestones, un-levied" />
        <KpiTile label="BG value expiring ≤30 d" value={inrCr(agg.bgExpiring30Cr * 1e7)} tone="danger" href={`/contracts/guarantees${scopeQs(scope)}`} sub={`${num(agg.bgExpiring30Count)} guarantees`} />
      </div>

      <RealTenders />

      <div className="flex flex-wrap gap-2 mt-6 mb-3 no-print">
        <Link href={mkQs({ cat: "all" })} className={chipCls(cat === "all")}>All categories</Link>
        {categories.map((c) => (
          <Link key={c} href={mkQs({ cat: c })} className={chipCls(cat === c)}>{c}</Link>
        ))}
        <span className="mx-2 text-faint">|</span>
        {MODES.map((m) => (
          <Link key={m} href={mkQs({ mode: m })} className={chipCls(mode === m)}>
            {m === "all" ? "All modes" : m}
          </Link>
        ))}
      </div>

      <div className="text-[0.72rem] text-muted mb-2">
        {num(total)} contracts match · showing the {num(Math.min(80, total))} highest-value rows · period scope not applied — the repository is a cumulative register
      </div>

      <div className="overflow-x-auto">
        <table className="ledger min-w-[1000px]">
          <thead>
            <tr>
              <th>Contract</th><th>Title</th><th>Vendor</th><th>Plant</th><th>Category</th>
              <th className="num">Value</th><th>Awarded</th><th>Milestones</th><th>LD clause</th><th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const f = milestoneFlags(c);
              return (
                <tr key={c.id}>
                  <td><Link className="underline font-medium whitespace-nowrap" href={`/contracts/${c.id}${scopeQs(scope)}`}>{c.id}</Link></td>
                  <td className="max-w-[280px]">{c.title}</td>
                  <td className="whitespace-nowrap">{vendorById.get(c.vendorId)?.name ?? c.vendorId}</td>
                  <td>{c.plant}</td>
                  <td className="whitespace-nowrap">{c.category}</td>
                  <td className="num font-medium">{inrCr(c.valueCr * 1e7)}</td>
                  <td className="whitespace-nowrap">{dateFmt(c.awardDate)}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {f.late > 0 && <Chip tone="danger">{num(f.late)} late</Chip>}
                    {f.open - f.late > 0 && <Chip tone="info">{num(f.open - f.late)} open</Chip>}
                    {f.open === 0 && <Chip tone="success">complete</Chip>}
                  </td>
                  <td className="whitespace-nowrap text-muted">{ldClause(c)}</td>
                  <td>
                    {c.tenderMode === "SINGLE" ? <Chip tone="warning">SINGLE</Chip>
                      : c.tenderMode === "LIMITED" ? <Chip tone="info">LIMITED</Chip>
                      : <Chip tone="neutral">OPEN</Chip>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
