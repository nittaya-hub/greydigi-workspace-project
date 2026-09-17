import type { ReactNode } from "react";
import { ClientScopeSync } from "@/components/shell/ClientScopeSync";

/** Wraps report-config (and any future sibling under this route) so the
 * shell tracks into this client's scope on open — same reasoning as
 * clients/[id]/layout.tsx. The id in the URL is already the client id. */
export default async function HypercareClientLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <ClientScopeSync clientId={id} />
      {children}
    </>
  );
}
