import { createClient } from "@/lib/supabase/server";

/** Options for the "New project" template dropdown: every template version
 * in the workspace, labeled with its template name. Local to this route —
 * `listTemplates` in `@/lib/data/templates` returns richer rows than a
 * plain dropdown needs. */
export interface TemplateVersionOption {
  id: string;
  label: string;
}

export async function listTemplateVersionOptions(workspaceId: string): Promise<TemplateVersionOption[]> {
  const supabase = await createClient();
  const { data: templates } = await supabase.from("templates").select("id, name").eq("workspace_id", workspaceId);
  if (!templates || templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);
  const { data: versions } = await supabase
    .from("template_versions")
    .select("id, template_id, version")
    .in("template_id", templateIds)
    .order("version", { ascending: false });
  const nameById = new Map(templates.map((t) => [t.id, t.name]));

  return (versions ?? []).map((v) => ({
    id: v.id,
    label: `${nameById.get(v.template_id) ?? "—"} · ${v.version.toUpperCase()}`,
  }));
}

/** Options for the "New project" lead dropdown: internal people only. */
export interface InternalPersonOption {
  id: string;
  fullName: string;
}

export async function listInternalPeopleOptions(workspaceId: string): Promise<InternalPersonOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("people")
    .select("id, full_name")
    .eq("workspace_id", workspaceId)
    .eq("kind", "internal")
    .order("full_name");
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name }));
}
