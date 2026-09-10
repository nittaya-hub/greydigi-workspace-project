import { notFound } from "next/navigation";
import { Card, StatTile, EmptyState } from "@/components/ui/Card";
import { getProjectByRef, getProjectBaselines } from "@/lib/data/project";
import { createClient } from "@/lib/supabase/server";
import { CreateBaselineButton } from "./CreateBaselineButton";
import { CompareBaselinesButton, type CompareBaselineRow } from "./CompareBaselinesButton";
import { BaselinesTable } from "./BaselinesTable";

export default async function ProjectBaselinesPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const baselines = await getProjectBaselines(project.id);
  const current = baselines.find((b) => b.status === "approved");

  let compareRows: CompareBaselineRow[] = [];
  if (baselines.length >= 2) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("baselines")
      .select("id, version, status, scope_snapshot, dates_snapshot, approved_at, created_at")
      .eq("project_id", project.id)
      .order("version", { ascending: false });
    compareRows = (data ?? []).map((b) => ({
      id: b.id,
      version: b.version,
      status: b.status,
      createdAt: b.created_at,
      approvedAt: b.approved_at,
      scopeSnapshot: b.scope_snapshot,
      datesSnapshot: b.dates_snapshot,
    }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          A baseline freezes scope, dates and effort at approval. Variance is measured against the current approved
          version.
        </p>
        <div className="flex items-center gap-2 flex-none">
          {baselines.length >= 2 ? <CompareBaselinesButton baselines={compareRows} /> : null}
          {baselines.length > 0 ? (
            <CreateBaselineButton projectId={project.id} projectRef={project.ref} label={`Create baseline v${baselines.length + 1}`} />
          ) : null}
        </div>
      </div>

      {baselines.length === 0 ? (
        <Card>
          <EmptyState
            title="No approved baseline yet."
            description="Scope moves only through a change request. Approve a baseline at G2 to start tracking variance."
            action={<CreateBaselineButton projectId={project.id} projectRef={project.ref} />}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatTile label="CURRENT" value={current?.version ?? "—"} note={current?.approvedAt ? `Approved ${current.approvedAt}` : undefined} />
            <StatTile
              label="DATE VARIANCE"
              value={current?.varianceDays != null ? `${current.varianceDays > 0 ? "+" : ""}${current.varianceDays}d` : "—"}
              note="Vs the first approved baseline"
              accent={!!current?.varianceDays}
            />
          </div>
          <BaselinesTable baselines={baselines} projectId={project.id} projectRef={project.ref} />
        </>
      )}
    </div>
  );
}
