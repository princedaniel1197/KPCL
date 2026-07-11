// Data Feeds [A11/C7/E3] — the public-data spine, driven by the scraper manifest
// (scrapers/run_all.py → data/manifest.json). Provenance is visible on every row:
// this screen is the proof that REAL feeds are real and SYNTHETIC is labelled.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiTile, SectionHead } from "@/components/ui/Kpi";
import { ProvenanceChip, ProvenanceLegend } from "@/components/ui/ProvenanceChip";
import { getLang, getScope, type SearchParams } from "@/lib/params";
import { t } from "@/lib/i18n";
import { subtitle } from "@/lib/subtitle";
import { manifest, type FeedStatus } from "@/lib/manifest";
import { dataFeeds } from "@/lib/data";
import { num } from "@/lib/format";

function StatusChip({ status }: { status: FeedStatus }) {
  const map: Record<FeedStatus, string> = {
    LIVE: "chip chip-success",
    BASELINE: "chip chip-info",
    PENDING: "chip chip-warning",
    SKIPPED: "chip chip-neutral",
    STALE: "chip chip-warning",
    ERROR: "chip chip-danger",
  };
  const label: Record<FeedStatus, string> = {
    LIVE: "live", BASELINE: "baseline", PENDING: "run locally",
    SKIPPED: "skipped", STALE: "stale", ERROR: "error",
  };
  return <span className={map[status]}>{label[status]}</span>;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const lang = getLang();
  const scope = getScope(searchParams);

  const sources = manifest.sources;
  const real = sources.filter((s) => s.provenance === "REAL").length;
  const calibrated = sources.filter((s) => s.provenance === "CALIBRATED").length;
  const live = sources.filter((s) => s.status === "LIVE" || s.status === "BASELINE").length;
  const pending = sources.filter((s) => s.status === "PENDING").length;

  return (
    <>
      <PageHeader title={t(lang, "dataFeeds")} subtitle={subtitle(lang, scope, "dataFeeds")} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile label="Public sources" value={num(sources.length)} sub="Parivesh · eCourts · CEA · CAG · KERC · CIL · Railway" />
        <KpiTile label="Real feeds" value={num(real)} tone="success" sub="public record · real names OK" />
        <KpiTile label="Calibrated" value={num(calibrated)} tone="warning" sub="real parameters seeding synthetic" />
        <KpiTile label="Live / baseline" value={`${num(live)} / ${num(pending)}`} tone="info" sub="active vs awaiting local pull" />
      </div>

      <div className="mt-4"><ProvenanceLegend /></div>

      <SectionHead title="Scraper manifest" right={`generated ${manifest.generatedAt.slice(0, 10)}`} />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[980px]">
          <thead>
            <tr>
              <th>Source</th><th>Provenance</th><th>Status</th><th className="num">Records</th>
              <th>Powers</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.feed}>
                <td className="font-medium whitespace-nowrap">{s.label}</td>
                <td><ProvenanceChip provenance={s.provenance} /></td>
                <td><StatusChip status={s.status} /></td>
                <td className="num">{num(s.count)}</td>
                <td className="text-[0.72rem]">
                  {s.powers.map((p, i) => (
                    <span key={p}>
                      {i > 0 && " · "}
                      <Link className="underline" href={p}>{p}</Link>
                    </span>
                  ))}
                </td>
                <td className="text-muted text-[0.72rem]">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.72rem] text-muted mt-2">
        REAL feeds render as real entities where present; CALIBRATED parameters shape SYNTHETIC
        instances but never attach a real name to a fault value; everything else is SYNTHETIC and
        labelled. Refresh with <code className="text-ink">python scrapers/run_all.py</code> the night
        before a demo, verify this manifest, commit <code className="text-ink">/data</code>, deploy.
      </p>

      <SectionHead title="Internal connectors" right="counterparty / ERP feeds (synthetic in this demo)" />
      <div className="overflow-x-auto">
        <table className="ledger min-w-[760px]">
          <thead>
            <tr><th>Connector</th><th>Kind</th><th>Last sync</th><th className="num">Records</th><th>Provenance</th></tr>
          </thead>
          <tbody>
            {dataFeeds.slice(0, 6).map((f) => (
              <tr key={f.id}>
                <td className="font-medium whitespace-nowrap">{f.name}</td>
                <td>{f.kind}</td>
                <td className="whitespace-nowrap">{f.lastSync}</td>
                <td className="num">{num(f.records)}</td>
                <td><ProvenanceChip provenance="SYNTHETIC" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[0.72rem] text-muted mt-2">
        Internal feeds (ERP, DCS historian, CLMS biometric) need counterparty consent and are shown
        as synthetic until KPCL connects them — the public spine above keeps the ledger working meanwhile.
      </p>
    </>
  );
}
