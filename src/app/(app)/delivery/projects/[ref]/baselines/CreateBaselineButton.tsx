"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createNextBaseline } from "./actions";

export function CreateBaselineButton({
  projectId,
  projectRef,
  label = "Create baseline v1",
}: {
  projectId: string;
  projectRef: string;
  label?: string;
}) {
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
              await createNextBaseline(projectId, projectRef);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create baseline.");
            }
          });
        }}
      >
        {isPending ? "Creating..." : label}
      </Button>
      {error ? <p className="text-[11px] text-block-fg leading-[1.4]">{error}</p> : null}
    </div>
  );
}
