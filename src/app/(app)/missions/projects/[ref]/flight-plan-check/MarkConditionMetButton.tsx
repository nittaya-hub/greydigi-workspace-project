"use client";

import { useState, useTransition } from "react";
import { markGateConditionMet } from "./actions";

export function MarkConditionMetButton({
  conditionId,
  projectId,
  projectRef,
}: {
  conditionId: string;
  projectId: string;
  projectRef: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await markGateConditionMet(conditionId, projectId, projectRef);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not update.");
            }
          });
        }}
        className="font-mono text-[9px] tracking-[.05em] rounded-[5px] border border-line px-2 py-1 text-ok-fg hover:bg-ok-bg disabled:opacity-50"
      >
        {isPending ? "SAVING..." : "MARK MET"}
      </button>
      {error ? <span className="text-[10px] text-block-fg">{error}</span> : null}
    </span>
  );
}
