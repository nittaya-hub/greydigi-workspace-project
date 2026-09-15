import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";
import { BaselinesWorkspaceTable, type WorkspaceBaselineRow } from "./BaselinesWorkspaceTable";

export default async function BaselinesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const supabase = await createClient();

  const projectIds = projects.map((p) => p.id);
  // created_at, not approved_at -- a draft baseline has no approved_at
  // yet, and Postgres sorts nulls FIRST on a plain `desc` order, so
  // every never-approved draft used to float to the top ahead of
  // baselines that were actually approved recently.
  const { data: baselines } = projectIds.length
    ? await supabase
        .from("baselines")
        .select("id, project_id, version, status, variance_days, approved_at, approved_by, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
    : {
        data: [] as {
          id: string;
          project_id: string;
          version: string;
          status: string;
          variance_days: number | null;
          approved_at: string | null;
          approved_by: string | null;
        }[],
      };

  const approverIds = [...new Set((baselines ?? []).map((b) => b.approved_by).filter((x): x is string => !!x))];
  const { data: people } = approverIds.length
    ? await supabase.from("people").select("id, full_name").in("id", approverIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const rows: WorkspaceBaselineRow[] = (baselines ?? []).map((b) => {
    const project = projectById.get(b.project_id);
    return {
      id: b.id,
      version: b.version,
      status: b.status,
      varianceDays: b.variance_days,
      approvedAt: b.approved_at,
      approverName: b.approved_by ? nameById.get(b.approved_by) ?? "—" : "—",
      projectRef: project?.ref ?? null,
      projectName: project?.name ?? null,
    };
  });

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Baselines"
        description="Every baseline across the space. A baseline freezes scope, dates and effort at approval; scope moves only through a signed change request after that."
      />
      <BaselinesWorkspaceTable baselines={rows} />
    </div>
  );
}
