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
