// Graph view: builds the entity graph + a dossier for every node [H3].

import { AS_OF, collieries, contracts, legalMatters, projects, rakes, vendorById, vendors } from "@/lib/data";
import { buildGraph, type EntityGraph } from "@/lib/engines/graph";
import { scoreVendor } from "@/lib/engines/vendor";
import { projectHealth } from "@/lib/engines/execution";
import { ldRegister } from "@/lib/engines/obligations";
import { recoverableLd } from "@/lib/engines/legal";
import { sourceLeague } from "@/lib/engines/coal";
import { inrCr, pct } from "@/lib/format";

export interface DossierLine {
  label: string;
  value: string;
  href?: string;
}

export interface NodeDossier {
  headline: string;
  lines: DossierLine[];
}

export function graphWithDossiers(): { graph: EntityGraph; dossiers: Record<string, NodeDossier> } {
  const graph = buildGraph({ vendors, projects, contracts, matters: legalMatters, collieries, asOf: AS_OF });
  const dossiers: Record<string, NodeDossier> = {};
  const lds = ldRegister(contracts, AS_OF);
  const recoverable = recoverableLd(contracts, legalMatters, AS_OF);
  const league = sourceLeague(rakes);

  for (const node of graph.nodes) {
    const [kind, id] = [node.kind, node.id.split(":").slice(1).join(":")];

    if (kind === "vendor") {
      const v = vendorById.get(id)!;
      const s = scoreVendor(v);
      const myProjects = projects.filter((p) => p.contractorId === id);
      const slipping = myProjects.filter((p) => {
        const h = projectHealth(p, AS_OF);
        return h.divergenceFlag || h.riskScore > 30;
      });
      const myContracts = contracts.filter((c) => c.vendorId === id);
      const myLd = recoverable.filter((r) => r.contract.vendorId === id && r.claimStatus === "NO_CLAIM_FILED");
      const ldValue = myLd.reduce((sum, r) => sum + r.accrual.accruedValue, 0);
      const disputes = legalMatters.filter(
        (m) => m.status === "OPEN" && (myContracts.some((c) => c.id === m.linkedContractId) || m.title.includes(v.name.split(" ")[0])),
      );
      dossiers[node.id] = {
        headline: `${v.name}: ${myProjects.length} project${myProjects.length === 1 ? "" : "s"}${slipping.length ? `, ${slipping.length} slipping` : ""}${ldValue > 0.05 ? `; ${inrCr(ldValue * 1e7, 1)} LD unclaimed` : ""}${disputes.length ? `; ${disputes.length} live dispute${disputes.length > 1 ? "s" : ""}` : ""}; vendor grade ${s.grade}`,
        lines: [
          { label: "Score", value: `${s.score.toFixed(1)} / 100 → grade ${s.grade}`, href: `/contracts/vendors?focus=${id}` },
          ...myProjects.map((p) => {
            const h = projectHealth(p, AS_OF);
            return { label: "Project", value: `${p.name} — fin ${h.financialPct.toFixed(0)}% / phy ${h.physicalPct.toFixed(0)}%${h.divergenceFlag ? " ⚑" : ""}`, href: `/projects/${p.id}` };
          }),
          { label: "Contracts", value: `${myContracts.length} live, ${inrCr(myContracts.reduce((sum, c) => sum + c.valueCr, 0) * 1e7, 1)}` },
          ...(ldValue > 0.05 ? [{ label: "LD un-pursued", value: inrCr(ldValue * 1e7, 1), href: "/legal/intelligence" }] : []),
          ...disputes.map((d) => ({ label: "Dispute", value: `${d.id} — ${d.stage}`, href: `/legal/${d.id}` })),
        ],
      };
    } else if (kind === "project") {
      const p = projects.find((x) => x.id === id)!;
      const h = projectHealth(p, AS_OF);
      dossiers[node.id] = {
        headline: `${p.name} — risk ${h.riskScore.toFixed(0)}/100`,
        lines: [
          { label: "Progress", value: `financial ${h.financialPct.toFixed(0)}% vs physical ${h.physicalPct.toFixed(0)}%`, href: `/projects/${p.id}` },
          { label: "Contractor", value: vendorById.get(p.contractorId)?.name ?? p.contractorId },
          ...(h.blockedGate ? [{ label: "Gate", value: `${h.blockedGate.label} BLOCKED`, href: "/projects/clearances" }] : []),
          ...(h.advanceVsFrozenFlag ? [{ label: "Advance", value: "disbursed against frozen site" }] : []),
        ],
      };
    } else if (kind === "contract") {
      const c = contracts.find((x) => x.id === id)!;
      const myLd = lds.filter((l) => l.contractId === id);
      dossiers[node.id] = {
        headline: `${c.id} — ${c.title}`,
        lines: [
          { label: "Vendor", value: vendorById.get(c.vendorId)?.name ?? c.vendorId },
          { label: "Value", value: inrCr(c.valueCr * 1e7, 1), href: `/contracts/${c.id}` },
          ...(myLd.length ? [{ label: "LD accrued", value: inrCr(myLd.reduce((s2, l) => s2 + l.accruedValue, 0) * 1e7, 2) }] : []),
        ],
      };
    } else if (kind === "case") {
      const m = legalMatters.find((x) => x.id === id)!;
      dossiers[node.id] = {
        headline: `${m.id} — ${m.title}`,
        lines: [
          { label: "Forum", value: `${m.forum} · ${m.stage}`, href: `/legal/${m.id}` },
          { label: "Exposure", value: inrCr(m.exposureCr * 1e7, 1) },
          ...(m.nextHearing ? [{ label: "Next hearing", value: m.nextHearing }] : []),
        ],
      };
    } else if (kind === "source") {
      const s = league.find((x) => x.source === id);
      const col = collieries.find((c) => c.id === id)!;
      dossiers[node.id] = {
        headline: col.name,
        lines: s
          ? [
              { label: "Rakes", value: `${s.rakes} in window`, href: "/coal/sources" },
              { label: "Transit loss", value: pct(s.transitLossPct) },
              { label: "Grade slips", value: pct(s.slippedRakePct, 0) + " of rakes" },
              { label: "Leakage", value: inrCr(s.totalLeakage, 1) },
            ]
          : [],
      };
    } else if (kind === "claim") {
      dossiers[node.id] = {
        headline: node.label,
        lines: [{ label: "Register", value: "Recoverable-LD linkage", href: "/legal/intelligence" }],
      };
    } else {
      dossiers[node.id] = { headline: `${node.label} station`, lines: [{ label: "Fleet", value: "open plant ledger", href: "/plants" }] };
    }
  }

  return { graph, dossiers };
}
