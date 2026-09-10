"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProjectAccess, requireWorkspaceAdmin } from "@/lib/data/auth-guard";
import { afterConditionWrite } from "@/lib/data/gate-conditions";

/** Marks an open condition met. Any project member can do this — it
 * just records that the team/client did the thing described, the same
 * "recorded by, not e-signed" pattern already used for documents/
 * baselines elsewhere in this app. When the condition's template carries
 * `requires_signature`, this also stamps signed_by/signed_at. */
export async function markGateConditionMet(conditionId: string, projectId: string, projectRef: string) {
  const person = await requireProjectAccess(projectId, "member");
  const supabase = await createClient();

  const { data: condition } = await supabase
    .from("project_gate_conditions")
    .select("id, template_condition_id")
    .eq("id", conditionId)
    .maybeSingle();
  if (!condition) throw new Error("Condition not found.");

  let requiresSignature = false;
  if (condition.template_condition_id) {
    const { data: templateCondition } = await supabase
      .from("template_gate_conditions")
      .select("requires_signature")
      .eq("id", condition.template_condition_id)
      .maybeSingle();
    requiresSignature = templateCondition?.requires_signature ?? false;
  }

  const { error } = await supabase
    .from("project_gate_conditions")
    .update({
      status: "met",
      met_at: new Date().toISOString(),
      ...(requiresSignature ? { signed_by: person.id, signed_at: new Date().toISOString() } : {}),
    })
    .eq("id", conditionId);
  if (error) throw new Error(error.message);

  await afterConditionWrite(supabase, projectId, projectRef);
}

/** Reverts a met/waived condition back to open — workspace-admin only,
 * with a written reason, for the "clicked the wrong one" case. This
 * un-clears whichever gate that condition belongs to (the same
 * fn_recompute_project_gates trigger that clears a gate when every
 * condition is met runs again here and correctly flips it back to held,
 * since it re-derives status from the live open-condition count every
 * time, not just on the open->cleared direction). There's no dedicated
 * column for a revert reason — met_at/signed_by/waived_by etc. all get
 * cleared since the condition is open again, not "met, but reverted" —
 * so the reason is preserved in the activity log instead, which is
 * exactly what an audit trail is for. */
export async function revertGateCondition(conditionId: string, projectId: string, projectRef: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("A written reason is required to revert a condition.");

  const person = await requireWorkspaceAdmin();
  const supabase = await createClient();

  const { data: condition } = await supabase
    .from("project_gate_conditions")
    .select("id, description, status")
    .eq("id", conditionId)
    .maybeSingle();
  if (!condition) throw new Error("Condition not found.");
  if (condition.status === "open") throw new Error("This condition is already open.");

  const { error } = await supabase
    .from("project_gate_conditions")
    .update({
      status: "open",
      met_at: null,
      met_via_document_id: null,
      signed_by: null,
      signed_at: null,
      waived_by: null,
      waived_reason: null,
      waived_at: null,
    })
    .eq("id", conditionId);
  if (error) throw new Error(error.message);

  await supabase.rpc("fn_log_activity", {
    p_workspace_id: person.workspace_id,
    p_actor_person_id: person.id,
    p_space: "delivery",
    p_action: "revert",
    p_entity_type: "project_gate_conditions",
    p_entity_id: conditionId,
    p_summary: `Reverted "${condition.description}" back to open — ${trimmed}`,
    p_metadata: { reason: trimmed, previous_status: condition.status },
  });

  await afterConditionWrite(supabase, projectId, projectRef);
}

/** Overrides a failing condition — workspace-admin only, with a written
 * reason, per the Flight plan check page's own stated policy ("A failing
 * condition can be overridden by a workspace admin with a written
 * reason. The override is stamped on the gate..."). */
export async function waiveGateCondition(conditionId: string, projectId: string, projectRef: string, reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("A written reason is required to override a condition.");

  const person = await requireWorkspaceAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_gate_conditions")
    .update({
      status: "waived",
      waived_by: person.id,
      waived_reason: trimmed,
      waived_at: new Date().toISOString(),
    })
    .eq("id", conditionId);
  if (error) throw new Error(error.message);

  await afterConditionWrite(supabase, projectId, projectRef);
}
