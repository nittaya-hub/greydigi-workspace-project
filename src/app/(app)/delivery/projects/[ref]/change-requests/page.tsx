import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getProjectByRef, getProjectChangeRequests } from "@/lib/data/project";
import { RaiseChangeRequestButton } from "./RaiseChangeRequestButton";

const COLS = "66px 1fr 76px 108px";

const STATUS_TONE: Record<string, "in_progress" | "waiting_on_client" | "done" | "idle"> = {
  draft: "idle",
  raised: "in_progress",
  awaiting_signature: "waiting_on_client",
  approved: "done",
  rejected: "idle",
};

export default async function ProjectChangeRequestsPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const crs = await getProjectChangeRequests(project.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          Every CR names its impact on dates, effort and price before it can be sent for approval.
        </p>
        <RaiseChangeRequestButton projectId={project.id} projectRef={project.ref} />
      </div>

      <Card>
        {crs.length === 0 ? (
          <EmptyState
            title="No change requests raised."
            description="Scope is exactly as agreed in the current baseline. Anything outside that needs a CR before work starts."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>REF</span>
              <span>REQUEST AND ORIGIN</span>
              <span>IMPACT</span>
              <span>STATUS</span>
            </TableHead>
            {crs.map((c, i) => (
              <TableRow cols={COLS} key={c.id} last={i === crs.length - 1}>
                <span className="font-mono text-[9.5px] text-muted">{c.ref}</span>
                <CellStack
                  primary={c.title}
                  secondary={c.raisedFromRef ? `FROM ${c.raisedFromRef}` : c.description ?? undefined}
                />
                <span className="font-mono text-[9.5px] text-muted">
                  {c.impactDatesDays != null ? `${c.impactDatesDays > 0 ? "+" : ""}${c.impactDatesDays}d` : "—"}
                </span>
                <Pill tone={STATUS_TONE[c.status] ?? "idle"} className="justify-self-start">
                  {c.status.replace(/_/g, " ").toUpperCase()}
                </Pill>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
