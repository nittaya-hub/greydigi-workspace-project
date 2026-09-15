"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { approveBaseline } from "./actions";

/** Sits on every "draft" row in the baselines table — the step that never
 * existed before, leaving every baseline stuck in draft forever. */
export function ApproveBaselineButton({ baselineId, projectId, projectRef }: { baselineId: string; projectId: string; projectRef: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        className="!h-6 !px-2 !text-[10.5px]"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await approveBaseline(baselineId, projectId, projectRef);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not approve.");
            }
          });
        }}
      >
        {isPending ? "Approving..." : "Approve"}
      </Button>
      {error ? <p className="text-[10px] text-block-fg leading-[1.4]">{error}</p> : null}
    </div>
  );
}
