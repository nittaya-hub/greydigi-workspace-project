"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson, requireWorkspaceAdmin } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** Creates a project and clones its flight plan from the chosen locked
 * template version: project_phases from template_phases, then
 * project_gates from template_gates (each gate's project_phase_id
 * resolved from the phase it was just cloned into). Mirrors the shape
 * supabase/seed_nk_live.sql uses to seed NK-P1's phases and gates by hand.
 * Gate conditions are not cloned — a fresh project starts with no gates
 * held (default status 'on_plan'), which is the correct empty state. */
export async function createProject(formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const clientId = String(formData.get("clientId") ?? "").trim();
  const ref = String(formData.get("ref") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const templateVersionId = String(formData.get("templateVersionId") ?? "").trim();
  const leadPersonId = String(formData.get("leadPersonId") ?? "").trim() || null;
  const goLiveTarget = String(formData.get("goLiveTarget") ?? "").trim() || null;

  if (!clientId) throw new Error("Client is required.");
  if (!ref) throw new Error("Ref is required.");
  if (!name) throw new Error("Name is required.");
  if (!templateVersionId) throw new Error("Template version is required.");

  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id: person.workspace_id,
      client_id: clientId,
      ref,
      name,
      description,
      template_version_id: templateVersionId,
      lead_person_id: leadPersonId,
      go_live_target: goLiveTarget,
    })
    .select("id")
    .single();
  if (projectError || !project) throw new Error(projectError?.message ?? "Could not create project.");

  const { data: templatePhases, error: templatePhasesError } = await supabase
    .from("template_phases")
    .select("id, index, code, name, duration_label, show_duration_label")
    .eq("template_version_id", templateVersionId)
    .order("index");
  if (templatePhasesError) throw new Error(templatePhasesError.message);

  const phaseIdByTemplatePhase = new Map<string, string>();
  if (templatePhases && templatePhases.length > 0) {
    const { data: insertedPhases, error: phasesInsertError } = await supabase
      .from("project_phases")
      .insert(
        templatePhases.map((p) => ({
          project_id: project.id,
          template_phase_id: p.id,
          index: p.index,
          code: p.code,
          name: p.name,
          duration_label: p.duration_label,
          show_duration_label: p.show_duration_label,
        }))
      )
      .select("id, template_phase_id");
    if (phasesInsertError) throw new Error(phasesInsertError.message);
    for (const p of insertedPhases ?? []) {
      if (p.template_phase_id) phaseIdByTemplatePhase.set(p.template_phase_id, p.id);
    }
  }

  const { data: templateGates, error: templateGatesError } = await supabase
    .from("template_gates")
    .select("id, template_phase_id, code, name, sequence")
    .eq("template_version_id", templateVersionId)
    .order("sequence");
  if (templateGatesError) throw new Error(templateGatesError.message);

  if (templateGates && templateGates.length > 0) {
    const gateRows = templateGates
      .map((g) => {
        const projectPhaseId = phaseIdByTemplatePhase.get(g.template_phase_id);
        if (!projectPhaseId) return null;
        return {
          project_id: project.id,
          project_phase_id: projectPhaseId,
          template_gate_id: g.id,
          code: g.code,
          name: g.name,
          sequence: g.sequence,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (gateRows.length > 0) {
      const { error: gatesInsertError } = await supabase.from("project_gates").insert(gateRows);
      if (gatesInsertError) throw new Error(gatesInsertError.message);
    }
  }

  // Phases and gates were already cloned from the template; tasks never
  // were, so every new project started with an empty Tasks and
  // milestones tab, grouped under "Phase — Unassigned" the moment
  // someone added their own task by hand (no phase to put it under).
  // Cloning template_tasks the same way gives a project its starting
  // checklist for real, ordered by the phase it was cloned into.
  const { data: templateTasks, error: templateTasksError } = await supabase
    .from("template_tasks")
    .select("template_phase_id, title, is_critical_path")
    .eq("template_version_id", templateVersionId);
  if (templateTasksError) throw new Error(templateTasksError.message);

  if (templateTasks && templateTasks.length > 0) {
    const phaseIndexByTemplatePhase = new Map((templatePhases ?? []).map((p) => [p.id, p.index]));
    const orderedTasks = [...templateTasks].sort((a, b) => {
      const ai = phaseIndexByTemplatePhase.get(a.template_phase_id) ?? 0;
      const bi = phaseIndexByTemplatePhase.get(b.template_phase_id) ?? 0;
      return ai - bi;
    });

    const taskRows = orderedTasks
      .map((t, i) => {
        const projectPhaseId = phaseIdByTemplatePhase.get(t.template_phase_id);
        if (!projectPhaseId) return null;
        return {
          project_id: project.id,
          project_phase_id: projectPhaseId,
          ref: `${ref}-T${String(i + 1).padStart(2, "0")}`,
          title: t.title,
          is_critical_path: t.is_critical_path,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (taskRows.length > 0) {
      const { error: tasksInsertError } = await supabase.from("project_tasks").insert(taskRows);
      if (tasksInsertError) throw new Error(tasksInsertError.message);
    }
  }

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "project_created",
      title: `New project: ${name}`,
      body: `${person.full_name} created ${ref} — ${name}.`,
      relatedUrl: `/delivery/projects/${ref.toLowerCase()}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/delivery/projects");
  revalidatePath("/delivery");
  revalidatePath("/");

  return { ref };
}

/** Edits a project's own fields. Any internal member may (projects_
 * internal_update, 0007_rls.sql) — this is metadata correction, not the
 * destructive operation deleteProject below is. Ref is uppercased and can
 * change: every URL/link that embeds the old ref (client portal links,
 * share links, bookmarks) breaks the moment this changes, so the caller
 * is trusted to know that, not warned again server-side. */
export async function updateProject(
  projectId: string,
  currentRef: string,
  fields: { ref: string; name: string; description: string; goLiveTarget: string }
) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const ref = fields.ref.trim().toUpperCase();
  const name = fields.name.trim();
  if (!ref) throw new Error("Ref is required.");
  if (!name) throw new Error("Name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      ref,
      name,
      description: fields.description.trim() || null,
      go_live_target: fields.goLiveTarget.trim() || null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath("/delivery/projects");
  revalidatePath("/delivery");
  revalidatePath(`/delivery/projects/${currentRef.toLowerCase()}`);
  if (ref.toLowerCase() !== currentRef.toLowerCase()) revalidatePath(`/delivery/projects/${ref.toLowerCase()}`);
  revalidatePath("/");

  return { ref };
}

/** Deletes a project outright — workspace admin only (projects_internal_
 * delete, 0041_projects_delete_rls.sql). Every child row (phases, gates,
 * gate conditions, tasks, documents, baselines, change requests, client
 * updates, share links, project members, client view config, project
 * branding, client dashboard) cascades with it — declared `on delete
 * cascade` against projects.id since 0003_delivery.sql. A Hypercare
 * service already earned from this project is NOT deleted — its
 * origin_project_id just goes null (`on delete set null`,
 * 0005_hypercare.sql) — a live client-facing service must outlive the
 * delivery record that spawned it. */
export async function deleteProject(projectId: string, ref: string, name: string) {
  const person = await requireWorkspaceAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(person.workspace_id, {
    kind: "project_deleted",
    title: `Project deleted: ${name}`,
    body: `${person.full_name} deleted ${ref} — ${name}. Everything under it (tasks, documents, gates) went with it.`,
    relatedUrl: "/delivery/projects",
  });

  revalidatePath("/delivery/projects");
  revalidatePath("/delivery");
  revalidatePath("/");
}
