import { createClient } from "@/lib/supabase/server";

export interface CrossSpaceDashboard {
  deliveryInFlight: number;
  goLive30d: number;
  servicesLive: number;
  openIncidents: number;
  atRiskCount: number;
  handoverQueue: { ref: string; name: string; clearedAt: string | null }[];
  hypercareToChangeRequest: number;
  hypercareToProductFeature: number;
}

export async function getCrossSpaceDashboard(workspaceId: string): Promise<CrossSpaceDashboard> {
  const supabase = await createClient();

  const [{ data: projects }, { data: services }, { data: links }] = await Promise.all([
    supabase.from("projects").select("id, ref, name").eq("workspace_id", workspaceId).eq("status", "active"),
    supabase.from("services").select("id, health, origin_project_id").eq("workspace_id", workspaceId),
    supabase
      .from("cross_space_links")
      .select("relationship")
      .eq("workspace_id", workspaceId)
      .in("relationship", ["hypercare_to_delivery_change_request", "hypercare_to_product_feature"]),
  ]);

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: gates } = projectIds.length
    ? await supabase.from("project_gates").select("project_id, code, status, cleared_at, sequence").in("project_id", projectIds)
    : { data: [] as { project_id: string; code: string; status: string; cleared_at: string | null; sequence: number }[] };

  const originProjectIds = new Set((services ?? []).map((s) => s.origin_project_id).filter(Boolean));
  const g5ByProject = new Map((gates ?? []).filter((g) => g.sequence === 5).map((g) => [g.project_id, g]));

  const handoverQueue = (projects ?? [])
    .filter((p) => {
      const g5 = g5ByProject.get(p.id);
      return g5?.status === "cleared" && !originProjectIds.has(p.id);
    })
    .map((p) => ({ ref: p.ref, name: p.name, clearedAt: g5ByProject.get(p.id)?.cleared_at ?? null }));

  const serviceIds = (services ?? []).map((s) => s.id);
  const { data: incidents } = serviceIds.length
    ? await supabase.from("incidents").select("id").in("service_id", serviceIds).neq("status", "resolved")
    : { data: [] as { id: string }[] };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: recentServices } = await supabase
    .from("services")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("live_since", thirtyDaysAgo.slice(0, 10));

  return {
    deliveryInFlight: projects?.length ?? 0,
    goLive30d: recentServices?.length ?? 0,
    servicesLive: services?.length ?? 0,
    openIncidents: incidents?.length ?? 0,
    atRiskCount: (services ?? []).filter((s) => s.health === "at_risk").length,
    handoverQueue,
    hypercareToChangeRequest: (links ?? []).filter((l) => l.relationship === "hypercare_to_delivery_change_request").length,
    hypercareToProductFeature: (links ?? []).filter((l) => l.relationship === "hypercare_to_product_feature").length,
  };
}
