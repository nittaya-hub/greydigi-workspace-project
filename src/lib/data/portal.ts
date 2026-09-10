import { createClient } from "@/lib/supabase/server";

export interface PortalClientProjectsResult {
  state: "ok" | "not_found";
  client_name?: string;
  projects?: {
    ref: string;
    name: string;
    go_live_target: string | null;
    health: string;
    progress_pct: number;
    current_phase: { code: string; name: string } | null;
  }[];
}

/**
 * Resolves the signed-in client-portal person's own client_id (a person
 * may in principle hold more than one client_roles grant; this takes the
 * first — multi-client portal people are out of scope for now) and reads
 * every active project under it through fn_client_portal_projects. An
 * internal admin previewing a specific client passes clientId directly.
 */
export async function getPortalCurrentClientId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: person } = await supabase.from("people").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!person) return null;

  const { data: role } = await supabase.from("client_roles").select("client_id").eq("person_id", person.id).limit(1).maybeSingle();
  return role?.client_id ?? null;
}

export async function getPortalClientProjects(clientId: string): Promise<PortalClientProjectsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_client_portal_projects", { p_client_id: clientId });
  if (error || !data) return { state: "not_found" };
  return data as unknown as PortalClientProjectsResult;
}

export interface PortalProjectResult {
  state: "ok" | "not_found";
  project?: { name: string; description: string | null; client_name: string; go_live_target: string | null };
  health?: string;
  progress_pct?: number;
  phases?: {
    id: string;
    code: string;
    name: string;
    index: number;
    started_at: string | null;
    completed_at: string | null;
    duration_label: string | null;
    show_duration_label: boolean;
  }[];
  gates?: { code: string; name: string; sequence: number; status: string; target_date: string | null }[];
  milestones?: { ref: string; title: string; status: string; date: string | null }[];
  updates?: { title: string; body: string; published_at: string | null }[];
  documents?: { name: string; kind: string; version: string; created_at: string }[];
  roadmap?: { ref: string; title: string; kind: string; quarter: string | null }[];
  gantt_tasks?: {
    ref: string;
    title: string;
    status: string;
    due_date: string | null;
    is_critical_path: boolean;
    client_visible_date: string | null;
    project_phase_id: string | null;
  }[];
  actions_required?: {
    id: string;
    kind: string;
    title: string;
    description: string | null;
    status: string;
    due_at: string | null;
  }[];
  signatures?: { id: string; status: string; signed_at: string | null }[];
  progress_stats?: { label: string; value: string; note: string | null }[];
  decisions?: {
    id: string;
    title: string;
    detail: string | null;
    owner: string | null;
    due_label: string | null;
    status: "open" | "closed";
  }[];
  commitments?: { period_label: string; owner_label: string; items: string[]; accent: boolean }[];
  baseline_measures?: {
    measure_name: string;
    today_value: string;
    after_value: string;
    baselined_when: string | null;
  }[];
}

/**
 * Resolves a project by ref under RLS (a client-portal user only ever sees
 * projects for a client they're granted on — client_roles /
 * projects_client_read in 0007_rls.sql), then reads it through
 * fn_client_portal_project, which is live (unlike P·1's frozen snapshot)
 * but still only surfaces the fields Client View Config allows.
 */
export async function getPortalProject(ref: string): Promise<{ id: string; result: PortalProjectResult } | null> {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").ilike("ref", ref).maybeSingle();
  if (!project) return null;

  const { data, error } = await supabase.rpc("fn_client_portal_project", { p_project_id: project.id });
  if (error || !data) return null;

  return { id: project.id, result: data as unknown as PortalProjectResult };
}
