"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createProjectForClient } from "./actions";
import type { TemplateVersionOption, InternalPersonOption } from "./data";

export function NewProjectButton({
  clientId,
  templateVersions,
  leadOptions,
}: {
  clientId: string;
  templateVersions: TemplateVersionOption[];
  leadOptions: InternalPersonOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        New project
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createProjectForClient(clientId, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create project.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="TEMPLATE">
            <SelectField
              name="templateVersionId"
              required
              placeholder="Choose a template version"
              options={templateVersions.map((t) => ({ value: t.id, label: t.label }))}
            />
          </Field>
          <Field label="REF">
            <input name="ref" required className={fieldInputClass} placeholder="ACME-P1" />
          </Field>
          <Field label="NAME">
            <input name="name" required autoFocus className={fieldInputClass} placeholder="Order to procurement automation" />
          </Field>
          <Field label="LEAD (OPTIONAL)">
            <SelectField
              name="leadPersonId"
              defaultValue=""
              options={[{ value: "", label: "No lead yet" }, ...leadOptions.map((p) => ({ value: p.id, label: p.fullName }))]}
            />
          </Field>
          <Field label="GO-LIVE TARGET (OPTIONAL)">
            <input name="goLiveTarget" type="date" className={fieldInputClass} />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create project"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
