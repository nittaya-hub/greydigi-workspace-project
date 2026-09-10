"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function createChangeRequest(projectId: string, projectRef: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  const description = String(formData.get("description") ?? "").trim() || null;
  const raisedFromRef = String(formData.get("raisedFromRef") ?? "").trim() || null;
  const impactDatesDaysRaw = String(formData.get("impactDatesDays") ?? "").trim();
  const impactDatesDays = impactDatesDaysRaw ? Number(impactDatesDaysRaw) : null;
  const impactEffort = String(formData.get("impactEffort") ?? "").trim() || null;
  const impactPrice = String(formData.get("impactPrice") ?? "").trim() || null;

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  // Ref numbering (CR-0XX) is continued across the whole workspace, not
  // just this project, so it reads as one running sequence (see seed.sql's
  // CR-011, CR-012, CR-014 across different projects).
  const { data: workspaceProjects } = await supabase.from("projects").select("id").eq("workspace_id", person.workspace_id);
  const projectIds = (workspaceProjects ?? []).map((p) => p.id);
  const { data: existingCrs } = projectIds.length
    ? await supabase.from("change_requests").select("ref").in("project_id", projectIds)
    : { data: [] as { ref: string }[] };

  const maxNumber = (existingCrs ?? []).reduce((max, c) => {
    const match = /^CR-(\d+)$/.exec(c.ref);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  const ref = `CR-${String(maxNumber + 1).padStart(3, "0")}`;

  const { error } = await supabase.from("change_requests").insert({
    project_id: projectId,
    ref,
    title,
    description,
    raised_from_ref: raisedFromRef,
    impact_dates_days: impactDatesDays,
    impact_effort: impactEffort,
    impact_price: impactPrice,
    status: "raised",
    created_by: person.id,
  });
  if (error) throw new Error(error.message);

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "change_request_raised",
      title: `New CR: ${title}`,
      body: `${person.full_name} raised ${ref} on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/change-requests`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/change-requests`);
  revalidatePath(base);
  revalidatePath("/delivery");
  revalidatePath("/");
}

/** Approves or rejects a raised CR — the step that never existed before,
 * leaving every CR stuck at "raised" forever regardless of what anyone
 * decided about it. Either outcome is final: once approved or rejected a
 * CR isn't re-opened, matching the flight plan's own rule that change
 * requests are decided in a day, not left hanging (a mistaken decision
 * gets a brand-new CR, not a reopened one). */
export async function decideChangeRequest(crId: string, projectId: string, projectRef: string, decision: "approved" | "rejected") {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: cr } = await supabase.from("change_requests").select("ref, title, status").eq("id", crId).maybeSingle();
  if (!cr) throw new Error("Change request not found.");
  if (cr.status !== "raised" && cr.status !== "awaiting_signature") {
    throw new Error(`This CR is already ${cr.status} — decisions aren't reopened.`);
  }

  const { error } = await supabase.from("change_requests").update({ status: decision }).eq("id", crId);
  if (error) throw new Error(error.message);

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();
  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: decision === "approved" ? "change_request_approved" : "change_request_rejected",
      title: `CR ${decision}: ${cr.ref}`,
      body: `${person.full_name} ${decision} ${cr.ref} — ${cr.title} — on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/change-requests`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/change-requests`);
  revalidatePath(base);
}
