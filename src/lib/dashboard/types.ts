import type { DashboardSpace } from "@/lib/supabase/database.types";
import type { DashboardBlockRow } from "@/lib/dashboard/service";

export type { DashboardBlockRow };

/** Which block types make sense in each space's "Add block" palette.
 * flight_plan/documents are delivery-only data shapes -- hypercare has no
 * phases/gates, product has no per-client documents. */
export const BLOCK_TYPES_BY_SPACE: Record<DashboardSpace, DashboardBlockRow["blockType"][]> = {
  delivery: ["text", "image", "flight_plan", "documents", "embed", "metric", "chart"],
  hypercare: ["text", "image", "embed", "metric", "chart"],
  product: ["text", "image", "embed", "metric", "chart"],
};

export const BLOCK_TYPE_LABELS: Record<DashboardBlockRow["blockType"], string> = {
  text: "Text",
  image: "Image",
  flight_plan: "Flight plan spine",
  documents: "Document list",
  embed: "Embed link",
  metric: "Metric",
  chart: "Chart",
};

export interface FlightPlanPhase {
  code: string;
  name: string;
  index: number;
  started_at: string | null;
  completed_at: string | null;
  duration_label: string | null;
  show_duration_label: boolean;
}
export interface FlightPlanGate {
  code: string;
  name: string;
  sequence: number;
  status: string;
  target_date: string | null;
}

/** The data bag a fn_client_dashboard_* RPC returns alongside `blocks` --
 * everything a block renderer might read, already shaped and gated
 * server-side. Every field is optional since delivery/hypercare/product
 * each populate a different subset. */
export interface DashboardData {
  flightPlan?: { phases: FlightPlanPhase[]; gates: FlightPlanGate[] };
  documents?: { name: string; kind: string; version: string; created_at: string }[];
  roadmap?: { ref: string; title: string; kind: string; quarter: string | null }[];
  metrics?: Record<string, number | null>;
  charts?: Record<string, { label: string; value: number }[]>;
}
