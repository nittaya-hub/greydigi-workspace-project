"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyWorkspace } from "@/lib/data/notify";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";

export interface CreateSubmissionResult {
  ok: boolean;
  message?: string;
  submissionId?: string;
  workspaceId?: string;
  clientId?: string;
}

const KIND_LABEL: Record<ClientSubmissionKind, string> = {
  issue: "Report an issue",
  change_request: "Change request",
  question: "Ask a question",
};

/** Creates the client_submissions row for one of the three portal forms.
 * Runs through the normal RLS-scoped client — a signed-in client-portal
 * user can insert for their own client_id (client_submissions_client
 * policy), an internal member for their workspace. Returns the new id so
 * the browser can then upload attachments straight to Storage under
 * `<workspace_id>/<client_id>/<submission_id>/<filename>` before calling
 * addSubmissionAttachment for each one. */
export async function createClientSubmission(
  projectRef: string,
  formData: FormData
): Promise<CreateSubmissionResult> {
  const kind = String(formData.get("kind") ?? "") as ClientSubmissionKind;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const severity = String(formData.get("severity") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "").trim() || null;
  const businessImpact = String(formData.get("businessImpact") ?? "").trim() || null;

  if (!["issue", "change_request", "question"].includes(kind)) return { ok: false, message: "Invalid form kind." };
  if (!title) return { ok: false, message: "Title is required." };
  if (!description) return { ok: false, message: "Description is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const [{ data: person }, { data: project }] = await Promise.all([
    supabase.from("people").select("id, workspace_id, full_name").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("projects").select("client_id").ilike("ref", projectRef).maybeSingle(),
  ]);
  if (!person) return { ok: false, message: "No matching account for this login." };
  if (!project) return { ok: false, message: "Project not found." };

  const [{ data: submission, error }, { data: client }] = await Promise.all([
    supabase
      .from("client_submissions")
      .insert({
        workspace_id: person.workspace_id,
        client_id: project.client_id,
        kind,
        category,
        severity,
        priority,
        title,
        description,
        business_impact: businessImpact,
        submitted_by: person.id,
      })
      .select("id")
      .single(),
    supabase.from("clients").select("name").eq("id", project.client_id).maybeSingle(),
  ]);
  if (error || !submission) return { ok: false, message: error?.message ?? "Could not submit." };

  // No excludePersonId: this action's actor is a client, not staff — a
  // real client is never in the internal recipient list anyway, and an
  // internal admin testing this page as themselves should still see the
  // notification, not have it excluded as if they'd edited their own
  // task.
  await notifyWorkspace(person.workspace_id, {
    kind: `delivery_submission_${kind}`,
    title: `${KIND_LABEL[kind]}: ${title}`,
    body: `${person.full_name} (${client?.name ?? "a client"}) submitted "${title}".`,
    relatedUrl: "/hypercare/submissions",
  });

  revalidatePath("/hypercare/submissions");

  return { ok: true, submissionId: submission.id, workspaceId: person.workspace_id, clientId: project.client_id };
}

/** Records one already-uploaded Storage object against a submission.
 * Called from the browser after a successful `.storage.from('client-attachments').upload(...)`. */
export async function addSubmissionAttachment(
  submissionId: string,
  file: { path: string; name: string; size: number; type: string }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_submission_attachments").insert({
    submission_id: submissionId,
    file_path: file.path,
    file_name: file.name,
    file_size: file.size,
    content_type: file.type,
  });
  if (error) throw new Error(error.message);
}
