import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import type { ProjectMemberRole } from "@/lib/supabase/database.types";

export interface ProjectMemberRow {
  id: string;
  personId: string;
  fullName: string;
  avatarInitials: string;
  role: ProjectMemberRole;
  createdAt: string;
}

/** Who's on a project, for the project's Members tab. Internal-workspace
 * read is open to everyone per project_members_read (0020) — only
 * add/remove is admin-gated. */
export async function listProjectMembers(projectId: string): Promise<ProjectMemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("id, person_id, role, created_at, people(full_name, avatar_initials)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((m) => {
    const person = Array.isArray(m.people) ? m.people[0] : m.people;
    return {
      id: m.id,
      personId: m.person_id,
      fullName: person?.full_name ?? "—",
      avatarInitials: person?.avatar_initials ?? "?",
      role: m.role,
      createdAt: m.created_at,
    };
  });
}

/** The signed-in caller's effective role on a project, for UI gating
 * (e.g. hiding the "Add member" button from a plain Member). Mirrors
 * requireProjectAccess's logic but never throws — returns null instead of
 * an error for "no access at all", since a page needs to render an empty
 * state rather than crash. */
export async function getMyProjectRole(projectId: string): Promise<"workspace_admin" | ProjectMemberRole | null> {
  const person = await getCurrentPerson();
  if (!person) return null;
  if (person.workspace_role === "workspace_admin") return "workspace_admin";

  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("person_id", person.id)
    .maybeSingle();

  return data?.role ?? null;
}
