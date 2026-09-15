"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addTaskCustomField } from "./task-drawer-actions";

/** "+" affordance in the table header — adds a new configurable column to
 * every task row in this project. Free text only, name must be unique per
 * project. No modal: click, type, Enter. */
export function AddColumnButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addTaskCustomField(projectId, projectRef, trimmed);
        setValue("");
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add column.");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Add column"
        title="Add column"
        className="w-6 h-6 flex items-center justify-center rounded-[5px] text-muted-2 hover:text-ink hover:bg-canvas justify-self-end"
      >
        <Plus size={13} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 justify-self-end">
      <input
        ref={inputRef}
        autoFocus
        value={value}
        disabled={isPending}
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
          else submit();
        }}
        placeholder="Column name"
        className="w-[110px] text-[10.5px] bg-white border border-line rounded-[6px] px-2 py-1 outline-none focus:border-coral normal-case font-sans"
      />
      {error ? <span className="text-[9.5px] text-block-fg normal-case">{error}</span> : null}
    </div>
  );
}
