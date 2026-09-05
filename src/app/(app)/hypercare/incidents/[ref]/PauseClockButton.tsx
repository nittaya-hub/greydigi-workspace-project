"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { pauseClock } from "./actions";

export function PauseClockButton({ incidentId, incidentRef }: { incidentId: string; incidentRef: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="ghost" className="!text-[#EDEEF1] !border-white/22" onClick={() => setOpen(true)}>
        Pause clock, with reason
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Pause clock">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await pauseClock(incidentId, incidentRef, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not pause the clock.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="REASON">
            <textarea name="reason" required autoFocus rows={3} className={fieldInputClass} placeholder="Waiting on client to confirm access." />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="coral" type="submit" disabled={isPending}>
            {isPending ? "Pausing..." : "Pause clock"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
