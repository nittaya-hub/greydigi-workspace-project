"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import type { DecisionRow } from "@/lib/data/project";
import { updateDecision, reviewDecision, toggleDecisionStatus, deleteDecision } from "./actions";

export function EditableDecisionRow({
  decision,
  projectId,
  projectRef,
  canEdit,
}: {
  decision: DecisionRow;
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
              await updateDecision(decision.id, projectId, projectRef, formData);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            }
          });
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="TITLE">
            <input name="title" required defaultValue={decision.title} className={fieldInputClass} />
          </Field>
          <Field label="OWNER">
            <input name="owner" defaultValue={decision.owner ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="WHY IT MATTERS (OPTIONAL)">
            <input name="detail" defaultValue={decision.detail ?? ""} className={fieldInputClass} />
          </Field>
          <Field label="DUE (OPTIONAL)">
            <input name="due_label" defaultValue={decision.dueLabel ?? ""} className={fieldInputClass} />
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
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-ink">{decision.title}</span>
          <Pill tone={decision.status === "closed" ? "done" : "idle"}>{decision.status.toUpperCase()}</Pill>
        </div>
        {decision.detail ? <span className="block text-[11px] text-muted mt-0.5">{decision.detail}</span> : null}
        <span className="block font-mono text-[9.5px] text-muted-2 mt-1">
          {decision.owner ? decision.owner.toUpperCase() : "NO OWNER"} · {decision.dueLabel ?? "no date"}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-none flex-wrap justify-end">
        {decision.reviewedAt ? (
          <Pill tone="done">REVIEWED{decision.reviewedByName ? ` · ${decision.reviewedByName.toUpperCase()}` : ""}</Pill>
        ) : (
          <Pill tone="waiting_on_client">NEEDS REVIEW</Pill>
        )}
        {canEdit ? (
          <>
            <Button variant="secondary" type="button" onClick={() => setEditing(true)} className="!h-6 !px-2 !text-[10.5px]">
              Edit
            </Button>
            {!decision.reviewedAt ? (
              <form action={reviewDecision.bind(null, decision.id, projectId, projectRef)}>
                <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                  Mark reviewed
                </Button>
              </form>
            ) : null}
            <form
              action={toggleDecisionStatus.bind(null, decision.id, projectId, projectRef, decision.status === "closed" ? "open" : "closed")}
            >
              <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                {decision.status === "closed" ? "Reopen" : "Close"}
              </Button>
            </form>
            <form action={deleteDecision.bind(null, decision.id, projectId, projectRef)}>
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
