// Real KPCL EC compliance disclosures, indexed from KPCL's own official
// Environment page. Server component: renders nothing until the kpcl_env
// scraper has run.
//
// The central Parivesh compliance module is login-gated and the legacy EC-site
// search can't isolate KPCL, but KPCL publishes its own six-monthly / half-yearly
// EC compliance reports directly — captcha-free, properly titled.

import { hasReal, scrapedKpclEnv, type EcDocRecord } from "@/lib/scraped";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { SectionHead, Chip } from "@/components/ui/Kpi";

function typeLabel(t: string): { label: string; tone: "success" | "info" | "neutral" } {
  switch (t) {
    case "HALF_YEARLY_COMPLIANCE":
      return { label: "half-yearly compliance", tone: "success" };
    case "SIX_MONTHLY_COMPLIANCE":
      return { label: "six-monthly compliance", tone: "success" };
    case "COMPLIANCE":
      return { label: "compliance", tone: "success" };
    case "EC_GRANT":
      return { label: "EC granted", tone: "info" };
    default:
      return { label: "EC document", tone: "neutral" };
  }
}

export function RealEcCompliance() {
  if (!hasReal(scrapedKpclEnv)) return null;
  const rows: EcDocRecord[] = scrapedKpclEnv.records;
  if (rows.length === 0) return null;

  const complianceCount = rows.filter((r) => r.docType.includes("COMPLIANCE")).length;

  return (
    <section className="panel p-4 mb-6 border-l-2 border-success">
      <SectionHead
        title="Real EC compliance disclosures"
        right={
          <ProvenanceChip
            provenance="REAL"
            source="KPCL Environment page"
            fetched={scrapedKpclEnv.fetched_at.slice(0, 10)}
          />
        }
      />
      <p className="text-[0.72rem] text-muted mb-3">
        {complianceCount} six-monthly / half-yearly EC compliance reports KPCL publishes on its own official site —
        condition-by-condition compliance against the granted environmental clearances. (The central Parivesh
        compliance module is login-gated, so these come straight from KPCL&apos;s statutory public disclosure.)
      </p>
      <div className="overflow-x-auto">
        <table className="ledger min-w-[640px]">
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Project</th>
              <th>Period</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tl = typeLabel(r.docType);
              return (
                <tr key={r.url}>
                  <td className="text-[0.8rem]">{r.title}</td>
                  <td><Chip tone={tl.tone}>{tl.label}</Chip></td>
                  <td className="text-[0.75rem] text-muted whitespace-nowrap">{r.project ?? "—"}</td>
                  <td className="text-[0.75rem] whitespace-nowrap">{r.period ?? "—"}</td>
                  <td className="text-[0.72rem]">
                    <a className="underline" href={r.url} target="_blank" rel="noopener noreferrer">open →</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
