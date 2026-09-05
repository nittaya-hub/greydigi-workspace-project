import Link from "next/link";
import { PageHeading, Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { HealthPill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { getCreateProjectOptions } from "./create-project-data";
import { CreateProjectButton } from "./CreateProjectButton";
import { ExportProjectsButton } from "./ExportProjectsButton";

const COLS = "74px 1fr 132px 92px 132px 104px";

export default async function ProjectsListPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const createOptions = workspaceId
    ? await getCreateProjectOptions(workspaceId)
    : { clients: [], templateVersions: [], leadPeople: [] };
  const blockedCount = projects.filter((p) => p.health === "blocked").length;
  const watchCount = projects.filter((p) => p.health === "watch").length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Projects"
          description="Active engagements. Health is computed from gate slip, overdue critical work and unresolved client action."
        />
        <div className="flex gap-1.5 flex-none">
          <ExportProjectsButton projects={projects} />
          <CreateProjectButton options={createOptions} />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] bg-ink text-white">
          ALL {projects.length}
        </span>
        {blockedCount > 0 ? (
          <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
            BLOCKED {blockedCount}
          </span>
        ) : null}
        {watchCount > 0 ? (
          <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
            WATCH {watchCount}
          </span>
        ) : null}
      </div>

      <Card>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects in this space yet."
            description="A project starts from a template so it inherits a versioned flight plan. Creating one without a template is possible but not recommended."
            action={<CreateProjectButton options={createOptions} triggerLabel="Create from template" />}
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>REF</span>
              <span>PROJECT</span>
              <span>CLIENT</span>
              <span>PHASE</span>
              <span>NEXT GATE</span>
              <span>HEALTH</span>
            </TableHead>
            {projects.map((p, i) => (
              <TableRow cols={COLS} key={p.id} last={i === projects.length - 1}>
                <span className="font-mono text-[9.5px] text-muted">{p.ref}</span>
                <Link href={`/delivery/projects/${p.ref.toLowerCase()}`} className="min-w-0">
                  <CellStack primary={p.name} secondary={`${p.openTasks} OPEN TASKS`} />
                </Link>
                <span className="text-muted truncate">{p.clientName}</span>
                <span className="font-mono text-[9.5px] text-muted">{p.phaseCode ?? "—"}</span>
                {p.nextGate ? (
                  <CellStack
                    primary={p.nextGate.targetDate ? `${p.nextGate.code}, ${p.nextGate.targetDate}` : p.nextGate.code}
                    secondary={`${p.nextGate.openConditions} CONDITION${p.nextGate.openConditions === 1 ? "" : "S"} OPEN`}
                  />
                ) : (
                  <span className="text-muted">—</span>
                )}
                <HealthPill health={p.health} className="justify-self-start" />
              </TableRow>
            ))}
          </>
        )}
      </Card>

      <Card>
        <CardHeader title="How health is computed" note="SAME RULE EVERY SPACE" />
        <div className="px-4 py-3.5 flex flex-col gap-2.5 text-[11.5px] text-muted leading-[1.5]">
          <span>
            <strong className="text-ink">Blocked</strong> a gate condition is open past its target date, or a hard
            dependency is unmet.
          </span>
          <span>
            <strong className="text-ink">Watch</strong> a client action is unresolved over 7 days, or critical path
            work is overdue.
          </span>
          <span>
            <strong className="text-ink">On plan</strong> neither of the above. Task completion percentage never
            sets health.
          </span>
        </div>
      </Card>
    </div>
  );
}
