"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { DatePicker } from "@/components/ui/DatePicker";
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
        New phase
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New phase">
        <p className="m-0 -mt-1 mb-1 text-[11px] text-muted leading-[1.5]">
          Each phase is its own engagement with its own flight plan — e.g. this client&apos;s Phase 1 in Singapore
          and a future Phase 2 in Hong Kong run as two separate ones, never merged.
        </p>
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
                setError(err instanceof Error ? err.message : "Could not create phase.");
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
          <Field label="PHASE NAME">
            <input name="name" required autoFocus className={fieldInputClass} placeholder="NK Core, Phase 1: order to procurement, Singapore" />
          </Field>
          <Field label="LEAD (OPTIONAL)">
            <SelectField
              name="leadPersonId"
              defaultValue=""
              options={[{ value: "", label: "No lead yet" }, ...leadOptions.map((p) => ({ value: p.id, label: p.fullName }))]}
            />
          </Field>
          <Field label="GO-LIVE TARGET (OPTIONAL)">
            <DatePicker name="goLiveTarget" />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create phase"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
