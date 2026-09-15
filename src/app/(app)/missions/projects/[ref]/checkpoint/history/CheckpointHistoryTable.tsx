"use client";

import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList } from "@/components/ui/FilterablePagedList";
import type { CheckpointSnapshotRow } from "@/lib/data/checkpoint-history";
import { CheckpointSnapshotDetailButton } from "./CheckpointSnapshotDetailButton";
import { DuplicateCheckpointSnapshotButton } from "./DuplicateCheckpointSnapshotButton";

const COLS = "1fr 150px 120px 90px 190px";

/** ≤20 rows/page, newest first, filterable by week label or who
 * published it -- same standard as every other list in the app. Rows
 * arrive newest-first from listCheckpointSnapshots (published_at desc),
 * matching FilterablePagedList's own "never re-sorts" contract. */
export function CheckpointHistoryTable({
  snapshots,
  projectId,
  projectRef,
}: {
  snapshots: CheckpointSnapshotRow[];
  projectId: string;
  projectRef: string;
}) {
  return (
    <FilterablePagedList
      rows={snapshots}
      searchPlaceholder="Search by week or who published it..."
      searchMatch={(s, q) => s.weekLabel.toLowerCase().includes(q) || (s.publishedByName ?? "").toLowerCase().includes(q)}
      emptyTitle="No checkpoints archived yet."
      emptyDescription='Once a week is reviewed, use "Publish to history" on the Checkpoint data tab to freeze it here permanently.'
      itemNounSingular="ARCHIVED WEEK"
      itemNounPlural="ARCHIVED WEEKS"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>WEEK</span>
          <span>PUBLISHED</span>
          <span>BY</span>
          <span>ITEMS</span>
          <span></span>
        </TableHead>
      )}
      renderRow={(s, i, isLast) => (
        <TableRow cols={COLS} key={s.id} last={isLast}>
          <CheckpointSnapshotDetailButton snapshot={s}>
            <CellStack primary={s.weekLabel} secondary="VIEW ARCHIVED CONTENT" />
          </CheckpointSnapshotDetailButton>
          <span className="font-mono text-[9.5px] text-muted">{new Date(s.publishedAt).toLocaleDateString("en-SG")}</span>
          <span className="text-[11.5px] text-muted truncate">{s.publishedByName ?? "—"}</span>
          <span className="font-mono text-[9.5px] text-muted">{s.itemCount}</span>
          <DuplicateCheckpointSnapshotButton snapshotId={s.id} projectId={projectId} projectRef={projectRef} />
        </TableRow>
      )}
    />
  );
}
