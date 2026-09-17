import { createClient } from "@/lib/supabase/server";

/** The five Hypercare blueprint objects added in 0064_hypercare_blueprint.sql
 * — Service agreement, Entitlement period, Run book, Service change,
 * Improvement item — on top of Service/Incident/Request/Escalation
 * (0005_hypercare.sql). One file since they're all read together on the
 * service detail page, the blueprint's own "Service detail" screen. */

export interface ServiceAgreementRow {
  id: string;
  tier: string;
  termMonths: number | null;
  fee: string | null;
  entitlementIncludedUnits: number;
  renewalDate: string | null;
  sourceRef: string | null;
  feeAmountMonthly: number | null;
  monthlyRunningCost: number | null;
}

export async function getServiceAgreement(serviceId: string): Promise<ServiceAgreementRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_agreements")
    .select("id, tier, term_months, fee, entitlement_included_units, renewal_date, source_ref, fee_amount_monthly, monthly_running_cost")
    .eq("service_id", serviceId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    tier: data.tier,
    termMonths: data.term_months,
    fee: data.fee,
    entitlementIncludedUnits: data.entitlement_included_units,
    renewalDate: data.renewal_date,
    sourceRef: data.source_ref,
    feeAmountMonthly: data.fee_amount_monthly,
    monthlyRunningCost: data.monthly_running_cost,
  };
}

export interface EntitlementPeriodRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  includedUnits: number;
  consumedUnits: number;
  overageUnits: number;
  overageBilled: boolean;
  overageAbsorbed: boolean;
}

/** The entitlement period covering today, if one has been opened — a
 * period is opened by hand (openEntitlementPeriod), not auto-rolled,
 * since there's no billing-cycle scheduler in this build yet. consumed_
 * units comes from fn_entitlement_consumed (0064), never a stored/
 * cached number. */
export async function getCurrentEntitlementPeriod(serviceId: string): Promise<EntitlementPeriodRow | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("entitlement_periods")
    .select("id, period_start, period_end, included_units, overage_billed, overage_absorbed")
    .eq("service_id", serviceId)
    .lte("period_start", today)
    .gte("period_end", today)
    .maybeSingle();
  if (!data) return null;

  const { data: consumed } = await supabase.rpc("fn_entitlement_consumed", { p_entitlement_period_id: data.id });
  const consumedUnits = (consumed as number) ?? 0;

  return {
    id: data.id,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    includedUnits: data.included_units,
    consumedUnits,
    overageUnits: Math.max(0, consumedUnits - data.included_units),
    overageBilled: data.overage_billed,
    overageAbsorbed: data.overage_absorbed,
  };
}

export interface RunBookRow {
  id: string;
  dependencies: string | null;
  recoverySteps: string | null;
  ownerName: string | null;
  escalationPath: string | null;
  updatedAt: string;
}

export async function getRunBook(serviceId: string): Promise<RunBookRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("run_books")
    .select("id, dependencies, recovery_steps, owner_person_id, escalation_path, updated_at")
    .eq("service_id", serviceId)
    .maybeSingle();
  if (!data) return null;

  let ownerName: string | null = null;
  if (data.owner_person_id) {
    const { data: owner } = await supabase.from("people").select("full_name").eq("id", data.owner_person_id).maybeSingle();
    ownerName = owner?.full_name ?? null;
  }

  return {
    id: data.id,
    dependencies: data.dependencies,
    recoverySteps: data.recovery_steps,
    ownerName,
    escalationPath: data.escalation_path,
    updatedAt: data.updated_at,
  };
}

export interface ServiceChangeRow {
  id: string;
  title: string;
  description: string | null;
  effortBand: string | null;
  billable: boolean;
  status: "open" | "done";
  createdAt: string;
  assignedPersonId: string | null;
}

export async function listServiceChanges(serviceId: string): Promise<ServiceChangeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_changes")
    .select("id, title, description, effort_band, billable, status, created_at, assigned_person_id")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    effortBand: c.effort_band,
    billable: c.billable,
    status: c.status,
    createdAt: c.created_at,
    assignedPersonId: c.assigned_person_id,
  }));
}

export interface ImprovementItemRow {
  id: string;
  pattern: string;
  frequency: number;
  proposedFix: string | null;
  status: "open" | "done";
  createdAt: string;
}

export async function listImprovementItems(serviceId: string): Promise<ImprovementItemRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("improvement_items")
    .select("id, pattern, frequency, proposed_fix, status, created_at")
    .eq("service_id", serviceId)
    .order("frequency", { ascending: false });
  return (data ?? []).map((i) => ({
    id: i.id,
    pattern: i.pattern,
    frequency: i.frequency,
    proposedFix: i.proposed_fix,
    status: i.status,
    createdAt: i.created_at,
  }));
}

/** For Manifest's overview: every open improvement item across the whole
 * workspace, read directly rather than copied — "nothing retyped at a
 * handoff" (Decision Pack, page 3), the same rule services.origin_
 * project_id and origin_product_id already follow. */
export async function listOpenImprovementItemsForWorkspace(
  workspaceId: string
): Promise<{ id: string; pattern: string; frequency: number; serviceName: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("improvement_items")
    .select("id, pattern, frequency, service_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("frequency", { ascending: false })
    .limit(20);
  if (!data || data.length === 0) return [];

  const serviceIds = [...new Set(data.map((i) => i.service_id))];
  const { data: services } = await supabase.from("services").select("id, name").in("id", serviceIds);
  const nameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  return data.map((i) => ({ id: i.id, pattern: i.pattern, frequency: i.frequency, serviceName: nameById.get(i.service_id) ?? "—" }));
}

export interface CommercialsRow {
  serviceId: string;
  serviceRef: string;
  serviceName: string;
  clientName: string;
  tier: string | null;
  feeAmountMonthly: number | null;
  monthlyRunningCost: number | null;
  marginMonthly: number | null;
}

/** Hypercare wave 4.4's Commercials screen: margin per service, computed
 * only where a person has entered both real numbers (fee_amount_monthly,
 * monthly_running_cost, 0069) — a service with neither, or only one, shows
 * as not entered rather than a computed zero or a silently wrong number. */
export async function getCommercialsOverview(workspaceId: string, clientId?: string | null): Promise<CommercialsRow[]> {
  const supabase = await createClient();
  let servicesQuery = supabase.from("services").select("id, ref, name, client_id").eq("workspace_id", workspaceId);
  if (clientId) servicesQuery = servicesQuery.eq("client_id", clientId);
  const { data: services } = await servicesQuery;
  if (!services || services.length === 0) return [];

  const serviceIds = services.map((s) => s.id);
  const clientIds = [...new Set(services.map((s) => s.client_id))];

  const [{ data: agreements }, { data: clients }] = await Promise.all([
    supabase
      .from("service_agreements")
      .select("service_id, tier, fee_amount_monthly, monthly_running_cost")
      .in("service_id", serviceIds),
    supabase.from("clients").select("id, name").in("id", clientIds),
  ]);
  const agreementByService = new Map((agreements ?? []).map((a) => [a.service_id, a] as const));
  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name] as const));

  return services.map((s) => {
    const agreement = agreementByService.get(s.id);
    const fee = agreement?.fee_amount_monthly ?? null;
    const cost = agreement?.monthly_running_cost ?? null;
    return {
      serviceId: s.id,
      serviceRef: s.ref,
      serviceName: s.name,
      clientName: clientNameById.get(s.client_id) ?? "—",
      tier: agreement?.tier ?? null,
      feeAmountMonthly: fee,
      monthlyRunningCost: cost,
      marginMonthly: fee != null && cost != null ? fee - cost : null,
    };
  });
}
