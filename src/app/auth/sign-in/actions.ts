"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface SendLinkResult {
  ok: boolean;
  message: string;
}

/** Passwordless sign-in: emails a magic link that lands on /auth/callback.
 * Works for both internal workspace members and client-portal people —
 * which of the two a signed-in user is comes entirely from their `people`
 * row (kind + workspace_role / client_roles), not from how they signed in. */
export async function sendMagicLink(email: string, redirectPath: string): Promise<SendLinkResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase is not configured yet. See supabase/README.md." };
  }
  if (!email.trim() || !email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callback = `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectPath || "/")}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: siteUrl ? callback : undefined },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Check ${email.trim()} for a sign-in link.` };
}

/** Email + password sign-in, for accounts created via Users and members ->
 * Invite. Redirects on success; returns an error on failure rather than
 * throwing, so the form can show it inline. */
export async function signInWithPassword(
  email: string,
  password: string,
  redirectPath: string
): Promise<SendLinkResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase is not configured yet. See supabase/README.md." };
  }
  if (!email.trim() || !password) {
    return { ok: false, message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

  if (error) return { ok: false, message: "Incorrect email or password." };

  redirect(redirectPath || "/");
}

/** Google OAuth sign-in. Returns the provider's authorize URL for the
 * client to navigate to (redirects can't cross from a server action to an
 * external origin), or an error if Google isn't enabled in Supabase yet. */
export async function signInWithGoogle(redirectPath: string): Promise<SendLinkResult & { url?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase is not configured yet. See supabase/README.md." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const callback = `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectPath || "/")}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: siteUrl ? callback : undefined },
  });

  if (error || !data.url) {
    return { ok: false, message: error?.message ?? "Google sign-in isn't set up yet." };
  }
  return { ok: true, message: "", url: data.url };
}
