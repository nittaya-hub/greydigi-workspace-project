"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createDecision } from "../actions";

export function NewDecisionButton({ projects }: { projects: { id: string; ref: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        Log decision
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log a decision">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createDecision(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not log the decision.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="MISSION">
            <SelectField
              name="projectId"
              required
              placeholder="Select a mission"
              options={projects.map((p) => ({ value: p.id, label: `${p.ref} — ${p.name}` }))}
            />
          </Field>
          <Field label="DECISION">
            <input name="decision" required autoFocus className={fieldInputClass} placeholder="Ship the client portal without SSO for v1" />
          </Field>
          <Field label="OBJECTION (OPTIONAL)">
            <textarea name="objection" rows={2} className={fieldInputClass} placeholder="What the client (or the team) pushed back on." />
          </Field>
          <Field label="RESOLUTION">
            <textarea name="resolution" required rows={3} className={fieldInputClass} placeholder="How it was resolved, and why." />
          </Field>

          {projects.length === 0 ? <p className="text-[11.5px] text-block-fg leading-[1.5]">No active missions yet.</p> : null}
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || projects.length === 0}>
            {isPending ? "Logging..." : "Log decision"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
