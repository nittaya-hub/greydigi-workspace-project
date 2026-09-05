"use server";

import { createClient } from "@/lib/supabase/server";

export interface SetPasswordResult {
  ok: boolean;
  message: string;
}

export async function setPassword(newPassword: string, confirm: string): Promise<SetPasswordResult> {
  if (newPassword.length < 8) return { ok: false, message: "Password must be at least 8 characters." };
  if (newPassword !== confirm) return { ok: false, message: "Passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Password updated." };
}
