"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import { getSubmissionComments, type SubmissionCommentRow } from "@/lib/data/client-submissions";
import type { ClientSubmissionStatus } from "@/lib/supabase/database.types";

/** Thin server-action wrapper so the client-side detail modal can load
 * a submission's internal reply thread on demand (only when opened),
 * rather than every row's comments being fetched up front on page load. */
export async function fetchSubmissionComments(submissionId: string): Promise<SubmissionCommentRow[]> {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  return getSubmissionComments(submissionId);
}

export async function updateSubmissionStatus(submissionId: string, status: ClientSubmissionStatus) {
  const supabase = await createClient();
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const { data: submission, error } = await supabase
    .from("client_submissions")
    .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
    .eq("id", submissionId)
    .select("title, client_id")
    .single();
  if (error) throw new Error(error.message);

  const { data: client } = await supabase.from("clients").select("name").eq("id", submission.client_id).maybeSingle();
  const clientName = client?.name ?? "a client";

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "client_submission_status_changed",
      title: `${submission.title}: ${status.replace(/_/g, " ")}`,
      body: `${person.full_name} marked ${clientName}'s submission "${submission.title}" as ${status.replace(/_/g, " ")}.`,
      relatedUrl: "/hypercare/submissions",
    },
    { excludePersonId: person.id }
  );

  revalidatePath("/hypercare/submissions");
}

/** Assigns (or unassigns) the internal person responsible for a
 * submission -- same shape as delivery tasks' updateTaskAssignee: a
 * plain FK update, an activity-log entry, and (only when a real,
 * non-self assignee is set) one targeted notification to that person
 * rather than a workspace-wide broadcast. */
export async function updateSubmissionAssignee(submissionId: string, assigneePersonId: string | null) {
  const supabase = await createClient();
  const actor = await getCurrentPerson();
  if (!actor) throw new Error("Not signed in.");

  const { data: submission, error: fetchError } = await supabase
    .from("client_submissions")
    .select("title")
    .eq("id", submissionId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!submission) throw new Error("Submission not found.");

  const { error } = await supabase.from("client_submissions").update({ assignee_person_id: assigneePersonId }).eq("id", submissionId);
  if (error) throw new Error(error.message);

  let assigneeName = "Unassigned";
  if (assigneePersonId) {
    const { data: person } = await supabase.from("people").select("full_name").eq("id", assigneePersonId).maybeSingle();
    assigneeName = person?.full_name ?? "—";
  }

  await supabase.rpc("fn_log_activity", {
    p_workspace_id: actor.workspace_id,
    p_actor_person_id: actor.id,
    p_space: "hypercare",
    p_action: "update",
    p_entity_type: "client_submissions",
    p_entity_id: submissionId,
    p_summary: `Reassigned "${submission.title}" to ${assigneeName}`,
    p_metadata: { assignee_person_id: assigneePersonId },
  });

  if (assigneePersonId && assigneePersonId !== actor.id) {
    await supabase.from("notifications").insert({
      workspace_id: actor.workspace_id,
      person_id: assigneePersonId,
      kind: "submission_assigned",
      title: `You were assigned "${submission.title}"`,
      related_url: "/hypercare/submissions",
    });
  }

  revalidatePath("/hypercare/submissions");
}

/** Toggles the "needs to notify client" reminder flag on a submission --
 * purely an in-system flag someone else on the team can see and act on;
 * there is no real outbound email/SMS behind it. Turning it ON
 * broadcasts to the workspace so it surfaces on the bell for whoever
 * picks it up next; turning it off (once handled) is silent, matching
 * how resolving a submission's status doesn't re-notify either. */
export async function toggleSubmissionNeedsClientNotice(submissionId: string, needsClientNotice: boolean) {
  const supabase = await createClient();
  const actor = await getCurrentPerson();
  if (!actor) throw new Error("Not signed in.");

  const { data: submission, error } = await supabase
    .from("client_submissions")
    .update({ needs_client_notice: needsClientNotice })
    .eq("id", submissionId)
    .select("title, client_id")
    .single();
  if (error) throw new Error(error.message);

  if (needsClientNotice) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", submission.client_id).maybeSingle();
    await notifyWorkspace(
      actor.workspace_id,
      {
        kind: "submission_needs_client_notice",
        title: `Notify ${client?.name ?? "the client"} — "${submission.title}"`,
        body: `${actor.full_name} flagged that ${client?.name ?? "the client"} needs to be told about "${submission.title}".`,
        relatedUrl: "/hypercare/submissions",
      },
      { excludePersonId: actor.id }
    );
  }

  revalidatePath("/hypercare/submissions");
}

/** Posts an internal reply on a submission's case thread -- the team
 * discussing it with each other, never shown to the client (mirrors
 * task_comments / addTaskComment exactly). */
export async function addSubmissionComment(submissionId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment can't be empty.");

  const supabase = await createClient();
  const actor = await getCurrentPerson();
  if (!actor) throw new Error("Not signed in.");

  const { error } = await supabase.from("client_submission_comments").insert({
    submission_id: submissionId,
    author_person_id: actor.id,
    body: trimmed,
  });
  if (error) throw new Error(error.message);

  const { data: submission } = await supabase.from("client_submissions").select("title").eq("id", submissionId).maybeSingle();

  await supabase.rpc("fn_log_activity", {
    p_workspace_id: actor.workspace_id,
    p_actor_person_id: actor.id,
    p_space: "hypercare",
    p_action: "comment",
    p_entity_type: "client_submissions",
    p_entity_id: submissionId,
    p_summary: `${actor.full_name} commented on "${submission?.title ?? "a submission"}"`,
    p_metadata: {},
  });

  await notifyWorkspace(
    actor.workspace_id,
    {
      kind: "submission_comment_added",
      title: `New comment on "${submission?.title ?? "a submission"}"`,
      body: trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed,
      relatedUrl: "/hypercare/submissions",
    },
    { excludePersonId: actor.id }
  );

  revalidatePath("/hypercare/submissions");
}

/** Short-lived signed URL for downloading a client submission's
 * attached file — same pattern as delivery documents'
 * getDocumentDownloadUrl, just against the `client-attachments` bucket
 * (see ClientSubmissionForm.tsx's upload, and 0013_client_scoping_
 * hypercare_forms.sql for client_submission_attachments). Generated on
 * click, never embedded in server-rendered HTML. */
export async function getSubmissionAttachmentUrl(filePath: string): Promise<string> {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("client-attachments").createSignedUrl(filePath, 60);
  if (error || !data) throw new Error(error?.message ?? "Could not create a download link.");

  return data.signedUrl;
}
