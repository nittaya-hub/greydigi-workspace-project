"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { updateSubmissionAssignee } from "./actions";
import type { WorkspacePersonOption } from "@/lib/data/project";

const UNASSIGNED = "__unassigned__";

/** Same optimistic-update shape as SubmissionStatusSelect, just for the
 * assignee FK instead of status -- the picker's pool is every internal
 * person in the workspace (getWorkspaceInternalPeople), same as the
 * Tasks drawer's own assignee picker, not just people on this client. */
export function SubmissionAssigneeSelect({
  submissionId,
  assigneePersonId,
  people,
}: {
  submissionId: string;
  assigneePersonId: string | null;
  people: WorkspacePersonOption[];
}) {
  const [value, setValue] = useState(assigneePersonId ?? UNASSIGNED);
  const [isPending, startTransition] = useTransition();

  const items = [{ value: UNASSIGNED, label: "Unassigned" }, ...people.map((p) => ({ value: p.id, label: p.fullName }))];

  return (
    <Select
      value={value}
      disabled={isPending}
      items={items}
      onValueChange={(next) => {
        const nextValue = next ?? UNASSIGNED;
        setValue(nextValue);
        startTransition(async () => {
          try {
            await updateSubmissionAssignee(submissionId, nextValue === UNASSIGNED ? null : nextValue);
          } catch {
            setValue(assigneePersonId ?? UNASSIGNED);
          }
        });
      }}
    >
      <SelectTrigger className="h-auto rounded-[6px] border-transparent px-2 py-1 text-[10.5px] justify-self-start text-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((it) => (
          <SelectItem key={it.value} value={it.value} className="text-[11px]">
            {it.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
