"use client";

import { useState, useTransition } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/shadcn/select";
import type { TaskCustomFieldOption } from "@/lib/data/project";
import type { TaskCustomFieldType } from "@/lib/supabase/database.types";
import { setTaskCustomFieldValue, setTaskCustomFieldOption } from "./task-drawer-actions";

const NONE_VALUE = "__none__";

/** One cell of a configurable column, styled to match the built-in
 * Owner/Due/Status cells exactly (same component, same size/font
 * classes) rather than inventing new ones that read as a different
 * size on the same row: calendar reuses the identical DatePicker
 * classes the Due column uses (h-auto, font-mono text-[9.5px]);
 * status reuses the same shadcn Select + SelectTrigger size="sm" +
 * font-mono text-[9px] uppercase shape the built-in Status column
 * uses, just with per-column colours instead of a fixed status map;
 * text edits inline (click, save on blur/Enter, matching the rest of
 * the tasks page's autosave feel). */
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
  const [, startTransition] = useTransition();

  if (fieldType === "calendar") {
    return (
      <DatePicker
        value={initialValue || null}
        onClick={(e) => e.stopPropagation()}
        onChange={(value) => startTransition(() => setTaskCustomFieldValue(taskId, projectRef, fieldId, value))}
        className="h-auto w-full min-w-0 rounded-[6px] border-transparent bg-transparent px-1 py-1 font-mono text-[9.5px] text-muted hover:border-line"
      />
    );
  }

  if (fieldType === "status") {
    const items = [{ value: NONE_VALUE, label: "—" }, ...options.map((o) => ({ value: o.id, label: o.label }))];
    const selected = initialOptionId ? options.find((o) => o.id === initialOptionId) : null;
    return (
      <Select
        items={items}
        value={initialOptionId ?? NONE_VALUE}
        onValueChange={(v) =>
          startTransition(() => setTaskCustomFieldOption(taskId, projectRef, fieldId, v === NONE_VALUE ? null : (v as string)))
        }
      >
        <SelectTrigger
          size="sm"
          onClick={(e) => e.stopPropagation()}
          className="justify-self-start w-full min-w-0 justify-start gap-1 rounded-[5px] border-transparent px-[7px] py-[3px] font-mono text-[9px] tracking-[.06em] uppercase focus-visible:ring-0"
          style={
            selected
              ? { background: `${selected.colorHex}1A`, color: selected.colorHex }
              : { background: "var(--color-idle-bg)", color: "var(--color-muted)" }
          }
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => {
            const opt = options.find((x) => x.id === o.value);
            return (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-1.5">
                  {opt ? <span className="w-2 h-2 rounded-full flex-none" style={{ background: opt.colorHex }} /> : null}
                  {o.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
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
