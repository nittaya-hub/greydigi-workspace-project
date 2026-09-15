"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { toggleFeatureClientVisible } from "../actions";

/** Same optimistic-toggle-then-persist, revert-on-error shape as
 * client-view-config/ClientViewFieldToggle.tsx. Lets an internal lead flip
 * roadmap_items.client_visible per feature from wherever features are
 * listed — this is a workspace-wide flag on the item, not a per-project
 * client-view-config setting. */
export function FeatureClientVisibleToggle({
  itemId,
  itemRef,
  initialOn,
}: {
  itemId: string;
  itemRef: string;
  initialOn: boolean;
}) {
  const [on, setOn] = useState(initialOn);
  const [isPending, startTransition] = useTransition();

  return (
    <Toggle
      checked={on}
      disabled={isPending}
      label={`Client visible: ${itemRef}`}
      onChange={() => {
        const next = !on;
        setOn(next);
        startTransition(async () => {
          try {
            await toggleFeatureClientVisible(itemId, itemRef, next);
          } catch {
            setOn(!next);
          }
        });
      }}
    />
  );
}
