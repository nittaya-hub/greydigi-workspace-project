import { createClient } from "@/lib/supabase/server";
import type { HealthStatus } from "@/lib/supabase/database.types";

export interface ProjectSummary {
  id: string;
  ref: string;
  name: string;
  description: string | null;
  clientName: string;
  phaseCode: string | null;
  phaseName: string | null;
  health: HealthStatus;
  nextGate: { code: string; targetDate: string | null; openConditions: number } | null;
  openTasks: number;
}

export interface DeliveryOverview {
  projectCount: number;
  blockedCount: number;
  watchCount: number;
  nextGate: { code: string; ref: string; targetDate: string | null } | null;
  openChangeRequests: number;
  awaitingSignatureCount: number;
  milestonesNext14: number;
  gatePipeline: {
    code: string;
    projectRef: string;
    projectName: string;
    detail: string;
    ownerName: string;
    status: string;
  }[];
  phaseDistribution: { code: string; count: number; passedCount: number }[];
  clientActionQueue: { kind: string; label: string; ageDays: number }[];
}

async function projectHealthMap(workspaceId: string, projectIds: string[]) {
  const supabase = await createClient();
  const map = new Map<string, HealthStatus>();
  await Promise.all(
    projectIds.map(async (id) => {
      const { data } = await supabase.rpc("fn_project_health", { p_project_id: id });
      map.set(id, (data as HealthStatus) ?? "on_plan");
    })
  );
  return map;
}

export async function listProjects(workspaceId: string, clientId?: string | null): Promise<ProjectSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("projects")
    .select("id, ref, name, description, client_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("ref");
  if (clientId) query = query.eq("client_id", clientId);
  const { data: projects } = await query;

  if (!projects || projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);
  const clientIds = [...new Set(projects.map((p) => p.client_id))];

  const [{ data: clients }, { data: phases }, { data: gates }, { data: tasks }, healthMap] = await Promise.all([
    supabase.from("clients").select("id, name").in("id", clientIds),
    // .order("index") matters here: currentPhaseByProject below keeps
    // the FIRST not-yet-completed phase it sees per project, so without
    // an explicit order a project sitting incomplete across two phases
    // at once (e.g. after a reverted gate re-opened an earlier one, see
    // 0050/0052) could show whichever of them the database happened to
    // return first as "current" instead of the earliest one.
    supabase.from("project_phases").select("project_id, code, name, index, completed_at").in("project_id", projectIds).order("index"),
    supabase
      .from("project_gates")
      .select("id, project_id, code, status, target_date, sequence")
      .in("project_id", projectIds),
    supabase.from("project_tasks").select("project_id, status").in("project_id", projectIds),
    projectHealthMap(workspaceId, projectIds),
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const currentPhaseByProject = new Map<string, { code: string; name: string }>();
  for (const ph of phases ?? []) {
    if (ph.completed_at) continue;
    const existing = currentPhaseByProject.get(ph.project_id);
    if (!existing) currentPhaseByProject.set(ph.project_id, { code: ph.code, name: ph.name });
  }

  const gatesByProject = new Map<string, typeof gates>();
  for (const g of gates ?? []) {
    const list = gatesByProject.get(g.project_id) ?? [];
    list.push(g);
    gatesByProject.set(g.project_id, list);
  }

  const openTasksByProject = new Map<string, number>();
  for (const t of tasks ?? []) {
    if (t.status === "done") continue;
    openTasksByProject.set(t.project_id, (openTasksByProject.get(t.project_id) ?? 0) + 1);
  }

  const gateIds = (gates ?? []).map((g) => g.id);
  const { data: openConditionCounts } = gateIds.length
    ? await supabase.from("project_gate_conditions").select("project_gate_id, status").in("project_gate_id", gateIds).eq("status", "open")
    : { data: [] as { project_gate_id: string; status: string }[] };
  const openByGateId = new Map<string, number>();
  for (const c of openConditionCounts ?? []) {
    openByGateId.set(c.project_gate_id, (openByGateId.get(c.project_gate_id) ?? 0) + 1);
  }
  const gateIdByCode = new Map<string, string>();
  for (const g of gates ?? []) gateIdByCode.set(`${g.project_id}:${g.code}`, g.id);

  return projects.map((p) => {
    const phase = currentPhaseByProject.get(p.id);
    const projectGates = (gatesByProject.get(p.id) ?? []).slice().sort((a, b) => a.sequence - b.sequence);
    const heldGate = projectGates.find((g) => g.status === "held");
    const nextGate = heldGate
      ? {
          code: heldGate.code,
          targetDate: heldGate.target_date,
          openConditions: openByGateId.get(gateIdByCode.get(`${p.id}:${heldGate.code}`) ?? "") ?? 0,
        }
      : null;

    return {
      id: p.id,
      ref: p.ref,
      name: p.name,
      description: p.description,
      clientName: clientById.get(p.client_id) ?? "—",
      phaseCode: phase?.code ?? null,
      phaseName: phase?.name ?? null,
      health: healthMap.get(p.id) ?? "on_plan",
      nextGate,
      openTasks: openTasksByProject.get(p.id) ?? 0,
    };
  });
}

export async function getDeliveryOverview(workspaceId: string, clientId?: string | null): Promise<DeliveryOverview> {
  const supabase = await createClient();
  const projects = await listProjects(workspaceId, clientId);
  const projectIds = projects.map((p) => p.id);

  const [{ data: allGates }, { data: changeRequests }, { data: signatures }, { data: milestoneTasks }, { data: allPhases }] =
    await Promise.all([
      projectIds.length
        ? supabase.from("project_gates").select("id, project_id, code, status, target_date, sequence").in("project_id", projectIds)
        : Promise.resolve({ data: [] as { id: string; project_id: string; code: string; status: string; target_date: string | null; sequence: number }[] }),
      projectIds.length
        ? supabase.from("change_requests").select("id, status").in("project_id", projectIds)
        : Promise.resolve({ data: [] as { id: string; status: string }[] }),
      projectIds.length
        ? supabase.from("client_signatures").select("id, status").in("project_id", projectIds)
        : Promise.resolve({ data: [] as { id: string; status: string }[] }),
      projectIds.length
        ? supabase
            .from("project_tasks")
            .select("id, client_visible_date")
            .in("project_id", projectIds)
            .not("client_visible_date", "is", null)
        : Promise.resolve({ data: [] as { id: string; client_visible_date: string | null }[] }),
      // Distinct from currentPhaseByProject inside listProjects (which only
      // keeps each project's first still-open phase): phaseDistribution
      // below needs to know, per code, how many phases have ALREADY been
      // completed across the portfolio — not just who's there right now —
      // so a phase nobody is currently sitting in can still show as
      // "passed" (green) instead of "not started yet" (beige).
      projectIds.length
        ? supabase.from("project_phases").select("code, completed_at").in("project_id", projectIds)
        : Promise.resolve({ data: [] as { code: string; completed_at: string | null }[] }),
    ]);

  const heldGates = (allGates ?? []).filter((g) => g.status === "held");
  const heldGateIds = heldGates.map((g) => g.id);
  const { data: openConds } = heldGateIds.length
    ? await supabase
        .from("project_gate_conditions")
        .select("project_gate_id, status, description, owner")
        .in("project_gate_id", heldGateIds)
        .eq("status", "open")
    : { data: [] as { project_gate_id: string; status: string; description: string; owner: string }[] };
  const openByGate = new Map<string, { count: number; sample: string; owner: string }>();
  for (const c of openConds ?? []) {
    const cur = openByGate.get(c.project_gate_id) ?? { count: 0, sample: c.description, owner: c.owner };
    cur.count++;
    openByGate.set(c.project_gate_id, cur);
  }

  const projectById = new Map(projects.map((p) => [p.id, p]));

  // Sorted once and reused for both the pipeline list and `nextGate`
  // below -- those used to sort independently (gatePipeline sorted,
  // nextGate's targetDate read off the unsorted `heldGates[0]`), so with
  // two or more held gates across different projects, the code/ref
  // shown as "next" and the date shown next to it could silently belong
  // to two different gates. Only ever looked right with a single held
  // gate in the data, which is all this project has had so far.
  const sortedHeldGates = heldGates.slice().sort((a, b) => (a.target_date ?? "").localeCompare(b.target_date ?? ""));

  const gatePipeline = sortedHeldGates.map((g) => {
    const project = projectById.get(g.project_id);
    const open = openByGate.get(g.id);
    return {
      code: g.code,
      projectRef: project?.ref ?? "",
      projectName: project?.name ?? "",
      detail: open ? `${open.count} condition${open.count === 1 ? "" : "s"} open` : "Held",
      ownerName: project?.clientName ?? "",
      status: project?.health === "blocked" ? "BLOCKED" : project?.health === "watch" ? "WATCH" : "ON PLAN",
    };
  });

  const phaseDistribution = ["00", "01", "02", "03", "04", "05", "06"].map((code) => ({
    code,
    count: projects.filter((p) => p.phaseCode === code).length,
    passedCount: (allPhases ?? []).filter((ph) => ph.code === code && ph.completed_at !== null).length,
  }));

  const now = Date.now();
  const in14Days = now + 14 * 86_400_000;
  const milestonesNext14 = (milestoneTasks ?? []).filter((t) => {
    if (!t.client_visible_date) return false;
    const ts = new Date(t.client_visible_date).getTime();
    return ts >= now && ts <= in14Days;
  }).length;

  return {
    projectCount: projects.length,
    blockedCount: projects.filter((p) => p.health === "blocked").length,
    watchCount: projects.filter((p) => p.health === "watch").length,
    nextGate: gatePipeline.length
      ? { code: gatePipeline[0].code, ref: gatePipeline[0].projectRef, targetDate: sortedHeldGates[0]?.target_date ?? null }
      : null,
    openChangeRequests: (changeRequests ?? []).filter((c) => c.status !== "approved" && c.status !== "rejected").length,
    // client_action_status is pending|in_progress|completed|overdue
    // (0001_extensions_enums.sql) -- an overdue signature is still
    // unsigned, so it belongs in this count as much as a pending one
    // does; excluding it undercounted exactly the signatures most worth
    // surfacing.
    awaitingSignatureCount: (signatures ?? []).filter((s) => s.status === "pending" || s.status === "overdue").length,
    milestonesNext14,
    gatePipeline,
    phaseDistribution,
    clientActionQueue: [],
  };
}
