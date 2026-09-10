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
  href: string;
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

const SUBMISSION_KIND_LABEL: Record<string, string> = {
  issue: "Report an issue",
  change_request: "Change request",
  question: "Question",
};

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

/** `clientId` scopes the whole overview to one client — projects,
 * gates, client actions, and services all filter to it (Product stays
 * workspace-wide throughout: it has no client_id in the schema, by
 * design — a reusable capability library, not owned by one client). */
export async function getWorkspaceOverview(workspaceId: string, clientId?: string | null): Promise<WorkspaceOverview> {
  const supabase = await createClient();

  let projectsQuery = supabase
    .from("projects")
    .select("id, ref, name, client_id, lead_person_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (clientId) projectsQuery = projectsQuery.eq("client_id", clientId);
  const { data: projects } = await projectsQuery;

  const projectIds = (projects ?? []).map((p) => p.id);
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const [{ count: clientCount }, { data: clients }, { data: gates }, { data: actions }] = await Promise.all([
      clientId
        ? Promise.resolve({ count: 1 })
        : supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      supabase.from("clients").select("id, name").eq("workspace_id", workspaceId),
      projectIds.length
        ? supabase.from("project_gates").select("id, code, status, target_date, held_since, project_id").in("project_id", projectIds)
        : Promise.resolve({ data: [] as { id: string; code: string; status: string; target_date: string | null; held_since: string | null; project_id: string }[] }),
      projectIds.length
        ? supabase.from("client_actions").select("id, kind, status, project_id, created_at").in("project_id", projectIds).in("status", ["pending", "in_progress"])
        : Promise.resolve({ data: [] as { id: string; kind: string; status: string; project_id: string; created_at: string }[] }),
    ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  let servicesQuery = supabase.from("services").select("id, name, health").eq("workspace_id", workspaceId);
  if (clientId) servicesQuery = servicesQuery.eq("client_id", clientId);
  const { data: services } = await servicesQuery;
  const serviceIds = (services ?? []).map((s) => s.id);

  // Client submissions (Report an issue / Change request / Ask a
  // question — the portal form and both no-login share links all write
  // here, see client-submission-actions.ts and 0048's RPCs) never fed
  // this overview before, so a client typing something in through a
  // share link — the exact case this dashboard exists to surface to the
  // CEO — showed nowhere on it until someone happened to open
  // /hypercare/submissions. Untriaged ones (not yet resolved) join the
  // same decision queue as held gates and open incidents below.
  let submissionsQuery = supabase
    .from("client_submissions")
    .select("id, kind, title, client_id, created_at")
    .eq("workspace_id", workspaceId)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: true });
  if (clientId) submissionsQuery = submissionsQuery.eq("client_id", clientId);
  const { data: openSubmissions } = await submissionsQuery;

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

  // Every source used to cap at 3 and push in whatever order its own
  // query happened to return -- fine for one client's one project, but
  // with several clients each running several projects, "the 3 gates
  // that came back first" is not "the 3 gates that have been held
  // longest." Collecting everything with its real wait time and sorting
  // once, across all three spaces, is what actually scales: the oldest
  // wait surfaces first regardless of which space or which client it
  // belongs to. Capped generously (not per-source) so "View more" on
  // the dashboard has real rows to reveal instead of just the same 3-4
  // it already showed.
  const rawQueue: { item: DecisionQueueItem; waitedMs: number }[] = [];
  for (const g of heldGates) {
    const project = projectById.get(g.project_id);
    const sourceIso = g.held_since ?? new Date().toISOString();
    const age = ageFrom(sourceIso);
    rawQueue.push({
      waitedMs: Date.now() - new Date(sourceIso).getTime(),
      item: {
        space: "delivery",
        what: `${g.code} held`,
        detail: `${project?.ref ?? ""} ${project?.name ?? ""}`.trim(),
        on: project ? (clientById.get(project.client_id) ?? "—") : "—",
        age: age.label,
        ageTone: age.tone,
        href: project ? `/delivery/projects/${project.ref.toLowerCase()}/flight-plan-check` : "/delivery/gates",
      },
    });
  }
  for (const inc of incidents ?? []) {
    const age = ageFrom(inc.opened_at);
    rawQueue.push({
      waitedMs: Date.now() - new Date(inc.opened_at).getTime(),
      item: {
        space: "hypercare",
        what: `${inc.ref} ${inc.title}`,
        detail: serviceNameById.get(inc.service_id) ?? "",
        on: "—",
        age: age.label,
        ageTone: age.tone,
        href: `/hypercare/incidents/${inc.ref.toLowerCase()}`,
      },
    });
  }
  for (const sub of openSubmissions ?? []) {
    const age = ageFrom(sub.created_at);
    rawQueue.push({
      waitedMs: Date.now() - new Date(sub.created_at).getTime(),
      item: {
        space: "hypercare",
        what: `${SUBMISSION_KIND_LABEL[sub.kind] ?? sub.kind} — ${sub.title}`,
        detail: "Client submission, not yet triaged",
        on: clientById.get(sub.client_id) ?? "—",
        age: age.label,
        ageTone: age.tone,
        href: `/hypercare/submissions?submission=${sub.id}`,
      },
    });
  }
  const decisionQueue = rawQueue
    .sort((a, b) => b.waitedMs - a.waitedMs)
    .slice(0, 20)
    .map((r) => r.item);

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
      // client_action_kind has 6 values (0001_extensions_enums.sql), but this
      // breakdown only ever named 2 of them — "review"/"approval"/
      // "confirm_decision" fell into neither bucket, so a pending action of
      // one of those kinds made the headline count and this detail string
      // silently stop adding up (e.g. "1" total next to "0 signatures, 0
      // access grants"). Named a third bucket so every kind is accounted for.
      detail: `${(actions ?? []).filter((a) => a.kind === "sign_artefact").length} signatures, ${
        (actions ?? []).filter((a) => a.kind === "provide_information" || a.kind === "upload_document").length
      } access grants, ${
        (actions ?? []).filter((a) => a.kind === "review" || a.kind === "approval" || a.kind === "confirm_decision").length
      } decisions`,
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
