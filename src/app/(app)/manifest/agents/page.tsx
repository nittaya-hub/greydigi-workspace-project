import Link from "next/link";
import { Card, CardHeader, PageHeading, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listAgentDefinitions, listAgentConnections, listAgentDeployments } from "@/lib/data/agents";

/** "What can we reuse?" — the registry answers that with one row per
 * agent definition and a live deployment count, per the blueprint's own
 * spec (section 12.1). Everything on this page is real data from
 * agent_definitions/agent_connections/agent_deployments (0066_agent_
 * registry.sql) — there is no seeded example row, so a workspace that
 * hasn't connected anything yet correctly shows empty states rather
 * than a demo that could be mistaken for a real deployment. */
export default async function AgentsRegistryPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [definitions, connections, deployments] = await Promise.all([
    workspaceId ? listAgentDefinitions(workspaceId) : Promise.resolve([]),
    workspaceId ? listAgentConnections(workspaceId) : Promise.resolve([]),
    workspaceId ? listAgentDeployments(workspaceId) : Promise.resolve([]),
  ]);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeading
          title="Agents"
          description="One reusable agent definition, many separately governed deployments. Nothing here can call a real provider yet — see the note below."
        />
        <Link href="/manifest/agents/connect">
          <Button variant="coral">Connect agent</Button>
        </Link>
      </div>

      <Card className="border-coral/40 bg-coral/[0.04]">
        <div className="px-4 py-3.5 flex flex-col gap-1">
          <p className="text-[11.5px] font-semibold text-ink">Integration required — by design, for now</p>
          <p className="text-[11.5px] text-muted leading-[1.55]">
            You can register an agent, set up a connection record, scope a deployment to a mission, and save it all as a draft. Running a real
            task test or activating a deployment is intentionally disabled everywhere in this cockpit until a real agent/provider is chosen and
            someone is named to pay for its usage — so nothing here can incur a real cost.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Agent definitions" note={`${definitions.length} REGISTERED`} />
        {definitions.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState title="No agents registered yet" description="Start the connect wizard to register your first reusable agent definition." />
          </div>
        ) : (
          <div className="px-4 pb-3.5 flex flex-col gap-2">
            {definitions.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-b border-line-soft last:border-b-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[12.5px] font-semibold text-ink">{d.name}</span>
                  <span className="text-[11px] text-muted truncate">{d.purpose}</span>
                </div>
                <span className="flex items-center gap-2 flex-none">
                  <span className="font-mono text-[9.5px] text-muted-2">{d.ownerName ?? "no owner"}</span>
                  <Pill tone={d.deploymentCount > 0 ? "in_progress" : "idle"}>
                    {d.deploymentCount} deployment{d.deploymentCount === 1 ? "" : "s"}
                  </Pill>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Connections" note={`${connections.length} CONFIGURED`} />
        {connections.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState title="No connections yet" description="A connection is where an agent actually runs — set one up from the connect wizard." />
          </div>
        ) : (
          <div className="px-4 pb-3.5 flex flex-col gap-2">
            {connections.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-line-soft last:border-b-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[12.5px] font-semibold text-ink">{c.name}</span>
                  <span className="font-mono text-[10px] text-muted truncate">{c.endpointUrl ?? "no endpoint set"}</span>
                </div>
                <span className="flex items-center gap-2 flex-none">
                  <span className="font-mono text-[9.5px] text-muted-2 uppercase">{c.connectorType.replace("_", " ")}</span>
                  <Pill tone={c.status === "verified" ? "done" : c.status === "failed" ? "blocked" : "idle"}>{c.status.replace("_", " ")}</Pill>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Deployments" note={`${deployments.length} TOTAL, ALL DRAFT UNTIL A CONNECTOR IS BUILT`} />
        {deployments.length === 0 ? (
          <div className="px-4 pb-4">
            <EmptyState title="No deployments yet" description="A deployment is one agent, scoped to one mission or client — created in step 3 of the wizard." />
          </div>
        ) : (
          <div className="px-4 pb-3.5 flex flex-col gap-2">
            {deployments.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-b border-line-soft last:border-b-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[12.5px] font-semibold text-ink">{d.agentDefinitionName}</span>
                  <span className="text-[11px] text-muted truncate">{d.scopeDescription ?? "no scope description"}</span>
                </div>
                <span className="flex items-center gap-2 flex-none">
                  <span className="font-mono text-[9.5px] text-muted-2">{d.projectRef ?? "no mission linked"}</span>
                  <Pill tone="idle">{d.status}</Pill>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
