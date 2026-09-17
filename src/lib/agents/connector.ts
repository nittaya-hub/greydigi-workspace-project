import { withTimeout } from "@/lib/withTimeout";
import type { AgentConnectionRow } from "@/lib/data/agents";

export type ConnectorCallResult = { ok: true; statusSummary: string } | { ok: false; message: string };

/** The one place that actually reaches an external agent. `external_api`
 * and `n8n_workflow` both resolve to a plain HTTPS POST -- an n8n
 * webhook is just an HTTP endpoint like any other -- so there is one
 * call path, not two. `secretRef` on the connection is an environment
 * variable NAME (never a stored secret -- see ConnectWizard's own
 * copy): resolved here, at call time, from this deployment's own
 * environment, so the actual credential only ever needs to exist where
 * whoever runs this app already manages secrets (e.g. Vercel project
 * settings), never in the database. Capped at 10s via withTimeout so a
 * hung external endpoint can't leave a button spinning forever. */
export async function callAgentConnector(connection: AgentConnectionRow, payload: unknown): Promise<ConnectorCallResult> {
  if (!connection.endpointUrl) {
    return { ok: false, message: "This connection has no endpoint URL configured yet -- add one on step 2 before testing." };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (connection.secretRef) {
    const secretValue = process.env[connection.secretRef];
    if (!secretValue) {
      return {
        ok: false,
        message: `Integration required: this connection's secret ("${connection.secretRef}") isn't set as an environment variable on this deployment yet. Add it, then retry.`,
      };
    }
    const method = (connection.authMethod ?? "").toLowerCase();
    if (method.includes("basic")) headers.Authorization = `Basic ${Buffer.from(secretValue).toString("base64")}`;
    else if (method.includes("header") || method.includes("api key") || method.includes("api-key")) headers["X-Api-Key"] = secretValue;
    else headers.Authorization = `Bearer ${secretValue}`;
  }

  let response: Response;
  try {
    response = await withTimeout(fetch(connection.endpointUrl, { method: "POST", headers, body: JSON.stringify(payload) }), 10_000);
  } catch (err) {
    return { ok: false, message: `Couldn't reach the connector: ${err instanceof Error ? err.message : "unknown error"}.` };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return { ok: false, message: `The connector responded with HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : "."}` };
  }
  return { ok: true, statusSummary: `HTTP ${response.status}` };
}
