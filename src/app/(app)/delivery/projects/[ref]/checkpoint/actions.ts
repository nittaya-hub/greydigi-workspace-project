"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import {
  getProjectProgressStats,
  getProjectDecisions,
  getProjectWeeklyCommitments,
  getProjectBaselineMeasures,
} from "@/lib/data/project";
import type { Json } from "@/lib/supabase/database.types";

function basePath(projectRef: string) {
  return `/delivery/projects/${projectRef.toLowerCase()}`;
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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

export async function deleteProgressStat(id: string, projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();

  const { error } = await supabase.from("project_progress_stats").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function createDecision(projectId: string, projectRef: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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

export async function deleteDecision(id: string, projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();

  const { error } = await supabase.from("project_decisions").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function createCommitment(projectId: string, projectRef: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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

export async function deleteCommitment(id: string, projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();

  const { error } = await supabase.from("project_weekly_commitments").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

export async function createBaselineMeasure(projectId: string, projectRef: string, formData: FormData) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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

export async function deleteBaselineMeasure(id: string, projectId: string, projectRef: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
  const supabase = await createClient();

  const { error } = await supabase.from("project_baseline_measures").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  revalidatePath(`${basePath(projectRef)}/checkpoint`);
  revalidatePath(`${basePath(projectRef)}/client-view-config`);
}

/** Freezes today's REVIEWED checkpoint data (same reviewed_at is not
 * null filter as fn_client_portal_project / fn_publish_client_view) into
 * a permanent history row -- see migration 0057. There's no update or
 * delete path for this table anywhere in the app on purpose: once this
 * insert lands, nothing can change it again. */
export async function publishCheckpointToHistory(projectId: string, projectRef: string, weekLabel: string) {
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
  const person = await getCurrentPerson();
  if (!person) throw new Error("Not signed in.");
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
