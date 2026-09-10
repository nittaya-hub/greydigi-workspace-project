import { notFound } from "next/navigation";
import { ClientPortalView } from "@/components/portal/ClientPortalView";
import { DashboardPortalView } from "@/components/dashboard/DashboardPortalView";
import { getPortalProject } from "@/lib/data/portal";
import { getDeliveryDashboard } from "@/lib/data/dashboard";
import { getProjectBranding } from "@/lib/data/project";
import { getWorkspaceBranding } from "@/lib/data/branding";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listActiveSubmissionOptions } from "@/lib/data/submission-taxonomies";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";

async function getHypercareEnabled(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).maybeSingle();
  if (!project) return true;
  const { data: client } = await supabase.from("clients").select("hypercare_enabled").eq("id", project.client_id).maybeSingle();
  return client?.hypercare_enabled ?? true;
}

export default async function ClientPortalPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const loaded = await getPortalProject(ref);
  if (!loaded || loaded.result.state !== "ok" || !loaded.result.project) notFound();

  const dashboard = await getDeliveryDashboard(loaded.id);
  if (dashboard.published && dashboard.blocks.length > 0) {
    return <DashboardPortalView title={loaded.result.project.client_name} blocks={dashboard.blocks} data={dashboard.data} />;
  }

  const hypercareEnabled = await getHypercareEnabled(loaded.id);
  const branding = await getProjectBranding(loaded.id);

  const workspaceId = await getCurrentWorkspaceId();
  const kinds: ClientSubmissionKind[] = ["issue", "change_request", "question"];
  const [issueOptions, changeRequestOptions, questionOptions] = workspaceId
    ? await Promise.all(kinds.map((kind) => listActiveSubmissionOptions(workspaceId, kind)))
    : [null, null, null];
  const submissionOptions = { issue: issueOptions, change_request: changeRequestOptions, question: questionOptions };
  const hostBranding = workspaceId ? await getWorkspaceBranding(workspaceId) : null;

  return (
    <ClientPortalView
      result={loaded.result}
      projectRef={ref}
      hypercareEnabled={hypercareEnabled}
      submissionOptions={submissionOptions}
      branding={branding}
      hostLogoDataUrl={hostBranding?.logoDataUrl ?? null}
    />
  );
}
