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
