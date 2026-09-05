"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function createClientUpdate(projectId: string, projectRef: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) throw new Error("Title is required.");
  if (!body) throw new Error("Body is required.");

  const publishNow = formData.get("publishNow") === "on";

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  const { error } = await supabase.from("client_updates").insert({
    project_id: projectId,
    title,
    body,
    author_person_id: person.id,
    status: publishNow ? "published" : "draft",
    published_at: publishNow ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: publishNow ? "client_update_published" : "client_update_created",
      title: `New client update: ${title}`,
      body: `${person.full_name} ${publishNow ? "published" : "drafted"} a client update on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/client-updates`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/client-updates`);
  revalidatePath(base);
  revalidatePath("/delivery");
  revalidatePath("/");
}

export async function publishClientUpdate(updateId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: update } = await supabase
    .from("client_updates")
    .select("title, project_id")
    .eq("id", updateId)
    .maybeSingle();
  const { data: project } = update
    ? await supabase.from("projects").select("name").eq("id", update.project_id).maybeSingle()
    : { data: null as { name: string } | null };

  const { error } = await supabase
    .from("client_updates")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", updateId);
  if (error) throw new Error(error.message);

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "client_update_published",
      title: `Client update published: ${update?.title ?? ""}`,
      body: `${person.full_name} published a client update to the portal on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/client-updates`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/client-updates`);
  revalidatePath(base);
  revalidatePath(`/portal/${projectRef.toLowerCase()}`);
  revalidatePath("/delivery");
  revalidatePath("/");
}
