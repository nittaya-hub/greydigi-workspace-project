"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireWorkspaceAdmin } from "@/lib/data/auth-guard";
import type { WorkspaceRole } from "@/lib/supabase/database.types";

/** Grants or revokes Product-space access via space_roles — the
 * previously-inert table revived as the Product membership grant (see
 * fn_my_product_access() in supabase/migrations/0020_project_membership_rbac.sql
 * and the RLS rewrite in 0022). Product has no client_id to scope by, so
 * unlike Delivery's per-project grant, this is a simple per-space
 * on/off toggle, admin-only. */
export async function toggleProductAccess(personId: string, grant: boolean) {
  await requireWorkspaceAdmin();
  const supabase = await createClient();

  if (grant) {
    const { data: existing } = await supabase
      .from("space_roles")
      .select("id")
      .eq("person_id", personId)
      .eq("space", "product")
      .maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("space_roles").insert({ person_id: personId, space: "product", role: "member" });
      if (error) throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("space_roles").delete().eq("person_id", personId).eq("space", "product");
    if (error) throw new Error(error.message);
  }

  revalidatePath("/people");
  revalidatePath("/settings/permissions");
}

const EDITABLE_ROLES = new Set<WorkspaceRole>(["workspace_admin", "delivery_lead", "product_lead", "hypercare_lead", "member"]);

/** Changes an internal person's workspace_role. Uses the service-role
 * client (bypassing RLS) the same way inviteMember does — `people` has
 * no UPDATE policy at all, since every existing write to it already goes
 * through this same admin-guarded, service-role path rather than RLS. */
export async function updateMemberRole(personId: string, workspaceRole: WorkspaceRole) {
  await requireWorkspaceAdmin();
  if (!EDITABLE_ROLES.has(workspaceRole)) throw new Error("Invalid role.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("people").update({ workspace_role: workspaceRole }).eq("id", personId);
  if (error) throw new Error(error.message);

  revalidatePath("/people");
  revalidatePath("/settings/permissions");
}

/** The active/inactive toggle. A soft flag only for now — see
 * 0029_people_active_flag.sql for why this doesn't yet block sign-in. */
export async function setMemberActive(personId: string, isActive: boolean) {
  await requireWorkspaceAdmin();
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("people").update({ is_active: isActive }).eq("id", personId);
  if (error) throw new Error(error.message);

  revalidatePath("/people");
  revalidatePath("/settings/permissions");
}

/** "Remove" a person: revokes their login (deletes the auth.users account
 * so they can no longer sign in) and marks them inactive, but keeps the
 * `people` row itself — it's referenced by created_by/assignee columns
 * and comments across the schema, so hard-deleting it would either fail
 * FK constraints or silently orphan historical records. This achieves
 * the practical goal ("this person no longer has access") without that
 * risk. */
export async function removeMemberAccess(personId: string) {
  const admin = await requireWorkspaceAdmin();
  if (personId === admin.id) throw new Error("You can't remove your own access.");

  const supabaseAdmin = createAdminClient();
  const { data: person, error: fetchError } = await supabaseAdmin.from("people").select("auth_user_id").eq("id", personId).maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!person) throw new Error("Person not found.");

  if (person.auth_user_id) {
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(person.auth_user_id);
    if (deleteAuthError) throw new Error(deleteAuthError.message);
  }

  const { error } = await supabaseAdmin.from("people").update({ auth_user_id: null, is_active: false }).eq("id", personId);
  if (error) throw new Error(error.message);

  revalidatePath("/people");
  revalidatePath("/settings/permissions");
}
