import { METRIC_LABELS, METRIC_UNIT, type MetricKey } from "@/lib/dashboard/metrics";
import type { DashboardData } from "@/lib/dashboard/types";

export function MetricBlock({ config, data }: { config: Record<string, unknown>; data: DashboardData }) {
  const metric = typeof config.metric === "string" ? (config.metric as MetricKey) : null;
  const value = metric ? data.metrics?.[metric] : undefined;

  if (!metric) {
    return <div className="h-full flex items-center justify-center p-3.5 text-[11.5px] text-muted">No metric chosen.</div>;
  }

  return (
    <div className="h-full flex flex-col items-start justify-center gap-1 p-3.5">
      <span className="font-mono text-[9px] tracking-[.09em] text-muted">{METRIC_LABELS[metric].toUpperCase()}</span>
      <span className="font-display font-extrabold text-[28px] tracking-[-0.03em] text-ink">
        {value ?? "—"}
        {value != null ? <span className="text-[14px] text-muted ml-1">{METRIC_UNIT[metric]}</span> : null}
      </span>
    </div>
  );
}
