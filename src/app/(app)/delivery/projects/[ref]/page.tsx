import { notFound } from "next/navigation";
import { Card, CardHeader, StatTile, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { GateConditionRow } from "@/components/ui/GateConditionRow";
import { FlightPlanSpine } from "@/components/portal/FlightPlanSpine";
import { getProjectByRef, getGateConditions, getProjectTasks } from "@/lib/data/project";

function daysAgo(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default async function ProjectOverviewPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [conditions, tasks] = await Promise.all([
    project.heldGate ? getGateConditions(project.heldGate.id) : Promise.resolve([]),
    getProjectTasks(project.id),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "done");
  const clientTasks = tasks.filter((t) => t.status === "waiting_on_client");
  const milestones = tasks
    .filter((t) => t.clientVisibleDate)
    .sort((a, b) => (a.clientVisibleDate ?? "").localeCompare(b.clientVisibleDate ?? ""))
    .slice(0, 3);

  const spinePhases = project.phases.map((p) => ({
    code: p.code,
    name: p.name,
    index: p.index,
    started_at: p.startedAt,
    completed_at: p.completedAt,
    duration_label: p.durationLabel,
    show_duration_label: p.showDurationLabel,
  }));
  const spineGates = project.gates.map((g) => ({
    code: g.code,
    name: g.name,
    sequence: g.sequence,
    status: g.status,
    target_date: g.targetDate,
  }));

  const cleared = project.gates.filter((g) => g.status === "cleared").length;

  return (
    <>
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 items-stretch">
        <HeroPanel>
          <Eyebrow className="text-muted-2">WHERE WE ARE</Eyebrow>
          <div className="flex flex-col gap-1.5">
            <span className="font-display font-extrabold text-2xl tracking-[-0.02em] leading-[1.15]">
              {project.currentPhase
                ? `Phase ${project.currentPhase.code} ${project.currentPhase.name}${
                    project.heldGate ? `, held at gate ${project.heldGate.code} ${project.heldGate.name}` : ""
                  }`
                : "Not started"}
            </span>
            {project.heldGate ? (
              <span className="text-[12.5px] text-muted-2">
                {conditions.filter((c) => c.status === "open").length} condition
                {conditions.filter((c) => c.status === "open").length === 1 ? "" : "s"} remain open.
              </span>
            ) : null}
          </div>
          <FlightPlanSpine phases={spinePhases} gates={spineGates} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5 border-t border-white/10">
            <Field label="GATE" value={project.heldGate ? `${project.heldGate.code} HELD` : `${cleared}/${project.gates.length} cleared`} accent={!!project.heldGate} />
            <Field
              label="HELD FOR"
              value={project.heldGate?.heldSince ? `${daysAgo(project.heldGate.heldSince)} days` : "—"}
            />
            <Field label="LEAD" value={project.leadName} />
            <Field label="GO LIVE TARGET" value={project.goLiveTarget ?? "—"} />
          </div>
        </HeroPanel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <StatTile label="OPEN TASKS" value={openTasks.length} note={`${openTasks.filter((t) => t.isCriticalPath).length} critical path`} />
          <StatTile label="CLIENT ACTIONS" value={clientTasks.length} note="Waiting on client" accent={clientTasks.length > 0} />
          <StatTile label="PROGRESS" value={`${project.progressPct}%`} note={`${cleared} of ${project.gates.length} gates cleared`} />
          <StatTile label="HEALTH" value={project.health.replace("_", " ")} note="From the state engine" accent={project.health !== "on_plan"} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card>
          <CardHeader
            title={project.heldGate ? `${project.heldGate.code} conditions` : "Gate conditions"}
            note={project.heldGate ? `${conditions.filter((c) => c.status === "open").length} OF ${conditions.length} OPEN` : undefined}
          />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {conditions.length === 0 ? (
              <span className="text-[11.5px] text-muted">No gate currently held.</span>
            ) : (
              conditions.map((c) => (
                <GateConditionRow
                  key={c.id}
                  description={c.description}
                  met={c.status === "met" || c.status === "waived"}
                  note={c.status === "open" ? c.owner.toUpperCase() : c.metAt ?? undefined}
                />
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Next milestones" note="CLIENT VISIBLE" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {milestones.length === 0 ? (
              <span className="text-[11.5px] text-muted">No client-visible milestones yet.</span>
            ) : (
              milestones.map((m) => (
                <div key={m.id} className="flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span className="text-[12.5px] font-semibold text-ink">{m.title}</span>
                    <span className="font-mono text-[9.5px] text-muted">{m.clientVisibleDate}</span>
                  </div>
                  {m.status === "blocked" ? (
                    <span className="font-mono text-[9.5px] text-block-fg">BLOCKED</span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Flight plan" note={`${project.gates.length} GATES`} />
          <div className="px-4 py-3.5 flex flex-col gap-2">
            {project.gates.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-[12px]">
                <span className="text-ink">
                  {g.code} {g.name}
                </span>
                <span
                  className={`font-mono text-[9.5px] ${
                    g.status === "cleared" ? "text-ok-fg" : g.status === "held" ? "text-block-fg" : "text-muted"
                  }`}
                >
                  {g.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Field({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="flex flex-col gap-1">
      <Eyebrow className="text-muted-2">{label}</Eyebrow>
      <span className={`text-[13px] font-semibold ${accent ? "text-coral" : ""}`}>{value}</span>
    </span>
  );
}
