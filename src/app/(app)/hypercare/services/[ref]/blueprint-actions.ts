"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHypercareLead, getCurrentPerson } from "@/lib/data/auth-guard";

function revalidateService(serviceRef: string) {
  revalidatePath(`/hypercare/services/${serviceRef.toLowerCase()}`);
  revalidatePath("/manifest");
}

/** Creates or updates the one service agreement a service has — term,
 * fee, tier, entitlement, renewal date, inherited by hand from the
 * signed SOW for now (source_ref is a plain text field until the
 * DocuSign chain exists to fill it automatically). Restricted to the
 * Hypercare lead: this is the commercial terms of the engagement. */
export async function upsertServiceAgreement(serviceId: string, serviceRef: string, formData: FormData) {
  const person = await requireHypercareLead();
  const supabase = await createClient();

  const tier = String(formData.get("tier") ?? "").trim();
  if (!tier) throw new Error("Tier is required.");
  const termMonthsRaw = String(formData.get("termMonths") ?? "").trim();
  const fee = String(formData.get("fee") ?? "").trim() || null;
  const entitlementIncludedUnits = Number(String(formData.get("entitlementIncludedUnits") ?? "0").trim()) || 0;
  const renewalDate = String(formData.get("renewalDate") ?? "").trim() || null;
  const sourceRef = String(formData.get("sourceRef") ?? "").trim() || null;

  const { error } = await supabase.from("service_agreements").upsert(
    {
      workspace_id: person.workspace_id,
      service_id: serviceId,
      tier,
      term_months: termMonthsRaw ? Number(termMonthsRaw) : null,
      fee,
      entitlement_included_units: entitlementIncludedUnits,
      renewal_date: renewalDate,
      source_ref: sourceRef,
    },
    { onConflict: "service_id" }
  );
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

/** Opens this month's entitlement bucket, included-units copied from the
 * agreement (edit the period directly for a one-off adjustment; the
 * agreement is the default going forward). */
export async function openEntitlementPeriod(serviceId: string, serviceRef: string) {
  const person = await requireHypercareLead();
  const supabase = await createClient();

  const { data: agreement } = await supabase
    .from("service_agreements")
    .select("entitlement_included_units")
    .eq("service_id", serviceId)
    .maybeSingle();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { error } = await supabase.from("entitlement_periods").upsert(
    {
      workspace_id: person.workspace_id,
      service_id: serviceId,
      period_start: periodStart,
      period_end: periodEnd,
      included_units: agreement?.entitlement_included_units ?? 0,
    },
    { onConflict: "service_id,period_start" }
  );
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

export async function setEntitlementOverage(entitlementPeriodId: string, serviceRef: string, mode: "billed" | "absorbed") {
  await requireHypercareLead();
  const supabase = await createClient();
  const { error } = await supabase
    .from("entitlement_periods")
    .update({ overage_billed: mode === "billed", overage_absorbed: mode === "absorbed" })
    .eq("id", entitlementPeriodId);
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

export async function upsertRunBook(serviceId: string, serviceRef: string, formData: FormData) {
  const person = await requireHypercareLead();
  const supabase = await createClient();

  const { error } = await supabase.from("run_books").upsert(
    {
      workspace_id: person.workspace_id,
      service_id: serviceId,
      dependencies: String(formData.get("dependencies") ?? "").trim() || null,
      recovery_steps: String(formData.get("recoverySteps") ?? "").trim() || null,
      owner_person_id: String(formData.get("ownerPersonId") ?? "").trim() || null,
      escalation_path: String(formData.get("escalationPath") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "service_id" }
  );
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

export async function logScheduledHealthCheck(serviceId: string, serviceRef: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();

  const { data: runBook } = await supabase.from("run_books").select("id").eq("service_id", serviceId).maybeSingle();

  const { error } = await supabase.from("scheduled_health_checks").insert({
    workspace_id: person.workspace_id,
    service_id: serviceId,
    run_book_id: runBook?.id ?? null,
    performed_by_person_id: person.id,
    notes: String(formData.get("notes") ?? "").trim() || null,
    found_issue: formData.get("foundIssue") === "on",
  });
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

/** The escape valve's other half, inside entitlement (Decision Pack, "A
 * change to the running solution, inside entitlement or billable" —
 * hypercare-cockpit-blueprint.pdf, object model). Above the effort
 * threshold, the real move is decideChangeRequest / a new mission in
 * Missions, already wired. */
export async function createServiceChange(serviceId: string, serviceRef: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const supabase = await createClient();

  const { error } = await supabase.from("service_changes").insert({
    workspace_id: person.workspace_id,
    service_id: serviceId,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    effort_band: String(formData.get("effortBand") ?? "").trim() || null,
    billable: formData.get("billable") === "on",
    source_incident_id: String(formData.get("sourceIncidentId") ?? "").trim() || null,
    source_request_id: String(formData.get("sourceRequestId") ?? "").trim() || null,
    created_by_person_id: person.id,
  });
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

export async function completeServiceChange(id: string, serviceRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();
  const { error } = await supabase.from("service_changes").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

/** Feeds Manifest and the Hangar roadmap directly — see
 * listOpenImprovementItemsForWorkspace (lib/data/hypercare-blueprint.ts),
 * read live rather than copied. */
export async function createImprovementItem(serviceId: string, serviceRef: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const pattern = String(formData.get("pattern") ?? "").trim();
  if (!pattern) throw new Error("Pattern is required.");
  const supabase = await createClient();

  const { error } = await supabase.from("improvement_items").insert({
    workspace_id: person.workspace_id,
    service_id: serviceId,
    pattern,
    frequency: Number(String(formData.get("frequency") ?? "1").trim()) || 1,
    proposed_fix: String(formData.get("proposedFix") ?? "").trim() || null,
    created_by_person_id: person.id,
  });
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}

export async function resolveImprovementItem(id: string, serviceRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();
  const { error } = await supabase.from("improvement_items").update({ status: "done" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateService(serviceRef);
}
