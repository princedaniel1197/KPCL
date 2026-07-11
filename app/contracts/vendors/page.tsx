// Vendor scorecards [D3] — weighted performance grades, and the pattern the
// score exists to catch: fresh awards landing on grade-E vendors.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { gradeEAwards, scopeQs, scoredVendors } from "@/lib/views/contracts";
import type { VendorGrade } from "@/lib/engines/vendor";
import { dateFmt, inrCr, num, pct } from "@/lib/format";

const GRADES: VendorGrade[] = ["A", "B", "C", "D", "E"];
const GRADE_TONE: Record<VendorGrade, "success" | "info" | "warning" | "danger"> = {
  A: "success",
  B: "success",
  C: "info",
  D: "warning",
  E: "danger",
};
const GRADE_TEXT: Record<VendorGrade, string> = {
  A: "text-success",
  B: "text-success",
  C: "text-info",
  D: "text-warning",
  E: "text-danger",
};

export default function VendorScorecards({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const focus = typeof searchParams.focus === "string" ? searchParams.focus : null;

  const scored = scoredVendors(); // worst-first
  const byGrade = new Map<VendorGrade, number>(GRADES.map((g) => [g, 0]));
  for (const s of scored) byGrade.set(s.score.grade, (byGrade.get(s.score.grade) ?? 0) + 1);
  const eAwards = gradeEAwards(60);
  const focused = focus ? scored.find((s) => s.vendor.id === focus) : undefined;
  const rows = scored.slice(0, 100);
  const qs = scopeQs(scope);
  const mkFocus = (id: string) => {
    const q = new URLSearchParams();
    if (scope.plant !== "ALL") q.set("plant", scope.plant);
    if (scope.period !== "ALL") q.set("period", scope.period);
    q.set("focus", id);
    return `?${q.toString()}`;
  };

  return (
    <>
      <PageHeader title={t(lang, "vendors")} subtitle={subtitle(lang, scope, "vendors")} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {GRADES.map((g) => (
          <KpiTile
            key={g}
            label={`Grade ${g}`}
            value={num(byGrade.get(g) ?? 0)}
            tone={GRADE_TONE[g]}
            sub={g === "A" ? "score ≥ 85" : g === "B" ? "75–84" : g === "C" ? "65–74" : g === "D" ? "55–64" : "below 55"}
          />
        ))}
      </div>

      {focused && (
        <>
          <SectionHead title={`Scorecard — ${focused.vendor.name}`} right={<Link className="underline" href={`/contracts/vendors${qs}`}>clear focus →</Link>} />
          <div className="grid md:grid-cols-3 gap-4">
            <div className="panel p-4">
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-1">Composite score</div>
              <div className={`hero-numeral text-[2rem] ${GRADE_TEXT[focused.score.grade]}`}>{num(focused.score.score, 1)}</div>
              <div className="mt-1"><Chip tone={GRADE_TONE[focused.score.grade]}>grade {focused.score.grade}</Chip></div>
              <div className="text-[0.68rem] text-faint mt-2">
                {focused.vendor.category} · {focused.vendor.city} · registered since {focused.vendor.registeredSince}
              </div>
            </div>
            <div className="panel p-4 md:col-span-2">
              <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted mb-2">Component contributions (points of 100)</div>
              <dl className="text-[0.82rem] space-y-1.5">
                <div className="flex justify-between"><dt className="text-muted">On-time delivery (40% weight, {pct(focused.vendor.onTimePct, 0)} punctual)</dt><dd className="tnum font-medium">{num(focused.score.components.onTime, 1)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Quality / rejection (25% weight, {pct(focused.vendor.rejectionRatePct, 0)} rejected)</dt><dd className="tnum font-medium">{num(focused.score.components.rejection, 1)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">LD record (20% weight, {num(focused.vendor.ldIncidents)} incidents / {num(focused.vendor.contractsCount)} contracts)</dt><dd className="tnum font-medium">{num(focused.score.components.ld, 1)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Dispute record (15% weight, {num(focused.vendor.disputeCount)} disputes)</dt><dd className="tnum font-medium">{num(focused.score.components.dispute, 1)}</dd></div>
                <div className="flex justify-between border-t border-rule pt-1.5"><dt className="font-medium">Composite</dt><dd className="tnum font-semibold">{num(focused.score.score, 1)}</dd></div>
              </dl>
            </div>
          </div>
        </>
      )}

      {eAwards.length > 0 && (
        <>
          <SectionHead title="Grade E, freshly awarded" right="awards in the last 60 days" />
          <div className="panel p-4 border-l-2 border-danger">
            <ul className="text-[0.8rem] space-y-1.5">
              {eAwards.map((a) => (
                <li key={a.contract.id} className="flex flex-wrap items-center gap-2">
                  <Link className="underline font-medium" href={mkFocus(a.vendor.id)}>{a.vendor.name}</Link>
                  <Chip tone="danger">grade E · score {num(a.score.score, 1)}</Chip>
                  <span className="text-muted">
                    won <Link className="underline font-medium" href={`/contracts/${a.contract.id}${qs}`}>{a.contract.id}</Link> — {a.contract.title}
                    {" "}({inrCr(a.contract.valueCr * 1e7)}) on {dateFmt(a.contract.awardDate)} · {num(a.daysAgo)} days ago
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[0.72rem] text-muted mt-3">
              The scorecard existed before the award. A grade-E history sitting next to a fresh L1 win is exactly
              the pattern this register is built to surface at the tender-scrutiny stage, not after kick-off.
            </p>
          </div>
        </>
      )}

      <SectionHead title="Scorecard league" right={`${num(scored.length)} vendors with ≥1 contract · worst first · top 100 shown`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[1000px]">
          <thead>
            <tr>
              <th>Vendor</th><th>Category</th><th>City</th>
              <th className="num">Contracts</th><th className="num">On-time %</th><th className="num">Rejection %</th>
              <th className="num">LD incidents</th><th className="num">Disputes</th><th className="num">Score</th><th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ vendor: v, score: sc }) => (
              <tr key={v.id} className={focus === v.id ? "bg-wash" : undefined}>
                <td><Link className="underline font-medium whitespace-nowrap" href={mkFocus(v.id)}>{v.name}</Link></td>
                <td className="whitespace-nowrap">{v.category}</td>
                <td className="whitespace-nowrap">{v.city}</td>
                <td className="num">{num(v.contractsCount)}</td>
                <td className="num">{pct(v.onTimePct, 0)}</td>
                <td className="num">{pct(v.rejectionRatePct, 0)}</td>
                <td className="num">{num(v.ldIncidents)}</td>
                <td className="num">{num(v.disputeCount)}</td>
                <td className="num font-medium">{num(sc.score, 1)}</td>
                <td><Chip tone={GRADE_TONE[sc.grade]}>{sc.grade}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[0.72rem] text-muted mt-3">
        Decision-support only — award decisions remain L1 within the KTPP framework.
      </p>
    </>
  );
}
