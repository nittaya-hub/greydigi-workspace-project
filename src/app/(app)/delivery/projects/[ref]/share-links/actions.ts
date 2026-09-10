"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";

function newToken() {
  return randomBytes(5).toString("base64url").toLowerCase();
}

/** The public P·1 link exposes a client's published data with no login
 * at all, so who can create/revoke/regenerate one is a real permission,
 * not just a hidden button -- client-view-config/page.tsx only renders
 * this section for a workspace_admin, but that's UI convenience; this
 * is the check that actually stops anyone else from calling the action
 * directly. */
async function requireWorkspaceAdmin() {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  if (person.workspace_role !== "workspace_admin") throw new Error("Workspace admins only.");
  return person;
}

/** At most one active link per project. Without this, clicking "Create
 * link" again -- easy to do by accident, not realizing an active one
 * already exists -- leaves several links all genuinely valid at once
 * with no way to tell which is the "real" one to hand to a stakeholder.
 * Revoking any existing active link first (rather than blocking the
 * click) keeps "Create link" a single always-available action and
 * still leaves the old one in the audit history as revoked, not
 * deleted. */
export async function createShareLink(projectId: string, projectRef: string) {
  const person = await requireWorkspaceAdmin();
  const supabase = await createClient();
  await supabase
    .from("share_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("status", "active");
  const { error } = await supabase.from("share_links").insert({
    project_id: projectId,
    token: newToken(),
    created_by: person.id,
    expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-view-config`);
}

export async function revokeShareLink(linkId: string, projectRef: string) {
  await requireWorkspaceAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("share_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw new Error(error.message);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-view-config`);
}

export async function regenerateShareLink(linkId: string, projectRef: string) {
  await requireWorkspaceAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("share_links")
    .update({ token: newToken(), last_regenerated_at: new Date().toISOString() })
    .eq("id", linkId);
  if (error) throw new Error(error.message);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/client-view-config`);
}
