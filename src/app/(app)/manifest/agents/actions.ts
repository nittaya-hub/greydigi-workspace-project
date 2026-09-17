"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { getAgentDeployment, listAgentConnections, type AgentConnectorType } from "@/lib/data/agents";
import { callAgentConnector } from "@/lib/agents/connector";

/** Step 1 of the connect wizard: register (or reuse) the reusable agent
 * definition. This is the "1 definition" half of "1 definition, many
 * deployments" (blueprint section 1) — calling it twice for the same
 * purpose is a product mistake the registry list is meant to make
 * visible, not something this action tries to prevent by itself. */
export async function createAgentDefinition(input: { name: string; purpose: string; taskTemplate: string; ownerPersonId: string | null }) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (!input.name.trim()) throw new Error("Agent name is required.");
  if (!input.purpose.trim()) throw new Error("Purpose is required.");
  if (!input.taskTemplate.trim()) throw new Error("Task template is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_definitions")
    .insert({
      workspace_id: person.workspace_id,
      name: input.name.trim(),
      purpose: input.purpose.trim(),
      task_template: input.taskTemplate.trim(),
      owner_person_id: input.ownerPersonId,
      created_by: person.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/manifest/agents");
  return { id: data.id as string };
}

/** Step 2: a connection record. Deliberately never stores a real secret
 * — `secretRef` is a label for a human ("1Password: prod key"), not a
 * credential. Status starts at `not_configured` and can only become
 * `needs_verification` here; there is no code path in this pass that
 * calls a real endpoint, so nothing can silently move to `verified`
 * without a person saying so by hand once a real adapter exists. */
export async function createAgentConnection(input: {
  name: string;
  connectorType: AgentConnectorType;
  endpointUrl: string | null;
  authMethod: string | null;
  secretRef: string | null;
}) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (!input.name.trim()) throw new Error("Connection name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_connections")
    .insert({
      workspace_id: person.workspace_id,
      name: input.name.trim(),
      connector_type: input.connectorType,
      endpoint_url: input.endpointUrl?.trim() || null,
      auth_method: input.authMethod?.trim() || null,
      secret_ref: input.secretRef?.trim() || null,
      status: "needs_verification",
      created_by: person.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/manifest/agents");
  return { id: data.id as string };
}

export interface DeploymentDraftInput {
  id?: string;
  agentDefinitionId: string;
  connectionId: string | null;
  projectId: string | null;
  scopeDescription: string;
  canRead: boolean;
  canCreateDrafts: boolean;
  canChangeRecords: boolean;
  canPublish: boolean;
  scheduleDescription: string;
  timezone: string;
  ownerPersonId: string | null;
  reviewerPersonId: string | null;
  budgetNote: string;
}

/** Steps 3–5 all write here, as a draft, every time — "saving an
 * incomplete draft should remain possible" (blueprint section 11.6).
 * `can_publish` cannot be set true through this action: publication is
 * "separately granted; disabled for the first trial" per the blueprint's
 * own step-3 table, and there is no reviewed, working publish path for
 * an agent-produced draft yet, so the UI never even shows that toggle as
 * on. Status always stays `draft` here — moving to `ready`/`active`
 * requires a successful task test against a real connector, which this
 * pass doesn't build (see `activateDeployment` below, which enforces
 * exactly that and will always refuse right now). */
export async function saveDeploymentDraft(input: DeploymentDraftInput) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (!input.agentDefinitionId) throw new Error("Choose an agent definition first.");

  const supabase = await createClient();
  const row = {
    workspace_id: person.workspace_id,
    agent_definition_id: input.agentDefinitionId,
    connection_id: input.connectionId,
    project_id: input.projectId,
    scope_description: input.scopeDescription.trim() || null,
    can_read: input.canRead,
    can_create_drafts: input.canCreateDrafts,
    can_change_records: input.canChangeRecords,
    can_publish: false,
    schedule_description: input.scheduleDescription.trim() || null,
    timezone: input.timezone.trim() || null,
    owner_person_id: input.ownerPersonId,
    reviewer_person_id: input.reviewerPersonId,
    budget_note: input.budgetNote.trim() || null,
    status: "draft" as const,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("agent_deployments").update(row).eq("id", input.id).eq("workspace_id", person.workspace_id);
    if (error) throw new Error(error.message);
    revalidatePath("/manifest/agents");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("agent_deployments")
    .insert({ ...row, created_by: person.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/manifest/agents");
  return { id: data.id as string };
}

type ActionResult = { ok: true; message: string } | { ok: false; message: string };

/** Shared setup for both runTaskTest and activateDeployment: resolve the
 * deployment and its connection, and fail with a clear message before
 * ever attempting a real call. Returns a result rather than throwing --
 * a thrown Server Action error that reaches the client through Next's
 * Server Components render path gets its message redacted in a
 * production build (generic "Server Components render" text plus a
 * digest, no way for the button to show the real explanation). */
async function resolveDeploymentAndConnection(deploymentId: string) {
  const person = await getCurrentPerson();
  if (!person) return { ok: false as const, message: "Not signed in." };

  const deployment = await getAgentDeployment(person.workspace_id, deploymentId);
  if (!deployment) return { ok: false as const, message: "Deployment not found." };
  if (!deployment.connectionId) return { ok: false as const, message: "Choose a connection (step 2) before running a test." };

  const connections = await listAgentConnections(person.workspace_id);
  const connection = connections.find((c) => c.id === deployment.connectionId);
  if (!connection) return { ok: false as const, message: "Connection not found." };

  return { ok: true as const, person, deployment, connection };
}

/** The one action every "Run test" / "Activate" button in the wizard
 * ultimately calls. Makes a real HTTPS call to the deployment's own
 * connection (see src/lib/agents/connector.ts) -- an n8n webhook and a
 * plain external API are both just an HTTP endpoint, so there's one
 * call path for either. Marks the connection verified and the
 * deployment "active" only once that call actually succeeds. */
export async function activateDeployment(deploymentId: string): Promise<ActionResult> {
  const resolved = await resolveDeploymentAndConnection(deploymentId);
  if (!resolved.ok) return resolved;
  const { person, deployment, connection } = resolved;

  const result = await callAgentConnector(connection, {
    event: "activate",
    deployment: {
      id: deployment.id,
      scopeDescription: deployment.scopeDescription,
      canRead: deployment.canRead,
      canCreateDrafts: deployment.canCreateDrafts,
      canChangeRecords: deployment.canChangeRecords,
      canPublish: deployment.canPublish,
      scheduleDescription: deployment.scheduleDescription,
    },
    agent: { name: deployment.agentDefinitionName },
  });
  if (!result.ok) return result;

  const supabase = await createClient();
  await supabase.from("agent_connections").update({ status: "verified" }).eq("id", connection.id).eq("workspace_id", person.workspace_id);
  const { error } = await supabase
    .from("agent_deployments")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", deployment.id)
    .eq("workspace_id", person.workspace_id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/manifest/agents");
  return { ok: true, message: `Connector call succeeded (${result.statusSummary}). Deployment is now active.` };
}

/** Same connector call as activateDeployment, for the wizard's "Run
 * test" step — kept separate so a test can be re-run at any time
 * without touching the deployment's own active/paused state, and only
 * moves it to "ready" (not "active") on success. */
export async function runTaskTest(deploymentId: string): Promise<ActionResult> {
  const resolved = await resolveDeploymentAndConnection(deploymentId);
  if (!resolved.ok) return resolved;
  const { person, deployment, connection } = resolved;

  const result = await callAgentConnector(connection, {
    event: "task_test",
    deployment: {
      id: deployment.id,
      scopeDescription: deployment.scopeDescription,
      canRead: deployment.canRead,
      canCreateDrafts: deployment.canCreateDrafts,
      canChangeRecords: deployment.canChangeRecords,
    },
    agent: { name: deployment.agentDefinitionName },
  });
  if (!result.ok) return result;

  const supabase = await createClient();
  await supabase.from("agent_connections").update({ status: "verified" }).eq("id", connection.id).eq("workspace_id", person.workspace_id);
  if (deployment.status === "draft") {
    await supabase
      .from("agent_deployments")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", deployment.id)
      .eq("workspace_id", person.workspace_id);
  }

  revalidatePath("/manifest/agents");
  return { ok: true, message: `Test call succeeded (${result.statusSummary}). Deployment marked "ready" -- Activate to turn it on.` };
}
