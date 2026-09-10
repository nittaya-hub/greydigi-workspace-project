import { createClient } from "@/lib/supabase/server";

export interface HypercareViewConfig {
  fields: Record<string, boolean>;
}

export async function getHypercareViewConfig(clientId: string): Promise<HypercareViewConfig> {
  const supabase = await createClient();
  const { data } = await supabase.from("hypercare_view_configs").select("fields").eq("client_id", clientId).maybeSingle();
  return { fields: (data?.fields as Record<string, boolean>) ?? {} };
}

export interface HypercareReportRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  token: string;
  status: string;
  publishedAt: string;
  publishedByName: string;
}

/** Reports are one row per publish, newest first — unlike Delivery's P·1
 * (one row, overwritten each publish), so last week's report keeps
 * working as a link after this week's goes out. */
export async function getHypercareReports(clientId: string): Promise<HypercareReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hypercare_share_reports")
    .select("id, period_start, period_end, token, status, published_at, published_by")
    .eq("client_id", clientId)
    .order("period_start", { ascending: false });

  const personIds = [...new Set((data ?? []).map((r) => r.published_by).filter((x): x is string => !!x))];
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id, full_name").in("id", personIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (data ?? []).map((r) => ({
    id: r.id,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    token: r.token,
    status: r.status,
    publishedAt: r.published_at,
    publishedByName: r.published_by ? nameById.get(r.published_by) ?? "—" : "—",
  }));
}

export interface HypercareReportData {
  client_name: string;
  period_start: string;
  period_end: string;
  services?: { ref: string; name: string; health: string; live_since: string | null }[];
  incidents?: {
    ref: string;
    title: string;
    severity: string;
    status: string;
    opened_at: string;
    resolved_at: string | null;
    breach_at: string | null;
  }[];
  sla_tiers?: { service_ref: string; severity: string; response_target_minutes: number; update_cadence_minutes: number | null }[];
  request_backlog?: { ref: string; title: string; status: string; opened_at: string }[];
  submissions: { issue: boolean; change_request: boolean; question: boolean };
  submission_options: {
    issue: { category: { value: string; label: string }[]; severity: { value: string; label: string }[] };
    change_request: { priority: { value: string; label: string }[] };
  };
}

export type HypercarePublicReportState =
  | { state: "invalid" }
  | { state: "revoked"; revoked_at: string | null }
  | { state: "valid"; published_at: string; data: HypercareReportData };

export async function getPublicHypercareReportView(token: string): Promise<HypercarePublicReportState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_public_hypercare_report_view", { p_token: token });
  if (error || !data) return { state: "invalid" };
  return data as unknown as HypercarePublicReportState;
}
