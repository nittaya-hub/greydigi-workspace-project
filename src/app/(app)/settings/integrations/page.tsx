import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { createIntegration } from "../actions";
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

  async function addIntegration(formData: FormData) {
    "use server";
    if (!workspaceId) return;
    await createIntegration(workspaceId, String(formData.get("name") ?? ""));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title="Integrations"
        description="A client's own external systems (their Shopify, their Xero) -- a real workspace record an admin flips by hand once it's genuinely connected, since this app doesn't run an OAuth flow of its own. For what this app's own features call out to (an AI provider, an Agent registry connection), see Settings > Connections instead."
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
        {workspaceId ? (
          <form action={addIntegration} className="flex items-end gap-2 px-4 py-3 border-t border-line-soft">
            <Field label="ADD A SYSTEM THIS CLIENT ACTUALLY USES">
              <input name="name" required className={fieldInputClass} placeholder="e.g. Recurly" />
            </Field>
            <Button variant="secondary" type="submit">
              Add
            </Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
