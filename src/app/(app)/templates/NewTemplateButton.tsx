"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { createTemplate } from "./actions";

/** Backs both the "New template" primary action and the empty state's
 * "Import greydigi standard" action — the latter just opens the same modal
 * pre-filled with the seed data's template name, editable before submit. */
export function NewTemplateButton({
  label = "New template",
  variant = "primary",
  defaultName = "",
}: {
  label?: string;
  variant?: ButtonVariant;
  defaultName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant={variant} className="flex-none" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New template">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createTemplate(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create template.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="NAME">
            <input
              name="name"
              required
              autoFocus
              defaultValue={defaultName}
              className={fieldInputClass}
              placeholder="Automation delivery, standard"
            />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create template"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
