"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import type { ClientSubmissionStatus } from "@/lib/supabase/database.types";

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
