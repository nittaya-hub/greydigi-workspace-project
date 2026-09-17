"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceAdmin } from "@/lib/data/auth-guard";
import { listAgentConnections } from "@/lib/data/agents";
import { callAgentConnector } from "@/lib/agents/connector";

type TestResult = { ok: true; message: string } | { ok: false; message: string };

/** A real ping, not a stored flag -- makes one minimal, cheap call to
 * Anthropic to confirm ANTHROPIC_API_KEY actually works, the same key
 * "Run auto-map" on Checkpoint data reads. Never echoes the key itself
 * back to the client, only whether the call succeeded. */
export async function testAnthropicConnection(): Promise<TestResult> {
  await requireWorkspaceAdmin();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, message: "ANTHROPIC_API_KEY isn't set on this deployment yet. Add it, then test again." };
  }

  try {
    const client = new Anthropic({ apiKey });
    const started = Date.now();
    await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    });
    return { ok: true, message: `Connected -- got a real response in ${Date.now() - started}ms.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? `Key rejected or unreachable: ${err.message}` : "Key rejected or unreachable." };
  }
}

/** Pings one Agent registry connection directly -- the same HTTP call
 * runTaskTest makes from inside a deployment, but without needing a
 * deployment or task template first, so an admin can confirm a
 * connection works the moment it's created. Updates the connection's
 * own status on the outcome. */
export async function testAgentConnectionRow(connectionId: string): Promise<TestResult> {
  const person = await requireWorkspaceAdmin();
  const connections = await listAgentConnections(person.workspace_id);
  const connection = connections.find((c) => c.id === connectionId);
  if (!connection) return { ok: false, message: "Connection not found." };
  if (!connection.enabled) return { ok: false, message: "This connection is disabled -- enable it first." };

  const result = await callAgentConnector(connection, { event: "connection_test" });

  const supabase = await createClient();
  await supabase
    .from("agent_connections")
    .update({ status: result.ok ? "verified" : "failed" })
    .eq("id", connectionId)
    .eq("workspace_id", person.workspace_id);
  revalidatePath("/settings/connections");
  revalidatePath("/manifest/agents");

  if (!result.ok) return result;
  return { ok: true, message: `Connected -- ${result.statusSummary}.` };
}

export async function toggleAgentConnectionEnabled(connectionId: string, enabled: boolean) {
  const person = await requireWorkspaceAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_connections")
    .update({ enabled })
    .eq("id", connectionId)
    .eq("workspace_id", person.workspace_id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/connections");
  revalidatePath("/manifest/agents");
}
