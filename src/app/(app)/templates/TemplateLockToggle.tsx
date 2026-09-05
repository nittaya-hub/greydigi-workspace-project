"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { toggleTemplateLock } from "./actions";

/** Real on/off control for `template_versions.is_locked` — optimistic local
 * state, reverted on error, same shape as ClientViewFieldToggle. */
export function TemplateLockToggle({ versionId, initialLocked }: { versionId: string; initialLocked: boolean }) {
  const [locked, setLocked] = useState(initialLocked);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5 justify-self-start">
      <span className="font-mono text-[9px] tracking-[.06em] text-muted">{locked ? "LOCKED" : "DRAFT"}</span>
      <Toggle
        checked={locked}
        disabled={isPending}
        label={locked ? "Locked" : "Draft"}
        onChange={() => {
          const next = !locked;
          setLocked(next);
          startTransition(async () => {
            try {
              await toggleTemplateLock(versionId, next);
            } catch {
              setLocked(!next);
            }
          });
        }}
      />
    </div>
  );
}
