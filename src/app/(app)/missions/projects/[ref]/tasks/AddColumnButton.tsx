"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle } from "@/components/shadcn/popover";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/shadcn/select";
import type { TaskCustomFieldType } from "@/lib/supabase/database.types";
import { addTaskCustomField } from "./task-drawer-actions";

const TYPE_OPTIONS: { value: TaskCustomFieldType; label: string; hint: string }[] = [
  { value: "text", label: "Text", hint: "Free text, typed in per task." },
  { value: "calendar", label: "Calendar", hint: "A date, same picker as Due." },
  { value: "status", label: "Status", hint: "A closed set of colour-coded options." },
];

const DEFAULT_STATUS_COLORS = ["#F2583E", "#1F2738", "#2F5D3F", "#8A5A16", "#6E4FA3"];

/** "+" affordance in the table header — adds a new configurable column,
 * with a real type (text/calendar/status), replacing the old free-
 * text-only, no-modal version. Status columns build their option list
 * right here, so "Create" produces a fully working column in one call
 * (see addTaskCustomField, which inserts the field and every option
 * together). Native shadcn Popover/Select — same primitives, same
 * theme tokens as everything else in this app. */
export function AddColumnButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<TaskCustomFieldType>("text");
  const [options, setOptions] = useState<{ label: string; colorHex: string }[]>([{ label: "", colorHex: DEFAULT_STATUS_COLORS[0] }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setFieldType("text");
    setOptions([{ label: "", colorHex: DEFAULT_STATUS_COLORS[0] }]);
    setError(null);
  }

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Column name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await addTaskCustomField(projectId, projectRef, {
          name: trimmed,
          fieldType,
          options: fieldType === "status" ? options : undefined,
        });
        reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add column.");
      }
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Add column"
            title="Add column"
            className="w-6 h-6 flex items-center justify-center rounded-[5px] text-muted-2 hover:text-ink hover:bg-canvas justify-self-end"
          />
        }
      >
        <Plus size={13} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] normal-case font-sans">
        <PopoverHeader>
          <PopoverTitle>Add column</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-column-name">Name</Label>
            <Input id="new-column-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priority" autoFocus />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Type</Label>
            <Select items={TYPE_OPTIONS} value={fieldType} onValueChange={(v) => setFieldType(v as TaskCustomFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10.5px] text-muted-foreground">{TYPE_OPTIONS.find((t) => t.value === fieldType)?.hint}</span>
          </div>

          {fieldType === "status" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Options</Label>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={o.colorHex}
                    onChange={(e) =>
                      setOptions((prev) => prev.map((opt, j) => (j === i ? { ...opt, colorHex: e.target.value } : opt)))
                    }
                    className="h-8 w-8 flex-none rounded-[6px] border border-border"
                  />
                  <Input
                    value={o.label}
                    onChange={(e) => setOptions((prev) => prev.map((opt, j) => (j === i ? { ...opt, label: e.target.value } : opt)))}
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                      className="flex-none w-6 h-6 flex items-center justify-center rounded-[5px] text-muted-foreground hover:text-foreground"
                      aria-label="Remove option"
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  setOptions((prev) => [...prev, { label: "", colorHex: DEFAULT_STATUS_COLORS[prev.length % DEFAULT_STATUS_COLORS.length] }])
                }
              >
                Add option
              </Button>
            </div>
          ) : null}

          {error ? <span className="text-[11px] text-destructive">{error}</span> : null}

          <div className="flex gap-2 pt-1">
            <Button type="button" size="sm" disabled={isPending} onClick={submit}>
              {isPending ? "Adding..." : "Add column"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
