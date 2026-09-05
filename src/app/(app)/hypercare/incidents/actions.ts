"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import type { IncidentSeverity } from "@/lib/supabase/database.types";

/** Logs a new incident against a service. Shared by the Hypercare overview
 * page, the incidents list, and a service's own detail page (pre-scoped). */
export async function logIncident(formData: FormData) {
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  if (!serviceId) throw new Error("Service is required.");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const severity = String(formData.get("severity") ?? "").trim() as IncidentSeverity;
  if (!["sev1", "sev2", "sev3"].includes(severity)) throw new Error("Severity is required.");
  const rootCause = String(formData.get("rootCause") ?? "").trim() || null;

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: service } = await supabase.from("services").select("id, workspace_id, ref, name").eq("id", serviceId).maybeSingle();
  if (!service) throw new Error("Service not found.");

  // Ref generated workspace-wide (all services), max existing INC-xxx + 1 —
  // matches the INC-114 / INC-098 numbering convention in supabase/seed.sql.
  const { data: workspaceServices } = await supabase.from("services").select("id").eq("workspace_id", service.workspace_id);
  const serviceIds = (workspaceServices ?? []).map((s) => s.id);
  const { data: existing } = serviceIds.length
    ? await supabase.from("incidents").select("ref").in("service_id", serviceIds)
    : { data: [] as { ref: string }[] };
  const maxNum = (existing ?? []).reduce((max, r) => {
    const match = r.ref.match(/(\d+)\s*$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  const ref = `INC-${String(maxNum + 1).padStart(3, "0")}`;

  const { error } = await supabase.from("incidents").insert({
    service_id: serviceId,
    ref,
    title,
    severity,
    status: "open",
    opened_at: new Date().toISOString(),
    root_cause: rootCause,
    created_by: person.id,
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    service.workspace_id,
    {
      kind: "incident_logged",
      title: `${ref} logged: ${title}`,
      body: `${person.full_name} opened a ${severity.toUpperCase()} incident on ${service.name}.`,
      relatedUrl: `/hypercare/incidents/${ref.toLowerCase()}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/hypercare");
  revalidatePath("/hypercare/incidents");
  revalidatePath(`/hypercare/services/${service.ref.toLowerCase()}`);
  revalidatePath("/");
}
