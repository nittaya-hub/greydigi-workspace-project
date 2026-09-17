"use client";

import { useTransition } from "react";
import { fieldInputClass } from "@/components/ui/Modal";

/** One assignee dropdown, reused across incidents/requests/service
 * changes now that each has an assigned_person_id (0068) — feeds "My
 * queue" (/queue), which only shows what's actually assigned. Plain
 * native select + Server Action, matching the lighter-weight pattern
 * already used on service changes/requests, not the Base UI Select +
 * autosave hook the Missions task drawer uses for its own assignee
 * field — that one carries extra machinery (save-status indicator,
 * debounce) this smaller surface doesn't need. */
export function AssigneeSelect({
  value,
  people,
  onAssign,
  className,
}: {
  value: string | null;
  people: { id: string; fullName: string }[];
  onAssign: (personId: string | null) => Promise<void>;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      className={className ?? fieldInputClass}
      value={value ?? ""}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value || null;
        startTransition(() => onAssign(next));
      }}
    >
      <option value="">Unassigned</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.fullName}
        </option>
      ))}
    </select>
  );
}
