import { createClient } from "@/lib/supabase/server";

export interface PortalProjectResult {
  state: "ok" | "not_found";
  project?: { name: string; description: string | null; client_name: string; go_live_target: string | null };
  health?: string;
  progress_pct?: number;
  phases?: {
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
  actions_required?: {
    id: string;
    kind: string;
    title: string;
    description: string | null;
    status: string;
    due_at: string | null;
  }[];
  signatures?: { id: string; status: string; signed_at: string | null }[];
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
