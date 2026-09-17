"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMissionsLead } from "@/lib/data/auth-guard";
import {
  getProjectProgressStats,
  getProjectDecisions,
  getProjectWeeklyCommitments,
  getProjectBaselineMeasures,
} from "@/lib/data/project";
import type { Json } from "@/lib/supabase/database.types";

function basePath(projectRef: string) {
  return `/missions/projects/${projectRef.toLowerCase()}`;
}

function requiredString(formData: FormData, key: string): string {
  const value = (formData.get(key) as string | null)?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function optionalString(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string | null)?.trim();
  return value ? value : null;
}

export async function createProgressStat(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_progress_stats").insert({
    project_id: projectId,
    label: requiredString(formData, "label"),
    value: requiredString(formData, "value"),
    note: optionalString(formData, "note"),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function reviewProgressStat(id: string, projectId: string, projectRef: string) {
  const person = await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_progress_stats")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: person.id })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

/** Editing resets reviewed_at/reviewed_by to null on purpose: a review
 * only ever covers the content it was checked against, so a row that
 * has changed since needs a fresh check before it can reach a client
 * again — same reasoning as the reviewed_at gate itself (0054), just
 * applied to edits, not only first-time entry. */
export async function updateProgressStat(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_progress_stats")
    .update({
      label: requiredString(formData, "label"),
      value: requiredString(formData, "value"),
      note: optionalString(formData, "note"),
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function deleteProgressStat(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_progress_stats").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function createDecision(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_decisions").insert({
    project_id: projectId,
    title: requiredString(formData, "title"),
    detail: optionalString(formData, "detail"),
    owner: optionalString(formData, "owner"),
    due_label: optionalString(formData, "due_label"),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function toggleDecisionStatus(id: string, projectId: string, projectRef: string, nextStatus: "open" | "closed") {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_decisions")
    .update({ status: nextStatus })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function reviewDecision(id: string, projectId: string, projectRef: string) {
  const person = await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_decisions")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: person.id })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function updateDecision(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_decisions")
    .update({
      title: requiredString(formData, "title"),
      detail: optionalString(formData, "detail"),
      owner: optionalString(formData, "owner"),
      due_label: optionalString(formData, "due_label"),
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function deleteDecision(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_decisions").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function createCommitment(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const itemsRaw = (formData.get("items") as string | null) ?? "";
  const items = itemsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const { error } = await supabase.from("project_weekly_commitments").insert({
    project_id: projectId,
    period_label: requiredString(formData, "period_label"),
    owner_label: requiredString(formData, "owner_label"),
    items,
    accent: formData.get("accent") === "on",
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function reviewCommitment(id: string, projectId: string, projectRef: string) {
  const person = await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_weekly_commitments")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: person.id })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function updateCommitment(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const itemsRaw = (formData.get("items") as string | null) ?? "";
  const items = itemsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("project_weekly_commitments")
    .update({
      period_label: requiredString(formData, "period_label"),
      owner_label: requiredString(formData, "owner_label"),
      items,
      accent: formData.get("accent") === "on",
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function deleteCommitment(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_weekly_commitments").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function createBaselineMeasure(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_baseline_measures").insert({
    project_id: projectId,
    measure_name: requiredString(formData, "measure_name"),
    today_value: requiredString(formData, "today_value"),
    after_value: requiredString(formData, "after_value"),
    baselined_when: optionalString(formData, "baselined_when"),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function reviewBaselineMeasure(id: string, projectId: string, projectRef: string) {
  const person = await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_baseline_measures")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: person.id })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function updateBaselineMeasure(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_baseline_measures")
    .update({
      measure_name: requiredString(formData, "measure_name"),
      today_value: requiredString(formData, "today_value"),
      after_value: requiredString(formData, "after_value"),
      baselined_when: optionalString(formData, "baselined_when"),
      reviewed_at: null,
      reviewed_by: null,
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function deleteBaselineMeasure(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_baseline_measures").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

/** Records one already-uploaded delivery-documents Storage object as a
 * checkpoint source file -- mirrors attachDocumentFile in Missions'
 * Documents tab (0034), called from the browser after a successful
 * `.storage.from('delivery-documents').upload(...)`. Kept as its own
 * table/action rather than reusing the documents table, so this stays
 * separate from the Documents tab's signature/gate-auto-confirm/
 * client-visibility logic, none of which applies to a raw internal
 * source deck. */
export async function recordCheckpointSourceFile(
  projectId: string,
  projectRef: string,
  file: { path: string; name: string; size: number; type: string }
) {
  const person = await requireMissionsLead(projectId);
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
  if (assetError || !asset) throw new Error(assetError?.message ?? "Could not record the uploaded file.");

  const { error } = await supabase.from("checkpoint_source_files").insert({
    project_id: projectId,
    file_asset_id: asset.id,
    uploaded_by: person.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

export async function deleteCheckpointSourceFile(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("checkpoint_source_files").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

/** The gate every "Run auto-map" button calls. Always throws today --
 * reading a PDF/PNG and mapping it into stats/decisions/commitments/
 * measures needs a real AI provider call (this workspace has no AI API
 * key configured anywhere, checked before writing this), with a real
 * per-document cost. Say "Integration required," per the same pattern
 * already used for the agent registry (0066), rather than pretending
 * this can run. */
export async function runCheckpointAutoMap(_sourceFileId: string, projectId: string): Promise<never> {
  await requireMissionsLead(projectId);
  throw new Error(
    "Integration required: reading this file and mapping it into the sections above needs a real AI provider (e.g. an Anthropic API key), which isn't configured yet. The file is saved — add the key, then this can run for real."
  );
}

/** Freezes today's REVIEWED checkpoint data (same reviewed_at is not
 * null filter as fn_client_portal_project / fn_publish_client_view) into
 * a permanent history row -- see migration 0057. There's no update or
 * delete path for this table anywhere in the app on purpose: once this
 * insert lands, nothing can change it again. */
export async function publishCheckpointToHistory(projectId: string, projectRef: string, weekLabel: string) {
  // This mission's lead (or a workspace admin) only -- once published
  // this snapshot is permanent and client-visible, matching the
  // Decision Pack's own description of who creates a checkpoint ("the
  // delivery lead, weekly").
  const person = await requireMissionsLead(projectId);
  const trimmedLabel = weekLabel.trim();
  if (!trimmedLabel) throw new Error("A week label is required.");
  const supabase = await createClient();

  const [stats, decisions, commitments, measures] = await Promise.all([
    getProjectProgressStats(projectId),
    getProjectDecisions(projectId),
    getProjectWeeklyCommitments(projectId),
    getProjectBaselineMeasures(projectId),
  ]);

  const reviewedOnly = {
    stats: stats.filter((s) => s.reviewedAt),
    decisions: decisions.filter((d) => d.reviewedAt),
    commitments: commitments.filter((c) => c.reviewedAt),
    measures: measures.filter((m) => m.reviewedAt),
  };
  const itemCount = reviewedOnly.stats.length + reviewedOnly.decisions.length + reviewedOnly.commitments.length + reviewedOnly.measures.length;
  if (itemCount === 0) throw new Error("Nothing reviewed yet — mark at least one row reviewed before publishing to history.");

  const { error } = await supabase.from("project_checkpoint_snapshots").insert({
    project_id: projectId,
    week_label: trimmedLabel,
    published_by: person.id,
    snapshot: reviewedOnly as unknown as Json,
  });
  if (error) throw new Error(error.message);

  await supabase.rpc("fn_log_activity", {
    p_workspace_id: person.workspace_id,
    p_actor_person_id: person.id,
    p_space: "delivery",
    p_action: "publish",
    p_entity_type: "project_checkpoint_snapshots",
    p_entity_id: projectId,
    p_summary: `Published "${trimmedLabel}" to the checkpoint history archive`,
    p_metadata: { week_label: trimmedLabel, item_count: itemCount },
  });

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/checkpoint/history`);
}

/** Reuses one archived week's content as the starting point for a new,
 * fresh, editable week -- inserted as brand-new, unreviewed rows in the
 * live tables (the archived snapshot itself is never touched). Matches
 * the user's own description: "duplicate to use, but the original stays
 * the same." */
export async function duplicateCheckpointSnapshot(snapshotId: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("project_checkpoint_snapshots")
    .select("snapshot")
    .eq("id", snapshotId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Archived checkpoint not found.");

  const snapshot = row.snapshot as {
    stats: { label: string; value: string; note: string | null }[];
    decisions: { title: string; detail: string | null; owner: string | null; dueLabel: string | null }[];
    commitments: { periodLabel: string; ownerLabel: string; items: string[]; accent: boolean }[];
    measures: { measureName: string; todayValue: string; afterValue: string; baselinedWhen: string | null }[];
  };

  await Promise.all([
    snapshot.stats.length
      ? supabase
          .from("project_progress_stats")
          .insert(snapshot.stats.map((s) => ({ project_id: projectId, label: s.label, value: s.value, note: s.note })))
      : Promise.resolve(),
    snapshot.decisions.length
      ? supabase.from("project_decisions").insert(
          snapshot.decisions.map((d) => ({ project_id: projectId, title: d.title, detail: d.detail, owner: d.owner, due_label: d.dueLabel }))
        )
      : Promise.resolve(),
    snapshot.commitments.length
      ? supabase.from("project_weekly_commitments").insert(
          snapshot.commitments.map((c) => ({
            project_id: projectId,
            period_label: c.periodLabel,
            owner_label: c.ownerLabel,
            items: c.items,
            accent: c.accent,
          }))
        )
      : Promise.resolve(),
    snapshot.measures.length
      ? supabase.from("project_baseline_measures").insert(
          snapshot.measures.map((m) => ({
            project_id: projectId,
            measure_name: m.measureName,
            today_value: m.todayValue,
            after_value: m.afterValue,
            baselined_when: m.baselinedWhen,
          }))
        )
      : Promise.resolve(),
  ]);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}
