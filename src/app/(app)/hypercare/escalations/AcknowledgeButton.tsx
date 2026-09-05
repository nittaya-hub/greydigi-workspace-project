"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { acknowledgeEscalation } from "./actions";

export function AcknowledgeButton({ escalationId }: { escalationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            try {
              await acknowledgeEscalation(escalationId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not acknowledge this escalation.");
            }
          });
        }}
      >
        <Button variant="secondary" type="submit" disabled={isPending}>
          {isPending ? "Acknowledging..." : "Acknowledge"}
        </Button>
      </form>
      {error ? <p className="text-[11px] text-block-fg leading-[1.4]">{error}</p> : null}
    </div>
  );
}
