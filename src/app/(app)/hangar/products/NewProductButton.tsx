"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createProduct } from "./actions";
import type { TemplateVersionOption } from "@/lib/data/product";

export function NewProductButton({ templateOptions }: { templateOptions: TemplateVersionOption[] }) {
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
          <Field label="DELIVERY TEMPLATE (OPTIONAL, MARKET TRACK ONLY)">
            <SelectField
              name="deliveryTemplateVersionId"
              defaultValue=""
              options={[{ value: "", label: "None — internal / platform capability" }, ...templateOptions.map((t) => ({ value: t.id, label: t.label }))]}
            />
          </Field>
          <p className="m-0 -mt-1 text-[10.5px] text-muted leading-[1.4]">
            Set this only for a market product sold to clients — a sale then opens a mission that clones this
            template, carrying the product's scope with it.
          </p>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create product"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
