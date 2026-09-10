"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson, requireWorkspaceAdmin } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";

/** Creates a template plus its initial draft version ("v1", unlocked). */
export async function createTemplate(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .insert({ workspace_id: person.workspace_id, name })
    .select("id")
    .single();
  if (templateError || !template) throw new Error(templateError?.message ?? "Could not create the template.");

  const { data: version, error: versionError } = await supabase
    .from("template_versions")
    .insert({ template_id: template.id, version: "v1", is_locked: false })
    .select("id")
    .single();
  if (versionError || !version) throw new Error(versionError?.message ?? "Could not create the template version.");

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "template_created",
      title: `New template: ${name}`,
      body: `${person.full_name} created the "${name}" template.`,
      relatedUrl: `/templates/${version.id}`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/templates");
  revalidatePath("/");
}

/** Locks or unlocks a template version — a locked version cannot be edited;
 * changes go into a new draft version instead (see Duplicate). */
export async function toggleTemplateLock(versionId: string, nextValue: boolean) {
  const supabase = await createClient();
  const person = await getCurrentPerson();

  const { data: version } = await supabase
    .from("template_versions")
    .select("id, version, template_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) throw new Error("Template version not found.");

  const { data: template } = await supabase
    .from("templates")
    .select("workspace_id, name")
    .eq("id", version.template_id)
    .maybeSingle();
  if (!template) throw new Error("Template not found.");

  const { error } = await supabase
    .from("template_versions")
    .update({ is_locked: nextValue, locked_at: nextValue ? new Date().toISOString() : null })
    .eq("id", versionId);
  if (error) throw new Error(error.message);

  await notifyWorkspace(
    template.workspace_id,
    {
      kind: nextValue ? "template_locked" : "template_unlocked",
      title: `${template.name} ${version.version.toUpperCase()} ${nextValue ? "locked" : "unlocked"}`,
      body: `${person?.full_name ?? "Someone"} ${nextValue ? "locked" : "unlocked"} ${template.name} ${version.version.toUpperCase()}.`,
      relatedUrl: `/templates/${versionId}`,
    },
    { excludePersonId: person?.id }
  );

  revalidatePath("/templates");
  revalidatePath(`/templates/${versionId}`);
}

/** Deletes one template version — workspace-admin only. Refuses when any
 * project still references this exact version (`usedByCount`, the same
 * count the Templates list already shows), since that project's own
 * template_version_id would otherwise fall back to null (the FK is
 * `on delete set null`, not cascade, precisely so a stray delete can't
 * silently orphan work in flight) — the guard here turns that into an
 * explicit refusal instead. If this was the template's last remaining
 * version, deletes the template itself too (cascades through phases,
 * gates, conditions and tasks) so an empty, version-less template card
 * doesn't linger on the list. */
export async function deleteTemplateVersion(versionId: string) {
  const person = await requireWorkspaceAdmin();
  const supabase = await createClient();

  const { data: version } = await supabase
    .from("template_versions")
    .select("id, version, template_id")
    .eq("id", versionId)
    .maybeSingle();
  if (!version) throw new Error("Template version not found.");

  const { data: template } = await supabase.from("templates").select("workspace_id, name").eq("id", version.template_id).maybeSingle();
  if (!template) throw new Error("Template not found.");

  const { count: usedByCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("template_version_id", versionId);
  if (usedByCount && usedByCount > 0) {
    throw new Error(`${usedByCount} project${usedByCount === 1 ? "" : "s"} still use this version — cannot delete.`);
  }

  const { count: siblingVersionCount } = await supabase
    .from("template_versions")
    .select("id", { count: "exact", head: true })
    .eq("template_id", version.template_id);

  if ((siblingVersionCount ?? 0) <= 1) {
    const { error } = await supabase.from("templates").delete().eq("id", version.template_id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("template_versions").delete().eq("id", versionId);
    if (error) throw new Error(error.message);
  }

  await notifyWorkspace(
    template.workspace_id,
    {
      kind: "template_deleted",
      title: `Template deleted: ${template.name} ${version.version.toUpperCase()}`,
      body: `${person.full_name} deleted ${template.name} ${version.version.toUpperCase()}.`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/templates");
}
