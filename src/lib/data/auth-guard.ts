import { createClient } from "@/lib/supabase/server";

/** Confirms the signed-in caller is a workspace_admin in the given
 * workspace, returning their `people` row. Throws otherwise — every
 * Server Action that performs a privileged operation (inviting a member,
 * creating auth users) must call this first. RLS is the hard backstop,
 * but admin.* calls run through the service-role client and bypass RLS
 * entirely, so this check is the only thing standing between "signed in"
 * and "can create accounts". */
export async function requireWorkspaceAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: person } = await supabase
    .from("people")
    .select("id, workspace_id, workspace_role, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!person) throw new Error("No matching workspace person for this account.");
  if (person.workspace_role !== "workspace_admin") {
    throw new Error("Only a workspace admin can do this.");
  }

  return person;
}

/** Returns the signed-in caller's `people` row (any role), or null if not
 * signed in / no matching row. Use this for actor fields (created_by,
 * acknowledged_by) on actions that don't need admin-only enforcement —
 * RLS still governs what the write is actually allowed to touch. */
export async function getCurrentPerson() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: person } = await supabase
    .from("people")
    .select("id, workspace_id, workspace_role, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return person ?? null;
}
