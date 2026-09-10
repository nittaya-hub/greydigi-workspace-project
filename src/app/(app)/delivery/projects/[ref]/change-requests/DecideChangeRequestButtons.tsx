"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { decideChangeRequest } from "./actions";

/** Sits on every "raised" row — the step that never existed before,
 * leaving every CR stuck at "raised" forever with no way to actually
 * decide it. */
export function DecideChangeRequestButtons({ crId, projectId, projectRef }: { crId: string; projectId: string; projectRef: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        await decideChangeRequest(crId, projectId, projectRef, decision);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not decide.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button variant="secondary" className="!h-6 !px-2 !text-[10.5px]" disabled={isPending} onClick={() => decide("approved")}>
          Approve
        </Button>
        <Button variant="ghost" className="!h-6 !px-2 !text-[10.5px]" disabled={isPending} onClick={() => decide("rejected")}>
          Reject
        </Button>
      </div>
      {error ? <p className="text-[10px] text-block-fg leading-[1.4]">{error}</p> : null}
    </div>
  );
}
