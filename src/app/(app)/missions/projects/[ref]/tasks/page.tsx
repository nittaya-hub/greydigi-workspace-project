import { notFound } from "next/navigation";
import { Card, StatTile, EmptyState } from "@/components/ui/Card";
import { TableHead } from "@/components/ui/Table";
import {
  getProjectByRef,
  getProjectTasks,
  getTaskActivity,
  getTaskById,
  getTaskComments,
  getTaskCustomFields,
  getTaskCustomFieldValues,
  getWorkspacePeople,
  getProjectChangeRequests,
} from "@/lib/data/project";
import { TaskPhaseGroup } from "./TaskPhaseGroup";
import { InlineAddTaskRow } from "./InlineAddTaskRow";
import { AddColumnButton } from "./AddColumnButton";
import { CustomFieldColumnHeader } from "./CustomFieldColumnHeader";
import { TaskDrawer } from "./TaskDrawer";

const BASE_COLS = ["20px", "1fr", "116px", "96px", "116px"];
const CUSTOM_COL_WIDTH = "110px";

export default async function ProjectTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { ref } = await params;
  const { task: openTaskId } = await searchParams;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [tasks, people, customFields] = await Promise.all([
    getProjectTasks(project.id),
    getWorkspacePeople(project.workspaceId),
    getTaskCustomFields(project.id),
  ]);
  const customValues = await getTaskCustomFieldValues(tasks.map((t) => t.id));
  const cols = [...BASE_COLS, ...customFields.map(() => CUSTOM_COL_WIDTH), "28px"].join(" ");

  let drawerData: Awaited<ReturnType<typeof loadDrawerData>> | null = null;
  if (openTaskId) {
    drawerData = await loadDrawerData(openTaskId, project.id);
  }

  const open = tasks.filter((t) => t.status !== "done");
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done");
  const waiting = tasks.filter((t) => t.status === "waiting_on_client");
  const milestones = tasks.filter((t) => t.clientVisibleDate);

  const byPhase = new Map<string, { phaseName: string; phaseId: string | null; tasks: typeof tasks }>();
  for (const t of tasks) {
    const key = t.phaseCode ?? "—";
    const bucket = byPhase.get(key) ?? { phaseName: t.phaseName ?? "Unassigned", phaseId: t.projectPhaseId, tasks: [] };
    bucket.tasks.push(t);
    byPhase.set(key, bucket);
  }
  const phaseGroups = [...byPhase.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
        Grouped by phase so the flight plan stays visible. A milestone is a task with a client-visible date, not a
        separate object. Drag a row to reorder it within its phase, or use &ldquo;Add task&rdquo; at the bottom of a group.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="OPEN" value={open.length} note={`Of ${tasks.length} total`} />
        <StatTile label="OVERDUE" value={overdue.length} note={`${overdue.filter((t) => t.isCriticalPath).length} on the critical path`} accent={overdue.length > 0} />
        <StatTile label="WAITING ON CLIENT" value={waiting.length} note="Drives the client action queue" />
        <StatTile label="MILESTONES" value={milestones.length} note="Client visible dates" />
      </div>

      <Card>
        {tasks.length === 0 ? (
          <>
            <EmptyState
              title="No tasks yet."
              description="Tasks are inherited from the template when a phase starts, or added directly."
            />
            <InlineAddTaskRow projectId={project.id} projectRef={project.ref} phaseId={null} isLast />
          </>
        ) : (
          <>
            <TableHead cols={cols}>
              <span />
              <span>TASK</span>
              <span>OWNER</span>
              <span>DUE</span>
              <span>STATUS</span>
              {customFields.map((f) => (
                <CustomFieldColumnHeader key={f.id} fieldId={f.id} name={f.name} projectId={project.id} projectRef={project.ref} />
              ))}
              <AddColumnButton projectId={project.id} projectRef={project.ref} />
            </TableHead>
            {phaseGroups.map(([code, group]) => (
              <TaskPhaseGroup
                key={code}
                projectId={project.id}
                projectRef={project.ref}
                code={code}
                phaseName={group.phaseName}
                phaseId={group.phaseId}
                tasks={group.tasks}
                customFields={customFields}
                customValues={customValues}
                cols={cols}
                people={people}
              />
            ))}
          </>
        )}
      </Card>

      {drawerData ? (
        <TaskDrawer
          task={drawerData.task}
          comments={drawerData.comments}
          activity={drawerData.activity}
          people={people}
          projectRef={project.ref}
          customFields={customFields}
          customValues={customValues.get(drawerData.task.id) ?? new Map()}
          approvedChangeRequests={drawerData.approvedChangeRequests}
        />
      ) : null}
    </div>
  );
}

async function loadDrawerData(taskId: string, projectId: string) {
  const task = await getTaskById(taskId);
  if (!task || task.projectId !== projectId) return null;

  const [comments, activity, changeRequests] = await Promise.all([
    getTaskComments(taskId),
    getTaskActivity(taskId),
    getProjectChangeRequests(projectId),
  ]);
  const approvedChangeRequests = changeRequests.filter((cr) => cr.status === "approved");
  return { task, comments, activity, approvedChangeRequests };
}
