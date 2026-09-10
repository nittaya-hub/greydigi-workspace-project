import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Creates the Hypercare `services` row a delivery project earns once its
 * flight plan clears G5 ("Value confirmed") -- per the Services list
 * page's own copy ("Created at G5 from the delivery project. Never
 * created by hand for a live client system."), this is the only place a
 * service should ever come from. Idempotent: does nothing if a service
 * already exists for this project (checked by `origin_project_id`), so
 * it's safe to call after every gate-condition write rather than only on
 * the one write that actually clears G5. */
export async function ensureServiceForProject(
  supabase: Client,
  project: { id: string; workspaceId: string; clientId: string; name: string }
): Promise<{ created: boolean; ref: string | null }> {
  const { data: existing } = await supabase
    .from("services")
    .select("ref")
    .eq("origin_project_id", project.id)
    .maybeSingle();
  if (existing) return { created: false, ref: existing.ref };

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", project.workspaceId);

  const ref = `SVC-${String((count ?? 0) + 1).padStart(2, "0")}`;

  const { data: service, error } = await supabase
    .from("services")
    .insert({
      workspace_id: project.workspaceId,
      client_id: project.clientId,
      origin_project_id: project.id,
      ref,
      name: project.name,
      live_since: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error || !service) throw new Error(error?.message ?? "Could not create service.");

  // Settings -> SLA's own copy says "a policy is created alongside a
  // service" -- generic starter targets (editable per client afterward
  // at Settings -> SLA), shaped like the one real Hypercare SOW this app
  // has seen (SOW-2026-002 section 6): three severity tiers with a
  // first-response target and an update cadence, no resolve-time
  // commitment. The flat response_target_minutes/resolve_target_minutes
  // columns stay populated too, for the pages that haven't moved to
  // per-tier data yet.
  const { data: policy, error: policyError } = await supabase
    .from("sla_policies")
    .insert({
      service_id: service.id,
      name: `${project.name} SLA`,
      response_target_minutes: 360,
      resolve_target_minutes: 2880,
      business_hours_only: true,
    })
    .select("id")
    .single();
  if (policyError || !policy) throw new Error(policyError?.message ?? "Could not create SLA policy.");

  // 1 business day = 9 service hours (09:00-18:00, matching
  // computeTargetAt's own business-hours window in src/lib/data/sla.ts)
  // = 540 minutes.
  const { error: tiersError } = await supabase.from("sla_policy_tiers").insert([
    { sla_policy_id: policy.id, severity: "sev1", response_target_minutes: 360, update_cadence_minutes: 1440 },
    { sla_policy_id: policy.id, severity: "sev2", response_target_minutes: 540, update_cadence_minutes: 1080 },
    { sla_policy_id: policy.id, severity: "sev3", response_target_minutes: 1620, update_cadence_minutes: null },
  ]);
  if (tiersError) throw new Error(tiersError.message);

  return { created: true, ref };
}

/** Checks whether G5 is cleared for a project — the trigger that
 * derives project_gates.status from project_gate_conditions
 * (fn_recompute_project_gates, 0006_state_engine.sql) already ran by the
 * time a gate-condition write's transaction commits, so this is a plain
 * read of already-computed state, not a re-derivation. */
export async function isGate5Cleared(supabase: Client, projectId: string): Promise<boolean> {
  const { data } = await supabase
    .from("project_gates")
    .select("status")
    .eq("project_id", projectId)
    .eq("code", "G5")
    .maybeSingle();
  return data?.status === "cleared";
}
