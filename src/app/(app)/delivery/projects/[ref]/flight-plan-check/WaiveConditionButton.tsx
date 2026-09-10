"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { waiveGateCondition } from "./actions";

export function WaiveConditionButton({
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
        OVERRIDE
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Override this condition">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                await waiveGateCondition(conditionId, projectId, projectRef, reason);
                setOpen(false);
                setReason("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not override.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
            The override is stamped on the gate, shown on the project overview, and never hidden from the client
            update. Workspace admin only.
          </p>
          <Field label="REASON">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              autoFocus
              rows={3}
              className={fieldInputClass}
              placeholder="Why this condition is being overridden..."
            />
          </Field>
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}
          <Button variant="coral" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Override condition"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
