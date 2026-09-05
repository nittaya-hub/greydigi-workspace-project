import { createClient } from "@/lib/supabase/server";
import type { ServiceHealth } from "@/lib/supabase/database.types";

export interface HypercareOverview {
  activeIncidents: number;
  sev1Count: number;
  sev3Count: number;
  slaAtRisk: number;
  servicesLive: number;
  clientCount: number;
  requestBacklog: number;
  closestToBreach: { ref: string; title: string; serviceName: string; severity: string; breachAt: string | null; openedAt: string; ownerName: string; clientProject: string } | null;
  serviceHealth: { ref: string; name: string; health: ServiceHealth; note: string }[];
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

function formatDuration(minutes: number) {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${minutes < 0 ? "-" : ""}${h}h ${m.toString().padStart(2, "0")}m`;
}

export { formatDuration, minutesUntil };

export async function getHypercareOverview(workspaceId: string, clientId?: string | null): Promise<HypercareOverview> {
  const supabase = await createClient();

  let servicesQuery = supabase.from("services").select("id, ref, name, health, client_id").eq("workspace_id", workspaceId);
  if (clientId) servicesQuery = servicesQuery.eq("client_id", clientId);
  const { data: services } = await servicesQuery;
  const serviceIds = (services ?? []).map((s) => s.id);
  const serviceById = new Map((services ?? []).map((s) => [s.id, s]));

  const [{ data: incidents }, { data: requests }, { count: clientCount }] = await Promise.all([
    serviceIds.length
      ? supabase.from("incidents").select("id, ref, title, severity, breach_at, opened_at, service_id").in("service_id", serviceIds).neq("status", "resolved")
      : Promise.resolve({ data: [] as { id: string; ref: string; title: string; severity: string; breach_at: string | null; opened_at: string; service_id: string }[] }),
    serviceIds.length
      ? supabase.from("support_requests").select("id, status").in("service_id", serviceIds)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const withBreach = (incidents ?? []).filter((i) => i.breach_at).sort((a, b) => new Date(a.breach_at!).getTime() - new Date(b.breach_at!).getTime());
  const closest = withBreach[0];
  const service = closest ? serviceById.get(closest.service_id) : null;

  return {
    activeIncidents: incidents?.length ?? 0,
    sev1Count: (incidents ?? []).filter((i) => i.severity === "sev1").length,
    sev3Count: (incidents ?? []).filter((i) => i.severity === "sev3").length,
    slaAtRisk: (incidents ?? []).filter((i) => i.breach_at && minutesUntil(i.breach_at) < 6 * 60 && minutesUntil(i.breach_at) > 0).length,
    servicesLive: services?.length ?? 0,
    clientCount: clientCount ?? 0,
    requestBacklog: (requests ?? []).filter((r) => r.status !== "done").length,
    closestToBreach: closest
      ? {
          ref: closest.ref,
          title: closest.title,
          serviceName: service?.name ?? "—",
          severity: closest.severity,
          breachAt: closest.breach_at,
          openedAt: closest.opened_at,
          ownerName: "—",
          clientProject: service?.ref ?? "",
        }
      : null,
    serviceHealth: (services ?? [])
      .slice()
      .sort((a, b) => {
        const order: Record<string, number> = { at_risk: 0, watch: 1, healthy: 2 };
        return order[a.health] - order[b.health];
      })
      .map((s) => ({
        ref: s.ref,
        name: s.name,
        health: s.health,
        note: `${(incidents ?? []).filter((i) => i.service_id === s.id).length} open incident${(incidents ?? []).filter((i) => i.service_id === s.id).length === 1 ? "" : "s"}`,
      })),
  };
}

export interface ServiceRow {
  id: string;
  ref: string;
  name: string;
  health: ServiceHealth;
  liveSince: string | null;
  originProjectRef: string | null;
  slaName: string | null;
  openCount: number;
}

export async function listServices(workspaceId: string, clientId?: string | null): Promise<ServiceRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("services")
    .select("id, ref, name, health, live_since, origin_project_id")
    .eq("workspace_id", workspaceId);
  if (clientId) query = query.eq("client_id", clientId);
  const { data: services } = await query;
  if (!services || services.length === 0) return [];

  const serviceIds = services.map((s) => s.id);
  const originIds = [...new Set(services.map((s) => s.origin_project_id).filter((x): x is string => !!x))];

  const [{ data: policies }, { data: incidents }, { data: origins }] = await Promise.all([
    supabase.from("sla_policies").select("service_id, name").in("service_id", serviceIds),
    supabase.from("incidents").select("service_id").in("service_id", serviceIds).neq("status", "resolved"),
    originIds.length ? supabase.from("projects").select("id, ref").in("id", originIds) : Promise.resolve({ data: [] as { id: string; ref: string }[] }),
  ]);
  const policyByService = new Map((policies ?? []).map((p) => [p.service_id, p.name]));
  const originRefById = new Map((origins ?? []).map((o) => [o.id, o.ref]));
  const openCountByService = new Map<string, number>();
  for (const i of incidents ?? []) openCountByService.set(i.service_id, (openCountByService.get(i.service_id) ?? 0) + 1);

  return services.map((s) => ({
    id: s.id,
    ref: s.ref,
    name: s.name,
    health: s.health,
    liveSince: s.live_since,
    originProjectRef: s.origin_project_id ? (originRefById.get(s.origin_project_id) ?? null) : null,
    slaName: policyByService.get(s.id) ?? null,
    openCount: openCountByService.get(s.id) ?? 0,
  }));
}

export interface ServiceDetail {
  id: string;
  ref: string;
  name: string;
  clientName: string;
  liveSince: string | null;
  health: ServiceHealth;
  slaPolicy: { name: string; responseMinutes: number; resolveMinutes: number } | null;
  openIncidents: number;
}

export async function getServiceByRef(ref: string): Promise<ServiceDetail | null> {
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, ref, name, client_id, live_since, health")
    .ilike("ref", ref)
    .maybeSingle();
  if (!service) return null;

  const [{ data: client }, { data: policy }, { count: openIncidents }] = await Promise.all([
    supabase.from("clients").select("name").eq("id", service.client_id).maybeSingle(),
    supabase.from("sla_policies").select("name, response_target_minutes, resolve_target_minutes").eq("service_id", service.id).maybeSingle(),
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("service_id", service.id).neq("status", "resolved"),
  ]);

  return {
    id: service.id,
    ref: service.ref,
    name: service.name,
    clientName: client?.name ?? "—",
    liveSince: service.live_since,
    health: service.health,
    slaPolicy: policy ? { name: policy.name, responseMinutes: policy.response_target_minutes, resolveMinutes: policy.resolve_target_minutes } : null,
    openIncidents: openIncidents ?? 0,
  };
}

export interface IncidentRow {
  id: string;
  ref: string;
  title: string;
  severity: string;
  status: string;
  serviceName: string;
  breachAt: string | null;
  resolvedAt: string | null;
}

export async function listIncidents(workspaceId: string, clientId?: string | null): Promise<IncidentRow[]> {
  const supabase = await createClient();
  let servicesQuery = supabase.from("services").select("id, name").eq("workspace_id", workspaceId);
  if (clientId) servicesQuery = servicesQuery.eq("client_id", clientId);
  const { data: services } = await servicesQuery;
  const serviceIds = (services ?? []).map((s) => s.id);
  if (serviceIds.length === 0) return [];
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, ref, title, severity, status, service_id, breach_at, resolved_at")
    .in("service_id", serviceIds)
    .order("breach_at", { ascending: true, nullsFirst: false });

  return (incidents ?? []).map((i) => ({
    id: i.id,
    ref: i.ref,
    title: i.title,
    severity: i.severity,
    status: i.status,
    serviceName: serviceNameById.get(i.service_id) ?? "—",
    breachAt: i.breach_at,
    resolvedAt: i.resolved_at,
  }));
}

export interface IncidentDetail {
  id: string;
  ref: string;
  title: string;
  severity: string;
  status: string;
  serviceName: string;
  serviceRef: string;
  clientName: string;
  openedAt: string;
  breachAt: string | null;
  resolvedAt: string | null;
  rootCause: string | null;
}

export async function getIncidentByRef(ref: string): Promise<IncidentDetail | null> {
  const supabase = await createClient();
  const { data: incident } = await supabase
    .from("incidents")
    .select("id, ref, title, severity, status, service_id, opened_at, breach_at, resolved_at, root_cause")
    .ilike("ref", ref)
    .maybeSingle();
  if (!incident) return null;

  const { data: service } = await supabase.from("services").select("ref, name, client_id").eq("id", incident.service_id).maybeSingle();
  const { data: client } = service ? await supabase.from("clients").select("name").eq("id", service.client_id).maybeSingle() : { data: null };

  return {
    id: incident.id,
    ref: incident.ref,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    serviceName: service?.name ?? "—",
    serviceRef: service?.ref ?? "",
    clientName: client?.name ?? "—",
    openedAt: incident.opened_at,
    breachAt: incident.breach_at,
    resolvedAt: incident.resolved_at,
    rootCause: incident.root_cause,
  };
}

export interface RequestRow {
  id: string;
  ref: string;
  title: string;
  status: string;
  serviceName: string;
  openedAt: string;
}

export async function listRequests(workspaceId: string, clientId?: string | null): Promise<RequestRow[]> {
  const supabase = await createClient();
  let servicesQuery = supabase.from("services").select("id, name").eq("workspace_id", workspaceId);
  if (clientId) servicesQuery = servicesQuery.eq("client_id", clientId);
  const { data: services } = await servicesQuery;
  const serviceIds = (services ?? []).map((s) => s.id);
  if (serviceIds.length === 0) return [];
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  const { data: requests } = await supabase
    .from("support_requests")
    .select("id, ref, title, status, service_id, opened_at")
    .in("service_id", serviceIds)
    .order("opened_at", { ascending: true });

  return (requests ?? []).map((r) => ({
    id: r.id,
    ref: r.ref,
    title: r.title,
    status: r.status,
    serviceName: serviceNameById.get(r.service_id) ?? "—",
    openedAt: r.opened_at,
  }));
}

export interface SlaData {
  policies: { name: string; responseMinutes: number; resolveMinutes: number; serviceCount: number }[];
  metPct: number | null;
  servicePerformance: { name: string; metPct: number }[];
}

export async function getSlaData(workspaceId: string, clientId?: string | null): Promise<SlaData> {
  const supabase = await createClient();
  let servicesQuery = supabase.from("services").select("id, name").eq("workspace_id", workspaceId);
  if (clientId) servicesQuery = servicesQuery.eq("client_id", clientId);
  const { data: services } = await servicesQuery;
  const serviceIds = (services ?? []).map((s) => s.id);
  if (serviceIds.length === 0) return { policies: [], metPct: null, servicePerformance: [] };
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  const [{ data: policies }, { data: resolvedIncidents }] = await Promise.all([
    supabase.from("sla_policies").select("service_id, name, response_target_minutes, resolve_target_minutes").in("service_id", serviceIds),
    supabase.from("incidents").select("service_id, opened_at, resolved_at, breach_at, status").in("service_id", serviceIds).eq("status", "resolved"),
  ]);

  const policyGroups = new Map<string, { responseMinutes: number; resolveMinutes: number; count: number }>();
  for (const p of policies ?? []) {
    const cur = policyGroups.get(p.name) ?? { responseMinutes: p.response_target_minutes, resolveMinutes: p.resolve_target_minutes, count: 0 };
    cur.count++;
    policyGroups.set(p.name, cur);
  }

  const metByService = new Map<string, { met: number; total: number }>();
  let totalMet = 0;
  let total = 0;
  for (const inc of resolvedIncidents ?? []) {
    const cur = metByService.get(inc.service_id) ?? { met: 0, total: 0 };
    cur.total++;
    total++;
    const met = !inc.breach_at || (inc.resolved_at && new Date(inc.resolved_at) <= new Date(inc.breach_at));
    if (met) {
      cur.met++;
      totalMet++;
    }
    metByService.set(inc.service_id, cur);
  }

  return {
    policies: [...policyGroups.entries()].map(([name, v]) => ({ name, responseMinutes: v.responseMinutes, resolveMinutes: v.resolveMinutes, serviceCount: v.count })),
    metPct: total > 0 ? Math.round((totalMet / total) * 100) : null,
    servicePerformance: [...metByService.entries()].map(([serviceId, v]) => ({
      name: serviceNameById.get(serviceId) ?? "—",
      metPct: Math.round((v.met / v.total) * 100),
    })),
  };
}

export interface RepeatPatternRow {
  incidentRef: string;
  incidentTitle: string;
  targetLabel: string;
  targetKind: "change_request" | "roadmap_item";
}

export async function listRepeatPatterns(workspaceId: string): Promise<RepeatPatternRow[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("cross_space_links")
    .select("from_id, to_type, to_id")
    .eq("workspace_id", workspaceId)
    .eq("from_type", "incident")
    .in("relationship", ["hypercare_to_delivery_change_request", "hypercare_to_product_feature"]);
  if (!links || links.length === 0) return [];

  const incidentIds = [...new Set(links.map((l) => l.from_id))];
  const { data: incidents } = await supabase.from("incidents").select("id, ref, title").in("id", incidentIds);
  const incidentById = new Map((incidents ?? []).map((i) => [i.id, i]));

  const results: RepeatPatternRow[] = [];
  for (const link of links) {
    const incident = incidentById.get(link.from_id);
    if (!incident) continue;
    if (link.to_type === "change_request") {
      const { data: cr } = await supabase.from("change_requests").select("ref").eq("id", link.to_id).maybeSingle();
      if (cr) results.push({ incidentRef: incident.ref, incidentTitle: incident.title, targetLabel: `Raised ${cr.ref}`, targetKind: "change_request" });
    } else if (link.to_type === "roadmap_item") {
      const { data: item } = await supabase.from("roadmap_items").select("ref, status").eq("id", link.to_id).maybeSingle();
      if (item) results.push({ incidentRef: incident.ref, incidentTitle: incident.title, targetLabel: `${item.ref} ${item.status.replace(/_/g, " ")}`, targetKind: "roadmap_item" });
    }
  }
  return results;
}

export interface EscalationRow {
  id: string;
  reason: string;
  status: string;
  incidentRef: string | null;
  serviceName: string;
  escalatedToName: string;
}

export async function listEscalations(workspaceId: string, clientId?: string | null): Promise<EscalationRow[]> {
  const supabase = await createClient();
  const { data: escalations } = await supabase
    .from("escalations")
    .select("id, reason, status, incident_id, service_id, escalated_to_person_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "open");
  if (!escalations || escalations.length === 0) return [];

  let scopedEscalations = escalations;
  if (clientId) {
    const { data: clientServices } = await supabase.from("services").select("id").eq("client_id", clientId);
    const clientServiceIds = new Set((clientServices ?? []).map((s) => s.id));
    scopedEscalations = escalations.filter((e) => clientServiceIds.has(e.service_id));
    if (scopedEscalations.length === 0) return [];
  }

  const serviceIds = [...new Set(scopedEscalations.map((e) => e.service_id))];
  const incidentIds = [...new Set(escalations.map((e) => e.incident_id).filter((x): x is string => !!x))];
  const personIds = [...new Set(escalations.map((e) => e.escalated_to_person_id).filter((x): x is string => !!x))];

  const [{ data: services }, { data: incidents }, { data: people }] = await Promise.all([
    supabase.from("services").select("id, name").in("id", serviceIds),
    incidentIds.length ? supabase.from("incidents").select("id, ref").in("id", incidentIds) : Promise.resolve({ data: [] as { id: string; ref: string }[] }),
    personIds.length ? supabase.from("people").select("id, full_name").in("id", personIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const incidentRefById = new Map((incidents ?? []).map((i) => [i.id, i.ref]));
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return scopedEscalations.map((e) => ({
    id: e.id,
    reason: e.reason,
    status: e.status,
    incidentRef: e.incident_id ? (incidentRefById.get(e.incident_id) ?? null) : null,
    serviceName: serviceNameById.get(e.service_id) ?? "—",
    escalatedToName: e.escalated_to_person_id ? (nameById.get(e.escalated_to_person_id) ?? "—") : "—",
  }));
}
