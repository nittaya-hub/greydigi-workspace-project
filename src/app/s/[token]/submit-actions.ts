"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";

export interface PublicSubmitResult {
  ok: boolean;
  message?: string;
}

/** The public-share (/s/[token]) equivalent of createClientSubmission —
 * anonymous, so it goes through fn_public_submit_client_submission
 * (security definer, validates the token itself) instead of relying on
 * RLS + an authenticated client_id, which an anonymous visitor doesn't
 * have. See supabase/migrations/0033_public_submissions.sql. No file
 * attachments here — that path needs an authenticated client_id for
 * storage RLS (src/app/portal/[ref]/ClientSubmissionForm.tsx has it).
 *
 * Notifying the team happens inside the RPC itself (0048), not here — a
 * follow-up notifyWorkspace() call from this anonymous session would
 * read `people` through the same RLS that scopes it to signed-in
 * internal members, see zero rows, and silently insert nothing. The
 * security-definer function bypasses that the same way it already
 * bypasses RLS to insert the submission. */
export async function submitPublicClientSubmission(
  token: string,
  fields: {
    kind: ClientSubmissionKind;
    title: string;
    description: string;
    category?: string;
    severity?: string;
    priority?: string;
    businessImpact?: string;
  }
): Promise<PublicSubmitResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fn_public_submit_client_submission", {
    p_token: token,
    p_kind: fields.kind,
    p_title: fields.title,
    p_description: fields.description,
    p_category: fields.category ?? null,
    p_severity: fields.severity ?? null,
    p_priority: fields.priority ?? null,
    p_business_impact: fields.businessImpact ?? null,
  });

  if (error) return { ok: false, message: error.message };
  const result = data as unknown as { ok: boolean; message?: string };
  if (!result.ok) return { ok: false, message: result.message ?? "Could not submit." };

  return { ok: true };
}
