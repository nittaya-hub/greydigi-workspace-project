"use client";

import { X } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteTaskCustomField } from "./task-drawer-actions";

/** A custom column's header label plus its delete affordance — added
 * because the "+" button to add a column had no matching "−" anywhere,
 * so a stray test column (e.g. "TEST") had no way back out. Confirms
 * first since deleting the field deletes every task's value in it too,
 * across the whole project, not just this view. */
export function CustomFieldColumnHeader({
  fieldId,
  name,
  projectId,
  projectRef,
}: {
  fieldId: string;
  name: string;
  projectId: string;
  projectRef: string;
}) {
  return (
    <span className="group flex items-center gap-1 min-w-0">
      <span className="truncate">{name.toUpperCase()}</span>
      <ConfirmButton
        trigger={<X size={11} />}
        triggerClassName="flex-none w-4 h-4 flex items-center justify-center rounded-[4px] text-muted-2 opacity-0 group-hover:opacity-100 hover:text-block-fg hover:bg-block-bg normal-case"
        title="Delete column"
        message={
          <>
            Delete the &ldquo;{name}&rdquo; column and every task&rsquo;s value in it, across this whole project.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete column"
        onConfirm={async () => {
          await deleteTaskCustomField(fieldId, projectId, projectRef);
        }}
      />
    </span>
  );
}
