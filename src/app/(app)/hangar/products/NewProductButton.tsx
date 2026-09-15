"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { createProduct } from "./actions";

export function NewProductButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        New product
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New product">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createProduct(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create product.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="NAME">
            <input name="name" required autoFocus className={fieldInputClass} placeholder="Agent register" />
          </Field>
          <Field label="DESCRIPTION">
            <textarea name="description" rows={3} className={fieldInputClass} placeholder="Reusable capability, one line." />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create product"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
