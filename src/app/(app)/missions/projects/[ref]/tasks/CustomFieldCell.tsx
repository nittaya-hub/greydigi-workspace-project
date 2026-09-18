"use client";

import { useState, useTransition } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import type { TaskCustomFieldOption } from "@/lib/data/project";
import type { TaskCustomFieldType } from "@/lib/supabase/database.types";
import { setTaskCustomFieldValue, setTaskCustomFieldOption } from "./task-drawer-actions";

/** One cell of a configurable column -- text edits inline (click,
 * save on blur/Enter, matching the rest of the tasks page's autosave
 * feel); calendar reuses the exact same DatePicker every due-date
 * cell already uses; status is a plain <select> of colour swatches --
 * a native select rather than a custom dropdown keeps this consistent
 * with the fact that a real click target on a phone is what "status"
 * actually needs here, not a fancier widget. */
export function CustomFieldCell({
  taskId,
  projectRef,
  fieldId,
  fieldType,
  options,
  initialValue,
  initialOptionId,
}: {
  taskId: string;
  projectRef: string;
  fieldId: string;
  fieldType: TaskCustomFieldType;
  options: TaskCustomFieldOption[];
  initialValue: string;
  initialOptionId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (fieldType === "calendar") {
    return (
      <DatePicker
        value={initialValue || null}
        onClick={(e) => e.stopPropagation()}
        onChange={(value) => startTransition(() => setTaskCustomFieldValue(taskId, projectRef, fieldId, value))}
        className="w-full min-w-0 rounded-[6px] border-transparent bg-transparent px-1 py-0.5 text-[11.5px] text-ink hover:border-line"
      />
    );
  }

  if (fieldType === "status") {
    const selected = initialOptionId ? options.find((o) => o.id === initialOptionId) : null;
    return (
      <select
        value={initialOptionId ?? ""}
        disabled={isPending}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) =>
          startTransition(() => setTaskCustomFieldOption(taskId, projectRef, fieldId, e.target.value || null))
        }
        className="w-full min-w-0 text-[11px] font-semibold rounded-[6px] border px-1.5 py-1 outline-none"
        style={
          selected
            ? { background: `${selected.colorHex}1A`, color: selected.colorHex, borderColor: `${selected.colorHex}40` }
            : { background: "transparent", color: "var(--color-muted-2)", borderColor: "transparent" }
        }
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return <TextCell taskId={taskId} projectRef={projectRef} fieldId={fieldId} initialValue={initialValue} />;
}

function TextCell({
  taskId,
  projectRef,
  fieldId,
  initialValue,
}: {
  taskId: string;
  projectRef: string;
  fieldId: string;
  initialValue: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function save() {
    setEditing(false);
    if (value === initialValue) return;
    startTransition(() => {
      setTaskCustomFieldValue(taskId, projectRef, fieldId, value).catch(() => setValue(initialValue));
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }}
        className="text-left text-[11.5px] text-ink truncate min-w-0 hover:bg-canvas rounded-[4px] px-1 -mx-1 py-0.5"
      >
        {value || <span className="text-muted-2">—</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={value}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape") {
          setValue(initialValue);
          setEditing(false);
        }
      }}
      className="w-full text-[11.5px] bg-white border border-coral rounded-[5px] px-1.5 py-0.5 outline-none"
    />
  );
}
