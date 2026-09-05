"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createRequest } from "./actions";

export function NewRequestButton({ services }: { services: { id: string; ref: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        New request
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New request">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createRequest(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create request.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="SERVICE">
            <SelectField
              name="serviceId"
              required
              placeholder="Select a service"
              options={services.map((s) => ({ value: s.id, label: `${s.ref} · ${s.name}` }))}
            />
          </Field>
          <Field label="TITLE">
            <input name="title" required autoFocus className={fieldInputClass} placeholder="Add a second recall reminder channel" />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || services.length === 0}>
            {isPending ? "Creating..." : "Create request"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
