// Hidden self-audit route [§8]: every catalogue ID → its implementing screen.
// Not linked in nav; used to verify all 45 solutions appear in the UI.

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Kpi";

type Status = "built" | "light" | "excluded";
type Row = { id: string; name: string; route: string; href: string; status: Status };

const ROWS: Row[] = [
  // A — Capital project execution
  { id: "A1", name: "Project Execution Control Tower", route: "/projects", href: "/projects", status: "built" },
  { id: "A2", name: "Clearance & statutory-gate tracker", route: "/projects/clearances", href: "/projects/clearances", status: "built" },
  { id: "A3", name: "RA-bill vs physical-progress mismatch", route: "/projects/PRJ-RM-01", href: "/projects/PRJ-RM-01", status: "built" },
  { id: "A4", name: "Mobilisation-advance vs frozen-site flag", route: "/projects/PRJ-PSP-01", href: "/projects/PRJ-PSP-01", status: "built" },
  { id: "A5", name: "Un-levied LD detector / LD register", route: "/projects/PRJ-RM-01 · /legal/intelligence", href: "/legal/intelligence", status: "built" },
  { id: "A6", name: "Drawing / deliverable backlog tracker", route: "/projects/PRJ-FGD-01", href: "/projects/PRJ-FGD-01", status: "built" },
  { id: "A7", name: "Court-stay vs field-activity reconciliation", route: "/projects/PRJ-PSP-01", href: "/projects/PRJ-PSP-01", status: "built" },
  { id: "A8", name: "Segmented-clearance risk detector", route: "/projects/PRJ-PSP-01", href: "/projects/PRJ-PSP-01", status: "built" },
  { id: "A9", name: "R&M milestone tracker (RLA → re-sync)", route: "/projects/rm", href: "/projects/rm", status: "built" },
  { id: "A10", name: "Re-tender pattern detector", route: "/projects/retenders", href: "/projects/retenders", status: "built" },
  { id: "A11", name: "Public-data ingestion spine", route: "/data", href: "/data", status: "built" },
  { id: "A12", name: "Upward-reporting automation", route: "/projects/reporting", href: "/projects/reporting", status: "built" },
  // B — Plant operations
  { id: "B1", name: "Predictive maintenance (concept)", route: "/plants/maintenance", href: "/plants/maintenance", status: "built" },
  { id: "B2", name: "Boiler-tube early warning (concept)", route: "/plants/RTPS-U2", href: "/plants/RTPS-U2", status: "built" },
  { id: "B3", name: "Continuous heat-rate analytics", route: "/plants", href: "/plants", status: "built" },
  { id: "B4", name: "Analytics-historian layer", route: "/plants/RTPS-U2", href: "/plants/RTPS-U2", status: "built" },
  { id: "B5", name: "Forced-outage root-cause register", route: "/plants/outages", href: "/plants/outages", status: "built" },
  { id: "B6", name: "Hydro inflow / reservoir (light)", route: "/plants/hydro", href: "/plants/hydro", status: "light" },
  { id: "B7", name: "Solar generation forecasting (light)", route: "/plants/solar", href: "/plants/solar", status: "light" },
  { id: "B8", name: "Safety & incident management", route: "/plants/safety", href: "/plants/safety", status: "built" },
  { id: "B9", name: "Emissions / CEMS compliance", route: "/plants/emissions", href: "/plants/emissions", status: "built" },
  // C — Coal & fuel
  { id: "C1", name: "GCV reconciliation + dispute automation", route: "/coal/ledger", href: "/coal/ledger", status: "built" },
  { id: "C2", name: "Demurrage & idle-freight tracker", route: "/coal/demurrage", href: "/coal/demurrage", status: "built" },
  { id: "C3", name: "Blending optimizer", route: "/coal/blending", href: "/coal/blending", status: "built" },
  { id: "C4", name: "Stockpile volumetrics & combustion risk", route: "/coal/stockyard", href: "/coal/stockyard", status: "built" },
  { id: "C5", name: "Transit-loss / pilferage tracker", route: "/coal/sources", href: "/coal/sources", status: "built" },
  { id: "C6", name: "Coal accounting reconciliation", route: "/coal/sources", href: "/coal/sources", status: "built" },
  { id: "C7", name: "Weighbridge digitization layer", route: "/data", href: "/data", status: "built" },
  { id: "C8", name: "FSA short-supply penalty tracker", route: "/coal/claims", href: "/coal/claims", status: "built" },
  // D — Procurement & contracts
  { id: "D1", name: "KTPP-native CLM & obligations", route: "/contracts", href: "/contracts", status: "built" },
  { id: "D2", name: "Spares-criticality & inventory", route: "/contracts/inventory", href: "/contracts/inventory", status: "built" },
  { id: "D3", name: "Vendor-performance scorecard", route: "/contracts/vendors", href: "/contracts/vendors", status: "built" },
  { id: "D4", name: "Procurement / spend analytics", route: "/contracts/spend", href: "/contracts/spend", status: "built" },
  { id: "D5", name: "BG / performance-security tracker", route: "/contracts/guarantees", href: "/contracts/guarantees", status: "built" },
  { id: "D6", name: "Tender-discovery AI", route: "excluded by design (serves bidders, not KPCL)", href: "/coverage", status: "excluded" },
  // E — Legal
  { id: "E1", name: "Litigation & contracts CMS", route: "/legal", href: "/legal", status: "built" },
  { id: "E2", name: "Litigation & contract intelligence", route: "/legal/intelligence", href: "/legal/intelligence", status: "built" },
  { id: "E3", name: "Court-data sync engine", route: "/legal · /data", href: "/data", status: "built" },
  // F — Workforce
  { id: "F1", name: "Retirement & knowledge continuity", route: "/workforce · /workforce/knowledge", href: "/workforce", status: "built" },
  { id: "F2", name: "Contract-labour compliance (CLMS)", route: "/workforce/contract-labour", href: "/workforce/contract-labour", status: "built" },
  { id: "F3", name: "Recruitment / workforce-planning", route: "/workforce/pipeline", href: "/workforce/pipeline", status: "built" },
  { id: "F4", name: "Skills / competency mapping", route: "/workforce/skills", href: "/workforce/skills", status: "built" },
  // G — Finance, audit & regulatory
  { id: "G1", name: "KERC tariff / truing-up accelerator", route: "/regulatory", href: "/regulatory", status: "built" },
  { id: "G2", name: "CAG audit-para / ATN management", route: "/regulatory/audit-paras", href: "/regulatory/audit-paras", status: "built" },
  { id: "G3", name: "Close-the-books / consolidation", route: "/regulatory/close", href: "/regulatory/close", status: "built" },
  { id: "G4", name: "Per-station cost-allocation engine", route: "/regulatory/costing", href: "/regulatory/costing", status: "built" },
  // H — Cross-cutting
  { id: "H1", name: "Officer AI query assistant", route: "floating bubble (every page)", href: "/", status: "built" },
  { id: "H2", name: "MD / Board single-screen dashboard", route: "/", href: "/", status: "built" },
  { id: "H3", name: "Cross-project contractor graph", route: "/graph", href: "/graph", status: "built" },
];

const TONE: Record<Status, "success" | "info" | "neutral"> = { built: "success", light: "info", excluded: "neutral" };
const LABEL: Record<Status, string> = { built: "built", light: "light by design", excluded: "excluded by design" };

export default function CoveragePage() {
  const built = ROWS.filter((r) => r.status === "built").length;
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H"];
  return (
    <>
      <PageHeader
        title="Catalogue Coverage"
        subtitle={`${ROWS.length} catalogue IDs · ${built} built · self-audit route`}
      />
      <p className="text-[0.8rem] text-muted -mt-3 mb-4 max-w-3xl">
        Every ID from the Orianode KPCL Master Build Catalogue (A1–H3) mapped to the screen that implements it —
        {" "}{ROWS.length} entries, {built} built. D6 is excluded by design; B6 and B7 are deliberately light advisory surfaces.
      </p>
      {groups.map((g) => (
        <div key={g}>
          <div className="mt-6 mb-1.5 pb-1 rule-master font-serif text-lg font-semibold">Group {g}</div>
          <table className="ledger">
            <thead>
              <tr><th className="w-16">ID</th><th>Solution</th><th>Implementing screen</th><th className="w-32">Status</th></tr>
            </thead>
            <tbody>
              {ROWS.filter((r) => r.id.startsWith(g)).map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.id}</td>
                  <td>{r.name}</td>
                  <td>
                    {r.status === "excluded" ? (
                      <span className="text-muted">{r.route}</span>
                    ) : (
                      <Link className="underline" href={r.href}>{r.route}</Link>
                    )}
                  </td>
                  <td><Chip tone={TONE[r.status]}>{LABEL[r.status]}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
