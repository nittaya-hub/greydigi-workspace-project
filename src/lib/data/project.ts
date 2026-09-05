import { createClient } from "@/lib/supabase/server";
import type { HealthStatus, TaskStatus, TaskVisibility } from "@/lib/supabase/database.types";

export interface ProjectContext {
  id: string;
  ref: string;
  workspaceId: string;
  name: string;
  description: string | null;
  clientId: string;
  clientName: string;
  goLiveTarget: string | null;
  leadName: string;
  health: HealthStatus;
  progressPct: number;
  phases: {
    code: string;
    name: string;
    index: number;
    startedAt: string | null;
    completedAt: string | null;
    durationLabel: string | null;
    showDurationLabel: boolean;
  }[];
  currentPhase: { code: string; name: string } | null;
  gates: { id: string; code: string; name: string; status: string; sequence: number; targetDate: string | null; heldSince: string | null }[];
  heldGate: { id: string; code: string; name: string; heldSince: string | null } | null;
}

/** Loads everything the project layout's hero + tabs need in one place, by
 * ref (case-insensitive — the design source's refs are upper-case, routes
 * are lower-case). Every derived field (health, progress, current phase,
 * held gate) comes from the shared state engine or a plain read, never a
 * page-local formula. */
export async function getProjectByRef(ref: string): Promise<ProjectContext | null> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, ref, workspace_id, name, description, client_id, go_live_target, lead_person_id")
    .ilike("ref", ref)
    .maybeSingle();

  if (!project) return null;

  const [{ data: client }, { data: lead }, { data: phases }, { data: gates }, { data: health }, { data: progress }] =
    await Promise.all([
      supabase.from("clients").select("name").eq("id", project.client_id).maybeSingle(),
      project.lead_person_id
        ? supabase.from("people").select("full_name").eq("id", project.lead_person_id).maybeSingle()
        : Promise.resolve({ data: null as { full_name: string } | null }),
      supabase
        .from("project_phases")
        .select("code, name, index, started_at, completed_at, duration_label, show_duration_label")
        .eq("project_id", project.id)
        .order("index"),
      supabase
        .from("project_gates")
        .select("id, code, name, status, sequence, target_date, held_since")
        .eq("project_id", project.id)
        .order("sequence"),
      supabase.rpc("fn_project_health", { p_project_id: project.id }),
      supabase.rpc("fn_project_progress_pct", { p_project_id: project.id }),
    ]);

  const currentPhase = (phases ?? []).find((p) => !p.completed_at) ?? null;
  const heldGate = (gates ?? []).find((g) => g.status === "held") ?? null;

  return {
    id: project.id,
    ref: project.ref,
    workspaceId: project.workspace_id,
    name: project.name,
    description: project.description,
    clientId: project.client_id,
    clientName: client?.name ?? "—",
    goLiveTarget: project.go_live_target,
    leadName: lead?.full_name ?? "—",
    health: (health as HealthStatus) ?? "on_plan",
    progressPct: (progress as number) ?? 0,
    phases: (phases ?? []).map((p) => ({
      code: p.code,
      name: p.name,
      index: p.index,
      startedAt: p.started_at,
      completedAt: p.completed_at,
      durationLabel: p.duration_label,
      showDurationLabel: p.show_duration_label,
    })),
    currentPhase: currentPhase ? { code: currentPhase.code, name: currentPhase.name } : null,
    gates: (gates ?? []).map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      status: g.status,
      sequence: g.sequence,
      targetDate: g.target_date,
      heldSince: g.held_since,
    })),
    heldGate: heldGate ? { id: heldGate.id, code: heldGate.code, name: heldGate.name, heldSince: heldGate.held_since } : null,
  };
}

export interface GateConditionRow {
  id: string;
  description: string;
  status: string;
  owner: string;
  metAt: string | null;
}

export async function getGateConditions(gateId: string): Promise<GateConditionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_gate_conditions")
    .select("id, description, status, owner, met_at")
    .eq("project_gate_id", gateId)
    .order("sequence");
  return (data ?? []).map((c) => ({
    id: c.id,
    description: c.description,
    status: c.status,
    owner: c.owner,
    metAt: c.met_at,
  }));
}

export interface TaskRow {
  id: string;
  ref: string;
  title: string;
  status: string;
  isCriticalPath: boolean;
  clientVisibleDate: string | null;
  dueDate: string | null;
  assigneeName: string;
  phaseCode: string | null;
  phaseName: string | null;
  projectPhaseId: string | null;
  sortOrder: number;
  visibility: TaskVisibility;
}

/** Tasks for the list view, ordered so each phase group renders by its
 * persisted `sort_order` (with `created_at` as the tiebreaker for the
 * still-unbackfilled rows that all share sort_order 0). Reordering within
 * a phase group renumbers that group's rows in TaskPhaseGroup's server
 * action — see `reorderProjectTasks` in tasks/task-drawer-actions.ts. */
export async function getProjectTasks(projectId: string): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("project_tasks")
    .select(
      "id, ref, title, status, is_critical_path, client_visible_date, due_date, assignee_person_id, project_phase_id, sort_order, visibility, created_at"
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!tasks || tasks.length === 0) return [];

  const personIds = [...new Set(tasks.map((t) => t.assignee_person_id).filter((x): x is string => !!x))];
  const phaseIds = [...new Set(tasks.map((t) => t.project_phase_id).filter((x): x is string => !!x))];

  const [{ data: people }, { data: phases }] = await Promise.all([
    personIds.length ? supabase.from("people").select("id, full_name").in("id", personIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    phaseIds.length ? supabase.from("project_phases").select("id, code, name").in("id", phaseIds) : Promise.resolve({ data: [] as { id: string; code: string; name: string }[] }),
  ]);
  const personById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const phaseById = new Map((phases ?? []).map((p) => [p.id, p]));

  return tasks.map((t) => {
    const phase = t.project_phase_id ? phaseById.get(t.project_phase_id) : undefined;
    return {
      id: t.id,
      ref: t.ref,
      title: t.title,
      status: t.status,
      isCriticalPath: t.is_critical_path,
      clientVisibleDate: t.client_visible_date,
      dueDate: t.due_date,
      assigneeName: t.assignee_person_id ? (personById.get(t.assignee_person_id) ?? "—") : "—",
      phaseCode: phase?.code ?? null,
      phaseName: phase?.name ?? null,
      projectPhaseId: t.project_phase_id,
      sortOrder: t.sort_order,
      visibility: t.visibility,
    };
  });
}

export interface TaskCustomFieldColumn {
  id: string;
  name: string;
  sortOrder: number;
}

/** The extra, admin-defined columns on this project's tasks table (see
 * task_custom_fields / task_custom_field_values in
 * supabase/migrations/0017_task_custom_fields.sql) — free-text only, one
 * value per (task, field). */
export async function getTaskCustomFields(projectId: string): Promise<TaskCustomFieldColumn[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_custom_fields")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  return (data ?? []).map((f) => ({ id: f.id, name: f.name, sortOrder: f.sort_order }));
}

/** Every custom-field value for the given tasks, as taskId -> fieldId ->
 * value, so a table row can look up `values.get(task.id)?.get(field.id)`
 * without an extra query per cell. */
export async function getTaskCustomFieldValues(taskIds: string[]): Promise<Map<string, Map<string, string>>> {
  const result = new Map<string, Map<string, string>>();
  if (taskIds.length === 0) return result;

  const supabase = await createClient();
  const { data } = await supabase
    .from("task_custom_field_values")
    .select("task_id, field_id, value")
    .in("task_id", taskIds);

  for (const row of data ?? []) {
    if (row.value === null) continue;
    const forTask = result.get(row.task_id) ?? new Map<string, string>();
    forTask.set(row.field_id, row.value);
    result.set(row.task_id, forTask);
  }
  return result;
}

export interface TaskDetail {
  id: string;
  projectId: string;
  ref: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  isCriticalPath: boolean;
  clientVisibleDate: string | null;
  dueDate: string | null;
  assigneePersonId: string | null;
  assigneeName: string;
  visibility: TaskVisibility;
  phaseCode: string | null;
  phaseName: string | null;
  sortOrder: number;
}

/** Full detail for the task drawer, fetched by id (the drawer is opened
 * via `?task=<id>` rather than by ref — see tasks/page.tsx). */
export async function getTaskById(taskId: string): Promise<TaskDetail | null> {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("project_tasks")
    .select(
      "id, project_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id, visibility, sort_order, project_phase_id"
    )
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;

  const [{ data: assignee }, { data: phase }] = await Promise.all([
    task.assignee_person_id
      ? supabase.from("people").select("full_name").eq("id", task.assignee_person_id).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string } | null }),
    task.project_phase_id
      ? supabase.from("project_phases").select("code, name").eq("id", task.project_phase_id).maybeSingle()
      : Promise.resolve({ data: null as { code: string; name: string } | null }),
  ]);

  return {
    id: task.id,
    projectId: task.project_id,
    ref: task.ref,
    title: task.title,
    description: task.description,
    status: task.status,
    isCriticalPath: task.is_critical_path,
    clientVisibleDate: task.client_visible_date,
    dueDate: task.due_date,
    assigneePersonId: task.assignee_person_id,
    assigneeName: assignee?.full_name ?? "Unassigned",
    visibility: task.visibility,
    phaseCode: phase?.code ?? null,
    phaseName: phase?.name ?? null,
    sortOrder: task.sort_order,
  };
}

export interface TaskCommentRow {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorInitials: string;
}

export async function getTaskComments(taskId: string): Promise<TaskCommentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_comments")
    .select("id, body, created_at, author_person_id")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (!data || data.length === 0) return [];

  const authorIds = [...new Set(data.map((c) => c.author_person_id).filter((x): x is string => !!x))];
  const { data: people } = authorIds.length
    ? await supabase.from("people").select("id, full_name, avatar_initials").in("id", authorIds)
    : { data: [] as { id: string; full_name: string; avatar_initials: string }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  return data.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    authorName: c.author_person_id ? (byId.get(c.author_person_id)?.full_name ?? "—") : "—",
    authorInitials: c.author_person_id ? (byId.get(c.author_person_id)?.avatar_initials ?? "?") : "?",
  }));
}

export interface TaskActivityRow {
  id: string;
  action: string;
  summary: string;
  actorName: string;
  createdAt: string;
}

/** Reads the task drawer's Activity tab back out of the shared
 * `activity_log` table, filtered to this task. Every write in
 * tasks/task-drawer-actions.ts inserts into this same table via
 * `fn_log_activity`, so this is a real audit trail, not a fake one. */
export async function getTaskActivity(taskId: string): Promise<TaskActivityRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, summary, actor_person_id, created_at")
    .eq("entity_type", "project_tasks")
    .eq("entity_id", taskId)
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return [];

  const actorIds = [...new Set(data.map((a) => a.actor_person_id).filter((x): x is string => !!x))];
  const { data: people } = actorIds.length
    ? await supabase.from("people").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return data.map((a) => ({
    id: a.id,
    action: a.action,
    summary: a.summary,
    actorName: a.actor_person_id ? (nameById.get(a.actor_person_id) ?? "—") : "System",
    createdAt: a.created_at,
  }));
}

export interface WorkspacePersonOption {
  id: string;
  fullName: string;
  avatarInitials: string;
}

/** Internal workspace members for the drawer's assignee picker. */
export async function getWorkspaceInternalPeople(workspaceId: string): Promise<WorkspacePersonOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("people")
    .select("id, full_name, avatar_initials")
    .eq("workspace_id", workspaceId)
    .eq("kind", "internal")
    .order("full_name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, avatarInitials: p.avatar_initials }));
}

export async function getTaskByRef(projectId: string, taskRef: string) {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("project_tasks")
    .select("id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id, project_phase_id")
    .eq("project_id", projectId)
    .ilike("ref", taskRef)
    .maybeSingle();
  if (!task) return null;

  const [{ data: assignee }, { data: phase }] = await Promise.all([
    task.assignee_person_id
      ? supabase.from("people").select("full_name").eq("id", task.assignee_person_id).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string } | null }),
    task.project_phase_id
      ? supabase.from("project_phases").select("code, name").eq("id", task.project_phase_id).maybeSingle()
      : Promise.resolve({ data: null as { code: string; name: string } | null }),
  ]);

  return {
    id: task.id,
    ref: task.ref,
    title: task.title,
    description: task.description,
    status: task.status,
    isCriticalPath: task.is_critical_path,
    clientVisibleDate: task.client_visible_date,
    dueDate: task.due_date,
    assigneeName: assignee?.full_name ?? "—",
    phaseCode: phase?.code ?? null,
    phaseName: phase?.name ?? null,
  };
}

export interface DocumentRow {
  id: string;
  name: string;
  kind: string;
  version: string;
  visibility: string;
  requiresSignature: boolean;
  signedAt: string | null;
}

export async function getProjectDocuments(projectId: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, name, kind, version, visibility, requires_signature, signed_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    version: d.version,
    visibility: d.visibility,
    requiresSignature: d.requires_signature,
    signedAt: d.signed_at,
  }));
}

export interface BaselineRow {
  id: string;
  version: string;
  status: string;
  varianceDays: number | null;
  approvedAt: string | null;
  approvedByName: string;
}

export async function getProjectBaselines(projectId: string): Promise<BaselineRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("baselines")
    .select("id, version, status, variance_days, approved_at, approved_by")
    .eq("project_id", projectId)
    .order("version", { ascending: false });
  const approverIds = [...new Set((data ?? []).map((b) => b.approved_by).filter((x): x is string => !!x))];
  const { data: people } = approverIds.length
    ? await supabase.from("people").select("id, full_name").in("id", approverIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  return (data ?? []).map((b) => ({
    id: b.id,
    version: b.version,
    status: b.status,
    varianceDays: b.variance_days,
    approvedAt: b.approved_at,
    approvedByName: b.approved_by ? (nameById.get(b.approved_by) ?? "—") : "—",
  }));
}

export interface ChangeRequestRow {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  impactDatesDays: number | null;
  impactEffort: string | null;
  impactPrice: string | null;
  status: string;
  raisedFromRef: string | null;
}

export async function getProjectChangeRequests(projectId: string): Promise<ChangeRequestRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("change_requests")
    .select("id, ref, title, description, impact_dates_days, impact_effort, impact_price, status, raised_from_ref")
    .eq("project_id", projectId)
    .order("ref", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    ref: c.ref,
    title: c.title,
    description: c.description,
    impactDatesDays: c.impact_dates_days,
    impactEffort: c.impact_effort,
    impactPrice: c.impact_price,
    status: c.status,
    raisedFromRef: c.raised_from_ref,
  }));
}

export interface ClientUpdateRow {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
  authorName: string;
}

export async function getProjectClientUpdates(projectId: string): Promise<ClientUpdateRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_updates")
    .select("id, title, body, status, published_at, author_person_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const authorIds = [...new Set((data ?? []).map((u) => u.author_person_id).filter((x): x is string => !!x))];
  const { data: people } = authorIds.length
    ? await supabase.from("people").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  return (data ?? []).map((u) => ({
    id: u.id,
    title: u.title,
    body: u.body,
    status: u.status,
    publishedAt: u.published_at,
    authorName: u.author_person_id ? (nameById.get(u.author_person_id) ?? "—") : "—",
  }));
}

export interface ClientViewConfigData {
  id: string;
  fields: Record<string, boolean>;
  publishedAt: string | null;
}

export async function getClientViewConfig(projectId: string): Promise<ClientViewConfigData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_view_configs")
    .select("id, fields, published_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, fields: (data.fields as Record<string, boolean>) ?? {}, publishedAt: data.published_at };
}

export interface ShareLinkRow {
  id: string;
  token: string;
  status: string;
  expiresAt: string | null;
  viewCount: number;
  createdByName: string;
  revokedAt: string | null;
}

export async function getProjectShareLinks(projectId: string): Promise<ShareLinkRow[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("share_links")
    .select("id, token, status, expires_at, created_by, revoked_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (!links || links.length === 0) return [];

  const linkIds = links.map((l) => l.id);
  const creatorIds = [...new Set(links.map((l) => l.created_by).filter((x): x is string => !!x))];
  const [{ data: views }, { data: people }] = await Promise.all([
    supabase.from("share_link_views").select("share_link_id").in("share_link_id", linkIds),
    creatorIds.length
      ? supabase.from("people").select("id, full_name").in("id", creatorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const viewCountByLink = new Map<string, number>();
  for (const v of views ?? []) viewCountByLink.set(v.share_link_id, (viewCountByLink.get(v.share_link_id) ?? 0) + 1);
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return links.map((l) => ({
    id: l.id,
    token: l.token,
    status: l.status,
    expiresAt: l.expires_at,
    viewCount: viewCountByLink.get(l.id) ?? 0,
    createdByName: l.created_by ? (nameById.get(l.created_by) ?? "—") : "—",
    revokedAt: l.revoked_at,
  }));
}

export interface ShareLinkAuditRow {
  viewedAt: string;
  ipCity: string | null;
  ipCountry: string | null;
}

export async function getShareLinkAudit(linkId: string): Promise<ShareLinkAuditRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("share_link_views")
    .select("viewed_at, ip_city, ip_country")
    .eq("share_link_id", linkId)
    .order("viewed_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((v) => ({ viewedAt: v.viewed_at, ipCity: v.ip_city, ipCountry: v.ip_country }));
}
