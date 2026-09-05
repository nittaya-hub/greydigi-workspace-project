import { createClient } from "@/lib/supabase/server";

export interface TemplateRow {
  id: string;
  name: string;
  version: string;
  isLocked: boolean;
  usedByCount: number;
  phaseCount: number;
  gateCount: number;
  conditionCount: number;
}

export async function listTemplates(workspaceId: string): Promise<TemplateRow[]> {
  const supabase = await createClient();
  const { data: templates } = await supabase.from("templates").select("id, name").eq("workspace_id", workspaceId);
  if (!templates || templates.length === 0) return [];

  const templateIds = templates.map((t) => t.id);
  const { data: versions } = await supabase
    .from("template_versions")
    .select("id, template_id, version, is_locked")
    .in("template_id", templateIds)
    .order("version", { ascending: false });
  if (!versions || versions.length === 0) return [];

  const versionIds = versions.map((v) => v.id);
  const [{ data: phases }, { data: gates }, { data: projects }] = await Promise.all([
    supabase.from("template_phases").select("id, template_version_id").in("template_version_id", versionIds),
    supabase.from("template_gates").select("id, template_version_id").in("template_version_id", versionIds),
    supabase.from("projects").select("template_version_id").in("template_version_id", versionIds),
  ]);
  const gateIds = (gates ?? []).map((g) => g.id);
  const { data: conditions } = gateIds.length
    ? await supabase.from("template_gate_conditions").select("id, template_gate_id").in("template_gate_id", gateIds)
    : { data: [] as { id: string; template_gate_id: string }[] };

  const phaseCountByVersion = new Map<string, number>();
  for (const p of phases ?? []) phaseCountByVersion.set(p.template_version_id, (phaseCountByVersion.get(p.template_version_id) ?? 0) + 1);
  const gateCountByVersion = new Map<string, number>();
  const gateVersionById = new Map((gates ?? []).map((g) => [g.id, g.template_version_id]));
  for (const g of gates ?? []) gateCountByVersion.set(g.template_version_id, (gateCountByVersion.get(g.template_version_id) ?? 0) + 1);
  const conditionCountByVersion = new Map<string, number>();
  for (const c of conditions ?? []) {
    const versionId = gateVersionById.get(c.template_gate_id);
    if (!versionId) continue;
    conditionCountByVersion.set(versionId, (conditionCountByVersion.get(versionId) ?? 0) + 1);
  }
  const usedByCountByVersion = new Map<string, number>();
  for (const p of projects ?? []) {
    if (!p.template_version_id) continue;
    usedByCountByVersion.set(p.template_version_id, (usedByCountByVersion.get(p.template_version_id) ?? 0) + 1);
  }

  const templateNameById = new Map(templates.map((t) => [t.id, t.name]));

  return versions.map((v) => ({
    id: v.id,
    name: templateNameById.get(v.template_id) ?? "—",
    version: v.version,
    isLocked: v.is_locked,
    usedByCount: usedByCountByVersion.get(v.id) ?? 0,
    phaseCount: phaseCountByVersion.get(v.id) ?? 0,
    gateCount: gateCountByVersion.get(v.id) ?? 0,
    conditionCount: conditionCountByVersion.get(v.id) ?? 0,
  }));
}

export interface TemplateDetail {
  id: string;
  name: string;
  version: string;
  isLocked: boolean;
  usedByCount: number;
  phases: {
    id: string;
    index: number;
    code: string;
    name: string;
    taskCount: number;
    gateCode: string | null;
    durationLabel: string | null;
    showDurationLabel: boolean;
  }[];
  gateConditions: { gateCode: string; gateName: string; conditions: { description: string; requiresSignature: boolean }[] }[];
}

export async function getTemplateVersion(templateVersionId: string): Promise<TemplateDetail | null> {
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("template_versions")
    .select("id, template_id, version, is_locked")
    .eq("id", templateVersionId)
    .maybeSingle();
  if (!version) return null;

  const [{ data: template }, { data: phases }, { data: gates }, { count: usedByCount }] = await Promise.all([
    supabase.from("templates").select("name").eq("id", version.template_id).maybeSingle(),
    supabase
      .from("template_phases")
      .select("id, index, code, name, duration_label, show_duration_label")
      .eq("template_version_id", version.id)
      .order("index"),
    supabase.from("template_gates").select("id, code, name, template_phase_id, sequence").eq("template_version_id", version.id).order("sequence"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("template_version_id", version.id),
  ]);

  const gateByPhase = new Map((gates ?? []).map((g) => [g.template_phase_id, g]));
  const { data: tasks } = await supabase.from("template_tasks").select("template_phase_id").eq("template_version_id", version.id);
  const taskCountByPhase = new Map<string, number>();
  for (const t of tasks ?? []) taskCountByPhase.set(t.template_phase_id, (taskCountByPhase.get(t.template_phase_id) ?? 0) + 1);

  const gateIds = (gates ?? []).map((g) => g.id);
  const { data: conditions } = gateIds.length
    ? await supabase.from("template_gate_conditions").select("template_gate_id, description, requires_signature").in("template_gate_id", gateIds).order("sequence")
    : { data: [] as { template_gate_id: string; description: string; requires_signature: boolean }[] };

  return {
    id: version.id,
    name: template?.name ?? "—",
    version: version.version,
    isLocked: version.is_locked,
    usedByCount: usedByCount ?? 0,
    phases: (phases ?? []).map((p) => {
      const gate = gateByPhase.get(p.id);
      return {
        id: p.id,
        index: p.index,
        code: p.code,
        name: p.name,
        taskCount: taskCountByPhase.get(p.id) ?? 0,
        gateCode: gate?.code ?? null,
        durationLabel: p.duration_label,
        showDurationLabel: p.show_duration_label,
      };
    }),
    gateConditions: (gates ?? []).map((g) => ({
      gateCode: g.code,
      gateName: g.name,
      conditions: (conditions ?? []).filter((c) => c.template_gate_id === g.id).map((c) => ({ description: c.description, requiresSignature: c.requires_signature })),
    })),
  };
}

export async function getDefaultTemplateVersionId(workspaceId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: templates } = await supabase.from("templates").select("id").eq("workspace_id", workspaceId).limit(1);
  if (!templates || templates.length === 0) return null;
  const { data: version } = await supabase
    .from("template_versions")
    .select("id")
    .eq("template_id", templates[0].id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return version?.id ?? null;
}
