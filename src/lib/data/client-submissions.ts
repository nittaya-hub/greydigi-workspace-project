import { createClient } from "@/lib/supabase/server";
import type { ClientSubmissionKind, ClientSubmissionStatus } from "@/lib/supabase/database.types";

export interface ClientSubmissionAttachment {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number | null;
}

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
  attachments: ClientSubmissionAttachment[];
  assigneePersonId: string | null;
  assigneeName: string | null;
  needsClientNotice: boolean;
}

export interface SubmissionCommentRow {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorInitials: string;
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
    .select(
      "id, kind, category, severity, priority, title, description, business_impact, status, client_id, service_id, submitted_by, created_at, assignee_person_id, needs_client_notice"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data: submissions } = await query;
  if (!submissions || submissions.length === 0) return [];

  const clientIds = [...new Set(submissions.map((s) => s.client_id))];
  const serviceIds = [...new Set(submissions.map((s) => s.service_id).filter((x): x is string => !!x))];
  const personIds = [
    ...new Set(
      submissions.flatMap((s) => [s.submitted_by, s.assignee_person_id]).filter((x): x is string => !!x)
    ),
  ];
  const submissionIds = submissions.map((s) => s.id);

  const [{ data: clients }, { data: services }, { data: people }, { data: attachments }] = await Promise.all([
    supabase.from("clients").select("id, name").in("id", clientIds),
    serviceIds.length ? supabase.from("services").select("id, name").in("id", serviceIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    personIds.length ? supabase.from("people").select("id, full_name").in("id", personIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase
      .from("client_submission_attachments")
      .select("id, submission_id, file_path, file_name, file_size")
      .in("submission_id", submissionIds),
  ]);

  const clientNameById = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const personNameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const attachmentsBySubmission = new Map<string, ClientSubmissionAttachment[]>();
  for (const a of attachments ?? []) {
    const list = attachmentsBySubmission.get(a.submission_id) ?? [];
    list.push({ id: a.id, filePath: a.file_path, fileName: a.file_name, fileSize: a.file_size });
    attachmentsBySubmission.set(a.submission_id, list);
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
    attachmentCount: (attachmentsBySubmission.get(s.id) ?? []).length,
    attachments: attachmentsBySubmission.get(s.id) ?? [],
    assigneePersonId: s.assignee_person_id,
    assigneeName: s.assignee_person_id ? (personNameById.get(s.assignee_person_id) ?? null) : null,
    needsClientNotice: s.needs_client_notice,
  }));
}

/** The internal-only reply thread on one client submission -- the team
 * discussing the case with each other, never shown to the client. Mirrors
 * getTaskComments' own shape and chronological (oldest first) order. */
export async function getSubmissionComments(submissionId: string): Promise<SubmissionCommentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_submission_comments")
    .select("id, body, created_at, author_person_id")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true });
  if (!data || data.length === 0) return [];

  const authorIds = [...new Set(data.map((c) => c.author_person_id).filter((x): x is string => !!x))];
  const { data: people } = authorIds.length
    ? await supabase.from("people").select("id, full_name, avatar_initials").in("id", authorIds)
    : { data: [] as { id: string; full_name: string; avatar_initials: string }[] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  return data.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.created_at,
    authorName: c.author_person_id ? (byId.get(c.author_person_id)?.full_name ?? "—") : "—",
    authorInitials: c.author_person_id ? (byId.get(c.author_person_id)?.avatar_initials ?? "?") : "?",
  }));
}
