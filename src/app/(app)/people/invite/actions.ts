"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireWorkspaceAdmin } from "@/lib/data/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface InviteResult {
  ok: boolean;
  message: string;
  temporaryPassword?: string;
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function generatePassword() {
  // 12 random bytes -> 16-char base64url string. Shown once to the admin;
  // the new member changes it after first sign-in (see /auth/set-password).
  return randomBytes(12).toString("base64url");
}

const VALID_ROLES = new Set([
  "workspace_admin",
  "delivery_lead",
  "product_lead",
  "hypercare_lead",
  "member",
]);

export async function inviteMember(formData: FormData): Promise<InviteResult> {
  let admin;
  try {
    admin = await requireWorkspaceAdmin();
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not authorized." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const workspaceRole = String(formData.get("workspaceRole") ?? "member");
  const customPassword = String(formData.get("password") ?? "").trim();

  if (!fullName) return { ok: false, message: "Enter a full name." };
  if (!email || !email.includes("@")) return { ok: false, message: "Enter a valid email address." };
  if (!VALID_ROLES.has(workspaceRole)) return { ok: false, message: "Invalid role." };
  if (customPassword && customPassword.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const password = customPassword || generatePassword();
  const supabaseAdmin = createAdminClient();

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return { ok: false, message: createError?.message ?? "Could not create the account." };
  }

  const { error: insertError } = await supabaseAdmin.from("people").insert({
    workspace_id: admin.workspace_id,
    auth_user_id: created.user.id,
    full_name: fullName,
    email,
    kind: "internal",
    avatar_initials: initialsFrom(fullName),
    workspace_role: workspaceRole as
      | "workspace_admin"
      | "delivery_lead"
      | "product_lead"
      | "hypercare_lead"
      | "member",
  });
  if (insertError) {
    // Roll back the auth user so a failed invite doesn't leave an orphaned
    // account with no matching people row.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: insertError.message };
  }

  const client = await createClient();
  await client.rpc("fn_log_activity", {
    p_workspace_id: admin.workspace_id,
    p_actor_person_id: admin.id,
    p_space: null,
    p_action: "invite",
    p_entity_type: "people",
    p_entity_id: created.user.id,
    p_summary: `${fullName} added as ${workspaceRole.replace(/_/g, " ")}`,
    p_metadata: {},
  });

  revalidatePath("/people");
  return {
    ok: true,
    message: `${fullName} was added. Share this temporary password with them securely — it won't be shown again.`,
    temporaryPassword: password,
  };
}

