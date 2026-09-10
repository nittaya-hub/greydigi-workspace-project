import { createClient } from "@/lib/supabase/server";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";

export type SubmissionTaxonomyField = "category" | "severity" | "priority";

export interface SubmissionTaxonomyOption {
  id: string;
  kind: ClientSubmissionKind;
  field: SubmissionTaxonomyField;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
}

/** Every option (active and retired) for a workspace, grouped by kind+field
 * in the order the settings page renders them. Admin-only page uses this. */
export async function listSubmissionTaxonomyOptions(workspaceId: string): Promise<SubmissionTaxonomyOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submission_taxonomy_options")
    .select("id, kind, field, value, label, sort_order, is_active")
    .eq("workspace_id", workspaceId)
    .order("kind")
    .order("field")
    .order("sort_order");

  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    field: r.field as SubmissionTaxonomyField,
    value: r.value,
    label: r.label,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }));
}

/** Active-only options for one kind, shaped as {value, label} pairs ready
 * for a <select> — what ClientSubmissionForm reads on the portal. */
export async function listActiveSubmissionOptions(
  workspaceId: string,
  kind: ClientSubmissionKind
): Promise<Record<SubmissionTaxonomyField, { value: string; label: string }[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submission_taxonomy_options")
    .select("field, value, label, sort_order")
    .eq("workspace_id", workspaceId)
    .eq("kind", kind)
    .eq("is_active", true)
    .order("sort_order");

  const grouped: Record<SubmissionTaxonomyField, { value: string; label: string }[]> = {
    category: [],
    severity: [],
    priority: [],
  };
  for (const row of data ?? []) {
    grouped[row.field as SubmissionTaxonomyField].push({ value: row.value, label: row.label });
  }
  return grouped;
}
