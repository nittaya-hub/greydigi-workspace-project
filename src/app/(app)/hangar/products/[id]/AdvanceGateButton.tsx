"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { advanceProductStageGate } from "../actions";

export function AdvanceGateButton({ productId, nextGate }: { productId: string; nextGate: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!nextGate) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await advanceProductStageGate(productId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not advance the gate.");
            }
          });
        }}
      >
        {isPending ? "Advancing..." : `Advance to ${nextGate}`}
      </Button>
      {error ? <span className="text-[11px] text-block-fg">{error}</span> : null}
    </div>
  );
}
