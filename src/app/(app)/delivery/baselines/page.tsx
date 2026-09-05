import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";

const COLS = "1fr 96px 1fr 100px";

export default async function BaselinesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const supabase = await createClient();

  const projectIds = projects.map((p) => p.id);
  const { data: baselines } = projectIds.length
    ? await supabase
        .from("baselines")
        .select("id, project_id, version, status, variance_days, approved_at, approved_by")
        .in("project_id", projectIds)
        .order("approved_at", { ascending: false })
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

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="Baselines"
        description="Every baseline across the space. A baseline freezes scope, dates and effort at approval; scope moves only through a signed change request after that."
      />
      <Card>
        {(baselines ?? []).length === 0 ? (
          <EmptyState title="No baselines yet." description="A baseline is approved at G2, once scope and dates are agreed." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>PROJECT</span>
              <span>VER</span>
              <span>APPROVED AND SOURCE</span>
              <span>STATUS</span>
            </TableHead>
            {(baselines ?? []).map((b, i) => {
              const project = projectById.get(b.project_id);
              return (
                <TableRow cols={COLS} key={b.id} last={i === (baselines ?? []).length - 1}>
                  {project ? (
                    <Link href={`/delivery/projects/${project.ref.toLowerCase()}/baselines`} className="min-w-0">
                      <CellStack primary={project.name} secondary={project.ref} />
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                  <span className="font-mono text-[9.5px] text-muted">{b.version}</span>
                  <CellStack
                    primary={b.approved_by ? (nameById.get(b.approved_by) ?? "—") : "—"}
                    secondary={
                      b.approved_at
                        ? `Approved ${b.approved_at}${b.variance_days != null ? `, ${b.variance_days > 0 ? "+" : ""}${b.variance_days}d variance` : ""}`
                        : "Not yet approved"
                    }
                  />
                  <Pill tone={b.status === "approved" ? "done" : b.status === "superseded" ? "idle" : "in_progress"} className="justify-self-start">
                    {b.status.toUpperCase()}
                  </Pill>
                </TableRow>
              );
            })}
          </>
        )}
      </Card>
    </div>
  );
}
