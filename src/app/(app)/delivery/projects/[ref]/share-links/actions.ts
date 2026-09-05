"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function newToken() {
  return randomBytes(5).toString("base64url").toLowerCase();
}

async function currentPersonId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { data: person } = await supabase.from("people").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!person) throw new Error("No matching workspace person for this account.");
  return person.id;
}

export async function createShareLink(projectId: string, projectRef: string) {
  const supabase = await createClient();
  const personId = await currentPersonId();
  const { error } = await supabase.from("share_links").insert({
    project_id: projectId,
    token: newToken(),
    created_by: personId,
    expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/share-links`);
}

export async function revokeShareLink(linkId: string, projectRef: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("share_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw new Error(error.message);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/share-links`);
}

export async function regenerateShareLink(linkId: string, projectRef: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("share_links")
    .update({ token: newToken(), last_regenerated_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw new Error(error.message);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/share-links`);
}
