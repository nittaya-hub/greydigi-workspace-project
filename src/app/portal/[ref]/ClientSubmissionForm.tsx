"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClientSubmission, addSubmissionAttachment } from "./client-submission-actions";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";
import type { SubmissionTaxonomyField } from "@/lib/data/submission-taxonomies";

const KIND_META: Record<ClientSubmissionKind, { label: string; cta: string; titlePlaceholder: string }> = {
  issue: { label: "Report an issue", cta: "Report issue", titlePlaceholder: "Order sync is failing" },
  change_request: { label: "Change request", cta: "Raise change request", titlePlaceholder: "Add a second recall channel" },
  question: { label: "Ask a question", cta: "Send question", titlePlaceholder: "How do I read the prep sheet export?" },
};

export function ClientSubmissionForm({
  projectRef,
  kind,
  options,
}: {
  projectRef: string;
  kind: ClientSubmissionKind;
  /** Category/severity/priority options, workspace-configured under
   * Settings → Submission types (src/lib/data/submission-taxonomies.ts).
   * Only the fields this `kind` actually renders are read. */
  options: Record<SubmissionTaxonomyField, { value: string; label: string }[]>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const meta = KIND_META[kind];

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {meta.label}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setDone(false);
          setError(null);
        }}
        title={meta.label}
      >
        {done ? (
          <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-ok-fg leading-[1.5]">
              Sent. The team has been notified and will follow up.
            </p>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const form = e.currentTarget;
              const formData = new FormData(form);
              formData.set("kind", kind);
              const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
              const files = fileInput?.files ? Array.from(fileInput.files) : [];

              startTransition(async () => {
                const result = await createClientSubmission(projectRef, formData);
                if (!result.ok || !result.submissionId) {
                  setError(result.message ?? "Could not submit.");
                  return;
                }

                if (files.length > 0 && result.workspaceId && result.clientId) {
                  const supabase = createBrowserClient();
                  for (const file of files) {
                    const path = `${result.workspaceId}/${result.clientId}/${result.submissionId}/${file.name}`;
                    const { error: uploadError } = await supabase.storage.from("client-attachments").upload(path, file);
                    if (uploadError) {
                      setError(`Submitted, but "${file.name}" failed to attach: ${uploadError.message}`);
                      continue;
                    }
                    try {
                      await addSubmissionAttachment(result.submissionId, {
                        path,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                      });
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not record attachment.");
                    }
                  }
                }

                setDone(true);
              });
            }}
            className="flex flex-col gap-3"
          >
            <Field label="TITLE">
              <input name="title" required autoFocus className={fieldInputClass} placeholder={meta.titlePlaceholder} />
            </Field>

            {kind === "issue" ? (
              <>
                <Field label="CATEGORY">
                  <SelectField name="category" placeholder="Select a category" options={options.category} />
                </Field>
                <Field label="SEVERITY">
                  <SelectField name="severity" placeholder="How disruptive is this?" options={options.severity} />
                </Field>
              </>
            ) : null}

            {kind === "change_request" ? (
              <>
                <Field label="BUSINESS IMPACT">
                  <textarea name="businessImpact" rows={2} className={fieldInputClass} placeholder="Who does this affect, and how?" />
                </Field>
                <Field label="PRIORITY">
                  <SelectField name="priority" placeholder="Select priority" options={options.priority} />
                </Field>
              </>
            ) : null}

            <Field label={kind === "question" ? "YOUR QUESTION" : "DESCRIPTION"}>
              <textarea name="description" required rows={4} className={fieldInputClass} placeholder="As much detail as you can share." />
            </Field>

            <Field label="ATTACH A FILE (OPTIONAL)">
              <input type="file" multiple className="text-[12px]" accept="image/*,.pdf,.doc,.docx,.csv,.xlsx" />
            </Field>

            {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? "Sending..." : meta.cta}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
