import { createClient } from "@/lib/supabase/server";

export interface CreateProjectOptions {
  clients: { id: string; name: string }[];
  templateVersions: { id: string; label: string }[];
  leadPeople: { id: string; name: string }[];
}

/** Read-side data for the "Create project" modal's dropdowns: the
 * workspace's clients, its locked template versions (a project can only
 * clone a locked version, per the flight-plan methodology), and internal
 * people eligible to lead a project. Co-located here (not in
 * lib/data/delivery.ts) since it's only ever used by the create-project
 * form, not read elsewhere. */
export async function getCreateProjectOptions(workspaceId: string): Promise<CreateProjectOptions> {
  const supabase = await createClient();

  const [{ data: clients }, { data: templates }, { data: people }] = await Promise.all([
    supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).order("name"),
    supabase.from("templates").select("id, name").eq("workspace_id", workspaceId),
    supabase
      .from("people")
      .select("id, full_name")
      .eq("workspace_id", workspaceId)
      .eq("kind", "internal")
      .order("full_name"),
  ]);

  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: versions } = templateIds.length
    ? await supabase
        .from("template_versions")
        .select("id, template_id, version, is_locked")
        .in("template_id", templateIds)
        .eq("is_locked", true)
        .order("version")
    : { data: [] as { id: string; template_id: string; version: string; is_locked: boolean }[] };

  const templateNameById = new Map((templates ?? []).map((t) => [t.id, t.name]));

  return {
    clients: (clients ?? []).map((c) => ({ id: c.id, name: c.name })),
    templateVersions: (versions ?? []).map((v) => ({
      id: v.id,
      label: `${templateNameById.get(v.template_id) ?? "Template"} — ${v.version}`,
    })),
    leadPeople: (people ?? []).map((p) => ({ id: p.id, name: p.full_name })),
  };
}
