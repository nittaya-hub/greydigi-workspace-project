"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { createChangeRequest } from "./actions";

export function RaiseChangeRequestButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        Raise CR
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Raise change request">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createChangeRequest(projectId, projectRef, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not raise change request.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="TITLE">
            <input name="title" required autoFocus className={fieldInputClass} placeholder="Add multi-location prep sheet split" />
          </Field>
          <Field label="DESCRIPTION">
            <textarea name="description" rows={4} className={fieldInputClass} placeholder="What's changing, and why." />
          </Field>
          <Field label="RAISED FROM (OPTIONAL, E.G. INC-114)">
            <input name="raisedFromRef" className={fieldInputClass} placeholder="INC-114" />
          </Field>

          <div className="grid grid-cols-3 gap-2.5">
            <Field label="IMPACT ON DATES (DAYS)">
              <input name="impactDatesDays" type="number" className={fieldInputClass} placeholder="+5" />
            </Field>
            <Field label="IMPACT ON EFFORT">
              <input name="impactEffort" className={fieldInputClass} placeholder="2 dev-days" />
            </Field>
            <Field label="IMPACT ON PRICE">
              <input name="impactPrice" className={fieldInputClass} placeholder="SGD 1,200" />
            </Field>
          </div>
          <p className="m-0 -mt-1 text-[10.5px] text-muted leading-[1.4]">
            Every CR names its impact before it can be sent for approval — leave blank only if this one truly has none.
          </p>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Raising..." : "Raise CR"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
