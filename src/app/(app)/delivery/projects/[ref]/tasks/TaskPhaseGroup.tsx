"use client";

import { useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GripVertical } from "lucide-react";
import { TaskStatusPill } from "@/components/ui/Pill";
import type { TaskRow, TaskCustomFieldColumn } from "@/lib/data/project";
import { reorderProjectTasks } from "./task-drawer-actions";
import { InlineAddTaskRow } from "./InlineAddTaskRow";
import { CustomFieldCell } from "./CustomFieldCell";

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
        <div
          key={t.id}
          draggable
          onDragStart={(e) => handleDragStart(e, t.id)}
          onDragOver={(e) => handleDragOver(e, t.id)}
          onDrop={handleDrop}
          onDragEnd={() => setDraggingId(null)}
          style={{ gridTemplateColumns: cols }}
          className={`grid gap-2.5 items-center px-4 py-[11px] text-[12px] border-b border-line-soft ${
            draggingId === t.id ? "opacity-40" : ""
          }`}
        >
          <span className="cursor-grab text-muted-2 active:cursor-grabbing" aria-hidden>
            <GripVertical size={14} />
          </span>
          <Link href={`${pathname}?task=${t.id}`} scroll={false} className="min-w-0 flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold text-ink truncate">{t.title}</span>
            <span className="font-mono text-[9.5px] text-muted truncate">
              {[t.isCriticalPath && "CRITICAL PATH", t.clientVisibleDate && "MILESTONE, CLIENT VISIBLE"]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </Link>
          <span className="text-muted truncate">{t.assigneeName}</span>
          <span className="font-mono text-[9.5px] text-muted">{t.dueDate ?? "—"}</span>
          <TaskStatusPill status={t.status} className="justify-self-start" />
          {customFields.map((f) => (
            <CustomFieldCell
              key={f.id}
              taskId={t.id}
              projectRef={projectRef}
              fieldId={f.id}
              initialValue={customValues.get(t.id)?.get(f.id) ?? ""}
            />
          ))}
        </div>
      ))}
      <InlineAddTaskRow projectId={projectId} projectRef={projectRef} phaseId={phaseId} isLast />
    </div>
  );
}
