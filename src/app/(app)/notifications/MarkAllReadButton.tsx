"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { markAllNotificationsRead } from "./actions";

export function MarkAllReadButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1 flex-none">
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await markAllNotificationsRead();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not mark notifications as read.");
            }
          });
        }}
      >
        {isPending ? "Marking..." : "Mark all read"}
      </Button>
      {error ? <p className="text-[11px] text-block-fg">{error}</p> : null}
    </div>
  );
}
