"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { DOCUMENT_KINDS } from "@/lib/flightplan/document-kinds";
import { createDocument, attachDocumentFile } from "./actions";

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
            const form = e.currentTarget;
            const formData = new FormData(form);
            const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
            const file = fileInput?.files?.[0] ?? null;

            startTransition(async () => {
              try {
                const { documentId, workspaceId } = await createDocument(projectId, projectRef, formData);

                if (file) {
                  const supabase = createBrowserClient();
                  const path = `${workspaceId}/${projectId}/${documentId}/${file.name}`;
                  const { error: uploadError } = await supabase.storage.from("delivery-documents").upload(path, file);
                  if (uploadError) {
                    setError(`Document created, but the file failed to upload: ${uploadError.message}`);
                    return;
                  }
                  await attachDocumentFile(documentId, projectRef, {
                    path,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                  });
                }

                setOpen(false);
                form.reset();
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
            <SelectField
              name="kind"
              defaultValue="internal"
              options={DOCUMENT_KINDS.map((k) => ({ value: k.value, label: k.gate ? `${k.label} (${k.gate})` : k.label }))}
            />
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
          <Field label="FILE">
            <input type="file" className="text-[12px]" />
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
