"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { publishClientView } from "./actions";

/** Publish freezes the current draft into the P·1 no-login snapshot —
 * irreversible in the sense that the old snapshot is gone the moment this
 * runs. The button used to submit on the same click that revealed no
 * feedback beyond a page refresh, so a stray click published whatever
 * draft happened to be on screen. This adds one confirm step between the
 * click and the actual publish call, mirroring the same gap fixed on the
 * Hypercare report page's own publish button. */
export function PublishClientViewButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="coral" type="button" onClick={() => setOpen(true)}>
        Publish
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Confirm publish">
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[12.5px] text-muted leading-[1.5]">
            This freezes the live preview shown on the right into the P·1 no-login share link, replacing whatever was
            published before. The client&apos;s logged-in portal is unaffected — it already shows this draft live.
          </p>
          {error ? <p className="m-0 text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="coral"
              type="button"
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await publishClientView(projectId, projectRef);
                    setOpen(false);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not publish.");
                  }
                });
              }}
            >
              {isPending ? "Publishing..." : "Confirm and publish"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
