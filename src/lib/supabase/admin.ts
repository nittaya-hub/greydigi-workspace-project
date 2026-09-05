import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Service-role client — bypasses RLS entirely and can call `auth.admin.*`.
 * Server-only (the `server-only` import throws if this ever ends up in a
 * client bundle). Never expose this client or the key it wraps to the
 * browser; only use it inside Server Actions / Route Handlers that have
 * already checked the caller is a workspace_admin.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — see supabase/README.md.");
  }
  return createSupabaseClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
