"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** "v3.2" -> "v3.3"; "v1" -> "v2"; anything else -> append "-copy" (the
 * caller resolves a collision by appending "-copy2", "-copy3", ...). */
function nextVersion(version: string): string {
  const match = version.match(/^(v)(\d+)(?:\.(\d+))?$/i);
  if (match) {
    const [, prefix, major, minor] = match;
    if (minor !== undefined) return `${prefix}${major}.${parseInt(minor, 10) + 1}`;
    return `${prefix}${parseInt(major, 10) + 1}`;
  }
  return `${version}-copy`;
}

/** Duplicates a template version: creates the next version under the same
 * template, then deep-copies phases, gates, gate conditions and tasks into
 * it — mapping old ids to new ones as it goes so a copied gate references
 * the *new* copied phase, never the original. Returns the new version id
 * so the caller can navigate to it. */
export async function duplicateTemplateVersion(versionId: string): Promise<string> {
  const supabase = await createClient();

  const { data: version } = await supabase
    .from("template_versions")
    .select("id, template_id, version")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) throw new Error("Template version not found.");

  const { data: template } = await supabase
    .from("templates")
    .select("workspace_id, name")
    .eq("id", version.template_id)
    .maybeSingle();
  if (!template) throw new Error("Template not found.");

  const { data: existingVersions } = await supabase
    .from("template_versions")
    .select("version")
    .eq("template_id", version.template_id);
  const existingSet = new Set((existingVersions ?? []).map((v) => v.version));

  let candidate = nextVersion(version.version);
  if (existingSet.has(candidate)) {
    let i = 2;
    let fallback = `${version.version}-copy`;
    while (existingSet.has(fallback)) {
      fallback = `${version.version}-copy${i}`;
      i++;
    }
    candidate = fallback;
  }

  const { data: newVersion, error: versionError } = await supabase
    .from("template_versions")
    .insert({ template_id: version.template_id, version: candidate, is_locked: false })
    .select("id")
    .single();
  if (versionError || !newVersion) throw new Error(versionError?.message ?? "Could not create the new version.");

  // Deep-copy phases first, mapping old phase id -> new phase id by index
  // (unique per version, so a stable join key regardless of insert order).
  const { data: phases } = await supabase
    .from("template_phases")
    .select("id, index, code, name, duration_label, show_duration_label")
    .eq("template_version_id", versionId)
    .order("index");

  const phaseIdMap = new Map<string, string>();
  if (phases && phases.length > 0) {
    const { data: insertedPhases, error: phasesError } = await supabase
      .from("template_phases")
      .insert(
        phases.map((p) => ({
          template_version_id: newVersion.id,
          index: p.index,
          code: p.code,
          name: p.name,
          duration_label: p.duration_label,
          show_duration_label: p.show_duration_label,
        }))
      )
      .select("id, index");
    if (phasesError) throw new Error(phasesError.message);

    const newIdByIndex = new Map((insertedPhases ?? []).map((p) => [p.index, p.id]));
    for (const p of phases) {
      const newId = newIdByIndex.get(p.index);
      if (newId) phaseIdMap.set(p.id, newId);
    }
  }

  // Deep-copy gates, pointed at the new phase ids. Map old gate id -> new
  // gate id by code (unique per version) for the conditions pass below.
  const { data: gates } = await supabase
    .from("template_gates")
    .select("id, template_phase_id, code, name, sequence")
    .eq("template_version_id", versionId)
    .order("sequence");

  const gateIdMap = new Map<string, string>();
  if (gates && gates.length > 0) {
    const gatesToInsert = gates
      .map((g) => {
        const newPhaseId = phaseIdMap.get(g.template_phase_id);
        if (!newPhaseId) return null;
        return {
          template_version_id: newVersion.id,
          template_phase_id: newPhaseId,
          code: g.code,
          name: g.name,
          sequence: g.sequence,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    if (gatesToInsert.length > 0) {
      const { data: insertedGates, error: gatesError } = await supabase
        .from("template_gates")
        .insert(gatesToInsert)
        .select("id, code");
      if (gatesError) throw new Error(gatesError.message);

      const newIdByCode = new Map((insertedGates ?? []).map((g) => [g.code, g.id]));
      for (const g of gates) {
        const newId = newIdByCode.get(g.code);
        if (newId) gateIdMap.set(g.id, newId);
      }
    }
  }

  // Deep-copy gate conditions, pointed at the new gate ids.
  const oldGateIds = (gates ?? []).map((g) => g.id);
  const { data: conditions } = oldGateIds.length
    ? await supabase
        .from("template_gate_conditions")
        .select("template_gate_id, description, requires_signature, sequence")
        .in("template_gate_id", oldGateIds)
        .order("sequence")
    : { data: [] as { template_gate_id: string; description: string; requires_signature: boolean; sequence: number }[] };

  if (conditions && conditions.length > 0) {
    const conditionsToInsert = conditions
      .map((c) => {
        const newGateId = gateIdMap.get(c.template_gate_id);
        if (!newGateId) return null;
        return {
          template_gate_id: newGateId,
          description: c.description,
          requires_signature: c.requires_signature,
          sequence: c.sequence,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (conditionsToInsert.length > 0) {
      const { error: conditionsError } = await supabase.from("template_gate_conditions").insert(conditionsToInsert);
      if (conditionsError) throw new Error(conditionsError.message);
    }
  }

  // Deep-copy template tasks, pointed at the new phase ids.
  const { data: tasks } = await supabase
    .from("template_tasks")
    .select("template_phase_id, title, is_critical_path")
    .eq("template_version_id", versionId);

  if (tasks && tasks.length > 0) {
    const tasksToInsert = tasks
      .map((t) => {
        const newPhaseId = phaseIdMap.get(t.template_phase_id);
        if (!newPhaseId) return null;
        return {
          template_version_id: newVersion.id,
          template_phase_id: newPhaseId,
          title: t.title,
          is_critical_path: t.is_critical_path,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase.from("template_tasks").insert(tasksToInsert);
      if (tasksError) throw new Error(tasksError.message);
    }
  }

  const person = await getCurrentPerson();
  await notifyWorkspace(
    template.workspace_id,
    {
      kind: "template_duplicated",
      title: `Template duplicated: ${template.name} ${candidate.toUpperCase()}`,
      body: `${person?.full_name ?? "Someone"} duplicated ${template.name} ${version.version.toUpperCase()} into ${candidate.toUpperCase()}.`,
      relatedUrl: `/templates/${newVersion.id}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/templates");
  revalidatePath(`/templates/${versionId}`);
  revalidatePath(`/templates/${newVersion.id}`);

  return newVersion.id;
}

/** Updates a template phase's duration caption (e.g. "Weeks 1 to 3") and
 * whether it's shown on the flight-plan spine — blocked while the version
 * is locked, same rule as every other template edit (see
 * toggleGateConditionSignature below). Only affects this template version;
 * projects already cloned from it keep their own project_phases copy
 * (see createProject in src/app/(app)/delivery/projects/actions.ts) and
 * are edited independently, not through this action. */
export async function updatePhaseDuration(phaseId: string, versionId: string, durationLabel: string, showDurationLabel: boolean) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: phase } = await supabase
    .from("template_phases")
    .select("id, code, name, template_version_id")
    .eq("id", phaseId)
    .maybeSingle();
  if (!phase) throw new Error("Phase not found.");
  if (phase.template_version_id !== versionId) throw new Error("Phase does not belong to this version.");

  const { data: version } = await supabase
    .from("template_versions")
    .select("id, template_id, is_locked")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) throw new Error("Template version not found.");
  if (version.is_locked) throw new Error("This template version is locked.");

  const { data: template } = await supabase.from("templates").select("workspace_id, name").eq("id", version.template_id).maybeSingle();
  if (!template) throw new Error("Template not found.");

  const trimmed = durationLabel.trim();
  const { error } = await supabase
    .from("template_phases")
    .update({ duration_label: trimmed || null, show_duration_label: showDurationLabel })
    .eq("id", phaseId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    template.workspace_id,
    {
      kind: "template_phase_edited",
      title: `${template.name}: phase duration updated`,
      body: `${person?.full_name ?? "Someone"} set ${phase.code} ${phase.name}'s duration label to ${trimmed ? `"${trimmed}"` : "empty"}${showDurationLabel ? "" : " (hidden)"}.`,
      relatedUrl: `/templates/${versionId}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath(`/templates/${versionId}`);
}

/** Toggles whether a gate condition requires a client signature — blocked
 * while the version is locked, since a locked version cannot be edited
 * (changes go through Duplicate instead). */
export async function toggleGateConditionSignature(conditionId: string, versionId: string, nextValue: boolean) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: condition } = await supabase
    .from("template_gate_conditions")
    .select("id, description, template_gate_id")
    .eq("id", conditionId)
    .maybeSingle();
  if (!condition) throw new Error("Condition not found.");

  const { data: gate } = await supabase
    .from("template_gates")
    .select("id, code, template_version_id")
    .eq("id", condition.template_gate_id)
    .maybeSingle();
  if (!gate) throw new Error("Gate not found.");

  const { data: version } = await supabase
    .from("template_versions")
    .select("id, template_id, is_locked")
    .eq("id", gate.template_version_id)
    .maybeSingle();
  if (!version) throw new Error("Template version not found.");
  if (version.is_locked) throw new Error("This template version is locked.");

  const { data: template } = await supabase
    .from("templates")
    .select("workspace_id, name")
    .eq("id", version.template_id)
    .maybeSingle();
  if (!template) throw new Error("Template not found.");

  const { error } = await supabase
    .from("template_gate_conditions")
    .update({ requires_signature: nextValue })
    .eq("id", conditionId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    template.workspace_id,
    {
      kind: "template_condition_edited",
      title: `${template.name}: condition updated`,
      body: `${person?.full_name ?? "Someone"} turned "requires signature" ${nextValue ? "on" : "off"} for "${condition.description}" (${gate.code}).`,
      relatedUrl: `/templates/${versionId}?tab=conditions`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath(`/templates/${versionId}`);
  revalidatePath("/templates");
}
