"use server";

import { createClient } from "@/lib/supabase/server";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";
import type { PublicSubmitResult } from "@/app/s/[token]/submit-actions";

/** The Hypercare report link's equivalent of submitPublicClientSubmission
 * — same anonymous pattern, resolves client_id off the report's own
 * token (fn_public_submit_hypercare_submission,
 * supabase/migrations/0046_hypercare_share_reports.sql, updated in 0048
 * to also notify the team from inside the security-definer function —
 * see submit-actions.ts's comment in the delivery share-link sibling for
 * why that can't happen from this anonymous session instead) instead of
 * a project's share link. */
export async function submitPublicHypercareSubmission(
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
  const { data, error } = await supabase.rpc("fn_public_submit_hypercare_submission", {
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
