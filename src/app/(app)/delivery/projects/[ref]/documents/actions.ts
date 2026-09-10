"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { notifyWorkspace } from "@/lib/data/notify";
import { afterConditionWrite } from "@/lib/data/gate-conditions";
import { documentKindGate, documentKindMatchKeyword, normalizeForMatch } from "@/lib/flightplan/document-kinds";

/** If this document is one of the six signed artefacts (Scope brief,
 * Quote, Agreement, Manifest, Go-live pack, Tie-out certificate) and its
 * gate has exactly one still-open condition whose wording names that
 * artefact, marks it met and stamps `met_via_document_id` so the Flight
 * plan check page can say "Confirmed from document" instead of showing
 * it as a manual click. Deliberately does nothing when zero or more
 * than one condition matches — a wrong auto-guess is worse than asking
 * for the one manual click Flight plan check already supports, and
 * getting it wrong here has no un-doing beyond the workspace-admin
 * revert already built for the manual case. */
async function tryAutoConfirmGateCondition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  projectRef: string,
  documentId: string,
  personId: string,
  kind: string
) {
  const gateCode = documentKindGate(kind);
  const keyword = documentKindMatchKeyword(kind);
  if (!gateCode || !keyword) return;

  const { data: gate } = await supabase.from("project_gates").select("id").eq("project_id", projectId).eq("code", gateCode).maybeSingle();
  if (!gate) return;

  const { data: openConditions } = await supabase
    .from("project_gate_conditions")
    .select("id, template_condition_id, description")
    .eq("project_gate_id", gate.id)
    .eq("status", "open");
  const matches = (openConditions ?? []).filter((c) => normalizeForMatch(c.description).includes(keyword));
  if (matches.length !== 1) return;
  const match = matches[0];

  let requiresSignature = false;
  if (match.template_condition_id) {
    const { data: templateCondition } = await supabase
      .from("template_gate_conditions")
      .select("requires_signature")
      .eq("id", match.template_condition_id)
      .maybeSingle();
    requiresSignature = templateCondition?.requires_signature ?? false;
  }

  const { error } = await supabase
    .from("project_gate_conditions")
    .update({
      status: "met",
      met_at: new Date().toISOString(),
      met_via_document_id: documentId,
      ...(requiresSignature ? { signed_by: personId, signed_at: new Date().toISOString() } : {}),
    })
    .eq("id", match.id);
  if (error) return;

  await afterConditionWrite(supabase, projectId, projectRef);
}

export async function createDocument(projectId: string, projectRef: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required.");

  const kind = String(formData.get("kind") ?? "internal").trim() || "internal";
  const version = String(formData.get("version") ?? "").trim() || "v1";
  const visibility = String(formData.get("visibility") ?? "internal").trim();
  const requiresSignature = formData.get("requiresSignature") === "on";

  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).maybeSingle();

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      workspace_id: person.workspace_id,
      project_id: projectId,
      name,
      kind,
      version,
      visibility: visibility === "client_visible" ? "client_visible" : "internal",
      requires_signature: requiresSignature,
    })
    .select("id")
    .single();
  if (error || !document) throw new Error(error?.message ?? "Could not create document.");

  await tryAutoConfirmGateCondition(supabase, projectId, projectRef, document.id, person.id, kind);

  const base = `/delivery/projects/${projectRef.toLowerCase()}`;

  await notifyWorkspace(
    person.workspace_id,
    {
      kind: "document_uploaded",
      title: `New document: ${name}`,
      body: `${person.full_name} added ${name} (${version}) to ${project?.name ?? "a project"}.`,
      relatedUrl: `${base}/documents`,
    },
    { excludePersonId: person.id }
  );

  revalidatePath(`${base}/documents`);
  revalidatePath(base);
  revalidatePath(`/portal/${projectRef.toLowerCase()}`);
  revalidatePath("/delivery");
  revalidatePath("/");

  return { documentId: document.id, workspaceId: person.workspace_id };
}

/** Records one already-uploaded `delivery-documents` Storage object
 * against a document row. Called from the browser after a successful
 * `.storage.from('delivery-documents').upload(...)`, mirroring the
 * client-submission-attachments flow in
 * src/app/portal/[ref]/client-submission-actions.ts. */
export async function attachDocumentFile(
  documentId: string,
  projectRef: string,
  file: { path: string; name: string; size: number; type: string }
) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();

  const { data: asset, error: assetError } = await supabase
    .from("file_assets")
    .insert({
      workspace_id: person.workspace_id,
      storage_path: file.path,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: person.id,
    })
    .select("id")
    .single();
  if (assetError || !asset) throw new Error(assetError?.message ?? "Could not record uploaded file.");

  const { error: linkError } = await supabase
    .from("documents")
    .update({ file_asset_id: asset.id })
    .eq("id", documentId);
  if (linkError) throw new Error(linkError.message);

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/documents`);
}

/** Short-lived signed URL for downloading a document's attached file.
 * Generated on click, never embedded in server-rendered HTML. */
export async function getDocumentDownloadUrl(storagePath: string): Promise<string> {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("delivery-documents").createSignedUrl(storagePath, 60);
  if (error || !data) throw new Error(error?.message ?? "Could not create a download link.");

  return data.signedUrl;
}
