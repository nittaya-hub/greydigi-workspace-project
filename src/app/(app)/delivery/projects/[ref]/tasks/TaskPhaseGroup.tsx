"use client";

import { useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GripVertical, CircleCheck, Circle, Trash2, Loader2, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/shadcn/select";
import type { TaskRow, TaskCustomFieldColumn, WorkspacePersonOption } from "@/lib/data/project";
import type { TaskStatus } from "@/lib/supabase/database.types";
import { withTimeout } from "@/lib/withTimeout";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { DatePicker } from "@/components/ui/DatePicker";
import { deleteTask, reorderProjectTasks, updateTaskAssignee, updateTaskField } from "./task-drawer-actions";
import { InlineAddTaskRow } from "./InlineAddTaskRow";
import { CustomFieldCell } from "./CustomFieldCell";

const UNASSIGNED = "__unassigned__";
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_client", label: "Waiting on client" },
  { value: "blocked", label: "Blocked" },
  { value: "watch", label: "Watch" },
  { value: "done", label: "Done" },
];
// Mirrors TaskStatusPill's tone mapping (src/components/ui/Pill.tsx) so the
// inline status select still reads as a status badge at a glance, not a
// plain form control, even though it's now a real dropdown instead of a
// read-only pill.
const STATUS_SELECT_CLASSES: Record<string, string> = {
  done: "bg-ok-bg text-ok-fg",
  in_progress: "bg-coral-tint text-coral-strong",
  waiting_on_client: "bg-block-bg text-block-fg",
  blocked: "bg-block-bg text-block-fg",
  watch: "bg-warn-bg text-warn-fg",
  idle: "bg-idle-bg text-muted",
};

/** One task row. Owns its own optimistic status so the checkbox, title
 * dimming, and status pill all flip together the instant you click,
 * instead of waiting on the round trip (checking sets status to "done";
 * unchecking reverts to "idle" — the other statuses are only reachable
 * from the drawer, since they're not a binary done/not-done toggle).
 * Rolls back if the write fails or hangs past 10s (withTimeout) — a slow
 * network shouldn't make a checkbox feel unresponsive. */
function TaskListRow({
  task,
  projectRef,
  pathname,
  cols,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  customFields,
  customValues,
  people,
}: {
  task: TaskRow;
  projectRef: string;
  pathname: string;
  cols: string;
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  customFields: TaskCustomFieldColumn[];
  customValues: Map<string, Map<string, string>>;
  people: WorkspacePersonOption[];
}) {
  // Adjusts optimistic local state during render when the server-confirmed
  // prop actually changes, instead of in a useEffect (same "sync derived
  // state on prop change" pattern TaskPhaseGroup below already uses for
  // `order`/`syncedTasks`) — keeps each field's optimistic value intact
  // across unrelated re-renders while still reconciling once the real
  // value moves.
  const [prevTask, setPrevTask] = useState(task);
  const [optimisticStatus, setOptimisticStatus] = useState(task.status);
  const [assignee, setAssignee] = useState(task.assigneePersonId ?? UNASSIGNED);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  if (task !== prevTask) {
    setPrevTask(task);
    if (task.status !== prevTask.status) setOptimisticStatus(task.status);
    if (task.assigneePersonId !== prevTask.assigneePersonId) setAssignee(task.assigneePersonId ?? UNASSIGNED);
    if (task.dueDate !== prevTask.dueDate) setDueDate(task.dueDate ?? "");
  }
  const [isDeleting, setIsDeleting] = useState(false);
  // Every inline edit used to save silently — nothing on screen changed
  // between clicking and the row settling, so a slow save (or even a
  // normal one) looked exactly like nothing had happened. This tracks
  // whichever field is mid-save so the row can say so.
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const done = optimisticStatus === "done";
  const ownerOptions = [{ value: UNASSIGNED, label: "Unassigned" }, ...people.map((p) => ({ value: p.id, label: p.fullName }))];

  function toggleComplete() {
    const next = done ? "idle" : "done";
    setOptimisticStatus(next);
    setIsSaving(true);
    setSaveError(null);
    startTransition(() => {
      withTimeout(updateTaskField(task.id, projectRef, { field: "status", value: next }))
        .catch((err) => {
          setOptimisticStatus(task.status);
          setSaveError(err instanceof Error ? err.message : "Could not save.");
        })
        .finally(() => setIsSaving(false));
    });
  }

  function handleStatusChange(next: TaskStatus) {
    setOptimisticStatus(next);
    setIsSaving(true);
    setSaveError(null);
    startTransition(() => {
      withTimeout(updateTaskField(task.id, projectRef, { field: "status", value: next }))
        .catch((err) => {
          setOptimisticStatus(task.status);
          setSaveError(err instanceof Error ? err.message : "Could not save.");
        })
        .finally(() => setIsSaving(false));
    });
  }

  function handleAssigneeChange(value: string) {
    setAssignee(value);
    setIsSaving(true);
    setSaveError(null);
    startTransition(() => {
      withTimeout(updateTaskAssignee(task.id, projectRef, value === UNASSIGNED ? null : value))
        .catch((err) => {
          setAssignee(task.assigneePersonId ?? UNASSIGNED);
          setSaveError(err instanceof Error ? err.message : "Could not save.");
        })
        .finally(() => setIsSaving(false));
    });
  }

  function handleDueDateChange(value: string) {
    setDueDate(value);
    setIsSaving(true);
    setSaveError(null);
    startTransition(() => {
      withTimeout(updateTaskField(task.id, projectRef, { field: "due_date", value: value || null }))
        .catch((err) => {
          setDueDate(task.dueDate ?? "");
          setSaveError(err instanceof Error ? err.message : "Could not save.");
        })
        .finally(() => setIsSaving(false));
    });
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await deleteTask(task.id, projectRef);
    } catch (err) {
      setIsDeleting(false);
      throw err;
    }
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{ gridTemplateColumns: cols }}
      className={clsx(
        "grid gap-2.5 items-center px-4 py-[11px] text-[12px] border-b border-line-soft",
        isDragging && "opacity-40",
        isDeleting && "opacity-40 pointer-events-none"
      )}
    >
      {isSaving ? (
        <span className="text-muted-2" title="Saving…" aria-label="Saving">
          <Loader2 size={14} className="animate-spin" />
        </span>
      ) : saveError ? (
        <button
          type="button"
          onClick={() => setSaveError(null)}
          className="text-block-fg"
          title={`${saveError} Click to dismiss.`}
          aria-label={`Could not save: ${saveError}`}
        >
          <AlertTriangle size={14} />
        </button>
      ) : (
        <span className="cursor-grab text-muted-2 active:cursor-grabbing" aria-hidden>
          <GripVertical size={14} />
        </span>
      )}
      <div className="min-w-0 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleComplete();
          }}
          aria-label={done ? "Mark task incomplete" : "Mark task complete"}
          aria-pressed={done}
          className={clsx("flex-none", done ? "text-emerald-600" : "text-muted-2 hover:text-ink")}
        >
          {done ? <CircleCheck size={16} /> : <Circle size={16} />}
        </button>
        <Link href={`${pathname}?task=${task.id}`} scroll={false} className="min-w-0 flex-1 flex flex-col gap-0.5">
          <span className={clsx("text-[12.5px] font-semibold truncate", done ? "text-muted-2" : "text-ink")}>{task.title}</span>
          <span className="font-mono text-[9.5px] text-muted truncate">
            {[task.isOutOfScope && "OUT OF SCOPE", task.isCriticalPath && "CRITICAL PATH", task.clientVisibleDate && "MILESTONE, CLIENT VISIBLE"]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </Link>
      </div>
      <Select items={ownerOptions} value={assignee} onValueChange={(v) => handleAssigneeChange(v as string)}>
        <SelectTrigger
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className="w-full min-w-0 justify-start border-transparent bg-transparent px-1 text-[12px] text-muted hover:border-line focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ownerOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DatePicker
        value={dueDate}
        onChange={handleDueDateChange}
        onClick={(e) => e.stopPropagation()}
        className="h-auto w-full min-w-0 rounded-[6px] border-transparent bg-transparent px-1 py-1 font-mono text-[9.5px] text-muted hover:border-line"
      />
      <Select items={STATUS_OPTIONS} value={optimisticStatus} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
        <SelectTrigger
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className={clsx(
            "justify-self-start w-full min-w-0 justify-start gap-1 rounded-[5px] border-transparent px-[7px] py-[3px] font-mono text-[9px] tracking-[.06em] uppercase focus-visible:ring-0",
            STATUS_SELECT_CLASSES[optimisticStatus] ?? STATUS_SELECT_CLASSES.idle
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {customFields.map((f) => (
        <CustomFieldCell
          key={f.id}
          taskId={task.id}
          projectRef={projectRef}
          fieldId={f.id}
          initialValue={customValues.get(task.id)?.get(f.id) ?? ""}
        />
      ))}
      <ConfirmButton
        trigger={<Trash2 size={14} />}
        triggerClassName="flex-none text-muted-2 hover:text-block-fg justify-self-center"
        title="Delete task"
        message={
          <>
            Delete <b>{task.title}</b>? This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete permanently"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/** One phase group's task rows, with native HTML5 drag-and-drop
 * reordering scoped to this group only (never across phases). Dropping
 * persists the group's full new order via `reorderProjectTasks`, which
 * also backfills sort_order for any row that still has the default 0. */
export function TaskPhaseGroup({
  projectId,
  projectRef,
  code,
  phaseName,
  phaseId,
  tasks,
  customFields,
  customValues,
  cols,
  people,
}: {
  projectId: string;
  projectRef: string;
  code: string;
  phaseName: string;
  phaseId: string | null;
  tasks: TaskRow[];
  customFields: TaskCustomFieldColumn[];
  customValues: Map<string, Map<string, string>>;
  cols: string;
  people: WorkspacePersonOption[];
}) {
  const pathname = usePathname();
  const [order, setOrder] = useState(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Pick up server-refreshed data (e.g. after a drawer edit revalidates
  // this route) during render — React's "adjusting state when a prop
  // changes" pattern — but never mid-drag, which would fight the user's
  // hand.
  const [syncedTasks, setSyncedTasks] = useState(tasks);
  if (tasks !== syncedTasks && !draggingId) {
    setSyncedTasks(tasks);
    setOrder(tasks);
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, overId: string) {
    e.preventDefault();
    if (!draggingId || draggingId === overId) return;
    setOrder((current) => {
      const from = current.findIndex((t) => t.id === draggingId);
      const to = current.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1 || from === to) return current;
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const finishedId = draggingId;
    setDraggingId(null);
    if (!finishedId) return;
    const ids = order.map((t) => t.id);
    startTransition(() => {
      reorderProjectTasks(projectId, projectRef, ids).catch(() => {
        // Best-effort: on failure the next server refresh reconciles the
        // list back to the persisted order.
      });
    });
  }

  return (
    <div>
      <div className="px-4 py-2.5 bg-[#F6F5F1] border-b border-line-soft flex items-center gap-2.5">
        <span className="font-mono text-[9px] tracking-[.08em] text-muted">
          PHASE {code} {phaseName.toUpperCase()}
        </span>
        {isPending ? <span className="font-mono text-[9px] text-muted-2">SAVING ORDER…</span> : null}
      </div>
      {order.map((t) => (
        <TaskListRow
          key={t.id}
          task={t}
          projectRef={projectRef}
          pathname={pathname}
          cols={cols}
          isDragging={draggingId === t.id}
          onDragStart={(e) => handleDragStart(e, t.id)}
          onDragOver={(e) => handleDragOver(e, t.id)}
          onDrop={handleDrop}
          onDragEnd={() => setDraggingId(null)}
          customFields={customFields}
          customValues={customValues}
          people={people}
        />
      ))}
      <InlineAddTaskRow projectId={projectId} projectRef={projectRef} phaseId={phaseId} isLast />
    </div>
  );
}
