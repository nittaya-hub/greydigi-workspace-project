import { createClient } from "@/lib/supabase/server";

/** Broadcasts a notification to every internal member of a workspace
 * (minus the actor, so you don't notify yourself of your own edit).
 * Used by every create/delete/toggle/edit action so nothing changes
 * silently — see notifications_insert_internal in
 * supabase/migrations/0011_notifications_rls.sql for the write policy
 * this depends on. `kind` is free text (no enum on the table); keep it
 * short and machine-sortable, e.g. "task_created", "integration_toggled". */
export async function notifyWorkspace(
  workspaceId: string,
  notification: { kind: string; title: string; body?: string; relatedUrl?: string },
  options?: { excludePersonId?: string }
) {
  const supabase = await createClient();

  const { data: people } = await supabase
    .from("people")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("kind", "internal");

  const recipientIds = (people ?? [])
    .map((p) => p.id)
    .filter((id) => id !== options?.excludePersonId);
  if (!recipientIds.length) return;

  await supabase.from("notifications").insert(
    recipientIds.map((personId) => ({
      workspace_id: workspaceId,
      person_id: personId,
      kind: notification.kind,
      title: notification.title,
      body: notification.body ?? null,
      related_url: notification.relatedUrl ?? null,
    }))
  );
}
