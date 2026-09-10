"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";
import type { SubmissionTaxonomyField } from "@/lib/data/submission-taxonomies";

export async function renameWorkspace(workspaceId: string, name: string) {
  if (!name.trim()) throw new Error("Name cannot be empty.");
  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", workspaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function saveGeneralSettings(
  workspaceId: string,
  fields: { name: string; businessHours: string }
) {
  if (!fields.name.trim()) throw new Error("Name cannot be empty.");
  if (!fields.businessHours.trim()) throw new Error("Business hours cannot be empty.");
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { error } = await supabase
    .from("workspaces")
    .update({ name: fields.name.trim(), business_hours: fields.businessHours.trim() })
    .eq("id", workspaceId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    workspaceId,
    {
      kind: "settings_edited",
      title: "Workspace settings updated",
      body: `${person?.full_name ?? "Someone"} changed the workspace name and/or business hours.`,
      relatedUrl: "/settings",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/hypercare/health");
}

export async function savePortalSettings(
  workspaceId: string,
  fields: { defaultShareExpiryDays: number; portalWelcomeMessage: string }
) {
  if (!Number.isFinite(fields.defaultShareExpiryDays) || fields.defaultShareExpiryDays < 1) {
    throw new Error("Default share link expiry must be at least 1 day.");
  }
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { error } = await supabase
    .from("workspaces")
    .update({
      default_share_expiry_days: fields.defaultShareExpiryDays,
      portal_welcome_message: fields.portalWelcomeMessage.trim() || null,
    })
    .eq("id", workspaceId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    workspaceId,
    {
      kind: "settings_edited",
      title: "Portal and branding updated",
      body: `${person?.full_name ?? "Someone"} changed the client-portal welcome message and/or share link expiry.`,
      relatedUrl: "/settings/portal",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/settings/portal");
}

export async function toggleIntegration(
  workspaceId: string,
  integrationId: string,
  integrationName: string,
  connect: boolean
) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { error } = await supabase
    .from("workspace_integrations")
    .update({
      status: connect ? "connected" : "not_connected",
      connected_at: connect ? new Date().toISOString() : null,
    })
    .eq("id", integrationId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    workspaceId,
    {
      kind: connect ? "integration_connected" : "integration_disconnected",
      title: `${integrationName} ${connect ? "connected" : "disconnected"}`,
      body: `${person?.full_name ?? "Someone"} ${connect ? "connected" : "disconnected"} ${integrationName}.`,
      relatedUrl: "/settings/integrations",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/settings/integrations");
}

export async function updateSlaPolicy(
  policyId: string,
  serviceName: string,
  workspaceId: string,
  fields: { responseTargetMinutes: number; resolveTargetMinutes: number; businessHoursOnly: boolean }
) {
  if (!Number.isFinite(fields.responseTargetMinutes) || fields.responseTargetMinutes < 1) {
    throw new Error("Response target must be a positive number of minutes.");
  }
  if (!Number.isFinite(fields.resolveTargetMinutes) || fields.resolveTargetMinutes < 1) {
    throw new Error("Resolve target must be a positive number of minutes.");
  }
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { error } = await supabase
    .from("sla_policies")
    .update({
      response_target_minutes: fields.responseTargetMinutes,
      resolve_target_minutes: fields.resolveTargetMinutes,
      business_hours_only: fields.businessHoursOnly,
    })
    .eq("id", policyId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    workspaceId,
    {
      kind: "sla_policy_edited",
      title: `SLA policy edited: ${serviceName}`,
      body: `${person?.full_name ?? "Someone"} updated response/resolve targets for ${serviceName}.`,
      relatedUrl: "/settings/sla",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/settings/sla");
  revalidatePath("/hypercare/sla");
}

export async function addSubmissionTaxonomyOption(
  workspaceId: string,
  fields: { kind: ClientSubmissionKind; field: SubmissionTaxonomyField; value: string; label: string }
) {
  const value = fields.value.trim().toLowerCase().replace(/\s+/g, "_");
  const label = fields.label.trim();
  if (!value) throw new Error("Enter a value.");
  if (!label) throw new Error("Enter a label.");

  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { count } = await supabase
    .from("submission_taxonomy_options")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("kind", fields.kind)
    .eq("field", fields.field);

  const { error } = await supabase.from("submission_taxonomy_options").insert({
    workspace_id: workspaceId,
    kind: fields.kind,
    field: fields.field,
    value,
    label,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    workspaceId,
    {
      kind: "submission_taxonomy_edited",
      title: `Submission option added: ${label}`,
      body: `${person?.full_name ?? "Someone"} added "${label}" to ${fields.kind} ${fields.field} options.`,
      relatedUrl: "/settings/submissions",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/settings/submissions");
}

export async function updateSubmissionTaxonomyOption(
  optionId: string,
  workspaceId: string,
  fields: { label: string; isActive: boolean }
) {
  const label = fields.label.trim();
  if (!label) throw new Error("Label cannot be empty.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("submission_taxonomy_options")
    .update({ label, is_active: fields.isActive })
    .eq("id", optionId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings/submissions");
}
