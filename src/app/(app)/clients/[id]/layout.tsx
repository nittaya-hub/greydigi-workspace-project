import type { ReactNode } from "react";
import { ClientScopeSync } from "@/components/shell/ClientScopeSync";

/** Wraps every page under /clients/[id] (the detail page itself, plus
 * client-dashboard) so the shell tracks into this client's scope on
 * open — the id in the URL already IS the client id here, no lookup
 * needed. See ClientScopeSync's own comment for why. */
export default async function ClientDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <ClientScopeSync clientId={id} />
      {children}
    </>
  );
}
