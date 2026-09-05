"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

async function getIncidentContext(supabase: Awaited<ReturnType<typeof createClient>>, incidentId: string) {
  const { data: incident } = await supabase.from("incidents").select("id, title, service_id").eq("id", incidentId).maybeSingle();
  if (!incident) throw new Error("Incident not found.");
  const { data: service } = await supabase.from("services").select("workspace_id, name").eq("id", incident.service_id).maybeSingle();
  if (!service) throw new Error("Service not found.");
  return { incident, service };
}

/** Every pause needs a reason (design source note on screen "SLA"). There is
 * no 'paused' value in incident_status (migration 0001: open / investigating
 * / resolved), so this only records the pause window — it does not change
 * the incident's own status. */
export async function pauseClock(incidentId: string, incidentRef: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A reason is required to pause the clock.");

  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { incident, service } = await getIncidentContext(supabase, incidentId);

  const { error } = await supabase.from("incident_pauses").insert({
    incident_id: incidentId,
    reason,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    service.workspace_id,
    {
      kind: "incident_paused",
      title: `${incidentRef} clock paused`,
      body: `${person?.full_name ?? "Someone"} paused the SLA clock on ${incident.title}: ${reason}`,
      relatedUrl: `/hypercare/incidents/${incidentRef.toLowerCase()}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath(`/hypercare/incidents/${incidentRef.toLowerCase()}`);
  revalidatePath("/hypercare/incidents");
  revalidatePath("/hypercare");
}

export async function resolveIncident(incidentId: string, incidentRef: string) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  const { incident, service } = await getIncidentContext(supabase, incidentId);

  const { error } = await supabase
    .from("incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", incidentId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    service.workspace_id,
    {
      kind: "incident_resolved",
      title: `${incidentRef} resolved`,
      body: `${person?.full_name ?? "Someone"} marked ${incident.title} (${service.name}) resolved.`,
      relatedUrl: `/hypercare/incidents/${incidentRef.toLowerCase()}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath(`/hypercare/incidents/${incidentRef.toLowerCase()}`);
  revalidatePath("/hypercare/incidents");
  revalidatePath("/hypercare");
  revalidatePath("/");
}
