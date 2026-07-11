// Entity intelligence graph builder [H3].
// Nodes: contractors/vendors, projects, contracts, cases, claims, coal sources,
// plants. Edges from shared keys across datasets. Degree- and risk-weighted.

import type { Colliery, Contract, LegalMatter, Project, Vendor } from "@/lib/types";
import { scoreVendor } from "./vendor";
import { projectHealth } from "./execution";
import { ldRegister } from "./obligations";

export type NodeKind =
  | "vendor"
  | "project"
  | "contract"
  | "case"
  | "claim"
  | "source"
  | "plant";

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  weight: number; // size driver (degree)
  risk: number; // 0-100 tint driver
  href: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: string;
}

export interface EntityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraph(input: {
  vendors: Vendor[];
  projects: Project[];
  contracts: Contract[];
  matters: LegalMatter[];
  collieries: Colliery[];
  asOf: string;
}): EntityGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const add = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  const link = (a: string, b: string, kind: string) => {
    if (nodes.has(a) && nodes.has(b)) edges.push({ source: a, target: b, kind });
  };

  const plants = ["RTPS", "BTPS", "YTPS", "HYDRO", "PSP"];
  for (const p of plants)
    add({ id: `plant:${p}`, label: p, kind: "plant", weight: 3, risk: 0, href: `/plants` });

  // Vendors that actually appear somewhere (keep the canvas ~150 nodes)
  const activeVendorIds = new Set<string>([
    ...input.projects.map((p) => p.contractorId),
    ...input.contracts.filter((c) => c.valueCr >= 15).map((c) => c.vendorId),
  ]);
  for (const v of input.vendors.filter((v) => activeVendorIds.has(v.id))) {
    const s = scoreVendor(v);
    add({
      id: `vendor:${v.id}`,
      label: v.name,
      kind: "vendor",
      weight: 2,
      risk: 100 - s.score,
      href: `/contracts/vendors?focus=${v.id}`,
    });
  }

  for (const p of input.projects) {
    const h = projectHealth(p, input.asOf);
    add({
      id: `project:${p.id}`,
      label: p.name,
      kind: "project",
      weight: 3,
      risk: h.riskScore,
      href: `/projects/${p.id}`,
    });
    link(`project:${p.id}`, `vendor:${p.contractorId}`, "contracted to");
    link(`project:${p.id}`, `plant:${p.plant}`, "at");
  }

  const lds = ldRegister(input.contracts, input.asOf);
  const ldByContract = new Map<string, number>();
  for (const l of lds)
    ldByContract.set(l.contractId, (ldByContract.get(l.contractId) ?? 0) + l.accruedValue);

  for (const c of input.contracts.filter((c) => c.valueCr >= 15)) {
    const ld = ldByContract.get(c.id) ?? 0;
    add({
      id: `contract:${c.id}`,
      label: c.id,
      kind: "contract",
      weight: 1,
      risk: Math.min(100, ld * 10),
      href: `/contracts/${c.id}`,
    });
    link(`contract:${c.id}`, `vendor:${c.vendorId}`, "awarded to");
    if (c.projectId) link(`contract:${c.id}`, `project:${c.projectId}`, "under");
    if (ld > 0.05) {
      add({
        id: `claim:LD-${c.id}`,
        label: `LD ₹${ld.toFixed(1)} cr`,
        kind: "claim",
        weight: 1,
        risk: 80,
        href: `/legal/intelligence`,
      });
      link(`claim:LD-${c.id}`, `contract:${c.id}`, "accrued on");
    }
  }

  for (const m of input.matters.filter((m) => m.status === "OPEN" && m.exposureCr >= 1)) {
    add({
      id: `case:${m.id}`,
      label: m.id,
      kind: "case",
      weight: 1,
      risk: Math.min(100, m.exposureCr * 2),
      href: `/legal/${m.id}`,
    });
    if (m.linkedProjectId) link(`case:${m.id}`, `project:${m.linkedProjectId}`, "threatens");
    if (m.linkedContractId) {
      link(`case:${m.id}`, `contract:${m.linkedContractId}`, "arises from");
      const vendorId = input.contracts.find((c) => c.id === m.linkedContractId)?.vendorId;
      if (vendorId) link(`case:${m.id}`, `vendor:${vendorId}`, "against");
    }
  }

  for (const col of input.collieries) {
    add({
      id: `source:${col.id}`,
      label: col.name,
      kind: "source",
      weight: 2,
      risk: 0,
      href: `/coal/sources`,
    });
  }

  // Degree-weight nodes
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const weighted = [...nodes.values()].map((n) => ({
    ...n,
    weight: n.weight + (degree.get(n.id) ?? 0),
  }));

  return { nodes: weighted, edges };
}

/** Everything the dossier panel needs for one node. */
export interface Dossier {
  nodeId: string;
  headline: string;
  lines: { label: string; value: string; href?: string }[];
}
