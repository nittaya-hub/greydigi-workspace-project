import { createClient } from "@/lib/supabase/server";

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
