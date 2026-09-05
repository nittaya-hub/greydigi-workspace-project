"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { escalateFurther } from "./actions";

export function EscalateFurtherButton({ escalationId, people }: { escalationId: string; people: { id: string; fullName: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Escalate further
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Escalate further">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await escalateFurther(escalationId, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not escalate further.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="WHY">
            <textarea name="reason" required autoFocus rows={3} className={fieldInputClass} placeholder="Why this needs to go further." />
          </Field>
          <Field label="ESCALATE TO">
            <SelectField
              name="escalatedToPersonId"
              required
              placeholder="Select a person"
              options={people.map((p) => ({ value: p.id, label: p.fullName }))}
            />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || people.length === 0}>
            {isPending ? "Escalating..." : "Escalate further"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
