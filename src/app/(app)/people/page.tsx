import { redirect } from "next/navigation";

/** The member list moved to Settings -> Permissions as "User Access"
 * (see UserAccessTable.tsx) — this route stays only so old links/bookmarks
 * land somewhere sensible. /people/invite and /people/[id] are unaffected. */
export default function MembersPageRedirect() {
  redirect("/settings/permissions");
}
