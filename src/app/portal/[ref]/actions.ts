"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Client-triggered mutation. RLS (client_actions_client_update in
 * 0007_rls.sql) is the actual enforcement — this only succeeds if the
 * signed-in person has a client_roles grant on the action's project. */
export async function markActionDone(actionId: string, projectRef: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: person } = await supabase.from("people").select("id").eq("auth_user_id", user.id).maybeSingle();

  const { error } = await supabase
    .from("client_actions")
    .update({ status: "completed", completed_at: new Date().toISOString(), completed_by: person?.id ?? null })
    .eq("id", actionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/portal/${projectRef.toLowerCase()}`);
}
