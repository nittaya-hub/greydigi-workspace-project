"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import type { WeeklyCommitmentRow } from "@/lib/data/project";
import { updateCommitment, reviewCommitment, deleteCommitment } from "./actions";

export function EditableCommitmentRow({
  commitment,
  projectId,
  projectRef,
}: {
  commitment: WeeklyCommitmentRow;
  projectId: string;
  projectRef: string;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <form
        className="flex flex-col gap-2 px-3 py-2.5 border border-coral rounded-[9px]"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            try {
              await updateCommitment(commitment.id, projectId, projectRef, formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            }
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="PERIOD">
            <input name="period_label" required defaultValue={commitment.periodLabel} className={fieldInputClass} />
          </Field>
          <Field label="OWNER">
            <input name="owner_label" required defaultValue={commitment.ownerLabel} className={fieldInputClass} />
          </Field>
        </div>
        <Field label="ITEMS (ONE PER LINE)">
          <textarea name="items" rows={3} defaultValue={commitment.items.join("\n")} className={fieldInputClass} />
        </Field>
        <label className="flex items-center gap-2 text-[11.5px] text-muted">
          <input type="checkbox" name="accent" defaultChecked={commitment.accent} />
          Highlight this card (e.g. commitments from the client)
        </label>
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
    <div
      className={`flex items-start justify-between gap-3 px-3 py-2.5 border rounded-[9px] ${
        commitment.accent ? "border-coral" : "border-line-soft"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ink">{commitment.periodLabel}</span>
          <span className="font-mono text-[9px] text-muted-2">{commitment.ownerLabel.toUpperCase()}</span>
        </div>
        <ul className="m-0 mt-1 pl-4 flex flex-col gap-0.5">
          {commitment.items.map((item, i) => (
            <li key={i} className="text-[11.5px] text-muted leading-[1.5]">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        {commitment.reviewedAt ? (
          <Pill tone="done">REVIEWED{commitment.reviewedByName ? ` · ${commitment.reviewedByName.toUpperCase()}` : ""}</Pill>
        ) : (
          <Pill tone="waiting_on_client">NEEDS REVIEW</Pill>
        )}
        <Button variant="secondary" type="button" onClick={() => setEditing(true)} className="!h-6 !px-2 !text-[10.5px]">
          Edit
        </Button>
        {!commitment.reviewedAt ? (
          <form action={reviewCommitment.bind(null, commitment.id, projectId, projectRef)}>
            <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
              Mark reviewed
            </Button>
          </form>
        ) : null}
        <form action={deleteCommitment.bind(null, commitment.id, projectId, projectRef)}>
          <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
            Delete
          </Button>
        </form>
      </div>
    </div>
  );
}
