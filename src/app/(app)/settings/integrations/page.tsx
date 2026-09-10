import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { IntegrationRow } from "./IntegrationRow";

export default async function IntegrationsSettingsPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="Integrations" />;

  const workspaceId = await getCurrentWorkspaceId();
  let rows: { id: string; name: string; status: string; connected_at: string | null }[] = [];

  if (workspaceId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("workspace_integrations")
      .select("id, name, status, connected_at")
      .eq("workspace_id", workspaceId)
      .order("name");
    rows = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Integrations"
        description="Connection status per external system. Flips a real workspace record — this app doesn't run an OAuth flow of its own."
      />

      <Card>
        <CardHeader title="Connections" note={`${rows.filter((r) => r.status === "connected").length}/${rows.length} CONNECTED`} />
        {rows.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No integrations configured yet.</div>
        ) : (
          rows.map((r, i) =>
            workspaceId ? (
              <IntegrationRow
                key={r.id}
                workspaceId={workspaceId}
                integrationId={r.id}
                name={r.name}
                connected={r.status === "connected"}
                connectedAt={r.connected_at}
                isLast={i === rows.length - 1}
              />
            ) : null
          )
        )}
      </Card>
    </div>
  );
}
