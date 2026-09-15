import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";
import { ChangeRequestsWorkspaceTable, type WorkspaceChangeRequestRow } from "./ChangeRequestsWorkspaceTable";

export default async function ChangeRequestsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const supabase = await createClient();

  const projectIds = projects.map((p) => p.id);
  const { data: crs } = projectIds.length
    ? await supabase
        .from("change_requests")
        .select("id, project_id, ref, title, description, impact_dates_days, status, raised_from_ref, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
    : {
        data: [] as {
          id: string;
          project_id: string;
          ref: string;
          title: string;
          description: string | null;
          impact_dates_days: number | null;
          status: string;
          raised_from_ref: string | null;
        }[],
      };

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const rows: WorkspaceChangeRequestRow[] = (crs ?? []).map((c) => ({
    id: c.id,
    ref: c.ref,
    title: c.title,
    description: c.description,
    impact_dates_days: c.impact_dates_days,
    status: c.status,
    raised_from_ref: c.raised_from_ref,
    projectRef: projectById.get(c.project_id)?.ref ?? null,
  }));

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Change requests"
        description="Every CR across the space, naming its impact on dates, effort and price before it can be sent for approval."
      />
      <ChangeRequestsWorkspaceTable crs={rows} />
    </div>
  );
}
