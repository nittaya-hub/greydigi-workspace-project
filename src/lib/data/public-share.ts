import { createClient } from "@/lib/supabase/server";

type TaxonomyOption = { value: string; label: string };

export interface PublishedSnapshot {
  project: { name: string; description: string | null; client_name: string; go_live_target: string | null };
  health: string;
  progress_pct: number;
  gate?: { code: string; name: string; status: string } | null;
  phase?: { code: string; name: string } | null;
  phases?: { code: string; name: string; index: number; started_at: string | null; completed_at: string | null }[];
  milestones?: { ref: string; title: string; status: string; date: string | null }[];
  updates?: { title: string; body: string; published_at: string | null }[];
  documents?: { name: string; kind: string; version: string; created_at: string }[];
  roadmap?: { ref: string; title: string; kind: string; quarter: string | null }[];
  /** Everything below was already in fn_publish_client_view's snapshot
   * (gated on the same Client View Config toggles as the live portal --
   * see 0055_checkpoint_sections_newest_first.sql) and fn_public_share_view
   * already returns published_snapshot verbatim, so P·1 always had this
   * data. It just wasn't declared here or rendered on the page -- a real
   * gap against the config screen's own "shows the same published
   * snapshot as [the live portal]" copy. */
  gantt_tasks?: {
    ref: string;
    title: string;
    status: string;
    due_date: string | null;
    is_critical_path: boolean;
    client_visible_date: string | null;
    project_phase_id: string | null;
  }[];
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
  baseline_measures?: { measure_name: string; today_value: string; after_value: string; baselined_when: string | null }[];
  /** Which of the three HyperCare submission cards are enabled for this
   * published view (Client View Config → HyperCare section). */
  submissions?: { issue: boolean; change_request: boolean; question: boolean };
  /** Category/severity/priority option lists, frozen at publish time from
   * Settings → Submission types (src/lib/data/submission-taxonomies.ts). */
  submission_options?: {
    issue: { category: TaxonomyOption[]; severity: TaxonomyOption[] };
    change_request: { priority: TaxonomyOption[] };
  };
}

export type PublicShareResult =
  | { state: "valid"; data: PublishedSnapshot; published_at: string | null }
  | { state: "revoked"; revoked_at: string | null }
  | { state: "expired"; expired_at: string | null }
  | { state: "invalid" }
  | { state: "error"; reason?: string };

/**
 * The ONLY way P·1 reads data. Calls fn_public_share_view (security
 * definer), which validates the token, logs the view, and returns strictly
 * the frozen published projection — never a live query against internal
 * tables. See supabase/migrations/0008_projections.sql.
 */
export async function getPublicShareView(token: string): Promise<PublicShareResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_public_share_view", { p_token: token });
  if (error || !data) return { state: "error", reason: error?.message };
  return data as unknown as PublicShareResult;
}
