"use client";

import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { useAutosaveField } from "./useAutosaveField";
import { setTaskCustomFieldValue } from "./task-drawer-actions";
import { SaveIndicator } from "./TaskDrawer";

/** One configurable column's value, editable inside the task drawer with
 * the same 2s-debounced autosave as title/description — the drawer's own
 * fields grid previously covered only the built-in columns, leaving
 * custom fields reachable solely from CustomFieldCell in the table row. */
export function CustomFieldDrawerField({
  taskId,
  projectRef,
  fieldId,
  fieldName,
  initialValue,
}: {
  taskId: string;
  projectRef: string;
  fieldId: string;
  fieldName: string;
  initialValue: string;
}) {
  const field = useAutosaveField(initialValue, (value) => setTaskCustomFieldValue(taskId, projectRef, fieldId, value));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`custom-field-${fieldId}`}>{fieldName}</Label>
        <SaveIndicator status={field.status} />
      </div>
      <Input id={`custom-field-${fieldId}`} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
    </div>
  );
}
