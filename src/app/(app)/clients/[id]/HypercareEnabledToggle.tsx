"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { toggleHypercareEnabled } from "./actions";

export function HypercareEnabledToggle({ clientId, initialEnabled }: { clientId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2.5">
      <Toggle
        checked={enabled}
        disabled={isPending}
        label="HyperCare enabled"
        onChange={() => {
          const next = !enabled;
          setEnabled(next);
          startTransition(async () => {
            try {
              await toggleHypercareEnabled(clientId, next);
            } catch {
              setEnabled(!next);
            }
          });
        }}
      />
      <span className="text-[11.5px] text-muted">HyperCare {enabled ? "purchased" : "not purchased"}</span>
    </div>
  );
}
