import type { DashboardSpace } from "@/lib/supabase/database.types";

/**
 * Every number a metric block can show is one of these fixed keys,
 * computed server-side inside the relevant fn_client_dashboard_* RPC
 * (see supabase/migrations/0036_dashboard_blocks.sql). A block's config
 * only ever stores `{ metric: MetricKey }` — never a user-typed formula —
 * so there is nothing here for an admin to inject.
 */
export type MetricKey =
  | "gates_cleared_pct"
  | "days_to_go_live"
  | "document_count"
  | "open_actions_count"
  | "open_incidents_count"
  | "sla_health_pct"
  | "roadmap_shipped_count";

export const METRIC_LABELS: Record<MetricKey, string> = {
  gates_cleared_pct: "% gates cleared",
  days_to_go_live: "Days to go-live",
  document_count: "Documents shared",
  open_actions_count: "Open actions needed",
  open_incidents_count: "Open incidents",
  sla_health_pct: "% services healthy",
  roadmap_shipped_count: "Roadmap items shipped",
};

export const METRIC_UNIT: Record<MetricKey, string> = {
  gates_cleared_pct: "%",
  days_to_go_live: "days",
  document_count: "",
  open_actions_count: "",
  open_incidents_count: "",
  sla_health_pct: "%",
  roadmap_shipped_count: "",
};

/** Which metrics make sense to offer in each space's block editor. */
export const METRICS_BY_SPACE: Record<DashboardSpace, MetricKey[]> = {
  delivery: ["gates_cleared_pct", "days_to_go_live", "document_count", "open_actions_count"],
  hypercare: ["open_incidents_count", "sla_health_pct"],
  product: ["roadmap_shipped_count"],
};

/**
 * Every chart block picks one of these fixed series keys, computed
 * server-side into the RPC's `charts` object — never a free query.
 */
export type ChartSeriesKey = "gates_by_status" | "incidents_by_severity" | "roadmap_by_quarter";

export const CHART_LABELS: Record<ChartSeriesKey, string> = {
  gates_by_status: "Gates by status",
  incidents_by_severity: "Open incidents by severity",
  roadmap_by_quarter: "Shipped roadmap by quarter",
};

export const CHARTS_BY_SPACE: Record<DashboardSpace, ChartSeriesKey[]> = {
  delivery: ["gates_by_status"],
  hypercare: ["incidents_by_severity"],
  product: ["roadmap_by_quarter"],
};
