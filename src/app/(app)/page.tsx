import { PageHeading, Card } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";
import { CreateProjectButton } from "@/app/(app)/delivery/projects/CreateProjectButton";
import { getCreateProjectOptions } from "@/app/(app)/delivery/projects/create-project-data";
import { WorkspaceOverviewMain } from "@/components/dashboard/WorkspaceOverviewMain";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";

export default async function WorkspaceOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
        <PageHeading
          title="Workspace"
          description="Three spaces read the same client, person and project records. Every number names its source and its formula."
        />
        <Card className="p-5">
          <p className="text-[12.5px] text-muted max-w-[60ch]">
            Not signed in, or this workspace has no data yet. Sign in as a workspace member to see the real
            portfolio here, or apply <code className="font-mono text-[11px]">supabase/seed.sql</code> to your
            project for a populated demo (see <code className="font-mono text-[11px]">supabase/README.md</code>).
          </p>
        </Card>
      </div>
    );
  }

  const selectedClientId = await getSelectedClientId();
  let selectedClientName: string | null = null;
  const supabase = await createClient();
  if (selectedClientId) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", selectedClientId).maybeSingle();
    selectedClientName = client?.name ?? null;
  }
  const { data: workspaceRow } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  const workspaceName = workspaceRow?.name ?? "Workspace";

  const createProjectOptions = selectedClientName ? null : await getCreateProjectOptions(workspaceId);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title={selectedClientName ? `${selectedClientName} Overview` : `${workspaceName} Dashboard`}
          description={
            selectedClientName
              ? "Three spaces read the same client, person and project records. Every number names its source and its formula."
              : "Overview of everything, split by category — every project, every client."
          }
        />
        <div className="flex gap-1.5 flex-none">
          <ExportPdfButton
            href="/pdf"
            fallbackFilename={`workspace-overview-${new Date().toISOString().slice(0, 10)}.pdf`}
            allowOrientationChoice
          />
          {selectedClientName || !createProjectOptions ? null : (
            // Master dashboard, no client selected yet — "Create project"
            // matches the actual flow here (add the client, then come
            // back to start their first project for them). "Create
            // phase" stays the label once you're inside a client's own
            // Delivery context, where you're adding another phase to an
            // engagement that already exists.
            <CreateProjectButton options={createProjectOptions} triggerLabel="Create project" />
          )}
        </div>
      </div>

      <WorkspaceOverviewMain workspaceId={workspaceId} selectedClientId={selectedClientId} />
    </div>
  );
}
