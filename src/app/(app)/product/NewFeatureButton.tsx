"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createFeature } from "./actions";

const STATUS_OPTIONS = [
  { value: "forecast", label: "Forecast" },
  { value: "committed", label: "Committed" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function NewFeatureButton({ products }: { products: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        New feature
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New feature">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createFeature(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create feature.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="TITLE">
            <input name="title" required autoFocus className={fieldInputClass} placeholder="Agent register versioning" />
          </Field>
          <Field label="DESCRIPTION">
            <textarea name="description" rows={3} className={fieldInputClass} placeholder="Why this matters, in a sentence or two." />
          </Field>
          <Field label="PRODUCT">
            <SelectField name="productId" required placeholder="Select a product" options={products.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label="STATUS">
            <SelectField name="status" defaultValue="forecast" options={STATUS_OPTIONS} />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || products.length === 0}>
            {isPending ? "Creating..." : "Create feature"}
          </Button>
          {products.length === 0 ? (
            <p className="text-[11px] text-muted leading-[1.5]">No products yet — create one under Products first.</p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
