import { createClient } from "@/lib/supabase/server";
import type { HealthStatus } from "@/lib/supabase/database.types";

// Every query here is flat (no embedded `table!inner(...)` selects) and
// joined manually in JS via Maps. Hand-written Database types don't carry
// accurate `Relationships` for most tables (see database.types.ts), so an
// embedded select silently loses type-checking instead of erroring —
// flat queries stay fully type-safe against the plain Row types, which
// were verified against a real Postgres instance. Regenerate
// database.types.ts from a real project (see supabase/README.md) and this
// can move to embeds later if the extra round trips ever matter.

export interface DecisionQueueItem {
  space: "delivery" | "hypercare" | "product" | "cross";
  what: string;
  detail: string;
  on: string;
  age: string;
  ageTone: "muted" | "warn" | "block";
}

export interface WorkspaceOverview {
  activeProjects: number;
  clientCount: number;
  blockedGates: { count: number; detail: string };
  clientActions: { count: number; detail: string };
  liveIncidents: { count: number; detail: string };
  releaseDependencies: { count: number; detail: string };
  decisionQueue: DecisionQueueItem[];
  portfolioHealth: { total: number; byHealth: Record<HealthStatus, number> };
  spaceSummaries: {
    delivery: { projects: number; nextGate: string | null; nextGateTarget: string | null };
    product: { products: number; featuresInBuild: number; nextRelease: string | null; deliveryWaiting: number };
    hypercare: { servicesLive: number; activeIncidents: number; requestBacklog: number };
  };
}

function ageFrom(iso: string): { label: string; tone: "muted" | "warn" | "block" } {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return { label: `${Math.max(1, hours)} HOURS`, tone: hours >= 12 ? "block" : "warn" };
  const days = Math.floor(hours / 24);
  return { label: `${days} DAY${days === 1 ? "" : "S"}`, tone: days >= 7 ? "warn" : "muted" };
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from("people").select("workspace_id").eq("auth_user_id", user.id).maybeSingle();
    return data?.workspace_id ?? null;
  } catch {
    return null;
  }
}

export async function getWorkspaceOverview(workspaceId: string): Promise<WorkspaceOverview> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, ref, name, client_id, lead_person_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  const projectIds = (projects ?? []).map((p) => p.id);
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const [{ count: clientCount }, { data: clients }, { data: gates }, { data: actions }] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("clients").select("id, name").eq("workspace_id", workspaceId),
      projectIds.length
        ? supabase.from("project_gates").select("id, code, status, target_date, held_since, project_id").in("project_id", projectIds)
        : Promise.resolve({ data: [] as { id: string; code: string; status: string; target_date: string | null; held_since: string | null; project_id: string }[] }),
      projectIds.length
        ? supabase.from("client_actions").select("id, kind, status, project_id, created_at").in("project_id", projectIds).in("status", ["pending", "in_progress"])
        : Promise.resolve({ data: [] as { id: string; kind: string; status: string; project_id: string; created_at: string }[] }),
    ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const { data: services } = await supabase.from("services").select("id, name, health").eq("workspace_id", workspaceId);
  const serviceIds = (services ?? []).map((s) => s.id);

  const [{ data: incidents }, { data: requests }] = await Promise.all([
    serviceIds.length
      ? supabase.from("incidents").select("id, ref, title, opened_at, service_id").in("service_id", serviceIds).neq("status", "resolved")
      : Promise.resolve({ data: [] as { id: string; ref: string; title: string; opened_at: string; service_id: string }[] }),
    serviceIds.length
      ? supabase.from("support_requests").select("id, status").in("service_id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
  ]);
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  const { data: products } = await supabase.from("products").select("id").eq("workspace_id", workspaceId);
  const productIds = (products ?? []).map((p) => p.id);
  const [{ data: roadmapItems }, { data: releases }, { data: releaseDeps }] = await Promise.all([
    productIds.length
      ? supabase.from("roadmap_items").select("id, status").in("product_id", productIds)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    productIds.length
      ? supabase.from("releases").select("id, code, name, target_date, status").in("product_id", productIds).order("target_date", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; code: string; name: string; target_date: string | null; status: string }[] }),
    projectIds.length
      ? supabase.from("project_release_dependencies").select("id, project_id, release_id").in("project_id", projectIds)
      : Promise.resolve({ data: [] as { id: string; project_id: string; release_id: string }[] }),
  ]);

  const byHealth: Record<HealthStatus, number> = { on_plan: 0, watch: 0, blocked: 0 };
  await Promise.all(
    (projects ?? []).map(async (p) => {
      const { data: health } = await supabase.rpc("fn_project_health", { p_project_id: p.id });
      byHealth[(health as HealthStatus) ?? "on_plan"]++;
    })
  );

  const heldGates = (gates ?? []).filter((g) => g.status === "held");
  const nextHeldGate = [...heldGates].sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? ""))[0];

  const decisionQueue: DecisionQueueItem[] = [];
  for (const g of heldGates.slice(0, 3)) {
    const project = projectById.get(g.project_id);
    const age = ageFrom(g.held_since ?? new Date().toISOString());
    decisionQueue.push({
      space: "delivery",
      what: `${g.code} held`,
      detail: `${project?.ref ?? ""} ${project?.name ?? ""}`.trim(),
      on: project ? (clientById.get(project.client_id) ?? "—") : "—",
      age: age.label,
      ageTone: age.tone,
    });
  }
  for (const inc of (incidents ?? []).slice(0, 3)) {
    const age = ageFrom(inc.opened_at);
    decisionQueue.push({
      space: "hypercare",
      what: `${inc.ref} ${inc.title}`,
      detail: serviceNameById.get(inc.service_id) ?? "",
      on: "—",
      age: age.label,
      ageTone: age.tone,
    });
  }

  return {
    activeProjects: projects?.length ?? 0,
    clientCount: clientCount ?? 0,
    blockedGates: {
      count: heldGates.length,
      detail: heldGates
        .slice(0, 2)
        .map((g) => `${g.code} ${projectById.get(g.project_id)?.ref ?? ""}`)
        .join(", "),
    },
    clientActions: {
      count: actions?.length ?? 0,
      detail: `${(actions ?? []).filter((a) => a.kind === "sign_artefact").length} signatures, ${
        (actions ?? []).filter((a) => a.kind === "provide_information" || a.kind === "upload_document").length
      } access grants`,
    },
    liveIncidents: { count: incidents?.length ?? 0, detail: "" },
    releaseDependencies: { count: releaseDeps?.length ?? 0, detail: "" },
    decisionQueue,
    portfolioHealth: { total: projects?.length ?? 0, byHealth },
    spaceSummaries: {
      delivery: {
        projects: projects?.length ?? 0,
        nextGate: nextHeldGate?.code ?? null,
        nextGateTarget: nextHeldGate?.target_date ?? null,
      },
      product: {
        products: products?.length ?? 0,
        featuresInBuild: (roadmapItems ?? []).filter((r) => r.status === "in_progress").length,
        nextRelease: (releases ?? []).find((r) => r.status !== "shipped")?.code ?? null,
        deliveryWaiting: releaseDeps?.length ?? 0,
      },
      hypercare: {
        servicesLive: services?.length ?? 0,
        activeIncidents: incidents?.length ?? 0,
        requestBacklog: (requests ?? []).filter((r) => r.status !== "done").length,
      },
    },
  };
}
