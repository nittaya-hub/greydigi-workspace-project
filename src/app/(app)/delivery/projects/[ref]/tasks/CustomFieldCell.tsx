"use client";

import { useState, useTransition } from "react";
import { setTaskCustomFieldValue } from "./task-drawer-actions";

/** One cell of a configurable column — click to edit, saves on blur or
 * Enter (no separate save button, matches the rest of the tasks page's
 * autosave feel). */
export function CustomFieldCell({
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
