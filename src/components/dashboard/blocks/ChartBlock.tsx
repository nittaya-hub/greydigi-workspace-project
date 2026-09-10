"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_LABELS, type ChartSeriesKey } from "@/lib/dashboard/metrics";
import type { DashboardData } from "@/lib/dashboard/types";

export function ChartBlock({ config, data }: { config: Record<string, unknown>; data: DashboardData }) {
  const series = typeof config.series === "string" ? (config.series as ChartSeriesKey) : null;
  const points = series ? data.charts?.[series] ?? [] : [];

  if (!series) {
    return <div className="h-full flex items-center justify-center p-3.5 text-[11.5px] text-muted">No chart chosen.</div>;
  }

  if (points.length === 0) {
    return (
      <div className="h-full flex flex-col p-3.5 gap-1">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">{CHART_LABELS[series].toUpperCase()}</span>
        <div className="flex-1 flex items-center justify-center text-[11.5px] text-muted">No data yet.</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3.5 gap-1">
      <span className="font-mono text-[9px] tracking-[.09em] text-muted">{CHART_LABELS[series].toUpperCase()}</span>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--color-muted)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted)" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--color-coral)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
