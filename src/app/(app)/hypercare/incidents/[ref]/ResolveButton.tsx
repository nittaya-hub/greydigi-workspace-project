"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { resolveIncident } from "./actions";

export function ResolveButton({ incidentId, incidentRef }: { incidentId: string; incidentRef: string }) {
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
              await resolveIncident(incidentId, incidentRef);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not resolve this incident.");
            }
          });
        }}
      >
        <Button variant="coral" type="submit" disabled={isPending}>
          {isPending ? "Resolving..." : "Resolve"}
        </Button>
      </form>
      {error ? <p className="text-[11px] text-coral leading-[1.4]">{error}</p> : null}
    </div>
  );
}
