"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function createRequest(formData: FormData) {
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  if (!serviceId) throw new Error("Service is required.");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: service } = await supabase.from("services").select("id, workspace_id, name").eq("id", serviceId).maybeSingle();
  if (!service) throw new Error("Service not found.");

  // Ref generated workspace-wide, max existing REQ-xxx + 1 — matches the
  // REQ-055 / REQ-061 numbering convention in supabase/seed.sql.
  const { data: workspaceServices } = await supabase.from("services").select("id").eq("workspace_id", service.workspace_id);
  const serviceIds = (workspaceServices ?? []).map((s) => s.id);
  const { data: existing } = serviceIds.length
    ? await supabase.from("support_requests").select("ref").in("service_id", serviceIds)
    : { data: [] as { ref: string }[] };
  const maxNum = (existing ?? []).reduce((max, r) => {
    const match = r.ref.match(/(\d+)\s*$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > max ? n : max;
  }, 0);
  const ref = `REQ-${String(maxNum + 1).padStart(3, "0")}`;

  const { error } = await supabase.from("support_requests").insert({
    service_id: serviceId,
    ref,
    title,
    status: "open",
    opened_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    service.workspace_id,
    {
      kind: "request_created",
      title: `${ref} created: ${title}`,
      body: `${person?.full_name ?? "Someone"} opened a new request on ${service.name}.`,
      relatedUrl: "/hypercare/requests",
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/hypercare/requests");
  revalidatePath("/hypercare");
  revalidatePath("/");
}
