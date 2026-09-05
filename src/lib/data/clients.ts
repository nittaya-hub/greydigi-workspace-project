import { createClient } from "@/lib/supabase/server";
import type { GateStatus } from "@/lib/supabase/database.types";

export interface ClientRow {
  id: string;
  name: string;
  projectCount: number;
  serviceCount: number;
  hasAtRiskService: boolean;
}

export async function listClients(workspaceId: string): Promise<ClientRow[]> {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).order("name");
  if (!clients || clients.length === 0) return [];

  const clientIds = clients.map((c) => c.id);
  const [{ data: projects }, { data: services }] = await Promise.all([
    supabase.from("projects").select("client_id").in("client_id", clientIds).eq("status", "active"),
    supabase.from("services").select("client_id, health").in("client_id", clientIds),
  ]);

  const projectCountByClient = new Map<string, number>();
  for (const p of projects ?? []) projectCountByClient.set(p.client_id, (projectCountByClient.get(p.client_id) ?? 0) + 1);
  const serviceCountByClient = new Map<string, number>();
  const atRiskByClient = new Map<string, boolean>();
  for (const s of services ?? []) {
    serviceCountByClient.set(s.client_id, (serviceCountByClient.get(s.client_id) ?? 0) + 1);
    if (s.health === "at_risk") atRiskByClient.set(s.client_id, true);
  }

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    projectCount: projectCountByClient.get(c.id) ?? 0,
    serviceCount: serviceCountByClient.get(c.id) ?? 0,
    hasAtRiskService: atRiskByClient.get(c.id) ?? false,
  }));
}

export interface ClientDetail {
  id: string;
  name: string;
  clientSince: string | null;
  hypercareEnabled: boolean;
  projects: {
    ref: string;
    name: string;
    phaseCode: string | null;
    heldGateCode: string | null;
    phases: { code: string; name: string; index: number; started_at: string | null; completed_at: string | null; duration_label: string | null; show_duration_label: boolean }[];
    gates: { code: string; name: string; sequence: number; status: string; target_date: string | null }[];
  }[];
  services: { ref: string; name: string; openIncidents: number }[];
  people: { fullName: string; role: string; hasPortalAccess: boolean }[];
  /** Product releases this client's own projects depend on
   * (project_release_dependencies, 0004_product.sql). Products have no
   * client_id of their own -- they're reusable capabilities, not owned by
   * one client -- so this is the only genuine per-client Product signal:
   * releases a client's delivery work is actually waiting on. */
  releaseDependencies: { projectRef: string; releaseCode: string; releaseName: string; productName: string; status: string }[];
}

export async function getClientById(clientId: string): Promise<ClientDetail | null> {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, client_since, hypercare_enabled")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return null;

  const [{ data: projects }, { data: services }, { data: clientRoles }] = await Promise.all([
    supabase.from("projects").select("id, ref, name").eq("client_id", clientId).eq("status", "active"),
    supabase.from("services").select("id, ref, name").eq("client_id", clientId),
    supabase.from("client_roles").select("person_id, role").eq("client_id", clientId),
  ]);

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: phases } = projectIds.length
    ? await supabase
        .from("project_phases")
        .select("project_id, code, name, index, started_at, completed_at, duration_label, show_duration_label")
        .in("project_id", projectIds)
        .order("index")
    : {
        data: [] as {
          project_id: string;
          code: string;
          name: string;
          index: number;
          started_at: string | null;
          completed_at: string | null;
          duration_label: string | null;
          show_duration_label: boolean;
        }[],
      };
  const { data: gates } = projectIds.length
    ? await supabase
        .from("project_gates")
        .select("project_id, code, name, sequence, status, target_date")
        .in("project_id", projectIds)
    : { data: [] as { project_id: string; code: string; name: string; sequence: number; status: GateStatus; target_date: string | null }[] };

  const currentPhaseByProject = new Map<string, string>();
  const phasesByProject = new Map<string, NonNullable<typeof phases>>();
  for (const p of phases ?? []) {
    if (!p.completed_at && !currentPhaseByProject.has(p.project_id)) currentPhaseByProject.set(p.project_id, p.code);
    const list = phasesByProject.get(p.project_id) ?? [];
    list.push(p);
    phasesByProject.set(p.project_id, list);
  }
  const heldGateByProject = new Map<string, string>();
  const gatesByProject = new Map<string, NonNullable<typeof gates>>();
  for (const g of gates ?? []) {
    if (g.status === "held") heldGateByProject.set(g.project_id, g.code);
    const list = gatesByProject.get(g.project_id) ?? [];
    list.push(g);
    gatesByProject.set(g.project_id, list);
  }

  const serviceIds = (services ?? []).map((s) => s.id);
  const { data: incidents } = serviceIds.length
    ? await supabase.from("incidents").select("service_id").in("service_id", serviceIds).neq("status", "resolved")
    : { data: [] as { service_id: string }[] };
  const openByService = new Map<string, number>();
  for (const i of incidents ?? []) openByService.set(i.service_id, (openByService.get(i.service_id) ?? 0) + 1);

  const refByProject = new Map((projects ?? []).map((p) => [p.id, p.ref]));
  const { data: releaseDeps } = projectIds.length
    ? await supabase.from("project_release_dependencies").select("project_id, release_id").in("project_id", projectIds)
    : { data: [] as { project_id: string; release_id: string }[] };

  const releaseIds = [...new Set((releaseDeps ?? []).map((d) => d.release_id))];
  const { data: releasesForDeps } = releaseIds.length
    ? await supabase.from("releases").select("id, code, name, status, product_id").in("id", releaseIds)
    : { data: [] as { id: string; code: string; name: string; status: string; product_id: string }[] };

  const productIds = [...new Set((releasesForDeps ?? []).map((r) => r.product_id))];
  const { data: productsForDeps } = productIds.length
    ? await supabase.from("products").select("id, name").in("id", productIds)
    : { data: [] as { id: string; name: string }[] };
  const productNameById = new Map((productsForDeps ?? []).map((p) => [p.id, p.name]));
  const releaseById = new Map((releasesForDeps ?? []).map((r) => [r.id, r]));

  const personIds = (clientRoles ?? []).map((r) => r.person_id);
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id, full_name, auth_user_id").in("id", personIds)
    : { data: [] as { id: string; full_name: string; auth_user_id: string | null }[] };
  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  return {
    id: client.id,
    name: client.name,
    clientSince: client.client_since,
    hypercareEnabled: client.hypercare_enabled,
    projects: (projects ?? []).map((p) => ({
      ref: p.ref,
      name: p.name,
      phaseCode: currentPhaseByProject.get(p.id) ?? null,
      heldGateCode: heldGateByProject.get(p.id) ?? null,
      phases: phasesByProject.get(p.id) ?? [],
      gates: gatesByProject.get(p.id) ?? [],
    })),
    services: (services ?? []).map((s) => ({ ref: s.ref, name: s.name, openIncidents: openByService.get(s.id) ?? 0 })),
    people: (clientRoles ?? []).map((r) => {
      const person = personById.get(r.person_id);
      return { fullName: person?.full_name ?? "—", role: r.role.replace(/_/g, " "), hasPortalAccess: !!person?.auth_user_id };
    }),
    releaseDependencies: (releaseDeps ?? []).reduce<ClientDetail["releaseDependencies"]>((acc, dep) => {
      const release = releaseById.get(dep.release_id);
      if (!release) return acc;
      acc.push({
        projectRef: refByProject.get(dep.project_id) ?? "—",
        releaseCode: release.code,
        releaseName: release.name,
        productName: productNameById.get(release.product_id) ?? "—",
        status: release.status,
      });
      return acc;
    }, []),
  };
}
