"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import type { TaskStatus, TaskVisibility } from "@/lib/supabase/database.types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Every task mutation is visible from two routes — the per-project tasks
 * tab and the workspace-wide /delivery/tasks view — so both need
 * revalidating together or one of them serves stale data after an edit
 * made from the other. */
function revalidateTaskViews(projectRef: string) {
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/tasks`);
  revalidatePath("/delivery/tasks");
}

/** Every inline-editable field on the task drawer, keyed by its
 * `project_tasks` column name. `updateTaskField` is the one generic
 * writer used by every field except assignee (which has its own
 * notify-the-new-owner side effect) and comments/reorder (separate
 * shapes entirely). */
type EditableField =
  | { field: "title"; value: string }
  | { field: "description"; value: string | null }
  | { field: "due_date"; value: string | null }
  | { field: "client_visible_date"; value: string | null }
  | { field: "status"; value: TaskStatus }
  | { field: "is_critical_path"; value: boolean }
  | { field: "visibility"; value: TaskVisibility };

const FIELD_LABEL: Record<EditableField["field"], string> = {
  title: "title",
  description: "description",
  due_date: "due date",
  client_visible_date: "client-visible date",
  status: "status",
  is_critical_path: "critical path",
  visibility: "visibility",
};

function describeValue(field: EditableField["field"], value: EditableField["value"]): string {
  if (value === null || value === "") return "cleared";
  if (field === "is_critical_path") return value ? "on" : "off";
  if (field === "status") return String(value).replace(/_/g, " ");
  if (field === "description") return "updated";
  return String(value);
}

/** Narrows the update payload per-field so each `.update(...)` call keeps
 * its exact generated column type instead of a widened `Record<string,
 * unknown>` — the Supabase client's `RejectExcessProperties` update type
 * rejects an index-signature payload outright. */
function applyFieldUpdate(supabase: SupabaseServerClient, taskId: string, update: EditableField) {
  switch (update.field) {
    case "title":
      return supabase.from("project_tasks").update({ title: update.value }).eq("id", taskId);
    case "description":
      return supabase.from("project_tasks").update({ description: update.value }).eq("id", taskId);
    case "due_date":
      return supabase.from("project_tasks").update({ due_date: update.value }).eq("id", taskId);
    case "client_visible_date":
      return supabase.from("project_tasks").update({ client_visible_date: update.value }).eq("id", taskId);
    case "status":
      return supabase.from("project_tasks").update({ status: update.value }).eq("id", taskId);
    case "is_critical_path":
      return supabase.from("project_tasks").update({ is_critical_path: update.value }).eq("id", taskId);
    case "visibility":
      return supabase.from("project_tasks").update({ visibility: update.value }).eq("id", taskId);
  }
}

/** Updates one field on a task, logs a real activity_log row via
 * fn_log_activity describing the change, and revalidates the tasks list
 * so the row reflects it without a full reload. This is the writer
 * behind every debounced/immediate autosave in TaskDrawer.tsx. */
export async function updateTaskField(taskId: string, projectRef: string, update: EditableField) {
  const supabase = await createClient();

  const { data: task, error: fetchError } = await supabase
    .from("project_tasks")
    .select("title")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!task) throw new Error("Task not found.");

  const { error } = await applyFieldUpdate(supabase, taskId, update);
  if (error) throw new Error(error.message);

  const actor = await getCurrentPerson();
  if (actor) {
    await supabase.rpc("fn_log_activity", {
      p_workspace_id: actor.workspace_id,
      p_actor_person_id: actor.id,
      p_space: "delivery",
      p_action: "update",
      p_entity_type: "project_tasks",
      p_entity_id: taskId,
      p_summary: `Changed ${FIELD_LABEL[update.field]} to ${describeValue(update.field, update.value)} on "${task.title}"`,
      p_metadata: { field: update.field, value: update.value },
    });
  }

  revalidateTaskViews(projectRef);
}

/** Deletes a task outright — e.g. a stray manual test entry ("test",
 * "edit") left behind while trying out the Tasks tab, which today has no
 * way to be removed once created. Any project member may (project_tasks_
 * internal is `for all`, 0023_emergency_rollback_rls_rewrite.sql) — this
 * is a single row, not the cascading blast radius deleteProject has, so
 * it doesn't need that same workspace-admin gate or type-to-confirm. */
export async function deleteTask(taskId: string, projectRef: string) {
  const supabase = await createClient();

  const { data: task, error: fetchError } = await supabase
    .from("project_tasks")
    .select("title")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!task) throw new Error("Task not found.");

  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);

  const actor = await getCurrentPerson();
  if (actor) {
    await supabase.rpc("fn_log_activity", {
      p_workspace_id: actor.workspace_id,
      p_actor_person_id: actor.id,
      p_space: "delivery",
      p_action: "delete",
      p_entity_type: "project_tasks",
      p_entity_id: taskId,
      p_summary: `Deleted task "${task.title}"`,
      p_metadata: {},
    });
  }

  revalidateTaskViews(projectRef);
}

/** Reassigns a task, logs it, and notifies the newly-assigned person
 * directly (a single targeted `notifications` row, the same shape
 * notifyWorkspace uses internally) rather than broadcasting to everyone. */
export async function updateTaskAssignee(taskId: string, projectRef: string, assigneePersonId: string | null) {
  const supabase = await createClient();

  const { data: task, error: fetchError } = await supabase
    .from("project_tasks")
    .select("title")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!task) throw new Error("Task not found.");

  const { error } = await supabase.from("project_tasks").update({ assignee_person_id: assigneePersonId }).eq("id", taskId);
  if (error) throw new Error(error.message);

  let assigneeName = "Unassigned";
  if (assigneePersonId) {
    const { data: person } = await supabase.from("people").select("full_name").eq("id", assigneePersonId).maybeSingle();
    assigneeName = person?.full_name ?? "—";
  }

  const actor = await getCurrentPerson();
  if (actor) {
    await supabase.rpc("fn_log_activity", {
      p_workspace_id: actor.workspace_id,
      p_actor_person_id: actor.id,
      p_space: "delivery",
      p_action: "update",
      p_entity_type: "project_tasks",
      p_entity_id: taskId,
      p_summary: `Reassigned "${task.title}" to ${assigneeName}`,
      p_metadata: { assignee_person_id: assigneePersonId },
    });

    if (assigneePersonId && assigneePersonId !== actor.id) {
      await supabase.from("notifications").insert({
        workspace_id: actor.workspace_id,
        person_id: assigneePersonId,
        kind: "task_assigned",
        title: `You were assigned "${task.title}"`,
        related_url: `/delivery/projects/${projectRef.toLowerCase()}/tasks?task=${taskId}`,
      });
    }
  }

  revalidateTaskViews(projectRef);
}

/** Flags a task in or out of Phase-1 scope and, when flagging it out of
 * scope, links the change request it rides on. The actual enforcement
 * is a DB trigger (fn_enforce_task_scope_boundary, migration 0058) that
 * refuses this write outright unless change_request_id points at an
 * *approved* change request for this same project -- this action just
 * surfaces that rejection as a normal thrown Error, the same way every
 * other `if (error) throw` here does, so the drawer can show it inline. */
export async function updateTaskScope(taskId: string, projectRef: string, isOutOfScope: boolean, changeRequestId: string | null) {
  const supabase = await createClient();

  const { data: task, error: fetchError } = await supabase
    .from("project_tasks")
    .select("title")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!task) throw new Error("Task not found.");

  const { error } = await supabase
    .from("project_tasks")
    .update({ is_out_of_scope: isOutOfScope, change_request_id: changeRequestId })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  const actor = await getCurrentPerson();
  if (actor) {
    await supabase.rpc("fn_log_activity", {
      p_workspace_id: actor.workspace_id,
      p_actor_person_id: actor.id,
      p_space: "delivery",
      p_action: "update",
      p_entity_type: "project_tasks",
      p_entity_id: taskId,
      p_summary: isOutOfScope
        ? `Flagged "${task.title}" out of scope, linked to a change request`
        : `Marked "${task.title}" back in scope`,
      p_metadata: { is_out_of_scope: isOutOfScope, change_request_id: changeRequestId },
    });
  }

  revalidateTaskViews(projectRef);
}

/** Posts a comment, logs it to the activity feed, and notifies every
 * other internal teammate (not just the assignee — a comment is
 * workspace-visible discussion, so the broader notify makes sense here). */
export async function addTaskComment(taskId: string, projectRef: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment can't be empty.");

  const supabase = await createClient();
  const actor = await getCurrentPerson();
  if (!actor) throw new Error("Not signed in.");

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    author_person_id: actor.id,
    body: trimmed,
  });
  if (error) throw new Error(error.message);

  const { data: task } = await supabase.from("project_tasks").select("title").eq("id", taskId).maybeSingle();

  await supabase.rpc("fn_log_activity", {
    p_workspace_id: actor.workspace_id,
    p_actor_person_id: actor.id,
    p_space: "delivery",
    p_action: "comment",
    p_entity_type: "project_tasks",
    p_entity_id: taskId,
    p_summary: `${actor.full_name} commented on "${task?.title ?? "task"}"`,
    p_metadata: {},
  });

  await notifyWorkspace(
    actor.workspace_id,
    {
      kind: "task_comment_added",
      title: `New comment on "${task?.title ?? "a task"}"`,
      body: trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed,
      relatedUrl: `/delivery/projects/${projectRef.toLowerCase()}/tasks?task=${taskId}`,
    },
    { excludePersonId: actor.id }
  );

  revalidateTaskViews(projectRef);
}

/** Asana-style inline task creation: one title field, Enter to create,
 * no modal. Appends to the end of the given phase group's sort order (or
 * the "Unassigned" bucket when phaseId is null) so it lands where the
 * user was looking, not wherever plain created_at happened to fall. */
export async function createTaskInline(
  projectId: string,
  projectRef: string,
  phaseId: string | null,
  title: string
): Promise<string> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title can't be empty.");

  const supabase = await createClient();
  const actor = await getCurrentPerson();
  if (!actor) throw new Error("Not signed in.");

  const { count } = await supabase
    .from("project_tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const ref = `${projectRef}-T${String((count ?? 0) + 1).padStart(3, "0")}`;

  let topQuery = supabase
    .from("project_tasks")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  topQuery = phaseId ? topQuery.eq("project_phase_id", phaseId) : topQuery.is("project_phase_id", null);
  const { data: top } = await topQuery.maybeSingle();

  const { data: created, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: projectId,
      project_phase_id: phaseId,
      ref,
      title: trimmed,
      sort_order: (top?.sort_order ?? 0) + 10,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create task.");

  await supabase.rpc("fn_log_activity", {
    p_workspace_id: actor.workspace_id,
    p_actor_person_id: actor.id,
    p_space: "delivery",
    p_action: "create",
    p_entity_type: "project_tasks",
    p_entity_id: created.id,
    p_summary: `${actor.full_name} added task "${trimmed}"`,
    p_metadata: {},
  });

  revalidateTaskViews(projectRef);
  return created.id;
}

/** Adds a new configurable column to this project's tasks table — free
 * text only, applies to every task in the project going forward. Column
 * name must be unique per project (task_custom_fields has a unique
 * (project_id, name) constraint). */
export async function addTaskCustomField(projectId: string, projectRef: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Column name can't be empty.");

  const supabase = await createClient();
  const { count } = await supabase
    .from("task_custom_fields")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: created, error } = await supabase
    .from("task_custom_fields")
    .insert({ project_id: projectId, name: trimmed, sort_order: (count ?? 0) + 1 })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not add column.");

  revalidateTaskViews(projectRef);
  return created.id;
}

/** Removes a configurable column from this project's tasks table,
 * along with every task's value in it (task_custom_field_values.field_id
 * is `on delete cascade`, 0017_task_custom_fields.sql) — there's no
 * "empty the column instead" option, since a column with no values left
 * is just a column, not a meaningfully different state. */
export async function deleteTaskCustomField(fieldId: string, projectId: string, projectRef: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("task_custom_fields").delete().eq("id", fieldId).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidateTaskViews(projectRef);
}

/** Sets one cell's value for a custom column, upserting since the first
 * edit for a given (task, field) pair has no row yet. */
export async function setTaskCustomFieldValue(taskId: string, projectRef: string, fieldId: string, value: string) {
  const supabase = await createClient();
  const trimmed = value.trim();

  const { error } = await supabase
    .from("task_custom_field_values")
    .upsert({ task_id: taskId, field_id: fieldId, value: trimmed || null, updated_at: new Date().toISOString() }, { onConflict: "task_id,field_id" });
  if (error) throw new Error(error.message);

  revalidateTaskViews(projectRef);
}

/** Persists the full drop order for one phase group. Every existing row
 * in the group is renumbered (10, 20, 30, ...) so a group that has never
 * been reordered — where every row still carries the default sort_order
 * of 0 — gets backfilled from its current display order on first drag,
 * per the migration note in project_tasks. */
export async function reorderProjectTasks(projectId: string, projectRef: string, orderedTaskIds: string[]) {
  if (orderedTaskIds.length === 0) return;

  const supabase = await createClient();
  const results = await Promise.all(
    orderedTaskIds.map((id, index) =>
      supabase
        .from("project_tasks")
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", id)
        .eq("project_id", projectId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidateTaskViews(projectRef);
}
