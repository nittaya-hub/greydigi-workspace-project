import { createClient } from "@/lib/supabase/server";

/** Gate conditions with their row id — `getTemplateVersion` in
 * `@/lib/data/templates` intentionally drops ids for a read-only display,
 * so the "requires signature" Toggle needs its own query. */
export interface GateConditionRow {
  id: string;
  gateCode: string;
  gateName: string;
  description: string;
  requiresSignature: boolean;
}

export async function listGateConditionsWithIds(templateVersionId: string): Promise<GateConditionRow[]> {
  const supabase = await createClient();
  const { data: gates } = await supabase
    .from("template_gates")
    .select("id, code, name, sequence")
    .eq("template_version_id", templateVersionId)
    .order("sequence");
  if (!gates || gates.length === 0) return [];

  const gateIds = gates.map((g) => g.id);
  const { data: conditions } = await supabase
    .from("template_gate_conditions")
    .select("id, template_gate_id, description, requires_signature, sequence")
    .in("template_gate_id", gateIds)
    .order("sequence");

  const gateById = new Map(gates.map((g) => [g.id, g]));
  return (conditions ?? []).map((c) => {
    const gate = gateById.get(c.template_gate_id);
    return {
      id: c.id,
      gateCode: gate?.code ?? "",
      gateName: gate?.name ?? "",
      description: c.description,
      requiresSignature: c.requires_signature,
    };
  });
}
