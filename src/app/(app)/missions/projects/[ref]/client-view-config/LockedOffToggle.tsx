"use client";

import { Toggle } from "@/components/ui/Toggle";

/** A permanently-off, non-interactive toggle for sections that never cross
 * the publication boundary (internal effort/rates, task-level detail) —
 * same visual language as the real per-field toggles, but with no backing
 * action since there's nothing to persist. A no-op onChange is defined
 * here (client-side) because Server Components can't pass functions as
 * props to a Client Component. */
export function LockedOffToggle({ label }: { label: string }) {
  return <Toggle checked={false} disabled onChange={() => {}} label={label} />;
}
