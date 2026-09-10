"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";

/** Same generator as share-links' own newToken() — generating this in
 * application code, not SQL, is the pattern already proven to work here.
 * A SQL-side gen_random_bytes() call hit a real runtime error instead:
 * Supabase installs pgcrypto into the `extensions` schema, not `public`,
 * so a `set search_path = public` function can't see it. */
function newReportToken() {
  return randomBytes(9).toString("base64url").toLowerCase();
}

/** Same shape as Delivery's toggleClientViewField, on Hypercare's own
 * table — merges the one changed key into fields, leaving every other
 * key exactly as it was. fn_publish_hypercare_report defaults every
 * missing key with coalesce(...,true/false) from its first version, so
 * this never risks the 0043/0045 bug where an untouched key read as off. */
export async function toggleHypercareViewField(clientId: string, fieldKey: string, value: boolean) {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("hypercare_view_configs").select("fields").eq("client_id", clientId).maybeSingle();
  const fields = { ...(existing?.fields as Record<string, boolean> | undefined), [fieldKey]: value };

  const { error } = await supabase.from("hypercare_view_configs").upsert({ client_id: clientId, fields }, { onConflict: "client_id" });
  if (error) throw new Error(error.message);

  revalidatePath(`/hypercare/clients/${clientId}/report-config`);
}

export async function publishHypercareReport(clientId: string, periodStart: string, periodEnd: string) {
  if (!periodStart || !periodEnd) throw new Error("Pick a start and end date.");
  if (periodEnd < periodStart) throw new Error("End date can't be before the start date.");

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_publish_hypercare_report", {
    p_client_id: clientId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_published_by: person.id,
    p_token: newReportToken(),
  });
  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; message?: string; token?: string };
  if (!result.ok) throw new Error(result.message ?? "Could not publish the report.");

  revalidatePath(`/hypercare/clients/${clientId}/report-config`);
  return { token: result.token as string };
}

/** Powers the report-config page's preview panel — same section-building
 * logic as publish, minus the insert, so nothing is written and it's
 * free to call every time the admin changes the period or a toggle.
 * Matches Client view config's own live preview, just period-aware. */
export async function previewHypercareReport(clientId: string, periodStart: string, periodEnd: string) {
  if (!periodStart || !periodEnd) throw new Error("Pick a start and end date.");
  if (periodEnd < periodStart) throw new Error("End date can't be before the start date.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_preview_hypercare_report", {
    p_client_id: clientId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });
  if (error) throw new Error(error.message);
  const result = data as { ok: boolean; message?: string; data?: unknown };
  if (!result.ok) throw new Error(result.message ?? "Could not load the preview.");
  return result.data;
}

export async function revokeHypercareReport(reportId: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("hypercare_share_reports").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", reportId);
  if (error) throw new Error(error.message);

  revalidatePath(`/hypercare/clients/${clientId}/report-config`);
}
