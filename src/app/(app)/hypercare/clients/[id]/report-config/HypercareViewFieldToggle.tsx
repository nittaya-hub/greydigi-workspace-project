"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { toggleHypercareViewField } from "./actions";

export function HypercareViewFieldToggle({ clientId, fieldKey, initialOn }: { clientId: string; fieldKey: string; initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [isPending, startTransition] = useTransition();

  return (
    <Toggle
      checked={on}
      disabled={isPending}
      label={fieldKey}
      onChange={() => {
        const next = !on;
        setOn(next);
        startTransition(async () => {
          try {
            await toggleHypercareViewField(clientId, fieldKey, next);
          } catch {
            setOn(!next);
          }
        });
      }}
    />
  );
}
