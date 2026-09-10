"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/shadcn/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shadcn/tabs";
import { Input } from "@/components/shadcn/input";
import { Textarea } from "@/components/shadcn/textarea";
import { DatePicker } from "@/components/ui/DatePicker";
import { Label } from "@/components/shadcn/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/shadcn/select";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Badge } from "@/components/shadcn/badge";
import { Separator } from "@/components/shadcn/separator";
import { ScrollArea } from "@/components/shadcn/scroll-area";
import { Button } from "@/components/shadcn/button";
import type { TaskActivityRow, TaskCommentRow, TaskCustomFieldColumn, TaskDetail, WorkspacePersonOption } from "@/lib/data/project";
import type { TaskStatus, TaskVisibility } from "@/lib/supabase/database.types";
import { useAutosaveField, type SaveStatus } from "./useAutosaveField";
import { addTaskComment, deleteTask, updateTaskAssignee, updateTaskField, updateTaskScope } from "./task-drawer-actions";
import { CustomFieldDrawerField } from "./CustomFieldDrawerField";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_on_client", label: "Waiting on client" },
  { value: "blocked", label: "Blocked" },
  { value: "watch", label: "Watch" },
  { value: "done", label: "Done" },
];

const VISIBILITY_OPTIONS: { value: TaskVisibility; label: string }[] = [
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
];

const UNASSIGNED = "__unassigned__";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const label = status === "pending" ? "Unsaved…" : status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Couldn't save";
  return (
    <span className={`text-[10.5px] font-mono tracking-[.04em] ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
      {label}
    </span>
  );
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function TaskDrawer({
  task,
  comments,
  activity,
  people,
  projectRef,
  customFields = [],
  customValues = new Map(),
  approvedChangeRequests = [],
}: {
  task: TaskDetail;
  comments: TaskCommentRow[];
  activity: TaskActivityRow[];
  people: WorkspacePersonOption[];
  projectRef: string;
  /** This task's configurable columns (task_custom_fields), editable
   * inline below — same fields CustomFieldCell edits in the table row. */
  customFields?: TaskCustomFieldColumn[];
  customValues?: Map<string, string>;
  approvedChangeRequests?: { id: string; ref: string; title: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const close = () => router.push(pathname, { scroll: false });

  return (
    <Sheet
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-[480px] gap-0 p-0">
        <TaskDrawerBody
          key={task.id}
          task={task}
          comments={comments}
          activity={activity}
          people={people}
          projectRef={projectRef}
          customFields={customFields}
          customValues={customValues}
          onDeleted={close}
          approvedChangeRequests={approvedChangeRequests}
        />
      </SheetContent>
    </Sheet>
  );
}

function TaskDrawerBody({
  task,
  comments,
  activity,
  people,
  projectRef,
  customFields,
  customValues,
  onDeleted,
  approvedChangeRequests,
}: {
  task: TaskDetail;
  comments: TaskCommentRow[];
  activity: TaskActivityRow[];
  people: WorkspacePersonOption[];
  projectRef: string;
  customFields: TaskCustomFieldColumn[];
  customValues: Map<string, string>;
  onDeleted: () => void;
  /** Approved change requests for this task's project only — the scope
   * picker below can only ever link to one of these, so an unapproved
   * or draft CR is never even offered as an option (the DB trigger
   * would reject it anyway, but there's no reason to let someone pick
   * it and then show them the rejection). */
  approvedChangeRequests: { id: string; ref: string; title: string }[];
}) {
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isPosting, startPosting] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const [isOutOfScope, setIsOutOfScope] = useState(task.isOutOfScope);
  const [changeRequestId, setChangeRequestId] = useState(task.changeRequestId ?? "");
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [isSavingScope, startSavingScope] = useTransition();

  function saveScope(nextIsOutOfScope: boolean, nextChangeRequestId: string) {
    setScopeError(null);
    startSavingScope(async () => {
      try {
        await updateTaskScope(task.id, projectRef, nextIsOutOfScope, nextIsOutOfScope ? nextChangeRequestId || null : null);
        setIsOutOfScope(nextIsOutOfScope);
        setChangeRequestId(nextChangeRequestId);
      } catch (err) {
        setScopeError(err instanceof Error ? err.message : "Could not update scope.");
      }
    });
  }

  const titleField = useAutosaveField(task.title, (value) =>
    updateTaskField(task.id, projectRef, { field: "title", value })
  );
  const descriptionField = useAutosaveField(task.description ?? "", (value) =>
    updateTaskField(task.id, projectRef, { field: "description", value: value || null })
  );
  const statusField = useAutosaveField<TaskStatus>(task.status as TaskStatus, (value) =>
    updateTaskField(task.id, projectRef, { field: "status", value })
  );
  const dueDateField = useAutosaveField(task.dueDate ?? "", (value) =>
    updateTaskField(task.id, projectRef, { field: "due_date", value: value || null })
  );
  const clientVisibleDateField = useAutosaveField(task.clientVisibleDate ?? "", (value) =>
    updateTaskField(task.id, projectRef, { field: "client_visible_date", value: value || null })
  );
  const criticalPathField = useAutosaveField(task.isCriticalPath, (value) =>
    updateTaskField(task.id, projectRef, { field: "is_critical_path", value })
  );
  const visibilityField = useAutosaveField<TaskVisibility>(task.visibility, (value) =>
    updateTaskField(task.id, projectRef, { field: "visibility", value })
  );
  const assigneeField = useAutosaveField(task.assigneePersonId ?? UNASSIGNED, (value) =>
    updateTaskAssignee(task.id, projectRef, value === UNASSIGNED ? null : value)
  );
  // Base UI's <Select.Value> only renders a resolved label when the root
  // is given this items map — without it, it falls back to the raw
  // stored value (a person id, here).
  const assigneeItems = [{ value: UNASSIGNED, label: "Unassigned" }, ...people.map((p) => ({ value: p.id, label: p.fullName }))];

  function handleDelete() {
    setDeleteError(null);
    startDeleting(async () => {
      try {
        await deleteTask(task.id, projectRef);
        onDeleted();
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  function submitComment(e: FormEvent) {
    e.preventDefault();
    setCommentError(null);
    const body = commentBody.trim();
    if (!body) return;
    startPosting(async () => {
      try {
        await addTaskComment(task.id, projectRef, body);
        setCommentBody("");
      } catch (err) {
        setCommentError(err instanceof Error ? err.message : "Could not post comment.");
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="gap-2 border-b border-border pb-4">
        <span className="font-mono text-[10px] tracking-[.08em] text-muted-foreground">
          {task.ref} {task.phaseCode ? `· PHASE ${task.phaseCode} ${task.phaseName?.toUpperCase() ?? ""}` : ""}
        </span>
        <div className="flex items-start justify-between gap-2">
          <Input
            value={titleField.value}
            onChange={(e) => titleField.onChange(e.target.value)}
            className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0 h-auto py-0"
            aria-label="Task title"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <SaveIndicator status={titleField.status} />
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Delete this task?</span>
              <Button type="button" size="sm" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Deleting…" : "Confirm"}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={isDeleting} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmingDelete(true)}>
              Delete task
            </Button>
          )}
        </div>
        {deleteError ? <p className="text-xs text-destructive">{deleteError}</p> : null}
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <SheetDescription className="sr-only">Task details for {task.ref}</SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-5 p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-description">Description</Label>
              <SaveIndicator status={descriptionField.status} />
            </div>
            <Textarea
              id="task-description"
              value={descriptionField.value}
              onChange={(e) => descriptionField.onChange(e.target.value)}
              placeholder="Add a description…"
              className="min-h-24"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Assignee</Label>
                <SaveIndicator status={assigneeField.status} />
              </div>
              <Select
                items={assigneeItems}
                value={assigneeField.value}
                onValueChange={(value) => assigneeField.saveNow(value as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <SaveIndicator status={statusField.status} />
              </div>
              <Select
                items={STATUS_OPTIONS}
                value={statusField.value}
                onValueChange={(value) => statusField.saveNow(value as TaskStatus)}
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-due-date">Due date</Label>
                <SaveIndicator status={dueDateField.status} />
              </div>
              <DatePicker id="task-due-date" value={dueDateField.value} onChange={(value) => dueDateField.saveNow(value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-milestone-date">Client-visible date</Label>
                <SaveIndicator status={clientVisibleDateField.status} />
              </div>
              <DatePicker
                id="task-milestone-date"
                value={clientVisibleDateField.value}
                onChange={(value) => clientVisibleDateField.saveNow(value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Visibility</Label>
                <SaveIndicator status={visibilityField.status} />
              </div>
              <Select
                items={VISIBILITY_OPTIONS}
                value={visibilityField.value}
                onValueChange={(value) => visibilityField.saveNow(value as TaskVisibility)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-critical-path">Critical path</Label>
                <SaveIndicator status={criticalPathField.status} />
              </div>
              <label className="flex h-8 items-center gap-2 text-sm">
                <input
                  id="task-critical-path"
                  type="checkbox"
                  className="size-3.5"
                  checked={criticalPathField.value}
                  onChange={(e) => criticalPathField.saveNow(e.target.checked)}
                />
                {criticalPathField.value ? "On the critical path" : "Not on the critical path"}
              </label>
            </div>

            <div className="flex flex-col gap-1.5 col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-out-of-scope">Scope</Label>
                {isSavingScope ? <span className="text-[10.5px] font-mono tracking-[.04em] text-muted-foreground">Saving…</span> : null}
              </div>
              <label className="flex h-8 items-center gap-2 text-sm">
                <input
                  id="task-out-of-scope"
                  type="checkbox"
                  className="size-3.5"
                  checked={isOutOfScope}
                  disabled={isSavingScope}
                  onChange={(e) => saveScope(e.target.checked, changeRequestId)}
                />
                {isOutOfScope ? "Out of Phase-1 scope" : "In Phase-1 scope"}
              </label>
              {isOutOfScope ? (
                <Select
                  items={approvedChangeRequests.map((cr) => ({ value: cr.id, label: `${cr.ref} — ${cr.title}` }))}
                  value={changeRequestId}
                  disabled={isSavingScope}
                  onValueChange={(value) => saveScope(true, value as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Link an approved change request…" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedChangeRequests.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No approved change requests on this project yet.</div>
                    ) : (
                      approvedChangeRequests.map((cr) => (
                        <SelectItem key={cr.id} value={cr.id}>
                          {cr.ref} — {cr.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : null}
              {scopeError ? <span className="text-xs text-destructive">{scopeError}</span> : null}
            </div>
          </div>

          {task.clientVisibleDate ? (
            <Badge variant="secondary" className="w-fit">
              Milestone
            </Badge>
          ) : null}

          {customFields.length > 0 ? (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                {customFields.map((f) => (
                  <CustomFieldDrawerField
                    key={f.id}
                    taskId={task.id}
                    projectRef={projectRef}
                    fieldId={f.id}
                    fieldName={f.name}
                    initialValue={customValues.get(f.id) ?? ""}
                  />
                ))}
              </div>
            </>
          ) : null}

          <Separator />

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-3">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
                      <span className="text-sm text-foreground">{a.summary}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.actorName} · {formatTimestamp(a.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-3">
              <div className="flex flex-col gap-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {comments.map((c) => (
                      <li key={c.id} className="flex gap-2.5">
                        <Avatar size="sm" className="mt-0.5">
                          <AvatarFallback>{initialsFrom(c.authorName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {c.authorName} <span className="font-normal text-muted-foreground">{formatTimestamp(c.createdAt)}</span>
                          </span>
                          <span className="text-sm text-foreground whitespace-pre-wrap">{c.body}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={submitComment} className="flex flex-col gap-2">
                  <Textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment…"
                    className="min-h-16"
                  />
                  {commentError ? <p className="text-xs text-destructive">{commentError}</p> : null}
                  <Button type="submit" size="sm" className="self-end" disabled={isPosting || !commentBody.trim()}>
                    {isPosting ? "Posting…" : "Post comment"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
