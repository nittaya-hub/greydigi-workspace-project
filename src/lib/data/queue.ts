import { createClient } from "@/lib/supabase/server";

export type QueueItemSpace = "missions" | "hypercare";
export type QueueItemKind = "task" | "incident" | "request" | "service_change";

export interface QueueItem {
  id: string;
  kind: QueueItemKind;
  space: QueueItemSpace;
  ref: string;
  title: string;
  contextLabel: string;
  href: string;
  /** ISO date/datetime this item is due or breaches by — the sort key.
   * null sorts last, same convention as everywhere else this schema
   * sorts by an optional date. */
  urgentAt: string | null;
  overdue: boolean;
  statusLabel: string;
}

/** "One queue per person across missions and services" (blueprint wave
 * 4.2) — everything currently assigned to one person, regardless of
 * which cockpit it lives in, sorted so whatever is overdue or breaching
 * soonest sits at the top. Deliberately just the queue itself: no
 * "protected capacity" or "interrupt discipline" here — neither source
 * document specifies a concrete rule for either (a WIP limit? reserved
 * hours?), so this doesn't invent one. That judgement stays with the
 * person looking at their own list, same as the service-change escape
 * valve already leaves the effort-threshold call to a human. */
export async function getMyQueue(personId: string): Promise<QueueItem[]> {
  const supabase = await createClient();
  const now = Date.now();

  const [tasksRes, incidentsRes, requestsRes, changesRes] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id, ref, title, status, due_date, project_id")
      .eq("assignee_person_id", personId)
      .not("status", "in", "(done)"),
    supabase
      .from("incidents")
      .select("id, ref, title, severity, status, breach_at, service_id")
      .eq("assigned_person_id", personId)
      .neq("status", "resolved"),
    supabase
      .from("support_requests")
      .select("id, ref, title, status, opened_at, service_id")
      .eq("assigned_person_id", personId)
      .neq("status", "done"),
    supabase
      .from("service_changes")
      .select("id, title, status, effort_band, service_id")
      .eq("assigned_person_id", personId)
      .eq("status", "open"),
  ]);

  const projectIds = [...new Set((tasksRes.data ?? []).map((t) => t.project_id))];
  const serviceIds = [
    ...new Set(
      [...(incidentsRes.data ?? []).map((i) => i.service_id), ...(requestsRes.data ?? []).map((r) => r.service_id), ...(changesRes.data ?? []).map((c) => c.service_id)]
    ),
  ];

  const [projectsRes, servicesRes] = await Promise.all([
    projectIds.length ? supabase.from("projects").select("id, ref").in("id", projectIds) : Promise.resolve({ data: [] }),
    serviceIds.length ? supabase.from("services").select("id, ref, name").in("id", serviceIds) : Promise.resolve({ data: [] }),
  ]);
  const projectRefById = new Map((projectsRes.data ?? []).map((p) => [p.id, p.ref] as const));
  const serviceById = new Map((servicesRes.data ?? []).map((s) => [s.id, s] as const));

  const items: QueueItem[] = [];

  for (const t of tasksRes.data ?? []) {
    const projectRef = projectRefById.get(t.project_id) ?? "—";
    items.push({
      id: t.id,
      kind: "task",
      space: "missions",
      ref: t.ref,
      title: t.title,
      contextLabel: `Missions · ${projectRef}`,
      href: `/missions/projects/${projectRef.toLowerCase()}/tasks/${t.ref}`,
      urgentAt: t.due_date,
      overdue: !!t.due_date && new Date(t.due_date).getTime() < now,
      statusLabel: t.status.replace(/_/g, " "),
    });
  }

  for (const i of incidentsRes.data ?? []) {
    const service = serviceById.get(i.service_id);
    items.push({
      id: i.id,
      kind: "incident",
      space: "hypercare",
      ref: i.ref,
      title: i.title,
      contextLabel: `Hypercare · ${service?.name ?? "—"} · ${i.severity.toUpperCase()}`,
      href: `/hypercare/incidents/${i.ref}`,
      urgentAt: i.breach_at,
      overdue: !!i.breach_at && new Date(i.breach_at).getTime() < now,
      statusLabel: i.status.replace(/_/g, " "),
    });
  }

  for (const r of requestsRes.data ?? []) {
    const service = serviceById.get(r.service_id);
    items.push({
      id: r.id,
      kind: "request",
      space: "hypercare",
      ref: r.ref,
      title: r.title,
      contextLabel: `Hypercare · ${service?.name ?? "—"}`,
      href: `/hypercare/requests`,
      urgentAt: null,
      overdue: false,
      statusLabel: r.status.replace(/_/g, " "),
    });
  }

  for (const c of changesRes.data ?? []) {
    const service = serviceById.get(c.service_id);
    items.push({
      id: c.id,
      kind: "service_change",
      space: "hypercare",
      ref: service?.ref ?? "—",
      title: c.title,
      contextLabel: `Hypercare · ${service?.name ?? "—"} · ${c.effort_band ?? "no estimate"}`,
      href: `/hypercare/services/${(service?.ref ?? "").toLowerCase()}`,
      urgentAt: null,
      overdue: false,
      statusLabel: c.status,
    });
  }

  items.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (a.urgentAt && b.urgentAt) return new Date(a.urgentAt).getTime() - new Date(b.urgentAt).getTime();
    if (a.urgentAt) return -1;
    if (b.urgentAt) return 1;
    return 0;
  });

  return items;
}
