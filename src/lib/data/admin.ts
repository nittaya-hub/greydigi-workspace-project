import { createClient } from "@/lib/supabase/server";

export interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  relatedUrl: string | null;
  actorLabel: string | null;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

async function currentPersonId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: person } = await supabase.from("people").select("id").eq("auth_user_id", user.id).maybeSingle();
  return person?.id ?? null;
}

/** Newest 200, archived included — archiving (separate from is_read,
 * see NotificationRowItem.tsx) used to permanently drop a row out of
 * every view with no way back; it now stays fetched here too, with
 * `isArchived` on each row so NotificationsBoard.tsx can offer an
 * "Archived" filter pill instead of the notification just vanishing
 * the moment someone clicks archive.
 * `limit` defaults to a generous cap for the full /notifications page,
 * which paginates 20 at a time client-side (NotificationsBoard.tsx) —
 * this just bounds how much it ever has to page through. The header
 * bell's own preview (getRecentNotificationsForBell, notifications/
 * actions.ts) calls this with a small limit instead and still excludes
 * archived ones there, since a glanceable dropdown of "done with"
 * items would be pure noise. */
export async function listNotifications(limit = 200): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const personId = await currentPersonId();
  if (!personId) return [];
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, related_url, actor_label, is_read, is_archived, created_at")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    relatedUrl: n.related_url,
    actorLabel: n.actor_label,
    isRead: n.is_read,
    isArchived: n.is_archived,
    createdAt: n.created_at,
  }));
}

export interface MemberRow {
  id: string;
  fullName: string;
  email: string | null;
  kind: string;
  workspaceRole: string;
  clientName: string | null;
  hasPortalAccess: boolean;
  isActive: boolean;
  spaceRoles: Record<string, string>;
}

export async function listMembers(workspaceId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("people")
    .select("id, full_name, email, kind, workspace_role, auth_user_id, is_active")
    .eq("workspace_id", workspaceId)
    .order("full_name");
  if (!people || people.length === 0) return [];

  const personIds = people.map((p) => p.id);
  const [{ data: spaceRoles }, { data: clientRoles }] = await Promise.all([
    supabase.from("space_roles").select("person_id, space, role").in("person_id", personIds),
    supabase.from("client_roles").select("person_id, client_id, role").in("person_id", personIds),
  ]);

  const clientIds = [...new Set((clientRoles ?? []).map((r) => r.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase.from("clients").select("id, name").in("id", clientIds)
    : { data: [] as { id: string; name: string }[] };
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const spaceRolesByPerson = new Map<string, Record<string, string>>();
  for (const r of spaceRoles ?? []) {
    const cur = spaceRolesByPerson.get(r.person_id) ?? {};
    cur[r.space] = r.role;
    spaceRolesByPerson.set(r.person_id, cur);
  }
  const clientRoleByPerson = new Map((clientRoles ?? []).map((r) => [r.person_id, r]));

  return people.map((p) => {
    const clientRole = clientRoleByPerson.get(p.id);
    return {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      kind: p.kind,
      workspaceRole: p.workspace_role,
      clientName: clientRole ? (clientNameById.get(clientRole.client_id) ?? null) : null,
      hasPortalAccess: !!p.auth_user_id,
      isActive: p.is_active,
      spaceRoles: spaceRolesByPerson.get(p.id) ?? {},
    };
  });
}

export interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  actorName: string;
  createdAt: string;
}

/** Fetches up to 500 rows, newest first — the audit page paginates this
 * client-side at 20/page (AuditLogTable.tsx) rather than a DB-level
 * LIMIT/OFFSET per page, since a workspace-admin-only, append-only log is
 * small enough for this scale and it keeps the filter dropdown instant
 * (no round trip per filter change). */
export async function listAuditLog(workspaceId: string): Promise<AuditRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, entity_type, summary, actor_person_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!data || data.length === 0) return [];

  const actorIds = [...new Set(data.map((a) => a.actor_person_id).filter((x): x is string => !!x))];
  const { data: people } = actorIds.length
    ? await supabase.from("people").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return data.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entity_type,
    summary: a.summary,
    actorName: a.actor_person_id ? (nameById.get(a.actor_person_id) ?? "System") : "System",
    createdAt: a.created_at,
  }));
}

export interface SearchResults {
  projects: { ref: string; name: string }[];
  incidents: { ref: string; title: string; severity: string }[];
  documents: { name: string; version: string }[];
  changeRequests: { ref: string; title: string; status: string }[];
}

export async function search(workspaceId: string, q: string): Promise<SearchResults> {
  const supabase = await createClient();
  if (!q.trim()) return { projects: [], incidents: [], documents: [], changeRequests: [] };
  const term = `%${q}%`;

  const { data: projects } = await supabase
    .from("projects")
    .select("ref, name")
    .eq("workspace_id", workspaceId)
    .or(`name.ilike.${term},ref.ilike.${term}`)
    .limit(10);

  const { data: services } = await supabase.from("services").select("id").eq("workspace_id", workspaceId);
  const serviceIds = (services ?? []).map((s) => s.id);
  const { data: incidents } = serviceIds.length
    ? await supabase.from("incidents").select("ref, title, severity").in("service_id", serviceIds).or(`title.ilike.${term},ref.ilike.${term}`).limit(10)
    : { data: [] as { ref: string; title: string; severity: string }[] };

  const { data: documents } = await supabase.from("documents").select("name, version").eq("workspace_id", workspaceId).ilike("name", term).limit(10);

  const { data: projectIdsForCr } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId);
  const projIds = (projectIdsForCr ?? []).map((p) => p.id);
  const { data: crs } = projIds.length
    ? await supabase.from("change_requests").select("ref, title, status").in("project_id", projIds).or(`title.ilike.${term},ref.ilike.${term}`).limit(10)
    : { data: [] as { ref: string; title: string; status: string }[] };

  return {
    projects: projects ?? [],
    incidents: incidents ?? [],
    documents: documents ?? [],
    changeRequests: crs ?? [],
  };
}
