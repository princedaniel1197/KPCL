"use client";

// Interactive blending lab [C3] — target-GCV slider + required tonnage input,
// running the greedy least-cost blend() engine client-side.

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Kpi";
import { blend, type BlendComponent } from "@/lib/engines/coal";
import { inr, kcal, num, pct } from "@/lib/format";

const MIN_GCV = 3800;
const MAX_GCV = 5200;
const DEFAULT_GCV = 4300;
const DEFAULT_TONNES = 50000;

export function BlendingLab({ components }: { components: BlendComponent[] }) {
  const [targetGcv, setTargetGcv] = useState(DEFAULT_GCV);
  const [requiredT, setRequiredT] = useState(DEFAULT_TONNES);

  const result = useMemo(
    () => blend(components, targetGcv, Math.max(0, requiredT)),
    [components, targetGcv, requiredT],
  );

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="panel p-4">
          <label htmlFor="blend-target" className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted block mb-2">
            Target GCV (kcal/kg)
          </label>
          <input
            id="blend-target"
            type="range"
            min={MIN_GCV}
            max={MAX_GCV}
            step={25}
            value={targetGcv}
            onChange={(e) => setTargetGcv(Number(e.target.value))}
            className="w-full accent-gold"
          />
          <div className="flex justify-between text-[0.68rem] text-faint mt-1">
            <span>{num(MIN_GCV)}</span>
            <span className="hero-numeral text-[1.3rem] text-ink">{num(targetGcv)}</span>
            <span>{num(MAX_GCV)}</span>
          </div>
        </div>
        <div className="panel p-4">
          <label htmlFor="blend-tonnes" className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted block mb-2">
            Required tonnes
          </label>
          <input
            id="blend-tonnes"
            type="number"
            min={0}
            step={1000}
            value={requiredT}
            onChange={(e) => {
              const v = Number(e.target.value);
              setRequiredT(Number.isFinite(v) ? v : 0);
            }}
            className="w-full bg-panel border border-rule rounded-sm px-3 py-1.5 text-[0.9rem] tnum"
          />
          <div className="text-[0.68rem] text-faint mt-2">
            Available across sources: {num(Math.round(components.reduce((s, c) => s + c.availableT, 0)))} t
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="panel px-4 py-3">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">Achieved GCV</div>
          <div className={`hero-numeral text-[1.7rem] mt-1 ${result.achievedGcv >= targetGcv - 25 ? "text-success" : "text-danger"}`}>
            {kcal(result.achievedGcv)}
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">Blended cost</div>
          <div className="hero-numeral text-[1.7rem] mt-1 text-ink">{inr(Math.round(result.costPerTonne))}/t</div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">Mix tonnage</div>
          <div className="hero-numeral text-[1.7rem] mt-1 text-ink">
            {num(Math.round(result.mix.reduce((s, m) => s + m.tonnes, 0)))} t
          </div>
        </div>
        <div className="panel px-4 py-3">
          <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">Feasibility</div>
          <div className="mt-2">
            {result.feasible ? <Chip tone="success">feasible</Chip> : <Chip tone="danger">infeasible</Chip>}
          </div>
        </div>
      </div>

      <table className="ledger">
        <thead>
          <tr>
            <th>Source</th><th className="num">Tonnes</th><th className="num">Share</th>
          </tr>
        </thead>
        <tbody>
          {result.mix.length === 0 && (
            <tr><td colSpan={3} className="text-muted">No feasible mix for the current inputs.</td></tr>
          )}
          {result.mix.map((m) => (
            <tr key={m.id}>
              <td>{m.label}</td>
              <td className="num">{num(Math.round(m.tonnes))}</td>
              <td className="num">{pct(m.sharePct)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[0.72rem] text-muted">
        The optimizer is a greedy least-cost mix: sources are ranked by ₹ per kcal-tonne, the cheapest is drawn
        first, and low-GCV tonnage is then swapped for the cheapest higher-GCV source until the weighted average
        reaches the target. Simple and explainable — not a linear-programming optimum, but within a whisker of one
        on this source set.
      </p>
    </div>
  );
}
