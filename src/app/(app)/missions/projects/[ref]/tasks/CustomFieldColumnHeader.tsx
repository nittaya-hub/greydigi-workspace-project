"use client";

import { useState, useTransition } from "react";
import { X, Settings2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle } from "@/components/shadcn/popover";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import type { TaskCustomFieldOption } from "@/lib/data/project";
import {
  deleteTaskCustomField,
  addTaskCustomFieldOption,
  updateTaskCustomFieldOption,
  deleteTaskCustomFieldOption,
} from "./task-drawer-actions";

/** A custom column's header label, its delete affordance, and — for a
 * status column — a "Manage options" popover to add/rename/recolour/
 * remove its option set after creation (creation-time options come
 * from AddColumnButton itself). */
export function CustomFieldColumnHeader({
  fieldId,
  name,
  fieldType,
  options,
  projectId,
  projectRef,
}: {
  fieldId: string;
  name: string;
  fieldType: "text" | "calendar" | "status";
  options: TaskCustomFieldOption[];
  projectId: string;
  projectRef: string;
}) {
  return (
    <span className="group flex items-center gap-1 min-w-0">
      <span className="truncate">{name.toUpperCase()}</span>
      {fieldType === "status" ? <ManageOptionsPopover fieldId={fieldId} options={options} projectRef={projectRef} /> : null}
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

function ManageOptionsPopover({
  fieldId,
  options,
  projectRef,
}: {
  fieldId: string;
  options: TaskCustomFieldOption[];
  projectRef: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#8C9092");

  function run(fn: () => Promise<void>) {
    startTransition(fn);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Manage options"
            title="Manage options"
            className="flex-none w-4 h-4 flex items-center justify-center rounded-[4px] text-muted-2 opacity-0 group-hover:opacity-100 hover:text-ink normal-case"
          />
        }
      >
        <Settings2 size={11} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] normal-case font-sans">
        <PopoverHeader>
          <PopoverTitle>Options</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-1.5">
          {options.map((o) => (
            <div key={o.id} className="flex items-center gap-1.5">
              <input
                type="color"
                defaultValue={o.colorHex}
                disabled={isPending}
                onChange={(e) => run(() => updateTaskCustomFieldOption(o.id, projectRef, { label: o.label, colorHex: e.target.value }))}
                className="h-7 w-7 flex-none rounded-[6px] border border-border"
              />
              <Input
                defaultValue={o.label}
                disabled={isPending}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim();
                  if (trimmed && trimmed !== o.label) run(() => updateTaskCustomFieldOption(o.id, projectRef, { label: trimmed, colorHex: o.colorHex }));
                }}
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => deleteTaskCustomFieldOption(o.id, projectRef))}
                className="flex-none w-6 h-6 flex items-center justify-center rounded-[5px] text-muted-foreground hover:text-foreground"
                aria-label="Delete option"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pt-1 border-t border-border">
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-7 w-7 flex-none rounded-[6px] border border-border" />
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New option" />
            <Button
              type="button"
              size="icon-sm"
              disabled={isPending || !newLabel.trim()}
              onClick={() =>
                run(async () => {
                  await addTaskCustomFieldOption(fieldId, projectRef, { label: newLabel, colorHex: newColor });
                  setNewLabel("");
                })
              }
            >
              +
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
