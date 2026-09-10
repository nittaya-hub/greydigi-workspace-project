import { createClient } from "@/lib/supabase/server";

/** Broadcasts a notification to every internal member of a workspace
 * (minus the actor, if `excludePersonId` is passed, so an internal
 * person doesn't get notified of their own edit). Used by every
 * create/delete/toggle/edit action so nothing changes silently.
 *
 * Runs as one security-definer round trip (fn_notify_workspace,
 * 0053_notify_workspace_rpc.sql) instead of this function doing its own
 * select-then-insert under the caller's RLS. That used to silently do
 * nothing when the caller wasn't an internal member of the workspace —
 * a real external client submitting through the portal (client-
 * submission-actions.ts's createClientSubmission, reachable by a
 * genuine client-kind person, not just an internal admin testing as
 * one) isn't covered by fn_my_internal_workspace_ids(), so
 * notifications_insert_internal (0011_notifications_rls.sql) rejected
 * the insert and nobody on the team ever found out. `kind` is free text
 * (no enum on the table); keep it short and machine-sortable, e.g.
 * "task_created", "integration_toggled". */
export async function notifyWorkspace(
  workspaceId: string,
  notification: { kind: string; title: string; body?: string; relatedUrl?: string; actorLabel?: string },
  options?: { excludePersonId?: string }
) {
  const supabase = await createClient();
  await supabase.rpc("fn_notify_workspace", {
    p_workspace_id: workspaceId,
    p_kind: notification.kind,
    p_title: notification.title,
    p_body: notification.body ?? null,
    p_related_url: notification.relatedUrl ?? null,
    p_actor_label: notification.actorLabel ?? null,
    p_exclude_person_id: options?.excludePersonId ?? null,
  });
}
