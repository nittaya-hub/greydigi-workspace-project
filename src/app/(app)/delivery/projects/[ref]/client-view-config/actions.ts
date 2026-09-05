"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** Publish is explicit — never live. Calls the same fn_publish_client_view
 * the seed script uses, so the published_snapshot P·1 and Q read is always
 * built by the one function, never assembled ad hoc in a route handler. */
export async function publishClientView(projectId: string, projectRef: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: person } = await supabase.from("people").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!person) throw new Error("No matching workspace person for this account.");

  const { error } = await supabase.rpc("fn_publish_client_view", {
    p_project_id: projectId,
    p_published_by: person.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-view-config`);
}

/** Unpublish is explicit and immediate — sets published_at back to null so
 * P·1 (fn_public_share_view) starts returning `not_published` again. Leaves
 * published_snapshot as the last-known snapshot rather than clearing it:
 * simpler, less destructive, and it's already unreachable while
 * published_at is null (fn_public_share_view only ever reads the snapshot,
 * never published_at, but every internal caller gates on published_at —
 * see the badge on this page). Direct table write (not an RPC) because
 * there's no derived projection to rebuild, unlike publish. */
export async function unpublishClientView(projectId: string, projectRef: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) throw new Error("Project not found.");

  const { error } = await supabase
    .from("client_view_configs")
    .update({ published_at: null, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    project.workspace_id,
    {
      kind: "client_view_unpublished",
      title: `Client portal unpublished: ${project.name}`,
      body: `${person.full_name ?? "Someone"} unpublished the client portal for ${project.name}. Public share links will show as not published until it's published again.`,
      relatedUrl: `/delivery/projects/${projectRef.toLowerCase()}/client-view-config`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-view-config`);
}

/** Toggles one section of what the client-facing view can show. Changes
 * only take effect on the next Publish (see publishClientView above) — this
 * only edits the draft `fields`, never the published_snapshot. */
export async function toggleClientViewField(
  projectId: string,
  projectRef: string,
  fieldKey: string,
  nextValue: boolean
) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: project } = await supabase.from("projects").select("workspace_id, name").eq("id", projectId).maybeSingle();
  if (!project) throw new Error("Project not found.");

  const { data: existing } = await supabase
    .from("client_view_configs")
    .select("fields")
    .eq("project_id", projectId)
    .maybeSingle();

  const fields = { ...(existing?.fields as Record<string, boolean> | undefined), [fieldKey]: nextValue };

  const { error } = await supabase
    .from("client_view_configs")
    .upsert({ project_id: projectId, fields }, { onConflict: "project_id" });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    project.workspace_id,
    {
      kind: "client_view_config_edited",
      title: `Client view config edited: ${project.name}`,
      body: `${person?.full_name ?? "Someone"} turned ${fieldKey} ${nextValue ? "on" : "off"} for the client view (not yet published).`,
      relatedUrl: `/delivery/projects/${projectRef.toLowerCase()}/client-view-config`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-view-config`);
}
