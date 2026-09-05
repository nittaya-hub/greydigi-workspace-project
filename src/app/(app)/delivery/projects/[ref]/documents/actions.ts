"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function createDocument(projectId: string, projectRef: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const kind = String(formData.get("kind") ?? "artefact").trim() || "artefact";
  const version = String(formData.get("version") ?? "").trim() || "v1";
  const visibility = String(formData.get("visibility") ?? "internal").trim();
  const requiresSignature = formData.get("requiresSignature") === "on";

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  const { error } = await supabase.from("documents").insert({
    workspace_id: person.workspace_id,
    project_id: projectId,
    name,
    kind,
    version,
    visibility: visibility === "client_visible" ? "client_visible" : "internal",
    requires_signature: requiresSignature,
  });
  if (error) throw new Error(error.message);

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "document_uploaded",
      title: `New document: ${name}`,
      body: `${person.full_name} added ${name} (${version}) to ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/documents`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/documents`);
  revalidatePath(base);
  revalidatePath(`/portal/${projectRef.toLowerCase()}`);
  revalidatePath("/delivery");
  revalidatePath("/");
}
