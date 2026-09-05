"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

export async function createBaselineV1(projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  const { error } = await supabase.from("baselines").insert({
    project_id: projectId,
    version: "v1",
    status: "draft",
    scope_snapshot: {},
    dates_snapshot: {},
    effort_snapshot: {},
  });
  if (error) throw new Error(error.message);

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "baseline_created",
      title: `Baseline v1 created: ${project?.name ?? projectRef}`,
      body: `${person.full_name} created a draft v1 baseline on ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/baselines`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/baselines`);
  revalidatePath(base);
  revalidatePath("/delivery");
  revalidatePath("/");
}
