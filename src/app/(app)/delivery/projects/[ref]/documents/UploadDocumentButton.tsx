"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createDocument } from "./actions";

const KINDS = ["artefact", "manifest", "baseline", "methodology", "contract", "brief", "internal"];

export function UploadDocumentButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        Upload
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload document">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await createDocument(projectId, projectRef, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create document.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="NAME">
            <input name="name" required autoFocus className={fieldInputClass} placeholder="Manifest v2" />
          </Field>
          <Field label="KIND">
            <SelectField name="kind" defaultValue="artefact" options={KINDS.map((k) => ({ value: k, label: k }))} />
          </Field>
          <Field label="VERSION">
            <input name="version" defaultValue="v1" className={fieldInputClass} placeholder="v1" />
          </Field>
          <Field label="VISIBILITY">
            <SelectField
              name="visibility"
              defaultValue="internal"
              options={[
                { value: "internal", label: "Internal" },
                { value: "client_visible", label: "Client visible" },
              ]}
            />
          </Field>
          <label className="flex items-center gap-2 text-[12px] text-ink">
            <input name="requiresSignature" type="checkbox" className="w-3.5 h-3.5" />
            Requires signature
          </label>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Add document"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
