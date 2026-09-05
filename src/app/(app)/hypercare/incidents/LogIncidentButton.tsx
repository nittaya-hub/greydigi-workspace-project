"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { logIncident } from "./actions";

const SEVERITY_OPTIONS = [
  { value: "sev1", label: "Sev1" },
  { value: "sev2", label: "Sev2" },
  { value: "sev3", label: "Sev3" },
];

/** Log-incident modal, shared by the Hypercare overview, the incidents list,
 * and a service detail page. Pass `lockedService` to pre-scope and hide the
 * service dropdown (used from a service's own page). */
export function LogIncidentButton({
  services,
  lockedService,
  variant = "coral",
  label = "Log incident",
}: {
  services: { id: string; ref: string; name: string }[];
  lockedService?: { id: string; ref: string; name: string };
  variant?: ButtonVariant;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = lockedService ? [lockedService] : services;

  return (
    <>
      <Button variant={variant} className="flex-none" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log incident">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await logIncident(formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not log incident.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="SERVICE">
            {lockedService ? (
              <>
                <input type="hidden" name="serviceId" value={lockedService.id} />
                <span className={`${fieldInputClass} bg-canvas text-muted`}>
                  {lockedService.ref} · {lockedService.name}
                </span>
              </>
            ) : (
              <SelectField
                name="serviceId"
                required
                placeholder="Select a service"
                options={options.map((s) => ({ value: s.id, label: `${s.ref} · ${s.name}` }))}
              />
            )}
          </Field>
          <Field label="TITLE">
            <input name="title" required autoFocus className={fieldInputClass} placeholder="Invoice sync failing" />
          </Field>
          <Field label="SEVERITY">
            <SelectField name="severity" required placeholder="Select severity" options={SEVERITY_OPTIONS} />
          </Field>
          <Field label="ROOT CAUSE (OPTIONAL)">
            <textarea name="rootCause" rows={3} className={fieldInputClass} placeholder="If already known." />
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="coral" type="submit" disabled={isPending || (!lockedService && services.length === 0)}>
            {isPending ? "Logging..." : "Log incident"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
