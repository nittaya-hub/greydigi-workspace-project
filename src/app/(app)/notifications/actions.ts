"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";

/** Marks every unread notification for the signed-in person as read. */
export async function markAllNotificationsRead() {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("person_id", person.id)
    .eq("is_read", false);
  if (error) throw new Error(error.message);

  // The header badge (unread count) is computed in getShellData, rendered
  // by the (app) layout on every route — revalidate this page plus "/" so
  // it reflects the change immediately.
  revalidatePath("/notifications");
  revalidatePath("/");
}
