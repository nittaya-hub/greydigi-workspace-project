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
import { extractCheckpointDataFromFile } from "@/lib/ai/checkpoint-extraction";
import type { Json } from "@/lib/supabase/database.types";

/** The deck's own five (page 4 legend) — done/in progress/next/planned/
 * go-live window. Seeded once, on request, never automatically: a
 * plain data read should never have the side effect of inserting rows
 * (see getProjectTimeline's own comment). */
const DEFAULT_TIMELINE_STATUSES: { label: string; colorHex: string; style: "filled" | "outline" }[] = [
  { label: "Done", colorHex: "#22C55E", style: "filled" },
  { label: "In progress", colorHex: "#F2583E", style: "filled" },
  { label: "Next", colorHex: "#1F2738", style: "filled" },
  { label: "Planned", colorHex: "#CBD5E1", style: "filled" },
  { label: "Go-live window", colorHex: "#F2583E", style: "outline" },
];

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

/** The gate every "Run auto-map" button calls. Reads the source file
 * with Claude (see src/lib/ai/checkpoint-extraction.ts) and inserts
 * whatever it found as new, unreviewed rows -- additive only, never
 * touches or replaces an existing row, and every inserted row still
 * needs a human to open it, check it against the source, and mark it
 * reviewed before it can reach a client (same rule as a row typed in
 * by hand). Falls back to the same "Integration required" explanation
 * the button always showed when no ANTHROPIC_API_KEY is configured.
 *
 * Returns a result instead of throwing -- a thrown Server Action error
 * that reaches the client through Next's Server Components render path
 * gets its message redacted in a production build (generic "Server
 * Components render" text plus a digest, no way for the button to show
 * the real explanation). A returned value is never subject to that. */
export async function runCheckpointAutoMap(
  sourceFileId: string,
  projectId: string,
  projectRef: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    await requireMissionsLead(projectId);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Not authorized." };
  }

  const supabase = await createClient();

  const { data: sourceFile } = await supabase
    .from("checkpoint_source_files")
    .select("file_asset_id")
    .eq("id", sourceFileId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sourceFile) return { ok: false, message: "Source file not found." };

  const { data: asset } = await supabase
    .from("file_assets")
    .select("storage_path, mime_type")
    .eq("id", sourceFile.file_asset_id)
    .maybeSingle();
  if (!asset) return { ok: false, message: "Source file not found." };

  const { data: blob, error: downloadError } = await supabase.storage.from("delivery-documents").download(asset.storage_path);
  if (downloadError || !blob) return { ok: false, message: `Couldn't read the source file: ${downloadError?.message ?? "unknown error"}.` };

  let extraction;
  try {
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    extraction = await extractCheckpointDataFromFile({ base64, mimeType: asset.mime_type ?? "application/pdf" });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't read this file with the AI provider." };
  }

  const [statsResult, decisionsResult, commitmentsResult, measuresResult] = await Promise.all([
    extraction.stats.length
      ? supabase
          .from("project_progress_stats")
          .insert(extraction.stats.map((s) => ({ project_id: projectId, label: s.label, value: s.value, note: s.note })))
      : Promise.resolve({ error: null }),
    extraction.decisions.length
      ? supabase.from("project_decisions").insert(
          extraction.decisions.map((d) => ({
            project_id: projectId,
            title: d.title,
            detail: d.detail,
            owner: d.owner,
            due_label: d.dueLabel,
          }))
        )
      : Promise.resolve({ error: null }),
    extraction.commitments.length
      ? supabase.from("project_weekly_commitments").insert(
          extraction.commitments.map((c) => ({
            project_id: projectId,
            period_label: c.periodLabel,
            owner_label: c.ownerLabel,
            items: c.items,
            accent: c.accent,
          }))
        )
      : Promise.resolve({ error: null }),
    extraction.measures.length
      ? supabase.from("project_baseline_measures").insert(
          extraction.measures.map((m) => ({
            project_id: projectId,
            measure_name: m.measureName,
            today_value: m.todayValue,
            after_value: m.afterValue,
            baselined_when: m.baselinedWhen,
          }))
        )
      : Promise.resolve({ error: null }),
  ]);
  const dbError = statsResult.error ?? decisionsResult.error ?? commitmentsResult.error ?? measuresResult.error;
  if (dbError) return { ok: false, message: `Read the file, but couldn't save the result: ${dbError.message}` };

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);

  const totalRows = extraction.stats.length + extraction.decisions.length + extraction.commitments.length + extraction.measures.length;
  if (totalRows === 0) {
    return { ok: true, message: "Read the file, but didn't find anything new to add. Check the file and enter the numbers by hand." };
  }
  return {
    ok: true,
    message: `Added ${extraction.stats.length} stat(s), ${extraction.decisions.length} decision(s), ${extraction.commitments.length} commitment card(s), ${extraction.measures.length} measure(s) -- unreviewed. Check each against the file, then mark it reviewed.`,
  };
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

/* =========================================================================
   TIMELINE (Gantt) — hand-curated, week-by-week, deck page 4.
   Every mutation here is the same tier as the rest of this file:
   requireMissionsLead(projectId). Editing a row's label or any of its
   cells resets that row's reviewed_at/reviewed_by, same reasoning as
   every other Checkpoint section.
   ========================================================================= */

export async function seedDefaultTimelineStatuses(projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { count } = await supabase
    .from("project_timeline_statuses")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  if (count && count > 0) return;

  const { error } = await supabase.from("project_timeline_statuses").insert(
    DEFAULT_TIMELINE_STATUSES.map((s, i) => ({
      project_id: projectId,
      label: s.label,
      color_hex: s.colorHex,
      style: s.style,
      sort_order: i,
    }))
  );
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

export async function saveTimelineSettings(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const weekCountRaw = requiredString(formData, "week_count");
  const weekCount = Math.max(1, Math.min(52, Number(weekCountRaw) || 10));
  const week1StartDate = optionalString(formData, "week1_start_date");

  const { error } = await supabase
    .from("project_timeline_settings")
    .upsert({ project_id: projectId, week_count: weekCount, week1_start_date: week1StartDate, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

export async function createTimelineStatus(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_timeline_statuses")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_timeline_statuses").insert({
    project_id: projectId,
    label: requiredString(formData, "label"),
    color_hex: requiredString(formData, "color_hex"),
    style: formData.get("style") === "outline" ? "outline" : "filled",
    sort_order: (existing?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

export async function updateTimelineStatus(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_timeline_statuses")
    .update({
      label: requiredString(formData, "label"),
      color_hex: requiredString(formData, "color_hex"),
      style: formData.get("style") === "outline" ? "outline" : "filled",
    })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

/** Cells pointing at this status are left in place with status_id set
 * null (the column's own "on delete set null") -- they read as blank
 * rather than silently disappearing as a row. */
export async function deleteTimelineStatus(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_timeline_statuses").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
}

export async function createTimelineRow(projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_timeline_rows")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("project_timeline_rows").insert({
    project_id: projectId,
    label: requiredString(formData, "label"),
    sort_order: (existing?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function updateTimelineRowLabel(id: string, projectId: string, projectRef: string, formData: FormData) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_timeline_rows")
    .update({ label: requiredString(formData, "label"), reviewed_at: null, reviewed_by: null })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function toggleTimelineRowVisible(id: string, projectId: string, projectRef: string, visible: boolean) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_timeline_rows").update({ visible }).eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function reviewTimelineRow(id: string, projectId: string, projectRef: string) {
  const person = await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_timeline_rows")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: person.id })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function deleteTimelineRow(id: string, projectId: string, projectRef: string) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  const { error } = await supabase.from("project_timeline_rows").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

/** One cell = one (row, week). statusId null clears it back to blank.
 * Setting a cell resets its row's reviewed_at -- the row's reviewed
 * state covers everything in it, including every week's colour. */
export async function setTimelineCell(
  rowId: string,
  projectId: string,
  projectRef: string,
  weekIndex: number,
  statusId: string | null
) {
  await requireMissionsLead(projectId);
  const supabase = await createClient();

  if (statusId) {
    const { error } = await supabase
      .from("project_timeline_cells")
      .upsert({ row_id: rowId, week_index: weekIndex, status_id: statusId, updated_at: new Date().toISOString() }, { onConflict: "row_id,week_index" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("project_timeline_cells").delete().eq("row_id", rowId).eq("week_index", weekIndex);
    if (error) throw new Error(error.message);
  }

  const { error: resetError } = await supabase
    .from("project_timeline_rows")
    .update({ reviewed_at: null, reviewed_by: null })
    .eq("id", rowId)
    .eq("project_id", projectId);
  if (resetError) throw new Error(resetError.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}
