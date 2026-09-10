import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SELECTED_CLIENT_COOKIE } from "@/lib/data/client-scope";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/auth/sign-in", request.url));
  // The client-scope switcher (setSelectedClient, src/components/shell/actions.ts)
  // sets this cookie with a 1-year maxAge and it was never cleared anywhere —
  // so the next sign-in on this browser (same person or a different one)
  // silently reopened scoped to whichever client was last selected, instead
  // of resetting to Master Admin mode.
  response.cookies.delete(SELECTED_CLIENT_COOKIE);
  return response;
}
