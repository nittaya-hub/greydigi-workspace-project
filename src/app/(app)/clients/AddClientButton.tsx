"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { addClient } from "./actions";

export function AddClientButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        Add client
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add client">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await addClient(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add client.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="NAME">
            <input name="name" required autoFocus className={fieldInputClass} placeholder="Acme Co" />
          </Field>
          <Field label="CLIENT SINCE">
            <input name="clientSince" type="date" className={fieldInputClass} />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add client"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
