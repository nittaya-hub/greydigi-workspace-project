import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SELECTED_CLIENT_COOKIE } from "@/lib/data/client-scope";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Magic-link and Google sign-in both land here — clear the
      // year-long client-scope cookie on every fresh login, same as the
      // password path and sign-out, so this browser always opens on the
      // master "greydigi Dashboard" first, not whichever client was
      // scoped last time.
      const response = NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
      response.cookies.delete(SELECTED_CLIENT_COOKIE);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=link_invalid`);
}
