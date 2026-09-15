"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { toggleClientViewField } from "./actions";

export function ClientViewFieldToggle({
  projectId,
  projectRef,
  fieldKey,
  initialOn,
}: {
  projectId: string;
  projectRef: string;
  fieldKey: string;
  initialOn: boolean;
}) {
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
            await toggleClientViewField(projectId, projectRef, fieldKey, next);
          } catch {
            setOn(!next);
          }
        });
      }}
    />
  );
}
