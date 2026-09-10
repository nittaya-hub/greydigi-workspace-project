"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { withTimeout } from "@/lib/withTimeout";
import { createTaskInline } from "./task-drawer-actions";

/** Asana-style "+ Add task" row at the bottom of a phase group — click
 * (or focus) to reveal a bare input, Enter creates the task immediately
 * (no modal, no separate save step) and keeps focus so you can keep
 * typing the next one. Replaces the old header "New task" button. */
export function InlineAddTaskRow({
  projectId,
  projectRef,
  phaseId,
  isLast,
}: {
  projectId: string;
  projectRef: string;
  phaseId: string | null;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    setError(null);
    // Clears immediately (optimistic) so typing the next task never
    // waits on the round trip — restores the text if the write fails or
    // hangs past 10s (withTimeout).
    setValue("");
    inputRef.current?.focus();
    startTransition(async () => {
      try {
        await withTimeout(createTaskInline(projectId, projectRef, phaseId, trimmed));
      } catch (err) {
        setValue(trimmed);
        setError(err instanceof Error ? err.message : "Could not add task.");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`w-full text-left px-4 py-[9px] text-[11.5px] text-muted-2 hover:bg-canvas hover:text-ink flex items-center gap-1.5 ${
          isLast ? "" : "border-b border-line-soft"
        }`}
      >
        <Plus size={13} /> Add task
      </button>
    );
  }

  return (
    <div className={`px-4 py-2 flex flex-col gap-1 ${isLast ? "" : "border-b border-line-soft"}`}>
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setValue("");
            setEditing(false);
          }
        }}
        onBlur={() => {
          if (!value.trim()) setEditing(false);
        }}
        placeholder="Task name, press Enter to add"
        className="w-full text-[12.5px] bg-white border border-line rounded-[7px] px-2.5 py-1.5 outline-none focus:border-coral"
      />
      {error ? <span className="text-[10.5px] text-block-fg">{error}</span> : null}
    </div>
  );
}
