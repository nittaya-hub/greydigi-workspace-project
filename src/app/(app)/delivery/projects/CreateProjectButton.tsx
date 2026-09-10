"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { DatePicker } from "@/components/ui/DatePicker";
import { createProject } from "./actions";
import type { CreateProjectOptions } from "./create-project-data";

/** The primary create flow of the app: opens a modal that inserts a
 * `projects` row and clones its phases/gates from the chosen locked
 * template version (see ./actions.ts). Used both as the "Create project"
 * header action and the "Create from template" empty-state action — same
 * component, same modal, so the two triggers never diverge in behavior. */
export function CreateProjectButton({
  options,
  triggerLabel = "Create phase",
  triggerVariant = "primary",
}: {
  options: CreateProjectOptions;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button variant={triggerVariant} className="flex-none" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create phase">
        <p className="m-0 -mt-1 mb-1 text-[11px] text-muted leading-[1.5]">
          Each phase is its own engagement, with its own flight plan — a client with a Phase 1 in Singapore and a
          Phase 2 in Hong Kong runs them as two separate ones, never merged.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                const result = await createProject(formData);
                setOpen(false);
                e.currentTarget?.reset();
                router.push(`/delivery/projects/${result.ref.toLowerCase()}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create phase.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="CLIENT">
            <SelectField name="clientId" required placeholder="Select a client" options={options.clients.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="REF">
            <input name="ref" required autoFocus className={fieldInputClass} placeholder="NK-P2" />
          </Field>
          <Field label="PHASE NAME">
            <input name="name" required className={fieldInputClass} placeholder="NK Core, Phase 2: order to procurement, Hong Kong" />
          </Field>
          <Field label="DESCRIPTION">
            <textarea name="description" rows={3} className={fieldInputClass} placeholder="What this engagement covers." />
          </Field>
          <Field label="TEMPLATE VERSION">
            <SelectField
              name="templateVersionId"
              required
              placeholder="Select a locked template version"
              options={options.templateVersions.map((v) => ({ value: v.id, label: v.label }))}
            />
          </Field>
          <Field label="LEAD (OPTIONAL)">
            <SelectField
              name="leadPersonId"
              defaultValue=""
              options={[{ value: "", label: "No lead assigned" }, ...options.leadPeople.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </Field>
          <Field label="GO LIVE TARGET (OPTIONAL)">
            <DatePicker name="goLiveTarget" />
          </Field>

          {options.templateVersions.length === 0 ? (
            <p className="text-[11.5px] text-block-fg leading-[1.5]">
              No locked template version exists yet. Lock a template version before a project can be created from it.
            </p>
          ) : null}

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || options.templateVersions.length === 0}>
            {isPending ? "Creating..." : "Create phase"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
