"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { addProjectMember } from "./actions";

export function AddProjectMemberButton({
  projectId,
  projectRef,
  candidates,
}: {
  projectId: string;
  projectRef: string;
  candidates: { id: string; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return (
      <Button variant="secondary" className="flex-none" disabled title="Everyone on the workspace is already a member">
        Add member
      </Button>
    );
  }

  return (
    <>
      <Button variant="primary" className="flex-none" onClick={() => setOpen(true)}>
        Add member
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add project member">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await addProjectMember(projectId, projectRef, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not add member.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="PERSON">
            <select name="personId" required className={fieldInputClass} defaultValue="">
              <option value="" disabled>
                Choose a person
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ROLE">
            <select name="role" required className={fieldInputClass} defaultValue="member">
              <option value="member">Member — edits own tasks, comments anywhere</option>
              <option value="project_admin">Project Admin — full control of this project</option>
            </select>
          </Field>

          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add member"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
