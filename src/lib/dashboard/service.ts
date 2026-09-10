import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DashboardBlockType, DashboardSpace, Json } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface DashboardBlockRow {
  id: string;
  blockType: DashboardBlockType;
  config: Record<string, unknown>;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
}

export interface DashboardRow {
  id: string;
  publishedAt: string | null;
  blocks: DashboardBlockRow[];
}

function mapBlock(b: {
  id: string;
  block_type: DashboardBlockType;
  config: unknown;
  grid_x: number;
  grid_y: number;
  grid_w: number;
  grid_h: number;
}): DashboardBlockRow {
  return {
    id: b.id,
    blockType: b.block_type,
    config: (b.config as Record<string, unknown>) ?? {},
    gridX: b.grid_x,
    gridY: b.grid_y,
    gridW: b.grid_w,
    gridH: b.grid_h,
  };
}

type Scope = { space: "delivery"; projectId: string } | { space: "hypercare"; clientId: string } | { space: "product" };

/** Finds the one dashboard row for a scope, creating an empty (unpublished)
 * one on first access — every dashboard editor page needs a row to attach
 * blocks to before an admin has added anything. */
export async function getOrCreateDashboard(supabase: Client, workspaceId: string, scope: Scope): Promise<DashboardRow> {
  let query = supabase.from("client_dashboards").select("id, published_at").eq("space", scope.space);
  if (scope.space === "delivery") query = query.eq("project_id", scope.projectId);
  if (scope.space === "hypercare") query = query.eq("client_id", scope.clientId);
  if (scope.space === "product") query = query.eq("workspace_id", workspaceId);

  const { data: existing } = await query.maybeSingle();

  let dashboardId = existing?.id;
  let publishedAt = existing?.published_at ?? null;

  if (!dashboardId) {
    const { data: created, error } = await supabase
      .from("client_dashboards")
      .insert({
        workspace_id: workspaceId,
        space: scope.space as DashboardSpace,
        project_id: scope.space === "delivery" ? scope.projectId : null,
        client_id: scope.space === "hypercare" ? scope.clientId : null,
      })
      .select("id, published_at")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create dashboard.");
    dashboardId = created.id;
    publishedAt = created.published_at;
  }

  const { data: blocks } = await supabase
    .from("dashboard_blocks")
    .select("id, block_type, config, grid_x, grid_y, grid_w, grid_h")
    .eq("dashboard_id", dashboardId)
    .order("grid_y", { ascending: true });

  return { id: dashboardId, publishedAt, blocks: (blocks ?? []).map(mapBlock) };
}

const DEFAULT_SIZE: Record<DashboardBlockType, { w: number; h: number }> = {
  text: { w: 4, h: 3 },
  image: { w: 4, h: 4 },
  flight_plan: { w: 12, h: 4 },
  documents: { w: 6, h: 4 },
  embed: { w: 6, h: 5 },
  metric: { w: 3, h: 2 },
  chart: { w: 6, h: 5 },
};

export async function addBlock(
  supabase: Client,
  dashboardId: string,
  blockType: DashboardBlockType,
  config: Record<string, unknown> = {}
) {
  const { data: existing } = await supabase.from("dashboard_blocks").select("grid_y, grid_h").eq("dashboard_id", dashboardId);
  const nextY = (existing ?? []).reduce((max, b) => Math.max(max, b.grid_y + b.grid_h), 0);
  const size = DEFAULT_SIZE[blockType];

  const { error } = await supabase.from("dashboard_blocks").insert({
    dashboard_id: dashboardId,
    block_type: blockType,
    config: config as Json,
    grid_x: 0,
    grid_y: nextY,
    grid_w: size.w,
    grid_h: size.h,
  });
  if (error) throw new Error(error.message);
}

export async function updateBlockConfig(supabase: Client, blockId: string, config: Record<string, unknown>) {
  const { error } = await supabase.from("dashboard_blocks").update({ config: config as Json }).eq("id", blockId);
  if (error) throw new Error(error.message);
}

export async function updateBlockLayout(
  supabase: Client,
  layout: { id: string; x: number; y: number; w: number; h: number }[]
) {
  await Promise.all(
    layout.map((item) =>
      supabase
        .from("dashboard_blocks")
        .update({ grid_x: item.x, grid_y: item.y, grid_w: item.w, grid_h: item.h })
        .eq("id", item.id)
    )
  );
}

export async function removeBlock(supabase: Client, blockId: string) {
  const { error } = await supabase.from("dashboard_blocks").delete().eq("id", blockId);
  if (error) throw new Error(error.message);
}

export async function setDashboardPublished(supabase: Client, dashboardId: string, publishedBy: string | null) {
  const { error } = await supabase
    .from("client_dashboards")
    .update({ published_at: publishedBy ? new Date().toISOString() : null, published_by: publishedBy })
    .eq("id", dashboardId);
  if (error) throw new Error(error.message);
}
