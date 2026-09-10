"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProjectAccess, getCurrentPerson } from "@/lib/data/auth-guard";
import type { ProjectMemberRole } from "@/lib/supabase/database.types";

const VALID_ROLES: readonly ProjectMemberRole[] = ["project_admin", "member"];

/** Grants an existing internal person access to a project. Unlike
 * inviteMember (people/invite/actions.ts) or grantPortalAccess
 * (clients/[id]/actions.ts), this never creates an auth account — every
 * candidate is already an internal workspace member with a login, so this
 * is a plain insert into the narrower grant table, following the same
 * "find existing, then insert into scoping table" shape those two use. */
export async function addProjectMember(projectId: string, projectRef: string, formData: FormData) {
  await requireProjectAccess(projectId, "project_admin");

  const personId = String(formData.get("personId") ?? "").trim();
  if (!personId) throw new Error("Choose a person.");
  const role = String(formData.get("role") ?? "").trim() as ProjectMemberRole;
  if (!VALID_ROLES.includes(role)) throw new Error("Choose a role.");

  const supabase = await createClient();
  const actor = await getCurrentPerson();

  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("person_id", personId)
    .maybeSingle();
  if (existing) throw new Error("That person already has access to this project.");

  const { error } = await supabase.from("project_members").insert({ project_id: projectId, person_id: personId, role });
  if (error) throw new Error(error.message);

  if (actor) {
    const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
    await supabase.from("notifications").insert({
      workspace_id: actor.workspace_id,
      person_id: personId,
      kind: "project_member_added",
      title: `You were added to ${project?.name ?? "a project"}`,
      related_url: `/delivery/projects/${projectRef.toLowerCase()}`,
    });

    await supabase.rpc("fn_log_activity", {
      p_workspace_id: actor.workspace_id,
      p_actor_person_id: actor.id,
      p_space: "delivery",
      p_action: "invite",
      p_entity_type: "project_members",
      p_entity_id: projectId,
      p_summary: `${actor.full_name} added a ${role === "project_admin" ? "project admin" : "member"} to ${project?.name ?? "the project"}`,
      p_metadata: { person_id: personId, role },
    });
  }

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/members`);
}

export async function removeProjectMember(projectId: string, projectRef: string, memberId: string) {
  await requireProjectAccess(projectId, "project_admin");

  const supabase = await createClient();
  const { error } = await supabase.from("project_members").delete().eq("id", memberId).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/members`);
}
