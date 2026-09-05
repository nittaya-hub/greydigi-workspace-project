"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { markReleaseReady } from "./actions";

export function MarkReadyButton({ releaseId, releaseCode, disabled }: { releaseId: string; releaseCode: string; disabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            try {
              await markReleaseReady(releaseId, releaseCode);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not mark this release ready.");
            }
          });
        }}
      >
        <Button variant="coral" type="submit" className="flex-none" disabled={disabled || isPending}>
          {isPending ? "Marking ready..." : "Mark ready"}
        </Button>
      </form>
      {error ? <p className="text-[11px] text-block-fg leading-[1.4] max-w-[220px] text-right">{error}</p> : null}
    </div>
  );
}
