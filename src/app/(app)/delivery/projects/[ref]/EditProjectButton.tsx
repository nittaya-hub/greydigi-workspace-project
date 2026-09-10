"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { DatePicker } from "@/components/ui/DatePicker";
import { updateProject } from "../actions";

export function EditProjectButton({
  projectId,
  projectRef,
  name,
  description,
  goLiveTarget,
}: {
  projectId: string;
  projectRef: string;
  name: string;
  description: string | null;
  goLiveTarget: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[9.5px] tracking-[.05em] rounded-[6px] border border-line px-2.5 py-1.5 text-muted hover:text-ink hover:border-ink flex-none"
      >
        EDIT PROJECT
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            const nextRef = String(formData.get("ref") ?? "");
            startTransition(async () => {
              try {
                const result = await updateProject(projectId, projectRef, {
                  ref: nextRef,
                  name: String(formData.get("name") ?? ""),
                  description: String(formData.get("description") ?? ""),
                  goLiveTarget: String(formData.get("goLiveTarget") ?? ""),
                });
                setOpen(false);
                if (result.ref.toLowerCase() !== projectRef.toLowerCase()) {
                  router.push(`/delivery/projects/${result.ref.toLowerCase()}`);
                } else {
                  router.refresh();
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="REF">
            <input name="ref" defaultValue={projectRef} required className={fieldInputClass} />
          </Field>
          <p className="m-0 -mt-1.5 text-[10.5px] text-muted leading-[1.4]">
            Changing this breaks any link that already points at the old ref — the client portal link, share links,
            bookmarks.
          </p>
          <Field label="NAME">
            <input name="name" defaultValue={name} required className={fieldInputClass} />
          </Field>
          <Field label="DESCRIPTION">
            <textarea name="description" defaultValue={description ?? ""} rows={3} className={fieldInputClass} />
          </Field>
          <Field label="GO-LIVE TARGET">
            <DatePicker name="goLiveTarget" defaultValue={goLiveTarget ?? ""} />
          </Field>
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
