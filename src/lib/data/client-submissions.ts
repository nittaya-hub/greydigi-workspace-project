import { createClient } from "@/lib/supabase/server";
import type { ClientSubmissionKind, ClientSubmissionStatus } from "@/lib/supabase/database.types";

export interface ClientSubmissionRow {
  id: string;
  kind: ClientSubmissionKind;
  category: string | null;
  severity: string | null;
  priority: string | null;
  title: string;
  description: string;
  businessImpact: string | null;
  status: ClientSubmissionStatus;
  clientName: string;
  serviceName: string | null;
  submittedByName: string | null;
  createdAt: string;
  attachmentCount: number;
}

/** Every open/in-progress client-submitted form (Report an issue, Change
 * request, Ask a question) across the workspace, newest first — the
 * internal team's triage list. Distinct from `support_requests`
 * (internally-logged, already-triaged work) and `incidents` (internal
 * only) -- this is what a client typed in before anyone on the team saw
 * it. */
export async function listClientSubmissions(workspaceId: string, clientId?: string | null): Promise<ClientSubmissionRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("client_submissions")
    .select("id, kind, category, severity, priority, title, description, business_impact, status, client_id, service_id, submitted_by, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data: submissions } = await query;
  if (!submissions || submissions.length === 0) return [];

  const clientIds = [...new Set(submissions.map((s) => s.client_id))];
  const serviceIds = [...new Set(submissions.map((s) => s.service_id).filter((x): x is string => !!x))];
  const personIds = [...new Set(submissions.map((s) => s.submitted_by).filter((x): x is string => !!x))];
  const submissionIds = submissions.map((s) => s.id);

  const [{ data: clients }, { data: services }, { data: people }, { data: attachments }] = await Promise.all([
    supabase.from("clients").select("id, name").in("id", clientIds),
    serviceIds.length ? supabase.from("services").select("id, name").in("id", serviceIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    personIds.length ? supabase.from("people").select("id, full_name").in("id", personIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("client_submission_attachments").select("submission_id").in("submission_id", submissionIds),
  ]);

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const personNameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const attachmentCountBySubmission = new Map<string, number>();
  for (const a of attachments ?? []) {
    attachmentCountBySubmission.set(a.submission_id, (attachmentCountBySubmission.get(a.submission_id) ?? 0) + 1);
  }

  return submissions.map((s) => ({
    id: s.id,
    kind: s.kind,
    category: s.category,
    severity: s.severity,
    priority: s.priority,
    title: s.title,
    description: s.description,
    businessImpact: s.business_impact,
    status: s.status,
    clientName: clientNameById.get(s.client_id) ?? "—",
    serviceName: s.service_id ? (serviceNameById.get(s.service_id) ?? null) : null,
    submittedByName: s.submitted_by ? (personNameById.get(s.submitted_by) ?? null) : null,
    createdAt: s.created_at,
    attachmentCount: attachmentCountBySubmission.get(s.id) ?? 0,
  }));
}
