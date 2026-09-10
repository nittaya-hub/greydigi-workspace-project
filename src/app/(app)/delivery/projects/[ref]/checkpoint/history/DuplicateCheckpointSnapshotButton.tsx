"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { duplicateCheckpointSnapshot } from "../actions";

type Status = "idle" | "loading" | "done" | "error";

/** Reuses one archived week as the starting point for a fresh, editable
 * week on the live Checkpoint tab -- the archived row itself is never
 * touched (there's no update/delete path for it anywhere in the app).
 * Own loading/success/error feedback since this writes several new
 * rows at once and the person needs to know it actually landed. */
export function DuplicateCheckpointSnapshotButton({ snapshotId, projectId, projectRef }: { snapshotId: string; projectId: string; projectRef: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setStatus("loading");
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await duplicateCheckpointSnapshot(snapshotId, projectId, projectRef);
        setStatus("done");
        router.push(`/delivery/projects/${projectRef.toLowerCase()}/checkpoint`);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not duplicate.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" type="button" disabled={isPending} onClick={submit} className="!h-6 !px-2 !text-[10.5px] flex-none">
        {status === "loading" ? "Duplicating…" : "Duplicate to Checkpoint tab"}
      </Button>
      {status === "error" ? <span className="text-[9.5px] text-block-fg">{errorMessage}</span> : null}
    </div>
  );
}
