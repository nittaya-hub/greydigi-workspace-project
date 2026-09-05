import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSelectedClientId } from "@/lib/data/client-scope";

export interface ShellPerson {
  fullName: string;
  initials: string;
  roleLabel: string;
}

export interface ShellClientOption {
  id: string;
  name: string;
  hypercareEnabled: boolean;
}

export interface ShellData {
  workspaceName: string;
  person: ShellPerson | null;
  /** Master Admin mode when null — every space shows all clients. */
  selectedClient: ShellClientOption | null;
  clientOptions: ShellClientOption[];
  counts: {
    delivery: number;
    product: number;
    hypercare: number;
    hypercareUrgent: number;
    clients: number;
    people: number;
    templates: number;
    unreadNotifications: number;
  };
}

const EMPTY_COUNTS: ShellData["counts"] = {
  delivery: 0,
  product: 0,
  hypercare: 0,
  hypercareUrgent: 0,
  clients: 0,
  people: 0,
  templates: 0,
  unreadNotifications: 0,
};

const EMPTY_SHELL: ShellData = {
  workspaceName: "greydigi workspace",
  person: null,
  selectedClient: null,
  clientOptions: [],
  counts: EMPTY_COUNTS,
};

const ROLE_LABEL: Record<string, string> = {
  workspace_admin: "WORKSPACE ADMIN",
  delivery_lead: "DELIVERY LEAD",
  product_lead: "PRODUCT LEAD",
  hypercare_lead: "HYPERCARE LEAD",
  member: "MEMBER",
  client: "CLIENT",
};

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/**
 * Everything the app shell (sidebar counts, header, avatar, client
 * switcher) needs, fetched once per request. Falls back to empty/default
 * values on any failure — an unconfigured or unreachable Supabase project
 * should render an empty workspace, not crash the shell.
 *
 * Client scoping: when the `selected_client_id` cookie names a client
 * (src/lib/data/client-scope.ts), Delivery and Hypercare counts filter to
 * that client's projects/services. Product stays workspace-wide — it has
 * no client_id in the schema by design (a product is a reusable capability
 * promoted once two client projects need the same thing, not owned by one
 * client), so a client filter there would be fabricated, not real scoping.
 */
export async function getShellData(): Promise<ShellData> {
  if (!isSupabaseConfigured) return EMPTY_SHELL;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return EMPTY_SHELL;

    const { data: person } = await supabase
      .from("people")
      .select("id, full_name, workspace_role, workspace_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!person) return EMPTY_SHELL;

    const [{ data: workspace }, { data: clients }] = await Promise.all([
      supabase.from("workspaces").select("name").eq("id", person.workspace_id).maybeSingle(),
      supabase
        .from("clients")
        .select("id, name, hypercare_enabled")
        .eq("workspace_id", person.workspace_id)
        .order("name"),
    ]);

    const clientOptions: ShellClientOption[] = (clients ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      hypercareEnabled: c.hypercare_enabled,
    }));
    const selectedClientId = await getSelectedClientId();
    const selectedClient = selectedClientId ? (clientOptions.find((c) => c.id === selectedClientId) ?? null) : null;

    let projectsQuery = supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", person.workspace_id)
      .eq("status", "active");
    if (selectedClient) projectsQuery = projectsQuery.eq("client_id", selectedClient.id);

    let servicesQuery = supabase.from("services").select("id").eq("workspace_id", person.workspace_id);
    if (selectedClient) servicesQuery = servicesQuery.eq("client_id", selectedClient.id);
    const { data: scopedServices } = await servicesQuery;
    const serviceIds = (scopedServices ?? []).map((s) => s.id);

    const [
      { count: deliveryCount },
      { count: productCount },
      { count: hypercareCount },
      { count: hypercareUrgentCount },
      { count: clientsCount },
      { count: peopleCount },
      { count: templatesCount },
      { count: unreadCount },
    ] = await Promise.all([
      projectsQuery,
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", person.workspace_id),
      serviceIds.length
        ? supabase
            .from("incidents")
            .select("id", { count: "exact", head: true })
            .in("service_id", serviceIds)
            .neq("status", "resolved")
        : Promise.resolve({ count: 0 }),
      serviceIds.length
        ? supabase
            .from("incidents")
            .select("id", { count: "exact", head: true })
            .in("service_id", serviceIds)
            .eq("severity", "sev1")
            .neq("status", "resolved")
        : Promise.resolve({ count: 0 }),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", person.workspace_id),
      supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", person.workspace_id),
      supabase
        .from("templates")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", person.workspace_id),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("person_id", person.id)
        .eq("is_read", false),
    ]);

    return {
      workspaceName: workspace?.name ?? "greydigi workspace",
      person: {
        fullName: person.full_name,
        initials: initialsFrom(person.full_name),
        roleLabel: ROLE_LABEL[person.workspace_role] ?? person.workspace_role.toUpperCase(),
      },
      selectedClient,
      clientOptions,
      counts: {
        delivery: deliveryCount ?? 0,
        product: productCount ?? 0,
        hypercare: hypercareCount ?? 0,
        hypercareUrgent: hypercareUrgentCount ?? 0,
        clients: clientsCount ?? 0,
        people: peopleCount ?? 0,
        templates: templatesCount ?? 0,
        unreadNotifications: unreadCount ?? 0,
      },
    };
  } catch {
    return EMPTY_SHELL;
  }
}
