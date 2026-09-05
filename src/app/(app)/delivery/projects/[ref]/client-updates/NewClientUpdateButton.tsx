"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { createClientUpdate } from "./actions";

export function NewClientUpdateButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        New update
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New client update">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createClientUpdate(projectId, projectRef, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create update.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="TITLE">
            <input name="title" required autoFocus className={fieldInputClass} placeholder="Phase 1 kicked off, deploy sprint underway" />
          </Field>
          <Field label="BODY">
            <textarea
              name="body"
              required
              rows={5}
              className={fieldInputClass}
              placeholder="A dated narrative the client will read..."
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] text-ink">
            <input name="publishNow" type="checkbox" className="w-3.5 h-3.5" />
            Publish now
          </label>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save update"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
