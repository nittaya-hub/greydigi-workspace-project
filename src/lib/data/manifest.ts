import { createClient } from "@/lib/supabase/server";
import type { ManifestAssetKind } from "@/lib/supabase/database.types";

export interface ManifestSummary {
  assetCount: number;
  totalReuseCount: number;
  decisionCount: number;
  calibrationCount: number;
  /** Calibration rows written in the last 7 days -- "1 gate closed this
   * week with its calibration recorded" on the Decision Pack's own
   * entry-screen mock. */
  calibrationThisWeek: number;
  avgSlipDays: number | null;
  /** Hangar's write-back: every product_gate_history row is Hangar's own
   * "no gate closes without a write-back" (0063_hangar_product_first_
   * class.sql) -- read directly, not copied into a manifest_* table. */
  hangarGatesReached: number;
  hangarGatesThisWeek: number;
  /** Hypercare's write-back: open improvement_items, read directly from
   * Hypercare's own table (0064_hypercare_blueprint.sql) -- "nothing is
   * retyped at any handoff." */
  hypercareOpenImprovementItems: number;
}

/** Everything the Manifest entry-screen card and /manifest overview need.
 * Assets/Decisions/Calibration are Manifest's own tables; the Hangar and
 * Hypercare figures are read live from their own cockpits rather than
 * duplicated — the Decision Pack's "nothing is retyped at any handoff"
 * rule, applied literally. Nothing here is fabricated: an empty Manifest
 * reads as zeros, same as every other cockpit's empty state. */
export async function getManifestSummary(workspaceId: string): Promise<ManifestSummary> {
  const supabase = await createClient();
  const [{ count: assetCount }, { data: assets }, { count: decisionCount }, { data: calibration }, { data: gateHistory }, { count: improvementCount }] =
    await Promise.all([
      supabase.from("manifest_assets").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("manifest_assets").select("reuse_count").eq("workspace_id", workspaceId),
      supabase.from("manifest_decisions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("manifest_calibration").select("slip_days, created_at").eq("workspace_id", workspaceId),
      supabase.from("product_gate_history").select("reached_at").eq("workspace_id", workspaceId),
      supabase.from("improvement_items").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "open"),
    ]);

  const totalReuseCount = (assets ?? []).reduce((sum, a) => sum + a.reuse_count, 0);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const calibrationThisWeek = (calibration ?? []).filter((c) => new Date(c.created_at).getTime() >= weekAgo).length;
  const slips = (calibration ?? []).map((c) => c.slip_days).filter((s): s is number => s !== null);
  const avgSlipDays = slips.length ? Math.round((slips.reduce((sum, s) => sum + s, 0) / slips.length) * 10) / 10 : null;
  const hangarGatesThisWeek = (gateHistory ?? []).filter((g) => new Date(g.reached_at).getTime() >= weekAgo).length;

  return {
    assetCount: assetCount ?? 0,
    totalReuseCount,
    decisionCount: decisionCount ?? 0,
    calibrationCount: (calibration ?? []).length,
    hangarGatesReached: (gateHistory ?? []).length,
    hangarGatesThisWeek,
    hypercareOpenImprovementItems: improvementCount ?? 0,
    calibrationThisWeek,
    avgSlipDays,
  };
}

export interface AssetRow {
  id: string;
  name: string;
  kind: ManifestAssetKind;
  description: string | null;
  reuseCount: number;
  createdAt: string;
}

export async function listAssets(workspaceId: string): Promise<AssetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("manifest_assets")
    .select("id, name, kind, description, reuse_count, created_at")
    .eq("workspace_id", workspaceId)
    .order("reuse_count", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind,
    description: a.description,
    reuseCount: a.reuse_count,
    createdAt: a.created_at,
  }));
}

export interface DecisionRow {
  id: string;
  projectRef: string;
  decision: string;
  objection: string | null;
  resolution: string;
  createdAt: string;
}

export async function listDecisions(workspaceId: string): Promise<DecisionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("manifest_decisions")
    .select("id, project_id, decision, objection, resolution, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return [];

  const projectIds = [...new Set(data.map((d) => d.project_id))];
  const { data: projects } = await supabase.from("projects").select("id, ref").in("id", projectIds);
  const refById = new Map((projects ?? []).map((p) => [p.id, p.ref]));

  return data.map((d) => ({
    id: d.id,
    projectRef: refById.get(d.project_id) ?? "—",
    decision: d.decision,
    objection: d.objection,
    resolution: d.resolution,
    createdAt: d.created_at,
  }));
}

export interface CalibrationRow {
  id: string;
  projectRef: string;
  gateCode: string;
  targetDate: string | null;
  clearedAt: string;
  slipDays: number | null;
}

export async function listCalibration(workspaceId: string): Promise<CalibrationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("manifest_calibration")
    .select("id, project_id, gate_code, target_date, cleared_at, slip_days")
    .eq("workspace_id", workspaceId)
    .order("cleared_at", { ascending: false });
  if (!data || data.length === 0) return [];

  const projectIds = [...new Set(data.map((c) => c.project_id))];
  const { data: projects } = await supabase.from("projects").select("id, ref").in("id", projectIds);
  const refById = new Map((projects ?? []).map((p) => [p.id, p.ref]));

  return data.map((c) => ({
    id: c.id,
    projectRef: refById.get(c.project_id) ?? "—",
    gateCode: c.gate_code,
    targetDate: c.target_date,
    clearedAt: c.cleared_at,
    slipDays: c.slip_days,
  }));
}
