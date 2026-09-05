import { createClient } from "@/lib/supabase/server";

export interface PersonWorkItem {
  space: "delivery" | "product";
  ref: string;
  title: string;
  status: string;
  contextName: string;
  href: string;
  dueDate: string | null;
}

export interface PersonProfile {
  id: string;
  fullName: string;
  kind: string;
  workspaceRole: string;
  /** in_progress / waiting_on_client / watch / blocked — actively being worked. */
  current: PersonWorkItem[];
  /** idle — assigned but not started yet, i.e. what's next. */
  next: PersonWorkItem[];
  /** done, most recent first. */
  completed: PersonWorkItem[];
}

const ACTIVE_STATUSES = new Set(["in_progress", "waiting_on_client", "watch", "blocked"]);

/** A person's work across Delivery and Product in one place — the same
 * cross-space idea the Engineering overview summarizes into counts, just
 * expanded into the actual items for one person. Hypercare isn't included:
 * incidents have no assignee column in the schema (only created_by), so
 * there's no real per-person hypercare load to show — matches
 * getEngineeringLoad's hypercareDays, which is hardcoded 0 for the same
 * reason. */
export async function getPersonProfile(personId: string): Promise<PersonProfile | null> {
  const supabase = await createClient();
  const { data: person } = await supabase
    .from("people")
    .select("id, full_name, kind, workspace_role")
    .eq("id", personId)
    .maybeSingle();
  if (!person) return null;

  const [{ data: deliveryTasks }, { data: engTasks }] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("ref, title, status, due_date, project_id, created_at")
      .eq("assignee_person_id", personId)
      .order("created_at", { ascending: false }),
    supabase
      .from("engineering_tasks")
      .select("ref, title, status, release_id, created_at")
      .eq("person_id", personId)
      .order("created_at", { ascending: false }),
  ]);

  const projectIds = [...new Set((deliveryTasks ?? []).map((t) => t.project_id))];
  const { data: projects } = projectIds.length
    ? await supabase.from("projects").select("id, ref, name").in("id", projectIds)
    : { data: [] as { id: string; ref: string; name: string }[] };
  const projectById = new Map((projects ?? []).map((p) => [p.id, p]));

  const releaseIds = [...new Set((engTasks ?? []).map((t) => t.release_id).filter((x): x is string => !!x))];
  const { data: releases } = releaseIds.length
    ? await supabase.from("releases").select("id, code, name").in("id", releaseIds)
    : { data: [] as { id: string; code: string; name: string }[] };
  const releaseById = new Map((releases ?? []).map((r) => [r.id, r]));

  const deliveryItems: PersonWorkItem[] = (deliveryTasks ?? []).map((t) => {
    const project = projectById.get(t.project_id);
    return {
      space: "delivery",
      ref: t.ref,
      title: t.title,
      status: t.status,
      contextName: project ? `${project.ref} · ${project.name}` : "—",
      href: project ? `/delivery/projects/${project.ref.toLowerCase()}/tasks` : "/delivery",
      dueDate: t.due_date,
    };
  });

  const productItems: PersonWorkItem[] = (engTasks ?? []).map((t) => {
    const release = t.release_id ? releaseById.get(t.release_id) : null;
    return {
      space: "product",
      ref: t.ref,
      title: t.title,
      status: t.status,
      contextName: release ? `${release.code} · ${release.name}` : "Unassigned release",
      href: release ? `/product/releases/${release.code.toLowerCase()}` : "/product/engineering",
      dueDate: null,
    };
  });

  const all = [...deliveryItems, ...productItems];

  return {
    id: person.id,
    fullName: person.full_name,
    kind: person.kind,
    workspaceRole: person.workspace_role,
    current: all.filter((i) => ACTIVE_STATUSES.has(i.status)),
    next: all.filter((i) => i.status === "idle"),
    completed: all.filter((i) => i.status === "done"),
  };
}
