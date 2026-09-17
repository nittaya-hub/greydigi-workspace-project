"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import type { ProgressStatRow } from "@/lib/data/project";
import { updateProgressStat, reviewProgressStat, deleteProgressStat } from "./actions";

export function EditableStatRow({
  stat,
  projectId,
  projectRef,
  canEdit,
}: {
  stat: ProgressStatRow;
  projectId: string;
  projectRef: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing && canEdit) {
    return (
      <form
        className="flex flex-col gap-2 px-3 py-2.5 border border-coral rounded-[9px]"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await updateProgressStat(stat.id, projectId, projectRef, formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            }
          });
        }}
      >
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
          <Field label="LABEL">
            <input name="label" required defaultValue={stat.label} className={fieldInputClass} />
          </Field>
          <Field label="VALUE">
            <input name="value" required defaultValue={stat.value} className={fieldInputClass} />
          </Field>
          <Field label="NOTE (OPTIONAL)">
            <input name="note" defaultValue={stat.note ?? ""} className={fieldInputClass} />
          </Field>
        </div>
        {error ? <p className="m-0 text-[11px] text-block-fg">{error}</p> : null}
        <div className="flex gap-2">
          <Button variant="primary" type="submit" disabled={isPending} className="!h-6 !px-2 !text-[10.5px]">
            {isPending ? "Saving..." : "Save"}
          </Button>
          <Button variant="secondary" type="button" onClick={() => setEditing(false)} className="!h-6 !px-2 !text-[10.5px]">
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 border border-line-soft rounded-[9px]">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[16px] text-ink">{stat.value}</span>
          <span className="text-[11.5px] font-semibold text-ink">{stat.label}</span>
        </div>
        {stat.note ? <span className="block text-[11px] text-muted mt-0.5">{stat.note}</span> : null}
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        {stat.reviewedAt ? (
          <Pill tone="done">REVIEWED{stat.reviewedByName ? ` · ${stat.reviewedByName.toUpperCase()}` : ""}</Pill>
        ) : (
          <Pill tone="waiting_on_client">NEEDS REVIEW</Pill>
        )}
        {canEdit ? (
          <>
            <Button variant="secondary" type="button" onClick={() => setEditing(true)} className="!h-6 !px-2 !text-[10.5px]">
              Edit
            </Button>
            {!stat.reviewedAt ? (
              <form action={reviewProgressStat.bind(null, stat.id, projectId, projectRef)}>
                <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                  Mark reviewed
                </Button>
              </form>
            ) : null}
            <form action={deleteProgressStat.bind(null, stat.id, projectId, projectRef)}>
              <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                Delete
              </Button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
