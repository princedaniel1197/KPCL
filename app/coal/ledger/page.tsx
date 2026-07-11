// Rake ledger [C1] — every rake, reconciled billed → received → fired.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { subtitle } from "@/lib/subtitle";
import { t } from "@/lib/i18n";
import { findingsFor, scopedRakes } from "@/lib/views/coal";
import { collieries } from "@/lib/data";
import { dateFmt, inrCr, num } from "@/lib/format";

const FLAGS = [
  { key: "all", label: "All rakes" },
  { key: "slipped", label: "Grade slipped" },
  { key: "transit", label: "Excess transit loss" },
  { key: "demurrage", label: "Demurrage" },
  { key: "underload", label: "Under-loaded" },
] as const;

export default function RakeLedger({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const flag = typeof searchParams.flag === "string" ? searchParams.flag : "all";
  const source = typeof searchParams.source === "string" ? searchParams.source : "all";

  let rows = scopedRakes(scope)
    .map((r) => ({ r, f: findingsFor(r) }))
    .filter((x) => source === "all" || x.r.source === source)
    .filter((x) => {
      if (flag === "slipped") return x.f.gradeSlipped;
      if (flag === "transit") return x.f.excessLossT > 0;
      if (flag === "demurrage") return x.f.demurrageValue > 0;
      if (flag === "underload") return x.f.underloadT > 5;
      return true;
    })
    .sort((a, b) => b.f.totalLeakage - a.f.totalLeakage);

  const total = rows.length;
  const totalLeakage = rows.reduce((s, x) => s + x.f.totalLeakage, 0);
  rows = rows.slice(0, 150);

  const mkQs = (over: Record<string, string>) => {
    const q = new URLSearchParams();
    if (scope.plant !== "ALL") q.set("plant", scope.plant);
    if (scope.period !== "ALL") q.set("period", scope.period);
    const merged = { flag, source, ...over };
    if (merged.flag !== "all") q.set("flag", merged.flag);
    if (merged.source !== "all") q.set("source", merged.source);
    return `?${q.toString()}`;
  };

  return (
    <>
      <PageHeader title={t(lang, "rakeLedger")} subtitle={subtitle(lang, scope, "rakeLedger")} />

      <div className="flex flex-wrap gap-2 mb-3 no-print">
        {FLAGS.map((f) => (
          <Link
            key={f.key}
            href={mkQs({ flag: f.key })}
            className={`px-3 py-1 text-[0.75rem] rounded-sm border ${flag === f.key ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-2 text-faint">|</span>
        <Link href={mkQs({ source: "all" })} className={`px-3 py-1 text-[0.75rem] rounded-sm border ${source === "all" ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`}>All sources</Link>
        {collieries.map((c) => (
          <Link
            key={c.id}
            href={mkQs({ source: c.id })}
            className={`px-3 py-1 text-[0.75rem] rounded-sm border ${source === c.id ? "bg-gold border-gold font-semibold" : "border-rule bg-panel text-muted hover:bg-wash"}`}
          >
            {c.id}
          </Link>
        ))}
      </div>

      <div className="text-[0.72rem] text-muted mb-2">
        {num(total)} rakes match · combined leakage {inrCr(totalLeakage)} · showing the {Math.min(150, total)} highest-leakage rows
      </div>

      <div className="overflow-x-auto">
        <table className="ledger min-w-[900px]">
          <thead>
            <tr>
              <th>Rake</th><th>Date</th><th>Source → Plant</th>
              <th className="num">Billed t</th><th className="num">Received t</th>
              <th className="num">Billed GCV</th><th className="num">Received GCV</th><th className="num">Fired GCV</th>
              <th>Flags</th><th className="num">Leakage ₹</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, f }) => (
              <tr key={r.id}>
                <td><Link className="underline font-medium" href={`/coal/ledger/${r.id}`}>{r.id}</Link></td>
                <td className="whitespace-nowrap">{dateFmt(r.date)}</td>
                <td className="whitespace-nowrap">{r.source} → {r.plant}</td>
                <td className="num">{num(r.billedTonnes)}</td>
                <td className="num">{num(r.receivedTonnes)}</td>
                <td className="num">{num(r.billedGCV)}</td>
                <td className={`num ${f.gradeSlipped ? "text-danger font-semibold" : ""}`}>{num(r.receivedGCV)}</td>
                <td className="num">{num(r.firedGCV)}</td>
                <td className="space-x-1 whitespace-nowrap">
                  {f.gradeSlipped && <Chip tone="danger">grade</Chip>}
                  {f.excessLossT > 0 && <Chip tone="warning">transit</Chip>}
                  {f.demurrageValue > 0 && <Chip tone="info">demurrage</Chip>}
                  {f.underloadT > 5 && <Chip tone="neutral">underload</Chip>}
                  {r.thirdPartySampled && <Chip tone="success">3P sampled</Chip>}
                </td>
                <td className="num font-medium">{f.totalLeakage > 0 ? inrCr(f.totalLeakage) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
