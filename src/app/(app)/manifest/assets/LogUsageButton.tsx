"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { SelectField } from "@/components/ui/SelectField";
import { logAssetUsage } from "../actions";

export function LogUsageButton({
  assetId,
  assetName,
  projects,
}: {
  assetId: string;
  assetName: string;
  projects: { id: string; ref: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="secondary" className="flex-none" onClick={() => setOpen(true)}>
        Log reuse
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Log reuse of ${assetName}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await logAssetUsage(assetId, formData);
                setOpen(false);
                e.currentTarget?.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not log the reuse.");
              }
            });
          }}
          className="flex flex-col gap-3"
        >
          <Field label="MISSION">
            <SelectField
              name="projectId"
              required
              placeholder="Select a mission"
              options={projects.map((p) => ({ value: p.id, label: `${p.ref} — ${p.name}` }))}
            />
          </Field>
          <Field label="NOTE (OPTIONAL)">
            <textarea name="note" rows={2} className={fieldInputClass} placeholder="What changed, if anything, in this reuse." />
          </Field>

          {projects.length === 0 ? <p className="text-[11.5px] text-block-fg leading-[1.5]">No active missions yet.</p> : null}
          {error ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}

          <Button variant="primary" type="submit" disabled={isPending || projects.length === 0}>
            {isPending ? "Logging..." : "Log reuse"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
