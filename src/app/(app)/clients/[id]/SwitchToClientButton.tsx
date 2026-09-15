"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { setSelectedClient } from "@/components/shell/actions";

/** Scopes the whole shell (sidebar, Missions, Hypercare) to this client —
 * the same switch the top-left ClientSwitcher dropdown does, surfaced
 * here too since visiting a client's own detail page is the more
 * obvious place someone looks for it. Hidden once already scoped to
 * this client, since there's nothing left to switch to. */
export function SwitchToClientButton({ clientId, isScoped }: { clientId: string; isScoped: boolean }) {
  const [isPending, startTransition] = useTransition();
  if (isScoped) return null;

  return (
    <Button variant="secondary" disabled={isPending} onClick={() => startTransition(() => setSelectedClient(clientId))}>
      {isPending ? "Switching..." : "Switch to this client"}
    </Button>
  );
}
