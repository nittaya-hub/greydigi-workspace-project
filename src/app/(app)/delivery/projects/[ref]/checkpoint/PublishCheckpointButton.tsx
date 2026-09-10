"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/components/ui/Modal";
import { publishCheckpointToHistory } from "./actions";

type Status = "idle" | "loading" | "done" | "error";

/** Freezes this week's reviewed checkpoint data into the permanent
 * history archive -- a real (and, once written, irreversible) action,
 * so unlike the plain <form action> rows above it, this gets its own
 * loading/success/error feedback rather than a silent revalidate. */
export function PublishCheckpointButton({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const [weekLabel, setWeekLabel] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!weekLabel.trim()) return;
    setStatus("loading");
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await publishCheckpointToHistory(projectId, projectRef, weekLabel.trim());
        setStatus("done");
        setWeekLabel("");
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Could not publish to history.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          value={weekLabel}
          onChange={(e) => setWeekLabel(e.target.value)}
          placeholder="W4"
          className={`${fieldInputClass} !w-24`}
        />
        <Button variant="coral" type="button" disabled={isPending || !weekLabel.trim()} onClick={submit} className="flex-none whitespace-nowrap">
          {status === "loading" ? "Publishing…" : "Publish to history"}
        </Button>
      </div>
      {status === "done" ? <span className="text-[10.5px] text-ok-fg">Published — visible on the history archive now.</span> : null}
      {status === "error" ? <span className="text-[10.5px] text-block-fg">{errorMessage}</span> : null}
    </div>
  );
}
