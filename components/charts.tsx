"use client";

// Recharts wrappers in the ivory-ledger palette. Ink and gold only — status
// hues reserved for genuinely stateful series.

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Area, ComposedChart,
} from "recharts";

import { PALETTE } from "@/lib/palette";
export { PALETTE };

const axisStyle = { fontSize: 11, fill: PALETTE.muted, fontFamily: "var(--font-dmsans)" };
const tooltipStyle = {
  background: "#FBF9F3",
  border: "0.5px solid #CBB97F",
  fontSize: 12,
  fontFamily: "var(--font-dmsans)",
};

export function StackedBars({
  data,
  xKey,
  series,
  height = 260,
  unit = "",
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string; color: string }[];
  height?: number;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={PALETTE.wash} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: PALETTE.faint }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${Number(v).toLocaleString("en-IN")}${unit}`, name]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} maxBarSize={44} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleBars({
  data,
  xKey,
  yKey,
  height = 220,
  color = PALETTE.gold,
  unit = "",
  highlightIndices,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  unit?: string;
  // Serializable highlight (server components cannot pass a function to a client component).
  highlightIndices?: number[];
}) {
  const hi = new Set(highlightIndices ?? []);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={PALETTE.wash} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: PALETTE.faint }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${Number(v).toLocaleString("en-IN")}${unit}`]} />
        <Bar dataKey={yKey} maxBarSize={40}>
          {data.map((row, i) => (
            <Cell key={i} fill={hi.has(i) ? PALETTE.danger : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleLine({
  data,
  xKey,
  series,
  height = 220,
  refY,
  refLabel,
  unit = "",
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: { key: string; label: string; color: string; dashed?: boolean }[];
  height?: number;
  refY?: number;
  refLabel?: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={PALETTE.wash} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: PALETTE.faint }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${Number(v).toLocaleString("en-IN")}${unit}`, name]} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {refY !== undefined && (
          <ReferenceLine y={refY} stroke={PALETTE.danger} strokeDasharray="4 3" label={{ value: refLabel, fontSize: 10, fill: PALETTE.danger, position: "insideTopRight" }} />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={1.8}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BandArea({
  data,
  xKey,
  lowKey,
  highKey,
  valueKey,
  height = 220,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  lowKey: string;
  highKey: string;
  valueKey: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {/* ComposedChart, not AreaChart — AreaChart silently drops <Line> children. */}
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={PALETTE.wash} vertical={false} />
        <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: PALETTE.faint }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area dataKey={highKey} stroke="none" fill={PALETTE.wash} />
        <Area dataKey={lowKey} stroke="none" fill="#F5F1E8" />
        <Line dataKey={valueKey} stroke={PALETTE.ink} strokeWidth={1.8} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
