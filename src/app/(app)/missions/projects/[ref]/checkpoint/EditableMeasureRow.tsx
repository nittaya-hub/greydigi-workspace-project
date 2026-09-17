"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import type { BaselineMeasureRow } from "@/lib/data/project";
import { updateBaselineMeasure, reviewBaselineMeasure, deleteBaselineMeasure } from "./actions";

export function EditableMeasureRow({
  measure,
  projectId,
  projectRef,
  canEdit,
}: {
  measure: BaselineMeasureRow;
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
              await updateBaselineMeasure(measure.id, projectId, projectRef, formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            }
          });
        }}
      >
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2">
          <Field label="MEASURE">
            <input name="measure_name" required defaultValue={measure.measureName} className={fieldInputClass} />
          </Field>
          <Field label="TODAY">
            <input name="today_value" required defaultValue={measure.todayValue} className={fieldInputClass} />
          </Field>
          <Field label="AFTER">
            <input name="after_value" required defaultValue={measure.afterValue} className={fieldInputClass} />
          </Field>
          <Field label="BASELINED WHEN (OPTIONAL)">
            <input name="baselined_when" defaultValue={measure.baselinedWhen ?? ""} className={fieldInputClass} />
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
        <span className="block text-[12px] font-semibold text-ink">{measure.measureName}</span>
        <span className="block text-[11px] text-muted mt-0.5">
          Today: {measure.todayValue} → After: {measure.afterValue}
        </span>
        {measure.baselinedWhen ? (
          <span className="block font-mono text-[9.5px] text-muted-2 mt-1">BASELINED {measure.baselinedWhen.toUpperCase()}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        {measure.reviewedAt ? (
          <Pill tone="done">REVIEWED{measure.reviewedByName ? ` · ${measure.reviewedByName.toUpperCase()}` : ""}</Pill>
        ) : (
          <Pill tone="waiting_on_client">NEEDS REVIEW</Pill>
        )}
        {canEdit ? (
          <>
            <Button variant="secondary" type="button" onClick={() => setEditing(true)} className="!h-6 !px-2 !text-[10.5px]">
              Edit
            </Button>
            {!measure.reviewedAt ? (
              <form action={reviewBaselineMeasure.bind(null, measure.id, projectId, projectRef)}>
                <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                  Mark reviewed
                </Button>
              </form>
            ) : null}
            <form action={deleteBaselineMeasure.bind(null, measure.id, projectId, projectRef)}>
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
