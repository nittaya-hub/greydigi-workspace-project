"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { deleteProject } from "../actions";

/** Workspace-admin only (enforced server-side too) — deleting a project
 * cascades every phase/gate/task/document/baseline/change-request under
 * it, so this asks the admin to type the ref back, the same "type to
 * confirm" pattern any irreversible delete should use. */
export function DeleteProjectButton({ projectId, projectRef, name }: { projectId: string; projectRef: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDelete = confirmText.trim().toUpperCase() === projectRef.toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[9.5px] tracking-[.05em] rounded-[6px] border border-line px-2.5 py-1.5 text-block-fg hover:bg-block-bg flex-none"
      >
        DELETE PROJECT
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete this project">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[11.5px] text-block-fg leading-[1.55]">
            This permanently deletes <b>{name}</b> ({projectRef}) — every phase, gate, task, document, baseline,
            change request, client update, share link, and member under it goes with it. This cannot be undone.
          </p>
          <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
            A Hypercare service already earned from this project (if any) is not affected.
          </p>
          <Field label={`TYPE "${projectRef}" TO CONFIRM`}>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={fieldInputClass} autoFocus />
          </Field>
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}
          <Button
            variant="coral"
            type="button"
            disabled={!canDelete || isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await deleteProject(projectId, projectRef, name);
                  router.push("/delivery/projects");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not delete.");
                }
              });
            }}
          >
            {isPending ? "Deleting..." : "Delete permanently"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
