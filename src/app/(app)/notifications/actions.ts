"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import type { NotificationRow } from "@/lib/data/admin";

/** Polled from the header bell (see Header.tsx) so a submission through
 * a no-login share link — which nothing else on the page would ever
 * cause to re-render — still shows up on the badge within a few
 * seconds, not only after the next full navigation. Count-only, same
 * query as getShellData's own unread count, so polling this every few
 * seconds stays cheap. */
export async function getUnreadNotificationCount(): Promise<number> {
  const person = await getCurrentPerson();
  if (!person) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("person_id", person.id)
    .eq("is_read", false)
    .eq("is_archived", false);
  return count ?? 0;
}

/** Powers the header bell's dropdown preview (NotificationBell.tsx) —
 * newest-first, unread only, capped small since it's a glance, not the
 * full inbox (that's /notifications). Fetched when the dropdown opens,
 * same as the count above is polled every few seconds. */
export async function getRecentNotificationsForBell(limit = 5): Promise<NotificationRow[]> {
  const person = await getCurrentPerson();
  if (!person) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, related_url, actor_label, is_read, created_at")
    .eq("person_id", person.id)
    .eq("is_read", false)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    relatedUrl: n.related_url,
    actorLabel: n.actor_label,
    isRead: n.is_read,
    isArchived: false,
    createdAt: n.created_at,
  }));
}

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

/** Marks one notification as read — called when a row is expanded to
 * view its detail (opening it to read it is the read action; archiving
 * is separate, see below). Scoped to the caller's own row: the RLS
 * update-own policy (0007_rls.sql) would reject someone else's anyway,
 * but the `.eq("person_id", ...)` here makes that explicit rather than
 * relying on RLS to silently no-op a mismatched id. */
export async function markNotificationRead(notificationId: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("person_id", person.id);
  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
  revalidatePath("/");
}

/** Archives one notification — a deliberate second step past "read", so
 * the inbox only grows unbounded from notifications nobody has decided
 * are done with, not from every one that's merely been opened. */
export async function archiveNotification(notificationId: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_archived: true })
    .eq("id", notificationId)
    .eq("person_id", person.id);
  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
  revalidatePath("/");
}
