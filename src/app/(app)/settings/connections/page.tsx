import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { listAgentConnections } from "@/lib/data/agents";
import { AnthropicConnectionCard } from "./AnthropicConnectionCard";
import { AgentConnectionRow } from "./AgentConnectionRow";

export default async function ConnectionsSettingsPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="Connections" />;

  const connections = viewer.workspace_id ? await listAgentConnections(viewer.workspace_id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Connections"
        description="Every system this workspace's own features (not a client's Shopify/Xero — see Integrations for those) actually call out to. Test connection makes a real call, right now, so you know it works before anyone relies on it."
      />

      <Card>
        <CardHeader title="AI provider" note="POWERS AUTO-MAP" />
        <AnthropicConnectionCard configured={!!process.env.ANTHROPIC_API_KEY} />
      </Card>

      <Card>
        <CardHeader title="Agent registry connections" note={`${connections.length} CONFIGURED`} />
        {connections.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">
            No agent connections yet. Create one from Manifest &rsaquo; Agent registry &rsaquo; Connect.
          </div>
        ) : (
          connections.map((c, i) => <AgentConnectionRow key={c.id} connection={c} isLast={i === connections.length - 1} />)
        )}
      </Card>
    </div>
  );
}
