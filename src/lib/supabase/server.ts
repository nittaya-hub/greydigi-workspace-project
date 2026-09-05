import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Server Component / Server Action client — reads and writes the session cookie. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no request context to write to.
          // Session refresh in middleware covers this; safe to ignore here.
        }
      },
    },
  });
}
