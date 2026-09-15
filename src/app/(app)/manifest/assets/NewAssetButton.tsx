"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createAsset } from "../actions";

const KIND_OPTIONS = [
  { value: "agent", label: "Agent" },
  { value: "connector", label: "Connector" },
  { value: "prompt", label: "Prompt" },
  { value: "document_template", label: "Document template" },
];

export function NewAssetButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        New asset
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Register an asset">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createAsset(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not register the asset.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="NAME">
            <input name="name" required autoFocus className={fieldInputClass} placeholder="Gate evidence drafting agent" />
          </Field>
          <Field label="KIND">
            <SelectField name="kind" required placeholder="Select a kind" options={KIND_OPTIONS} />
          </Field>
          <Field label="DESCRIPTION">
            <textarea name="description" rows={3} className={fieldInputClass} placeholder="What it does, one line." />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Registering..." : "Register asset"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
