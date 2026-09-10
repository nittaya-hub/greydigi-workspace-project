import { PageHeading, Card, CardHeader, StatTile, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getDeliveryOverview, listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { getCreateProjectOptions } from "./projects/create-project-data";
import { CreateProjectButton } from "./projects/CreateProjectButton";
import { ExportProjectsButton } from "./projects/ExportProjectsButton";

const GATE_COLS = "56px 1fr 130px 112px";

export default async function DeliveryOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return <NotConnected />;
  }

  const clientId = await getSelectedClientId();
  const overview = await getDeliveryOverview(workspaceId, clientId);
  const [projects, createOptions] = await Promise.all([
    listProjects(workspaceId, clientId),
    getCreateProjectOptions(workspaceId),
  ]);
  const maxPhaseCount = Math.max(1, ...overview.phaseDistribution.map((p) => p.count));

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Delivery"
          description="Client engagements under the locked methodology. Health and gate status are derived, never typed by hand."
        />
        <div className="flex gap-1.5 flex-none">
          <ExportProjectsButton projects={projects} label="Portfolio export" />
          <CreateProjectButton options={createOptions} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="IN FLIGHT"
          value={overview.projectCount}
          note={`${overview.blockedCount} blocked, ${overview.watchCount} watch`}
        />
        <StatTile
          label="NEXT GATE"
          value={overview.nextGate?.code ?? "—"}
          note={overview.nextGate ? `${overview.nextGate.ref}${overview.nextGate.targetDate ? `, target ${overview.nextGate.targetDate}` : ""}` : "No gates held"}
        />
        <StatTile label="OPEN CHANGE REQUESTS" value={overview.openChangeRequests} note={`${overview.awaitingSignatureCount} awaiting client signature`} />
        <StatTile label="MILESTONES NEXT 14 DAYS" value={overview.milestonesNext14} note="With a client-visible date" />
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 items-start">
        <Card>
          <CardHeader title="Gate pipeline" note="EVERY HELD GATE ACROSS THE SPACE" />
          {overview.gatePipeline.length === 0 ? (
            <div className="py-10 px-4 text-center text-[12.5px] text-muted">No gates are currently held.</div>
          ) : (
            <>
              <TableHead cols={GATE_COLS}>
                <span>GATE</span>
                <span>PROJECT AND HOLD</span>
                <span>OWNER</span>
                <span>STATUS</span>
              </TableHead>
              {overview.gatePipeline.map((g, i) => (
                <TableRow cols={GATE_COLS} key={`${g.projectRef}-${g.code}`} last={i === overview.gatePipeline.length - 1}>
                  <span className="font-mono text-[9.5px] text-muted">{g.code}</span>
                  <CellStack primary={g.projectName} secondary={g.detail} />
                  <span className="text-muted truncate">{g.ownerName}</span>
                  <Pill
                    tone={g.status === "BLOCKED" ? "blocked" : g.status === "WATCH" ? "watch" : "in_progress"}
                    className="justify-self-start"
                  >
                    {g.status}
                  </Pill>
                </TableRow>
              ))}
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4 flex flex-col gap-2.5">
            <Eyebrow>PHASE DISTRIBUTION</Eyebrow>
            <div className="flex gap-1 items-end h-14">
              {/* Green means every project that ever sat in this phase has
                  already moved past it (passedCount > 0, nobody's there
                  now); orange means at least one project is in it today;
                  everything else hasn't been reached by any project yet.
                  The last phase (06) getting passed means a project has
                  fully gone live, not just "moved on" — its tick label
                  below swaps to "บินแล้ว" for that reason. */}
              {overview.phaseDistribution.map((p) => {
                const isCurrent = p.count > 0;
                const isPassed = !isCurrent && p.passedCount > 0;
                const height = isCurrent
                  ? Math.max(12, (p.count / maxPhaseCount) * 56)
                  : isPassed
                    ? 12
                    : 8;
                return (
                  <span
                    key={p.code}
                    style={{ height: `${height}px` }}
                    className={`flex-1 rounded-[3px] ${
                      isCurrent ? "bg-coral" : isPassed ? "bg-ok-fg" : "bg-[#DCD8CE]"
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-muted">
              {overview.phaseDistribution.map((p) => (
                <span key={p.code}>{p.code === "06" && p.count === 0 && p.passedCount > 0 ? "บินแล้ว" : p.code}</span>
              ))}
            </div>
            <span className="text-[11.5px] text-muted leading-[1.5]">
              Where projects sit in the flight plan right now. Capacity pressure shows here before it shows in a
              task list.
            </span>
          </Card>

          <Card className="p-4 flex flex-col gap-2.5">
            <Eyebrow>HOW HEALTH IS COMPUTED</Eyebrow>
            <div className="flex flex-col gap-2 text-[11.5px] text-muted leading-[1.5]">
              <span>
                <strong className="text-ink">Blocked</strong> a gate condition is open past its target date, or a
                held gate has a client dependency unmet for 10+ days.
              </span>
              <span>
                <strong className="text-ink">Watch</strong> a client action is unresolved over 7 days, or critical
                path work is overdue.
              </span>
              <span>
                <strong className="text-ink">On plan</strong> neither of the above. Task completion percentage never
                sets health.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NotConnected() {
  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading title="Delivery" description="Client engagements under the locked methodology." />
      <Card className="p-5">
        <p className="text-[12.5px] text-muted max-w-[60ch]">
          Not signed in, or this workspace has no data yet. See <code className="font-mono text-[11px]">supabase/README.md</code>{" "}
          to connect a project and load the seed portfolio.
        </p>
      </Card>
    </div>
  );
}
