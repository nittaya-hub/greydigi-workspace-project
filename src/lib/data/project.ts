import { createClient } from "@/lib/supabase/server";
import type { HealthStatus, TaskStatus, TaskVisibility, TaskCustomFieldType } from "@/lib/supabase/database.types";

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
  leadPersonId: string | null;
  health: HealthStatus;
  progressPct: number;
  phases: {
    id: string;
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
        .select("id, code, name, index, started_at, completed_at, duration_label, show_duration_label")
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
    leadPersonId: project.lead_person_id,
    health: (health as HealthStatus) ?? "on_plan",
    progressPct: (progress as number) ?? 0,
    phases: (phases ?? []).map((p) => ({
      id: p.id,
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

/** Reverse of getProjectByRef's id lookup — needed by cross-project views
 * (e.g. the workspace-wide Tasks page) that only have a task's project id
 * on hand and need the ref to route drawer actions back to the right
 * revalidatePath. */
export async function getProjectRefById(projectId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("ref").eq("id", projectId).maybeSingle();
  return data?.ref ?? null;
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
  assigneePersonId: string | null;
  assigneeAvatarUrl: string | null;
  assigneeInitials: string | null;
  phaseCode: string | null;
  phaseName: string | null;
  projectPhaseId: string | null;
  sortOrder: number;
  visibility: TaskVisibility;
  isOutOfScope: boolean;
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
      "id, ref, title, status, is_critical_path, client_visible_date, due_date, assignee_person_id, project_phase_id, sort_order, visibility, created_at, is_out_of_scope"
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!tasks || tasks.length === 0) return [];

  const personIds = [...new Set(tasks.map((t) => t.assignee_person_id).filter((x): x is string => !!x))];
  const phaseIds = [...new Set(tasks.map((t) => t.project_phase_id).filter((x): x is string => !!x))];

  const [{ data: people }, { data: phases }] = await Promise.all([
    personIds.length
      ? supabase.from("people").select("id, full_name, avatar_url, avatar_initials").in("id", personIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; avatar_url: string | null; avatar_initials: string }[] }),
    phaseIds.length ? supabase.from("project_phases").select("id, code, name").in("id", phaseIds) : Promise.resolve({ data: [] as { id: string; code: string; name: string }[] }),
  ]);
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const phaseById = new Map((phases ?? []).map((p) => [p.id, p]));

  return tasks.map((t) => {
    const phase = t.project_phase_id ? phaseById.get(t.project_phase_id) : undefined;
    const assignee = t.assignee_person_id ? personById.get(t.assignee_person_id) : undefined;
    return {
      id: t.id,
      ref: t.ref,
      title: t.title,
      status: t.status,
      isCriticalPath: t.is_critical_path,
      clientVisibleDate: t.client_visible_date,
      dueDate: t.due_date,
      assigneeName: assignee?.full_name ?? "—",
      assigneePersonId: t.assignee_person_id,
      assigneeAvatarUrl: assignee?.avatar_url ?? null,
      assigneeInitials: assignee?.avatar_initials ?? null,
      phaseCode: phase?.code ?? null,
      phaseName: phase?.name ?? null,
      projectPhaseId: t.project_phase_id,
      sortOrder: t.sort_order,
      visibility: t.visibility,
      isOutOfScope: t.is_out_of_scope,
    };
  });
}

export interface TaskCustomFieldOption {
  id: string;
  label: string;
  colorHex: string;
  sortOrder: number;
}

export interface TaskCustomFieldColumn {
  id: string;
  name: string;
  fieldType: TaskCustomFieldType;
  sortOrder: number;
  options: TaskCustomFieldOption[];
}

/** One custom-field cell's value -- `value` for text/calendar columns,
 * `optionId` for status columns. Never both at once (setting one always
 * clears the other server-side, see setTaskCustomFieldValue/Option). */
export interface TaskCustomFieldValue {
  value: string | null;
  optionId: string | null;
}

/** The extra, admin-defined columns on this project's tasks table (see
 * task_custom_fields / task_custom_field_values in
 * supabase/migrations/0017_task_custom_fields.sql, typed in 0076) --
 * text (free text), calendar (a date), or status (a closed,
 * colour-coded option set, options included here so a table header
 * never needs a second query to render its own dropdown/cells). */
export async function getTaskCustomFields(projectId: string): Promise<TaskCustomFieldColumn[]> {
  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("task_custom_fields")
    .select("id, name, field_type, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");
  if (!fields || fields.length === 0) return [];

  const fieldIds = fields.map((f) => f.id);
  const { data: options } = await supabase
    .from("task_custom_field_options")
    .select("id, field_id, label, color_hex, sort_order")
    .in("field_id", fieldIds)
    .order("sort_order");
  const optionsByField = new Map<string, TaskCustomFieldOption[]>();
  for (const o of options ?? []) {
    const list = optionsByField.get(o.field_id) ?? [];
    list.push({ id: o.id, label: o.label, colorHex: o.color_hex, sortOrder: o.sort_order });
    optionsByField.set(o.field_id, list);
  }

  return fields.map((f) => ({
    id: f.id,
    name: f.name,
    fieldType: f.field_type,
    sortOrder: f.sort_order,
    options: optionsByField.get(f.id) ?? [],
  }));
}

/** Every custom-field value for the given tasks, as taskId -> fieldId ->
 * {value, optionId}, so a table row can look up
 * `values.get(task.id)?.get(field.id)` without an extra query per cell. */
export async function getTaskCustomFieldValues(taskIds: string[]): Promise<Map<string, Map<string, TaskCustomFieldValue>>> {
  const result = new Map<string, Map<string, TaskCustomFieldValue>>();
  if (taskIds.length === 0) return result;

  const supabase = await createClient();
  const { data } = await supabase
    .from("task_custom_field_values")
    .select("task_id, field_id, value, option_id")
    .in("task_id", taskIds);

  for (const row of data ?? []) {
    if (row.value === null && row.option_id === null) continue;
    const forTask = result.get(row.task_id) ?? new Map<string, TaskCustomFieldValue>();
    forTask.set(row.field_id, { value: row.value, optionId: row.option_id });
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
  isOutOfScope: boolean;
  changeRequestId: string | null;
  changeRequestRef: string | null;
}

/** Full detail for the task drawer, fetched by id (the drawer is opened
 * via `?task=<id>` rather than by ref — see tasks/page.tsx). */
export async function getTaskById(taskId: string): Promise<TaskDetail | null> {
  const supabase = await createClient();
  const { data: task } = await supabase
    .from("project_tasks")
    .select(
      "id, project_id, ref, title, description, status, is_critical_path, client_visible_date, due_date, assignee_person_id, visibility, sort_order, project_phase_id, is_out_of_scope, change_request_id"
    )
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;

  const [{ data: assignee }, { data: phase }, { data: changeRequest }] = await Promise.all([
    task.assignee_person_id
      ? supabase.from("people").select("full_name").eq("id", task.assignee_person_id).maybeSingle()
      : Promise.resolve({ data: null as { full_name: string } | null }),
    task.project_phase_id
      ? supabase.from("project_phases").select("code, name").eq("id", task.project_phase_id).maybeSingle()
      : Promise.resolve({ data: null as { code: string; name: string } | null }),
    task.change_request_id
      ? supabase.from("change_requests").select("ref").eq("id", task.change_request_id).maybeSingle()
      : Promise.resolve({ data: null as { ref: string } | null }),
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
    isOutOfScope: task.is_out_of_scope,
    changeRequestId: task.change_request_id,
    changeRequestRef: changeRequest?.ref ?? null,
  };
}

export interface TaskCommentRow {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl: string | null;
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
    ? await supabase.from("people").select("id, full_name, avatar_initials, avatar_url").in("id", authorIds)
    : { data: [] as { id: string; full_name: string; avatar_initials: string; avatar_url: string | null }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  return data.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    authorName: c.author_person_id ? (byId.get(c.author_person_id)?.full_name ?? "—") : "—",
    authorInitials: c.author_person_id ? (byId.get(c.author_person_id)?.avatar_initials ?? "?") : "?",
    authorAvatarUrl: c.author_person_id ? (byId.get(c.author_person_id)?.avatar_url ?? null) : null,
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
  avatarUrl: string | null;
}

/** Internal workspace members for the drawer's assignee picker. */
export async function getWorkspaceInternalPeople(workspaceId: string): Promise<WorkspacePersonOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("people")
    .select("id, full_name, avatar_initials, avatar_url")
    .eq("workspace_id", workspaceId)
    .eq("kind", "internal")
    .order("full_name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, avatarInitials: p.avatar_initials, avatarUrl: p.avatar_url }));
}

/** Every person in the workspace, internal staff and client contacts
 * alike -- unlike getWorkspaceInternalPeople above. Tasks in a real
 * flight plan are genuinely two-sided (e.g. "Continuity cover on the
 * schema" assigned to a client-side owner, matching the checkpoint
 * deck's own "This week / From Nutrition Kitchen" commitments) so the
 * task assignee picker needs both kinds in its option list -- an
 * internal-only list meant a client-assigned task's owner_id couldn't
 * be resolved to a label at all, and Select rendered the raw uuid as
 * its own fallback text instead of a name. */
export async function getWorkspacePeople(workspaceId: string): Promise<WorkspacePersonOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("people")
    .select("id, full_name, avatar_initials, avatar_url")
    .eq("workspace_id", workspaceId)
    .order("full_name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name, avatarInitials: p.avatar_initials, avatarUrl: p.avatar_url }));
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
  storagePath: string | null;
  createdAt: string;
}

export async function getProjectDocuments(projectId: string): Promise<DocumentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, name, kind, version, visibility, requires_signature, signed_at, created_at, file_assets(storage_path)")
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
    storagePath: (Array.isArray(d.file_assets) ? d.file_assets[0] : d.file_assets)?.storage_path ?? null,
    createdAt: d.created_at,
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

// Every row below carries reviewedAt/reviewedByName so the Checkpoint tab
// can show "NEEDS REVIEW" vs "REVIEWED · by X on Y" — the client-facing
// RPCs (fn_client_portal_project, fn_publish_client_view) only select rows
// where reviewed_at is not null, so a freshly typed-in number sits here,
// visible to the team, until someone reviews it. lastUpdatedAt is the most
// recent created_at across a section's rows, for the "last updated" note
// on each card (there's no live upstream system to refresh these from —
// see 0054_checkpoint_sections.sql — so "last updated" means "last time
// someone on the team typed a fresh number in").

export interface ProgressStatRow {
  id: string;
  label: string;
  value: string;
  note: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

async function withReviewerNames<T extends { reviewed_by: string | null }>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: T[]
) {
  const reviewerIds = [...new Set(rows.map((r) => r.reviewed_by).filter((x): x is string => !!x))];
  const { data: people } = reviewerIds.length
    ? await supabase.from("people").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string }[] };
  return new Map((people ?? []).map((p) => [p.id, p.full_name]));
}

export async function getProjectProgressStats(projectId: string): Promise<ProgressStatRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_progress_stats")
    .select("id, label, value, note, reviewed_at, reviewed_by")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const nameById = await withReviewerNames(supabase, rows);
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    value: r.value,
    note: r.note,
    reviewedAt: r.reviewed_at,
    reviewedByName: r.reviewed_by ? (nameById.get(r.reviewed_by) ?? "—") : null,
  }));
}

export interface DecisionRow {
  id: string;
  title: string;
  detail: string | null;
  owner: string | null;
  dueLabel: string | null;
  status: "open" | "closed";
  reviewedAt: string | null;
  reviewedByName: string | null;
}

export async function getProjectDecisions(projectId: string): Promise<DecisionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_decisions")
    .select("id, title, detail, owner, due_label, status, reviewed_at, reviewed_by")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const nameById = await withReviewerNames(supabase, rows);
  return rows.map((d) => ({
    id: d.id,
    title: d.title,
    detail: d.detail,
    owner: d.owner,
    dueLabel: d.due_label,
    status: d.status,
    reviewedAt: d.reviewed_at,
    reviewedByName: d.reviewed_by ? (nameById.get(d.reviewed_by) ?? "—") : null,
  }));
}

export interface WeeklyCommitmentRow {
  id: string;
  periodLabel: string;
  ownerLabel: string;
  items: string[];
  accent: boolean;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

export async function getProjectWeeklyCommitments(projectId: string): Promise<WeeklyCommitmentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_weekly_commitments")
    .select("id, period_label, owner_label, items, accent, reviewed_at, reviewed_by")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const nameById = await withReviewerNames(supabase, rows);
  return rows.map((c) => ({
    id: c.id,
    periodLabel: c.period_label,
    ownerLabel: c.owner_label,
    items: Array.isArray(c.items) ? (c.items as string[]) : [],
    accent: c.accent,
    reviewedAt: c.reviewed_at,
    reviewedByName: c.reviewed_by ? (nameById.get(c.reviewed_by) ?? "—") : null,
  }));
}

export interface BaselineMeasureRow {
  id: string;
  measureName: string;
  todayValue: string;
  afterValue: string;
  baselinedWhen: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
}

export async function getProjectBaselineMeasures(projectId: string): Promise<BaselineMeasureRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_baseline_measures")
    .select("id, measure_name, today_value, after_value, baselined_when, reviewed_at, reviewed_by")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const nameById = await withReviewerNames(supabase, rows);
  return rows.map((m) => ({
    id: m.id,
    measureName: m.measure_name,
    todayValue: m.today_value,
    afterValue: m.after_value,
    baselinedWhen: m.baselined_when,
    reviewedAt: m.reviewed_at,
    reviewedByName: m.reviewed_by ? (nameById.get(m.reviewed_by) ?? "—") : null,
  }));
}

export interface CheckpointSourceFileRow {
  id: string;
  fileAssetId: string;
  storagePath: string;
  originalName: string;
  uploadedByName: string | null;
  createdAt: string;
}

/** Source decks (PDF/PNG) a person has uploaded against this mission's
 * Checkpoint data tab -- kept alongside the numbers they were read from.
 * Reads the real file via delivery-documents (0034's bucket) using
 * file_assets.storage_path, same as Missions' Documents tab. */
export async function getCheckpointSourceFiles(projectId: string): Promise<CheckpointSourceFileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkpoint_source_files")
    .select("id, file_asset_id, uploaded_by, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const fileAssetIds = [...new Set(rows.map((r) => r.file_asset_id))];
  const uploaderIds = [...new Set(rows.map((r) => r.uploaded_by).filter((x): x is string => !!x))];
  const [{ data: assets }, { data: uploaders }] = await Promise.all([
    supabase.from("file_assets").select("id, storage_path, original_name").in("id", fileAssetIds),
    uploaderIds.length
      ? supabase.from("people").select("id, full_name").in("id", uploaderIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const assetById = new Map((assets ?? []).map((a) => [a.id, a] as const));
  const nameById = new Map((uploaders ?? []).map((p) => [p.id, p.full_name] as const));

  return rows.map((r) => {
    const asset = assetById.get(r.file_asset_id);
    return {
      id: r.id,
      fileAssetId: r.file_asset_id,
      storagePath: asset?.storage_path ?? "",
      originalName: asset?.original_name ?? "Untitled file",
      uploadedByName: r.uploaded_by ? nameById.get(r.uploaded_by) ?? null : null,
      createdAt: r.created_at,
    };
  });
}

export interface TimelineStatusOption {
  id: string;
  label: string;
  colorHex: string;
  style: "filled" | "outline";
  sortOrder: number;
}

export interface TimelineRow {
  id: string;
  label: string;
  sortOrder: number;
  visible: boolean;
  reviewedAt: string | null;
  reviewedByName: string | null;
  /** Indexed 0..weekCount-1 — the assigned status id for that week, or
   * null for a blank cell. Always weekCount long, so the UI never has
   * to guess whether a week is simply unset. */
  cells: (string | null)[];
}

export interface ProjectTimelineData {
  weekCount: number;
  week1StartDate: string | null;
  statuses: TimelineStatusOption[];
  rows: TimelineRow[];
}

/** The hand-curated Gantt on the Checkpoint data tab (deck page 4) --
 * deliberately separate from src/lib/timeline/gantt.ts's auto-derived
 * one (Overview tab, client portal), which stays real-task-only by
 * design. Nothing here is seeded automatically: an empty statuses list
 * means a person hasn't set up this project's colour palette yet (see
 * seedDefaultTimelineStatuses in checkpoint/actions.ts) -- a plain data
 * read should never have the side effect of inserting rows. */
export async function getProjectTimeline(projectId: string): Promise<ProjectTimelineData> {
  const supabase = await createClient();

  const [{ data: settings }, { data: statusRows }, { data: rowRows }] = await Promise.all([
    supabase.from("project_timeline_settings").select("week_count, week1_start_date").eq("project_id", projectId).maybeSingle(),
    supabase.from("project_timeline_statuses").select("id, label, color_hex, style, sort_order").eq("project_id", projectId).order("sort_order"),
    supabase
      .from("project_timeline_rows")
      .select("id, label, sort_order, visible, reviewed_at, reviewed_by")
      .eq("project_id", projectId)
      .order("sort_order"),
  ]);

  const weekCount = settings?.week_count ?? 10;
  const statuses: TimelineStatusOption[] = (statusRows ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    colorHex: s.color_hex,
    style: s.style,
    sortOrder: s.sort_order,
  }));

  const rows = rowRows ?? [];
  const reviewerIds = [...new Set(rows.map((r) => r.reviewed_by).filter((x): x is string => !!x))];
  const { data: reviewers } = reviewerIds.length
    ? await supabase.from("people").select("id, full_name").in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const reviewerNameById = new Map((reviewers ?? []).map((p) => [p.id, p.full_name] as const));

  const rowIds = rows.map((r) => r.id);
  const { data: cellRows } = rowIds.length
    ? await supabase.from("project_timeline_cells").select("row_id, week_index, status_id").in("row_id", rowIds)
    : { data: [] as { row_id: string; week_index: number; status_id: string | null }[] };
  const cellsByRow = new Map<string, (string | null)[]>();
  for (const r of rows) cellsByRow.set(r.id, new Array(weekCount).fill(null));
  for (const c of cellRows ?? []) {
    const arr = cellsByRow.get(c.row_id);
    if (arr && c.week_index < weekCount) arr[c.week_index] = c.status_id;
  }

  return {
    weekCount,
    week1StartDate: settings?.week1_start_date ?? null,
    statuses,
    rows: rows.map((r) => ({
      id: r.id,
      label: r.label,
      sortOrder: r.sort_order,
      visible: r.visible,
      reviewedAt: r.reviewed_at,
      reviewedByName: r.reviewed_by ? reviewerNameById.get(r.reviewed_by) ?? null : null,
      cells: cellsByRow.get(r.id) ?? new Array(weekCount).fill(null),
    })),
  };
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

export interface ProjectBranding {
  logoDataUrl: string | null;
  logoFilename: string | null;
  accentColor: string | null;
  welcomeHeadline: string | null;
  /** Overrides the client name shown next to the client logo in the
   * portal header — null means the caller should fall back to the
   * client's real name (this function has no client_name to fall back
   * to itself, only the override row). */
  clientDisplayName: string | null;
  /** Whether the portal header shows that name at all, or just the
   * logo. Defaults true (matches the column's own DB default) so an
   * existing project with no branding row keeps showing the name it
   * always has. */
  showClientName: boolean;
}

const EMPTY_PROJECT_BRANDING: ProjectBranding = {
  logoDataUrl: null,
  logoFilename: null,
  accentColor: null,
  welcomeHeadline: null,
  clientDisplayName: null,
  showClientName: true,
};

/** A project's own logo/accent color/welcome headline/display-name
 * override, shown instead of greydigi's defaults on its client portal.
 * Unset (the common case) means the portal renders exactly as it always
 * has -- nothing here ever changes the app's own default look, only an
 * explicit per-project override applied inline on the portal page's own
 * root element (see ClientPortalView.tsx). */
export async function getProjectBranding(projectId: string): Promise<ProjectBranding> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_branding")
    .select("logo_data_url, logo_filename, accent_color, welcome_headline, client_display_name, show_client_name")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!data) return EMPTY_PROJECT_BRANDING;
  return {
    logoDataUrl: data.logo_data_url,
    logoFilename: data.logo_filename,
    accentColor: data.accent_color,
    welcomeHeadline: data.welcome_headline,
    clientDisplayName: data.client_display_name,
    showClientName: data.show_client_name,
  };
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
