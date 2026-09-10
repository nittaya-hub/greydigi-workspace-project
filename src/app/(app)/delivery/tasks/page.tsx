import { Card, CardHeader, StatTile, EmptyState, PageHeading } from "@/components/ui/Card";
import { TableHead } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import {
  getProjectRefById,
  getProjectTasks,
  getTaskActivity,
  getTaskById,
  getTaskComments,
  getTaskCustomFields,
  getTaskCustomFieldValues,
  getWorkspaceInternalPeople,
  getProjectChangeRequests,
  type TaskRow,
  type TaskCustomFieldColumn,
} from "@/lib/data/project";
import { TaskPhaseGroup } from "../projects/[ref]/tasks/TaskPhaseGroup";
import { InlineAddTaskRow } from "../projects/[ref]/tasks/InlineAddTaskRow";
import { AddColumnButton } from "../projects/[ref]/tasks/AddColumnButton";
import { TaskDrawer } from "../projects/[ref]/tasks/TaskDrawer";

const BASE_COLS = ["20px", "1fr", "116px", "96px", "116px"];
const CUSTOM_COL_WIDTH = "110px";

interface ProjectTaskSection {
  id: string;
  ref: string;
  name: string;
  clientName: string;
  tasks: TaskRow[];
  customFields: TaskCustomFieldColumn[];
  customValues: Map<string, Map<string, string>>;
}

export default async function WorkspaceTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: openTaskId } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();

  const [projects, people] = await Promise.all([
    workspaceId ? listProjects(workspaceId, clientId) : Promise.resolve([]),
    workspaceId ? getWorkspaceInternalPeople(workspaceId) : Promise.resolve([]),
  ]);

  const sections: ProjectTaskSection[] = await Promise.all(
    projects.map(async (p) => {
      const tasks = await getProjectTasks(p.id);
      const [customFields, customValues] = await Promise.all([
        getTaskCustomFields(p.id),
        getTaskCustomFieldValues(tasks.map((t) => t.id)),
      ]);
      return { id: p.id, ref: p.ref, name: p.name, clientName: p.clientName, tasks, customFields, customValues };
    })
  );

  const allTasks = sections.flatMap((s) => s.tasks);
  const open = allTasks.filter((t) => t.status !== "done");
  const overdue = allTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done");
  const waiting = allTasks.filter((t) => t.status === "waiting_on_client");
  const milestones = allTasks.filter((t) => t.clientVisibleDate);

  let drawerData: Awaited<ReturnType<typeof loadDrawerData>> | null = null;
  if (openTaskId) {
    drawerData = await loadDrawerData(openTaskId, sections);
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Tasks"
        description={
          clientId
            ? "Every task across this client's active projects, grouped by project and then by phase. Drag a row to reorder it within its phase, or use “Add task” at the bottom of a group."
            : "Every task across every active project, grouped by project and then by phase. Switch to a client to narrow this down. Drag a row to reorder it within its phase, or use “Add task” at the bottom of a group."
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="OPEN" value={open.length} note={`Of ${allTasks.length} total`} />
        <StatTile label="OVERDUE" value={overdue.length} note={`${overdue.filter((t) => t.isCriticalPath).length} on the critical path`} accent={overdue.length > 0} />
        <StatTile label="WAITING ON CLIENT" value={waiting.length} note="Drives the client action queue" />
        <StatTile label="MILESTONES" value={milestones.length} note="Client visible dates" />
      </div>

      {sections.length === 0 ? (
        <Card>
          <EmptyState
            title="No active projects in scope."
            description={
              clientId
                ? "This client has no active projects yet."
                : "There are no active projects in the workspace yet."
            }
          />
        </Card>
      ) : (
        sections.map((section) => {
          const cols = [...BASE_COLS, ...section.customFields.map(() => CUSTOM_COL_WIDTH), "28px"].join(" ");
          const byPhase = new Map<string, { phaseName: string; phaseId: string | null; tasks: TaskRow[] }>();
          for (const t of section.tasks) {
            const key = t.phaseCode ?? "—";
            const bucket = byPhase.get(key) ?? { phaseName: t.phaseName ?? "Unassigned", phaseId: t.projectPhaseId, tasks: [] };
            bucket.tasks.push(t);
            byPhase.set(key, bucket);
          }
          const phaseGroups = [...byPhase.entries()].sort((a, b) => a[0].localeCompare(b[0]));

          return (
            <Card key={section.id}>
              <CardHeader title={`${section.ref} · ${section.name}`} note={section.clientName.toUpperCase()} />
              {section.tasks.length === 0 ? (
                <>
                  <EmptyState
                    title="No tasks yet."
                    description="Tasks are inherited from the template when a phase starts, or added directly."
                  />
                  <InlineAddTaskRow projectId={section.id} projectRef={section.ref} phaseId={null} isLast />
                </>
              ) : (
                <>
                  <TableHead cols={cols}>
                    <span />
                    <span>TASK</span>
                    <span>OWNER</span>
                    <span>DUE</span>
                    <span>STATUS</span>
                    {section.customFields.map((f) => (
                      <span key={f.id} className="truncate">
                        {f.name.toUpperCase()}
                      </span>
                    ))}
                    <AddColumnButton projectId={section.id} projectRef={section.ref} />
                  </TableHead>
                  {phaseGroups.map(([code, group]) => (
                    <TaskPhaseGroup
                      key={code}
                      projectId={section.id}
                      projectRef={section.ref}
                      code={code}
                      phaseName={group.phaseName}
                      phaseId={group.phaseId}
                      tasks={group.tasks}
                      customFields={section.customFields}
                      customValues={section.customValues}
                      cols={cols}
                      people={people}
                    />
                  ))}
                </>
              )}
            </Card>
          );
        })
      )}

      {drawerData ? (
        <TaskDrawer
          task={drawerData.task}
          comments={drawerData.comments}
          activity={drawerData.activity}
          people={people}
          projectRef={drawerData.projectRef}
          customFields={drawerData.customFields}
          customValues={drawerData.customValues}
          approvedChangeRequests={drawerData.approvedChangeRequests}
        />
      ) : null}
    </div>
  );
}

async function loadDrawerData(taskId: string, sections: ProjectTaskSection[]) {
  const task = await getTaskById(taskId);
  if (!task) return null;

  // The task's project may not be in `sections` (e.g. the client scope
  // changed after the drawer was opened) — fall back to a direct lookup
  // rather than 404ing the whole aggregated page over one stale link.
  const section = sections.find((s) => s.id === task.projectId);
  const projectRef = section?.ref ?? (await getProjectRefById(task.projectId));
  if (!projectRef) return null;

  const [comments, activity, changeRequests] = await Promise.all([
    getTaskComments(taskId),
    getTaskActivity(taskId),
    getProjectChangeRequests(task.projectId),
  ]);
  const approvedChangeRequests = changeRequests.filter((cr) => cr.status === "approved");
  return {
    task,
    approvedChangeRequests,
    comments,
    activity,
    projectRef,
    customFields: section?.customFields ?? [],
    customValues: section?.customValues.get(taskId) ?? new Map<string, string>(),
  };
}
