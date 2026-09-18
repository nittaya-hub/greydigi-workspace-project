"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";

/** Every field here is scoped to the caller's own row -- there is no
 * personId parameter to spoof, deliberately: this action can only ever
 * touch the signed-in person's own profile. */
export async function updateOwnProfile(formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const fullName = (formData.get("full_name") as string | null)?.trim();
  if (!fullName) throw new Error("Name cannot be empty.");

  const supabase = await createClient();
  const { error } = await supabase.from("people").update({ full_name: fullName }).eq("id", person.id);
  if (error) throw new Error(error.message);

  revalidateEverywhereAPersonNameShows();
}

/** A person's name/photo shows on dozens of pages across every cockpit
 * (task owners, comments, project members, the sidebar itself) --
 * revalidating just /profile left every one of those showing a stale
 * cached render until its own path happened to revalidate for some
 * other reason. Revalidating the root layout instead invalidates the
 * whole app shell's cache in one call, so every page picks up the
 * change on next load. */
function revalidateEverywhereAPersonNameShows() {
  revalidatePath("/", "layout");
}

/** Records an already-uploaded avatars/<person_id>/<file> object as this
 * person's own picture -- mirrors every other "browser uploads to
 * Storage, then a Server Action records the path" flow in this app
 * (checkpoint sources, architecture spreadsheets, delivery documents).
 * The storage RLS policy (0075) already refuses any path outside the
 * caller's own <person_id>/ prefix, so this can't record someone else's
 * upload even if a client bug tried to. */
export async function updateOwnAvatar(path: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error } = await supabase.from("people").update({ avatar_url: publicUrl }).eq("id", person.id);
  if (error) throw new Error(error.message);

  revalidateEverywhereAPersonNameShows();
}

export async function removeOwnAvatar() {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase.from("people").update({ avatar_url: null }).eq("id", person.id);
  if (error) throw new Error(error.message);

  revalidateEverywhereAPersonNameShows();
}
