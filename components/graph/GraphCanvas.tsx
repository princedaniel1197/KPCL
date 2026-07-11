"use client";

// Entity intelligence graph canvas [H3]. d3-force layout on an ivory canvas;
// click a node for its cross-module dossier; non-focus nodes ghost, never hide.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation,
  type SimulationLinkDatum, type SimulationNodeDatum,
} from "d3-force";
import type { EntityGraph, GraphNode } from "@/lib/engines/graph";
import type { NodeDossier } from "@/lib/views/graph";

interface SimNode extends SimulationNodeDatum, GraphNode {}
type SimLink = SimulationLinkDatum<SimNode> & { kind: string };

const KIND_FILL: Record<string, string> = {
  vendor: "#C9A84C",
  project: "#2A2418",
  contract: "#7A7260",
  case: "#8C3B2E",
  claim: "#A9762B",
  source: "#5C6B7A",
  plant: "#5B6E3A",
};

const KIND_LABEL: Record<string, string> = {
  vendor: "Contractor / vendor",
  project: "Project",
  contract: "Contract",
  case: "Case",
  claim: "Claim",
  source: "Coal source",
  plant: "Plant",
};

const W = 1100;
const H = 640;

export function GraphCanvas({ graph, dossiers }: { graph: EntityGraph; dossiers: Record<string, NodeDossier> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  // d3-force uses Math.random() internally, so an SSR run and the client run
  // produce different node coordinates → React hydration mismatch. We therefore
  // compute the layout ONLY after mount; before that both server and client
  // render the same placeholder, so hydration matches. A seeded RNG keeps the
  // layout stable across reloads.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const layout = useMemo(() => {
    if (!mounted) return null;
    // Seeded LCG so the simulation is deterministic run-to-run.
    let seed = 0x5e_9d_10 ^ graph.nodes.length;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const nodes: SimNode[] = graph.nodes.map((n, i) => ({
      ...n,
      x: W / 2 + 260 * Math.cos((i / graph.nodes.length) * 2 * Math.PI),
      y: H / 2 + 220 * Math.sin((i / graph.nodes.length) * 2 * Math.PI),
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = graph.edges
      .filter((e) => byId.has(e.source) && byId.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, kind: e.kind }));
    const sim = forceSimulation(nodes)
      .randomSource(rand)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(46).strength(0.5))
      .force("charge", forceManyBody().strength(-90))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<SimNode>().radius((d) => 6 + Math.min(16, d.weight * 1.4)))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();
    return { nodes, links };
  }, [graph, mounted]);

  const nodes = layout?.nodes ?? [];
  const links = layout?.links ?? [];

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of links) {
      const s = (l.source as SimNode).id ?? (l.source as unknown as string);
      const t = (l.target as SimNode).id ?? (l.target as unknown as string);
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    }
    return map;
  }, [links]);

  const isGhost = (id: string) =>
    selected !== null && id !== selected && !(neighbors.get(selected)?.has(id) ?? false);

  const dossier = selected ? dossiers[selected] : null;
  const selectedNode = selected ? nodes.find((n) => n.id === selected) : null;

  useEffect(() => {
    setZoom({ k: 1, x: 0, y: 0 });
  }, [graph]);

  return (
    <div className="lg:flex gap-4">
      <div className="panel flex-1 overflow-hidden relative">
        <div className="absolute top-3 left-4 z-10 flex flex-wrap gap-3 text-[0.65rem] text-muted bg-panel/80 px-2 py-1">
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: KIND_FILL[k] }} />
              {label}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="graph-canvas w-full h-[540px] cursor-grab"
          onWheel={(e) => {
            // Compute inside the updater so batched wheel events accumulate
            // instead of all multiplying the same stale zoom.k.
            setZoom((z) => ({ ...z, k: Math.min(3, Math.max(0.5, z.k * (e.deltaY < 0 ? 1.1 : 0.9))) }));
          }}
          onMouseDown={(e) => (dragging.current = { x: e.clientX - zoom.x, y: e.clientY - zoom.y })}
          onMouseMove={(e) => {
            // Snapshot the ref: a deferred updater must not read dragging.current
            // (mouseup may have nulled it before this update is applied).
            const d = dragging.current;
            if (!d) return;
            setZoom((z) => ({ ...z, x: e.clientX - d.x, y: e.clientY - d.y }));
          }}
          onMouseUp={() => (dragging.current = null)}
          onMouseLeave={() => (dragging.current = null)}
        >
          <g className="graph-appear" transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.k})`}>
            {links.map((l, i) => {
              const s = l.source as SimNode;
              const t = l.target as SimNode;
              const ghost = isGhost(s.id) || isGhost(t.id);
              return (
                <line
                  key={i}
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke="#2A2418"
                  strokeOpacity={ghost ? 0.05 : 0.18}
                  strokeWidth={0.7}
                />
              );
            })}
            {nodes.map((n) => {
              const r = 4 + Math.min(15, n.weight * 1.3);
              const ghost = isGhost(n.id);
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  opacity={ghost ? 0.14 : 1}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(n.id === selected ? null : n.id);
                  }}
                >
                  <circle
                    r={r}
                    fill={KIND_FILL[n.kind]}
                    stroke={n.id === selected ? "#C9A84C" : n.risk > 55 ? "#8C3B2E" : "#FBF9F3"}
                    strokeWidth={n.id === selected ? 3.5 : n.risk > 55 ? 2 : 1}
                  />
                  {(n.kind === "vendor" || n.kind === "project" || n.kind === "source" || n.kind === "plant" || n.id === selected) && !ghost && (
                    <text
                      y={r + 10}
                      textAnchor="middle"
                      fontSize={n.kind === "project" ? 8.5 : 8}
                      fill="#7A7260"
                      style={{ fontFamily: "var(--font-dmsans)" }}
                    >
                      {n.label.length > 34 ? n.label.slice(0, 32) + "…" : n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className="px-4 py-2 border-t-[0.5px] border-rule text-[0.65rem] text-faint">
          {nodes.length} entities · {links.length} relationships · scroll to zoom, drag to pan, click a node for its dossier
        </div>
      </div>

      {/* Dossier panel */}
      <div className="panel w-full lg:w-[340px] shrink-0 p-4 mt-4 lg:mt-0 self-start">
        {dossier && selectedNode ? (
          <>
            <div className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">{KIND_LABEL[selectedNode.kind]}</div>
            <div className="font-serif text-xl font-semibold mt-1 leading-snug">{selectedNode.label}</div>
            <p className="text-[0.78rem] text-muted mt-2 leading-relaxed">{dossier.headline}</p>
            <div className="mt-3 space-y-0">
              {dossier.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-3 py-1.5 rule-hair text-[0.78rem]">
                  <span className="text-faint shrink-0">{l.label}</span>
                  {l.href ? (
                    <Link href={l.href} className="underline text-right">{l.value}</Link>
                  ) : (
                    <span className="text-right">{l.value}</span>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-outline mt-4 w-full" onClick={() => setSelected(null)}>
              Clear focus
            </button>
          </>
        ) : (
          <div className="text-[0.8rem] text-muted leading-relaxed">
            <div className="font-serif text-lg font-semibold text-ink mb-2">Entity dossier</div>
            Click any node to see everything the corporation knows about it — contracts, projects, cases, claims and scores joined across every module.
            <div className="mt-3 text-[0.72rem] text-faint">
              Try the gold contractor nodes: the same counterparty failing in five silos is invisible until the silos share one graph.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
