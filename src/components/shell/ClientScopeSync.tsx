"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { syncSelectedClient } from "./actions";

/** Renders nothing — mount it on any page whose data belongs to one
 * specific client (a project, a Hypercare service, a client's own
 * pages) so the shell's client-scope cookie tracks into that client
 * automatically on open, rather than staying wherever the ClientSwitcher
 * dropdown last left it. Only refreshes the shell (sidebar/header) when
 * the scope actually changes — syncSelectedClient no-ops and returns
 * false when it's already correct, so navigating between two pages of
 * the same client doesn't re-trigger a refresh on every load. */
export function ClientScopeSync({ clientId }: { clientId: string }) {
  const router = useRouter();
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (lastSynced.current === clientId) return;
    lastSynced.current = clientId;
    syncSelectedClient(clientId).then((changed) => {
      if (changed) router.refresh();
    });
  }, [clientId, router]);

  return null;
}
