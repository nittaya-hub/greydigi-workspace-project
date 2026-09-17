import { createClient } from "@/lib/supabase/server";

export type AgentConnectorType = "external_api" | "n8n_workflow";
export type AgentConnectionStatus = "not_configured" | "needs_verification" | "verified" | "failed";
export type AgentDeploymentStatus = "draft" | "ready" | "active" | "paused" | "retired";

export interface AgentDefinitionRow {
  id: string;
  name: string;
  purpose: string;
  taskTemplate: string;
  ownerPersonId: string | null;
  ownerName: string | null;
  approved: boolean;
  createdAt: string;
  deploymentCount: number;
}

export interface AgentConnectionRow {
  id: string;
  name: string;
  connectorType: AgentConnectorType;
  endpointUrl: string | null;
  authMethod: string | null;
  secretRef: string | null;
  status: AgentConnectionStatus;
  enabled: boolean;
  createdAt: string;
}

export interface AgentDeploymentRow {
  id: string;
  agentDefinitionId: string;
  agentDefinitionName: string;
  connectionId: string | null;
  connectionName: string | null;
  projectId: string | null;
  projectRef: string | null;
  scopeDescription: string | null;
  canRead: boolean;
  canCreateDrafts: boolean;
  canChangeRecords: boolean;
  canPublish: boolean;
  scheduleDescription: string | null;
  timezone: string | null;
  ownerPersonId: string | null;
  ownerName: string | null;
  reviewerPersonId: string | null;
  reviewerName: string | null;
  budgetNote: string | null;
  status: AgentDeploymentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Every registered agent definition, plus how many deployments each one
 * has — the "reuse" signal the registry exists to show: "1 definition,
 * many separately governed deployments," per the blueprint's own framing
 * (section 1). An empty list is the honest state today; nothing here is
 * seeded or invented.
 *
 * Looks up owner names and deployment counts as separate queries rather
 * than an embedded select — the new agent_* tables aren't in a live
 * Supabase project yet (see database.types.ts's own note), so there's no
 * generated foreign-key metadata for postgrest-js to resolve an embed
 * against. Plain follow-up queries need none of that. */
export async function listAgentDefinitions(workspaceId: string): Promise<AgentDefinitionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_definitions")
    .select("id, name, purpose, task_template, owner_person_id, approved, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return [];

  const ownerIds = [...new Set(data.map((d) => d.owner_person_id).filter((id): id is string => !!id))];
  const ownerNameById = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase.from("people").select("id, full_name").in("id", ownerIds);
    for (const o of owners ?? []) ownerNameById.set(o.id, o.full_name);
  }

  const { data: deployments } = await supabase
    .from("agent_deployments")
    .select("agent_definition_id")
    .eq("workspace_id", workspaceId);
  const countByDefinition = new Map<string, number>();
  for (const d of deployments ?? []) {
    countByDefinition.set(d.agent_definition_id, (countByDefinition.get(d.agent_definition_id) ?? 0) + 1);
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    taskTemplate: row.task_template,
    ownerPersonId: row.owner_person_id,
    ownerName: row.owner_person_id ? ownerNameById.get(row.owner_person_id) ?? null : null,
    approved: row.approved,
    createdAt: row.created_at,
    deploymentCount: countByDefinition.get(row.id) ?? 0,
  }));
}

export async function listAgentConnections(workspaceId: string): Promise<AgentConnectionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_connections")
    .select("id, name, connector_type, endpoint_url, auth_method, secret_ref, status, enabled, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    connectorType: c.connector_type,
    endpointUrl: c.endpoint_url,
    authMethod: c.auth_method,
    secretRef: c.secret_ref,
    status: c.status,
    enabled: c.enabled,
    createdAt: c.created_at,
  }));
}

export async function listAgentDeployments(workspaceId: string): Promise<AgentDeploymentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_deployments")
    .select(
      "id, agent_definition_id, connection_id, project_id, scope_description, can_read, can_create_drafts, can_change_records, can_publish, schedule_description, timezone, owner_person_id, reviewer_person_id, budget_note, status, created_at, updated_at"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return [];

  const definitionIds = [...new Set(data.map((d) => d.agent_definition_id))];
  const connectionIds = [...new Set(data.map((d) => d.connection_id).filter((id): id is string => !!id))];
  const projectIds = [...new Set(data.map((d) => d.project_id).filter((id): id is string => !!id))];
  const personIds = [
    ...new Set(
      [...data.map((d) => d.owner_person_id), ...data.map((d) => d.reviewer_person_id)].filter((id): id is string => !!id)
    ),
  ];

  const [definitionsRes, connectionsRes, projectsRes, peopleRes] = await Promise.all([
    definitionIds.length ? supabase.from("agent_definitions").select("id, name").in("id", definitionIds) : Promise.resolve({ data: [] }),
    connectionIds.length ? supabase.from("agent_connections").select("id, name").in("id", connectionIds) : Promise.resolve({ data: [] }),
    projectIds.length ? supabase.from("projects").select("id, ref").in("id", projectIds) : Promise.resolve({ data: [] }),
    personIds.length ? supabase.from("people").select("id, full_name").in("id", personIds) : Promise.resolve({ data: [] }),
  ]);

  const definitionNameById = new Map((definitionsRes.data ?? []).map((d) => [d.id, d.name] as const));
  const connectionNameById = new Map((connectionsRes.data ?? []).map((c) => [c.id, c.name] as const));
  const projectRefById = new Map((projectsRes.data ?? []).map((p) => [p.id, p.ref] as const));
  const personNameById = new Map((peopleRes.data ?? []).map((p) => [p.id, p.full_name] as const));

  return data.map((row) => ({
    id: row.id,
    agentDefinitionId: row.agent_definition_id,
    agentDefinitionName: definitionNameById.get(row.agent_definition_id) ?? "—",
    connectionId: row.connection_id,
    connectionName: row.connection_id ? connectionNameById.get(row.connection_id) ?? null : null,
    projectId: row.project_id,
    projectRef: row.project_id ? projectRefById.get(row.project_id) ?? null : null,
    scopeDescription: row.scope_description,
    canRead: row.can_read,
    canCreateDrafts: row.can_create_drafts,
    canChangeRecords: row.can_change_records,
    canPublish: row.can_publish,
    scheduleDescription: row.schedule_description,
    timezone: row.timezone,
    ownerPersonId: row.owner_person_id,
    ownerName: row.owner_person_id ? personNameById.get(row.owner_person_id) ?? null : null,
    reviewerPersonId: row.reviewer_person_id,
    reviewerName: row.reviewer_person_id ? personNameById.get(row.reviewer_person_id) ?? null : null,
    budgetNote: row.budget_note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getAgentDeployment(workspaceId: string, id: string): Promise<AgentDeploymentRow | null> {
  const rows = await listAgentDeployments(workspaceId);
  return rows.find((r) => r.id === id) ?? null;
}
