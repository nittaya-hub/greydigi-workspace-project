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
    .select("id, workspace_id, workspace_role, full_name, email, avatar_initials, avatar_url")
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
    .select("id, workspace_id, workspace_role, full_name, email, avatar_initials, avatar_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return person ?? null;
}

/** Confirms the caller is a workspace_admin, holds the workspace-wide
 * Missions lead role (delivery_lead — display-renamed, enum unchanged),
 * or is this specific project's own assigned lead (projects.lead_
 * person_id). This is the one place that workspace_role actually gates
 * something for a delivery_lead: per the Decision Pack's decision #7,
 * "a lead role should unlock or restrict something a plain member
 * cannot" — before this, the role displayed correctly and unlocked
 * nothing. Used for CR decisions, checkpoint publish, and gate-condition
 * overrides (all previously either ungated or admin-only). */
export async function requireMissionsLead(projectId?: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (person.workspace_role === "workspace_admin" || person.workspace_role === "delivery_lead") return person;

  if (projectId) {
    const supabase = await createClient();
    const { data: project } = await supabase.from("projects").select("lead_person_id").eq("id", projectId).maybeSingle();
    if (project?.lead_person_id === person.id) return person;
  }
  throw new Error("Only this mission's lead or a workspace admin can do this.");
}

/** Same idea for Hangar (product_lead — display-renamed "Hangar lead").
 * No per-product lead assignment exists (products have no lead_person_id
 * column), so this is workspace-wide-role-only, unlike requireMissionsLead. */
export async function requireHangarLead() {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (person.workspace_role === "workspace_admin" || person.workspace_role === "product_lead") return person;
  throw new Error("Only the Hangar lead or a workspace admin can do this.");
}

/** Same idea for Hypercare (hypercare_lead). */
export async function requireHypercareLead() {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (person.workspace_role === "workspace_admin" || person.workspace_role === "hypercare_lead") return person;
  throw new Error("Only the Hypercare lead or a workspace admin can do this.");
}

/** Confirms the signed-in caller can act on the given project at least at
 * `minRole`. A workspace_admin always passes (matches Super Admin's
 * unrestricted reach). Otherwise looks up the caller's `project_members`
 * grant and throws if it's missing or below `minRole`. RLS
 * (fn_my_accessible_project_ids / fn_my_admin_project_ids, see
 * supabase/migrations/0020_project_membership_rbac.sql) is the real
 * backstop — this guard exists so a Server Action can give a clear error
 * message before attempting a write RLS would silently drop anyway. */
export async function requireProjectAccess(projectId: string, minRole: "member" | "project_admin") {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (person.workspace_role === "workspace_admin") return person;

  const supabase = await createClient();
  const { data: grant } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("person_id", person.id)
    .maybeSingle();

  if (!grant) throw new Error("You don't have access to this project.");
  if (minRole === "project_admin" && grant.role !== "project_admin") {
    throw new Error("Only a project admin can do this.");
  }
  return person;
}
