"use client";

import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { DatePicker } from "@/components/ui/DatePicker";
import { useAutosaveField } from "./useAutosaveField";
import { setTaskCustomFieldValue, setTaskCustomFieldOption } from "./task-drawer-actions";
import { SaveIndicator } from "./TaskDrawer";
import type { TaskCustomFieldOption } from "@/lib/data/project";
import type { TaskCustomFieldType } from "@/lib/supabase/database.types";

/** One configurable column's value inside the task drawer -- text and
 * calendar autosave with the same 2s-debounced pattern as title/
 * description; status saves immediately on pick (saveNow), same as
 * every other select-driven field in this drawer. One useAutosaveField
 * call regardless of type (Rules of Hooks) -- which value/save-fn it
 * wraps just depends on fieldType, decided once per render. */
export function CustomFieldDrawerField({
  taskId,
  projectRef,
  fieldId,
  fieldName,
  fieldType,
  options,
  initialValue,
  initialOptionId,
}: {
  taskId: string;
  projectRef: string;
  fieldId: string;
  fieldName: string;
  fieldType: TaskCustomFieldType;
  options: TaskCustomFieldOption[];
  initialValue: string;
  initialOptionId: string | null;
}) {
  const isStatus = fieldType === "status";
  const field = useAutosaveField(isStatus ? initialOptionId ?? "" : initialValue, (value) =>
    isStatus ? setTaskCustomFieldOption(taskId, projectRef, fieldId, value || null) : setTaskCustomFieldValue(taskId, projectRef, fieldId, value)
  );

  if (fieldType === "calendar") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>{fieldName}</Label>
          <SaveIndicator status={field.status} />
        </div>
        <DatePicker value={field.value || null} onChange={(value) => field.saveNow(value)} />
      </div>
    );
  }

  if (isStatus) {
    const selected = field.value ? options.find((o) => o.id === field.value) : null;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`custom-field-${fieldId}`}>{fieldName}</Label>
          <SaveIndicator status={field.status} />
        </div>
        <select
          id={`custom-field-${fieldId}`}
          value={field.value}
          onChange={(e) => field.saveNow(e.target.value)}
          className="w-full text-[12.5px] font-semibold rounded-[8px] border px-2.5 py-1.5 outline-none"
          style={
            selected
              ? { background: `${selected.colorHex}1A`, color: selected.colorHex, borderColor: `${selected.colorHex}40` }
              : { background: "var(--background)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
          }
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

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
