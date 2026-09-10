"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { revertGateCondition } from "./actions";

/** Workspace-admin-only undo for a met/waived condition, for the
 * "clicked the wrong one" case — the same class of mistake as any other
 * accountable action in the flight plan spine, so it gets the same
 * treatment the spine already gives an override: a written reason,
 * stamped and logged (fn_log_activity), never silent. Not something the
 * aironauts flight plan document itself specifies — it only defines the
 * override policy for a *failing* condition (page 3's "A failing
 * condition can be overridden by a workspace admin with a written
 * reason"). Reverting a condition that's already met or waived back to
 * open is an operational safety net this app adds on top of that, in
 * the same spirit: admin-only, reasoned, and never hidden. */
export function RevertConditionButton({
  conditionId,
  projectId,
  projectRef,
}: {
  conditionId: string;
  projectId: string;
  projectRef: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[9px] tracking-[.05em] rounded-[5px] border border-line px-2 py-1 text-muted hover:text-ink"
      >
        REVERT
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Revert this condition">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                await revertGateCondition(conditionId, projectId, projectRef, reason);
                setOpen(false);
                setReason("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not revert.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
            Puts this condition back to open — for a mistaken click, not a real change of mind on whether it holds
            true. If it re-clears its gate, that is the state engine doing its job, not something to undo
            separately. Workspace admin only.
          </p>
          <Field label="REASON">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              autoFocus
              rows={3}
              className={fieldInputClass}
              placeholder="Why this condition is being reverted to open..."
            />
          </Field>
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}
          <Button variant="coral" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Revert condition"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
