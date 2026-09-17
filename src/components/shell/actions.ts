"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SELECTED_CLIENT_COOKIE } from "@/lib/data/client-scope";

/** Switches the whole shell into Master Admin mode (all clients) or scopes
 * it to one client. Redirects to `/` afterward — every space re-fetches
 * scoped to the new selection since they all read the cookie fresh per
 * request, not from client-side state. */
export async function setSelectedClient(clientId: string | null) {
  const store = await cookies();
  if (clientId) {
    store.set(SELECTED_CLIENT_COOKIE, clientId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete(SELECTED_CLIENT_COOKIE);
  }
  redirect("/");
}

/** Same cookie as setSelectedClient, but silent: no redirect, and a
 * no-op (returns false) when the shell is already scoped to this
 * client. Called from ClientScopeSync when a page whose data belongs to
 * one specific client is opened directly (e.g. a project, a Hypercare
 * service or client's own pages) — the shell should track into that
 * client's scope automatically rather than staying wherever the
 * dropdown last left it, per the explicit ask that this "support the
 * future" as more clients are added. Returns whether it changed
 * anything, so the caller only refreshes the shell when it actually
 * needs to. */
export async function syncSelectedClient(clientId: string): Promise<boolean> {
  const store = await cookies();
  const current = store.get(SELECTED_CLIENT_COOKIE)?.value || null;
  if (current === clientId) return false;
  store.set(SELECTED_CLIENT_COOKIE, clientId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return true;
}
