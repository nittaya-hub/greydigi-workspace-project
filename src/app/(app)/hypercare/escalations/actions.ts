"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** escalation_status only has 'open' | 'resolved' (migration 0001) — there is
 * no distinct "acknowledged" state, so acknowledging an escalation is
 * recorded the same way as resolving it: it is the terminal action a lead
 * takes on this row in the current UI (there's no separate resolve button
 * on this screen). */
export async function acknowledgeEscalation(escalationId: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: escalation } = await supabase
    .from("escalations")
    .select("id, workspace_id, service_id, reason")
    .eq("id", escalationId)
    .maybeSingle();
  if (!escalation) throw new Error("Escalation not found.");
  const { data: service } = await supabase.from("services").select("name").eq("id", escalation.service_id).maybeSingle();

  const { error } = await supabase
    .from("escalations")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", escalationId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    escalation.workspace_id,
    {
      kind: "escalation_acknowledged",
      title: `Escalation acknowledged on ${service?.name ?? "a service"}`,
      body: `${person?.full_name ?? "Someone"} acknowledged and closed out the escalation: ${escalation.reason}`,
      relatedUrl: "/hypercare/escalations",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/hypercare/escalations");
  revalidatePath("/hypercare");
}

/** escalations has no notes/history column — `reason` is a single
 * not-null text field, so appending to it would destroy the original
 * escalation's reason. Escalating further is therefore a new escalation
 * row against the same incident/service, which preserves the trail and
 * matches "further" (another level up) rather than editing history. */
export async function escalateFurther(escalationId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A reason is required.");
  const escalatedToPersonId = String(formData.get("escalatedToPersonId") ?? "").trim();
  if (!escalatedToPersonId) throw new Error("Choose who this escalates to.");

  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: current } = await supabase
    .from("escalations")
    .select("id, workspace_id, service_id, incident_id")
    .eq("id", escalationId)
    .maybeSingle();
  if (!current) throw new Error("Escalation not found.");

  const [{ data: service }, { data: target }] = await Promise.all([
    supabase.from("services").select("name").eq("id", current.service_id).maybeSingle(),
    supabase.from("people").select("full_name").eq("id", escalatedToPersonId).maybeSingle(),
  ]);

  const { error } = await supabase.from("escalations").insert({
    workspace_id: current.workspace_id,
    service_id: current.service_id,
    incident_id: current.incident_id,
    reason,
    escalated_to_person_id: escalatedToPersonId,
    status: "open",
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    current.workspace_id,
    {
      kind: "escalation_raised",
      title: `Escalated further on ${service?.name ?? "a service"}`,
      body: `${person?.full_name ?? "Someone"} escalated to ${target?.full_name ?? "someone"}: ${reason}`,
      relatedUrl: "/hypercare/escalations",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/hypercare/escalations");
  revalidatePath("/hypercare");
}
