// Audit-para register & ATN drafting [G2] — COPU clock on every para.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip, KpiTile, SectionHead } from "@/components/ui/Kpi";
import { PrintButton } from "@/components/ui/PrintButton";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { atnDraft } from "@/lib/engines/tariff";
import type { ParaClock } from "@/lib/engines/obligations";
import { overdueParaRows, paraRegister, scopeQs } from "@/lib/views/regulatory";
import { auditParas } from "@/lib/data";
import { dateFmt, inrCr, num } from "@/lib/format";
import type { AuditPara } from "@/lib/types";

const PIPELINE: AuditPara["status"][] = ["OPEN", "ATN_DRAFT", "REPLIED", "SETTLED"];

function clockChip(c: ParaClock) {
  if (c.bucket === "OVERDUE") return <Chip tone="danger">−{-c.daysRemaining} d</Chip>;
  if (c.bucket === "DUE_30") return <Chip tone="warning">due {c.daysRemaining} d</Chip>;
  if (c.bucket === "DUE_60") return <Chip tone="info">due {c.daysRemaining} d</Chip>;
  if (c.bucket === "ON_TIME") return <Chip tone="success">on time</Chip>;
  return <Chip tone="neutral">closed</Chip>;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);
  const paraId = typeof searchParams.para === "string" ? searchParams.para : null;

  const register = paraRegister(scope);
  const overdue = overdueParaRows();

  const openParas = auditParas.filter((p) => p.status === "OPEN" || p.status === "ATN_DRAFT");
  const openValueCr = openParas.reduce((s, p) => s + p.valueCr, 0);
  const counts = PIPELINE.map((status) => ({
    status,
    count: auditParas.filter((p) => p.status === status).length,
  }));

  const focus = paraId ? auditParas.find((p) => p.id === paraId) : undefined;
  const rows = register.slice(0, 80);

  return (
    <>
      <PageHeader title={t(lang, "auditParas")} subtitle={subtitle(lang, scope, "auditParas")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Paras in register" value={num(auditParas.length)} sub="AG inspection paras, all stations" />
        <KpiTile label="Open (incl. ATN draft)" value={num(openParas.length)} tone="warning" sub="awaiting reply to Audit" />
        <KpiTile label="Past COPU clock" value={num(overdue.length)} tone="danger" sub="4-month reply window breached" />
        <KpiTile label="Money value at stake" value={inrCr(openValueCr * 1e7)} tone="danger" sub="open paras only" />
      </div>

      <div className="flex flex-wrap gap-2 mt-4 no-print">
        {counts.map((c) => (
          <Chip
            key={c.status}
            tone={c.status === "OPEN" ? "danger" : c.status === "ATN_DRAFT" ? "warning" : c.status === "REPLIED" ? "info" : "success"}
          >
            {c.status} · {c.count}
          </Chip>
        ))}
      </div>

      {/* ── ATN drafting panel ── */}
      {focus && (
        <>
          <SectionHead title={`Action Taken Note — para ${focus.id}`} right={<PrintButton label="Print ATN" />} />
          <div className="report-white panel max-w-[820px] p-8 print-block" style={{ boxShadow: "0 2px 8px rgba(42,36,24,0.12)" }}>
            <pre className="whitespace-pre-wrap font-sans text-[0.82rem] leading-relaxed">
              {atnDraft({ id: focus.id, title: focus.title, valueCr: focus.valueCr, station: focus.station, category: focus.category })}
            </pre>
            <div className="mt-6 pt-3 border-t border-rule">
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted mb-1">Linked evidence</div>
              <ul className="text-[0.78rem] list-disc pl-5 space-y-0.5">
                <li>Inspection report extract — {focus.irId}, para {focus.id}</li>
                <li>Sub-ledger reconciliation statement — {focus.station}, {focus.category} head</li>
                <li>Recovery challans / adjustment vouchers, where recovery is applicable</li>
              </ul>
            </div>
            <div className="mt-6 pt-3 border-t-[0.5px] border-rule text-[0.62rem] text-faint">
              Synthetic demonstration document — no representation about any actual audit observation.
            </div>
          </div>
        </>
      )}

      {/* ── Register ── */}
      <SectionHead
        title="Para register"
        right={`${num(register.length)} paras in scope · sorted by clock urgency · showing ${num(rows.length)}`}
      />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[1000px]">
          <thead>
            <tr>
              <th>Para</th><th>IR</th><th>Title</th><th>Category</th><th>Station</th><th>Owner</th>
              <th className="num">Value (₹ cr)</th><th>Received</th><th>COPU deadline</th><th>Clock</th><th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ para, clock }) => (
              <tr key={para.id}>
                <td className="font-medium whitespace-nowrap">{para.id}</td>
                <td className="whitespace-nowrap">{para.irId}</td>
                <td>{para.title}</td>
                <td>{para.category}</td>
                <td>{para.station}</td>
                <td className="whitespace-nowrap">{para.owner}</td>
                <td className="num">{num(para.valueCr, 2)}</td>
                <td className="whitespace-nowrap">{dateFmt(para.receivedDate)}</td>
                <td className="whitespace-nowrap">{dateFmt(clock.deadline)}</td>
                <td>{clockChip(clock)}</td>
                <td className="no-print">
                  <Link className="underline whitespace-nowrap" href={`/regulatory/audit-paras${scopeQs(scope, { para: para.id })}`}>
                    draft ATN
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Overdue ledger ── */}
      <SectionHead
        title="Overdue ledger"
        right={`${num(overdue.length)} paras past the 4-month COPU reply clock (all stations)`}
      />
      <table className="ledger">
        <thead>
          <tr><th>Para</th><th>Title</th><th>Owner</th><th className="num">Days overdue</th></tr>
        </thead>
        <tbody>
          {overdue.map(({ para, clock }) => (
            <tr key={para.id}>
              <td className="font-medium whitespace-nowrap">{para.id}</td>
              <td>{para.title}</td>
              <td className="whitespace-nowrap">{para.owner}</td>
              <td className="num text-danger font-semibold">{num(-clock.daysRemaining)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
