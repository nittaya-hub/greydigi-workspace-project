const ACTION_KINDS = new Set(["gate_held", "incident", "change_request", "client_message", "submission_needs_client_notice"]);

/** Every client submission — from the authenticated portal or either
 * no-login share link (delivery_submission_*, hypercare_submission_*,
 * see supabase/migrations/0048_public_submission_notifications.sql) —
 * is, by definition, something a client is waiting on. Prefix-matched
 * rather than added to ACTION_KINDS one kind at a time, since all three
 * sub-kinds (issue/change_request/question) of both sources count.
 * `submission_needs_client_notice` (case-tracking's reminder flag,
 * src/app/(app)/hypercare/submissions/actions.ts) is added to
 * ACTION_KINDS directly rather than by prefix, since it's the one
 * case-tracking event that's genuinely still waiting on someone --
 * unlike submission_assigned/submission_comment_added, which are just
 * informational. */
export function isActionNeeded(kind: string): boolean {
  return ACTION_KINDS.has(kind) || kind.startsWith("delivery_submission_") || kind.startsWith("hypercare_submission_");
}

export type NotificationCategory = "hypercare" | "delivery" | "other";

const HYPERCARE_SUBMISSION_KINDS = new Set(["submission_assigned", "submission_needs_client_notice", "submission_comment_added"]);

/** Which space a notification is about — used both for the DELIVERY/
 * HYPERCARE tag on each row (NotificationRowItem.tsx) and for the
 * category filter pills on the full list (NotificationsBoard.tsx).
 * Hypercare gets the "urgent" treatment wherever it's shown, since it
 * means live production support is waiting, not a delivery-phase
 * request. */
export function notificationCategory(kind: string): NotificationCategory {
  if (kind.startsWith("hypercare_submission_") || HYPERCARE_SUBMISSION_KINDS.has(kind)) return "hypercare";
  if (kind.startsWith("delivery_submission_")) return "delivery";
  return "other";
}

/** Shared by NotificationBell.tsx and NotificationRowItem.tsx (each had
 * its own copy). Rounded to hours only, everything under one hour
 * collapsed into "JUST NOW" -- so three notifications a couple of
 * minutes apart all showed the same "JUST NOW" with no way to tell
 * which came first. Minutes now get their own bucket. */
export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "JUST NOW";
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}
