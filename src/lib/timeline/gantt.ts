/** Builds the week-by-week Gantt chart shown on the client checkpoint
 * PDF (e.g. NK_Core_checkpoint_20260908.pdf, page 4: "Ten weeks, three
 * gates, where we stand at week N") — derived entirely from
 * project_tasks and project_phases, the same rows the Tasks and
 * milestones tab already lets anyone add, edit, or delete. There is no
 * separate Gantt data model: editing a task's due date or status on a
 * Tuesday is what the Friday client checkpoint shows, with nothing to
 * keep in sync by hand.
 *
 * A task has only one date (due_date), not a start and end. An earlier
 * version tried to approximate a multi-week bar by extending it back to
 * the task's own phase start — but every task in the same phase shares
 * that same start, so they all smeared back to one identical column
 * instead of each showing its own real due week, which read as flatly
 * wrong rather than a reasonable approximation. Each row is a single
 * marker at its real due week instead, colored by its real status: less
 * visually busy than the hand-built deck's continuous bars, but every
 * cell it draws is a real fact instead of an invented one.
 */

// Three groups, not five — "เสร็จแล้ว กำลังทำ และต่อไปจะทำ" (done, in
// progress, and what's next) was the explicit ask: the deck's own five-way
// done/in-progress/next/planned/go-live split read as more shades to
// squint at than a real distinction. "next" and "planned" collapse into
// one "upcoming" group; milestone-ness (a task with a client-visible
// date) becomes an outline drawn in whichever group's own color, rather
// than a status that overrides done/in-progress and hides which one a
// milestone actually is.
export type GanttStatusGroup = "done" | "in_progress" | "upcoming";

export interface GanttWeek {
  index: number;
  label: string;
  startDate: string;
}

export interface GanttRow {
  ref: string;
  title: string;
  isCriticalPath: boolean;
  isMilestone: boolean;
  weekIndex: number;
  status: GanttStatusGroup;
}

export interface GanttChart {
  weeks: GanttWeek[];
  rows: GanttRow[];
}

export const STATUS_GROUP_ORDER: GanttStatusGroup[] = ["done", "in_progress", "upcoming"];
export const STATUS_GROUP_LABEL: Record<GanttStatusGroup, string> = {
  done: "Done",
  in_progress: "In progress",
  upcoming: "Upcoming",
};

interface PhaseInput {
  id: string;
  started_at: string | null;
}

interface TaskInput {
  ref: string;
  title: string;
  status: string;
  due_date: string | null;
  is_critical_path: boolean;
  client_visible_date: string | null;
  project_phase_id: string | null;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MAX_WEEKS = 16;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekIndexFor(date: Date, chartStart: Date): number {
  return Math.floor((startOfDay(date).getTime() - chartStart.getTime()) / MS_PER_WEEK);
}

function statusGroupFor(task: TaskInput): GanttStatusGroup {
  if (task.status === "done") return "done";
  if (task.status === "in_progress") return "in_progress";
  return "upcoming";
}

/** `phaseIdsByProjectPhaseId` maps project_phases.id -> started_at, since
 * gantt_tasks/TaskRow only carry the phase id, not its dates. */
export function buildGanttChart(
  phases: PhaseInput[],
  tasks: TaskInput[],
  opts: { goLiveTarget: string | null } = { goLiveTarget: null }
): GanttChart | null {
  const dated = tasks.filter((t) => t.due_date);
  const phaseStart = phases.find((p) => p.started_at)?.started_at;
  const candidates = [
    phaseStart ? new Date(phaseStart) : null,
    ...dated.map((t) => new Date(t.due_date as string)),
  ].filter((d): d is Date => d !== null);
  if (candidates.length === 0) return null;

  const chartStart = startOfDay(new Date(Math.min(...candidates.map((d) => d.getTime()))));
  const endCandidates = [
    ...dated.map((t) => new Date(t.due_date as string)),
    opts.goLiveTarget ? new Date(opts.goLiveTarget) : null,
  ].filter((d): d is Date => d !== null);
  const latest = endCandidates.length > 0 ? new Date(Math.max(...endCandidates.map((d) => d.getTime()))) : chartStart;

  const weekCount = Math.min(MAX_WEEKS, Math.max(1, weekIndexFor(latest, chartStart) + 1));

  const weeks: GanttWeek[] = Array.from({ length: weekCount }, (_, i) => {
    const start = new Date(chartStart.getTime() + i * MS_PER_WEEK);
    return {
      index: i,
      label: `W${i + 1}`,
      startDate: start.toISOString().slice(0, 10),
    };
  });

  const rows: GanttRow[] = dated
    .map((t) => {
      const dueDate = new Date(t.due_date as string);
      const weekIndex = Math.min(weekCount - 1, Math.max(0, weekIndexFor(dueDate, chartStart)));
      return {
        ref: t.ref,
        title: t.title,
        isCriticalPath: t.is_critical_path,
        isMilestone: !!t.client_visible_date,
        weekIndex,
        status: statusGroupFor(t),
      };
    })
    // Grouped by status first — done, then in progress, then upcoming —
    // so the three groups the request asked for read as three clearly
    // separated bands, not just three colors mixed through one list.
    // Ascending by week within each group.
    .sort((a, b) => {
      const groupDelta = STATUS_GROUP_ORDER.indexOf(a.status) - STATUS_GROUP_ORDER.indexOf(b.status);
      return groupDelta !== 0 ? groupDelta : a.weekIndex - b.weekIndex;
    });

  return { weeks, rows };
}
