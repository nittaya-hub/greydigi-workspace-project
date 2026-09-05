import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";

const COLS = "72px 1fr 1fr 76px 108px";

const STATUS_TONE: Record<string, "in_progress" | "waiting_on_client" | "done" | "idle"> = {
  draft: "idle",
  raised: "in_progress",
  awaiting_signature: "waiting_on_client",
  approved: "done",
  rejected: "idle",
};

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
  const openCount = (crs ?? []).filter((c) => c.status !== "approved" && c.status !== "rejected").length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="Change requests"
        description="Every CR across the space, naming its impact on dates, effort and price before it can be sent for approval."
      />
      <div className="flex gap-1.5 flex-wrap">
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] bg-ink text-white">
          ALL {(crs ?? []).length}
        </span>
        {openCount > 0 ? (
          <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
            OPEN {openCount}
          </span>
        ) : null}
      </div>
      <Card>
        {(crs ?? []).length === 0 ? (
          <EmptyState title="No change requests raised." description="Scope moves only through a signed change request." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>REF</span>
              <span>PROJECT</span>
              <span>REQUEST AND ORIGIN</span>
              <span>IMPACT</span>
              <span>STATUS</span>
            </TableHead>
            {(crs ?? []).map((c, i) => {
              const project = projectById.get(c.project_id);
              return (
                <TableRow cols={COLS} key={c.id} last={i === (crs ?? []).length - 1}>
                  <span className="font-mono text-[9.5px] text-muted">{c.ref}</span>
                  {project ? (
                    <Link href={`/delivery/projects/${project.ref.toLowerCase()}/change-requests`} className="text-[12.5px] text-ink truncate">
                      {project.ref}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                  <CellStack primary={c.title} secondary={c.raised_from_ref ? `FROM ${c.raised_from_ref}` : c.description ?? undefined} />
                  <span className="font-mono text-[9.5px] text-muted">
                    {c.impact_dates_days != null ? `${c.impact_dates_days > 0 ? "+" : ""}${c.impact_dates_days}d` : "—"}
                  </span>
                  <Pill tone={STATUS_TONE[c.status] ?? "idle"} className="justify-self-start">
                    {c.status.replace(/_/g, " ").toUpperCase()}
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
