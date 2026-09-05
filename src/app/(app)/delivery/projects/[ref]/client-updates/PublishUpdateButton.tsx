"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { publishClientUpdate } from "./actions";

export function PublishUpdateButton({ updateId, projectRef }: { updateId: string; projectRef: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="coral"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await publishClientUpdate(updateId, projectRef);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not publish.");
            }
          });
        }}
      >
        {isPending ? "Publishing..." : "Publish to portal"}
      </Button>
      {error ? <p className="text-[11px] text-block-fg leading-[1.4]">{error}</p> : null}
    </div>
  );
}
