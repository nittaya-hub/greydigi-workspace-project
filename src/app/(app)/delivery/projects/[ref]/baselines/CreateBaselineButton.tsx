"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createBaselineV1 } from "./actions";

export function CreateBaselineButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await createBaselineV1(projectId, projectRef);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create baseline.");
            }
          });
        }}
      >
        {isPending ? "Creating..." : "Create baseline v1"}
      </Button>
      {error ? <p className="text-[11px] text-block-fg leading-[1.4]">{error}</p> : null}
    </div>
  );
}
