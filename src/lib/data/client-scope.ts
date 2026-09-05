import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Client-scoping cookie: unset/absent = Master Admin mode (all clients,
 * cross-client aggregates). Set to a client id = every space (Delivery,
 * Hypercare; Product is workspace-wide by design, see note in
 * src/lib/data/product.ts) filters to that client only. Read on the server
 * only — this never needs to reach the browser as anything but the
 * selected label already rendered into the switcher. */
export const SELECTED_CLIENT_COOKIE = "selected_client_id";

export async function getSelectedClientId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SELECTED_CLIENT_COOKIE)?.value || null;
}

/** When a specific client is in scope, returns whether HyperCare is
 * enabled for them (the admin toggle on /clients/[id]) — null when in
 * Master Admin mode (no single client selected, so no gate applies). */
export async function getSelectedClientHypercareEnabled(): Promise<boolean | null> {
  const clientId = await getSelectedClientId();
  if (!clientId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("hypercare_enabled").eq("id", clientId).maybeSingle();
  return data?.hypercare_enabled ?? true;
}
