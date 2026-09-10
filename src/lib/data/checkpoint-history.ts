import { createClient } from "@/lib/supabase/server";
import type { ProgressStatRow, DecisionRow, WeeklyCommitmentRow, BaselineMeasureRow } from "@/lib/data/project";

export interface CheckpointSnapshotData {
  stats: ProgressStatRow[];
  decisions: DecisionRow[];
  commitments: WeeklyCommitmentRow[];
  measures: BaselineMeasureRow[];
}

export interface CheckpointSnapshotRow {
  id: string;
  weekLabel: string;
  publishedAt: string;
  publishedByName: string | null;
  itemCount: number;
  data: CheckpointSnapshotData;
}

/** Every frozen Checkpoint archive entry for one project, newest first —
 * the history/archive table (see migration 0057). Each row is a
 * point-in-time copy; nothing here is ever updated or deleted once
 * written, so this is a plain read with no reviewed_at filtering of its
 * own (that filtering already happened once, at publish time). */
export async function listCheckpointSnapshots(projectId: string): Promise<CheckpointSnapshotRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_checkpoint_snapshots")
    .select("id, week_label, published_at, published_by, snapshot")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false });
  if (!data || data.length === 0) return [];

  const publisherIds = [...new Set(data.map((s) => s.published_by).filter((x): x is string => !!x))];
  const { data: people } = publisherIds.length
    ? await supabase.from("people").select("id, full_name").in("id", publisherIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return data.map((s) => {
    const snapshot = (s.snapshot as unknown as CheckpointSnapshotData) ?? { stats: [], decisions: [], commitments: [], measures: [] };
    return {
      id: s.id,
      weekLabel: s.week_label,
      publishedAt: s.published_at,
      publishedByName: s.published_by ? (nameById.get(s.published_by) ?? null) : null,
      itemCount: snapshot.stats.length + snapshot.decisions.length + snapshot.commitments.length + snapshot.measures.length,
      data: snapshot,
    };
  });
}

export async function getCheckpointSnapshot(snapshotId: string, projectId: string): Promise<CheckpointSnapshotRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_checkpoint_snapshots")
    .select("id, week_label, published_at, published_by, snapshot")
    .eq("id", snapshotId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!data) return null;

  let publishedByName: string | null = null;
  if (data.published_by) {
    const { data: person } = await supabase.from("people").select("full_name").eq("id", data.published_by).maybeSingle();
    publishedByName = person?.full_name ?? null;
  }

  const snapshot = (data.snapshot as unknown as CheckpointSnapshotData) ?? { stats: [], decisions: [], commitments: [], measures: [] };
  return {
    id: data.id,
    weekLabel: data.week_label,
    publishedAt: data.published_at,
    publishedByName,
    itemCount: snapshot.stats.length + snapshot.decisions.length + snapshot.commitments.length + snapshot.measures.length,
    data: snapshot,
  };
}
