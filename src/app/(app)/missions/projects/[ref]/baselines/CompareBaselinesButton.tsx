"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";

export interface CompareBaselineRow {
  id: string;
  version: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  scopeSnapshot: unknown;
  datesSnapshot: unknown;
}

interface SnapshotTask {
  ref: string;
  title: string;
  status: string;
  is_critical_path: boolean;
}

function tasksOf(row: CompareBaselineRow): SnapshotTask[] {
  const scope = row.scopeSnapshot as { tasks?: SnapshotTask[] } | null;
  return scope?.tasks ?? [];
}

function goLiveOf(row: CompareBaselineRow): string | null {
  const dates = row.datesSnapshot as { go_live_target?: string | null } | null;
  return dates?.go_live_target ?? null;
}

function dayDelta(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000);
  if (days === 0) return "No change";
  return `${days > 0 ? "+" : ""}${days}d`;
}

/** A readable side-by-side of the oldest and newest baseline — the
 * aironauts flight plan's own tie-out certificate is described as "a
 * one-page certificate: metric, baseline, outcome" (page 6), never a
 * data dump. This used to be a raw JSON.stringify of the snapshot
 * column, which is what the underlying data looks like in the database,
 * not what a baseline comparison is supposed to read like. */
export function CompareBaselinesButton({ baselines }: { baselines: CompareBaselineRow[] }) {
  const [open, setOpen] = useState(false);
  if (baselines.length < 2) return null;

  const newest = baselines[0];
  const oldest = baselines[baselines.length - 1];
  const newestTasks = tasksOf(newest);
  const oldestTasks = tasksOf(oldest);
  const oldestByRef = new Map(oldestTasks.map((t) => [t.ref, t]));
  const newestByRef = new Map(newestTasks.map((t) => [t.ref, t]));
  const allRefs = [...new Set([...oldestTasks.map((t) => t.ref), ...newestTasks.map((t) => t.ref)])].sort();

  const newestGoLive = goLiveOf(newest);
  const oldestGoLive = goLiveOf(oldest);
  const delta = dayDelta(oldestGoLive, newestGoLive);

  return (
    <>
      <Button variant="secondary" className="flex-none" onClick={() => setOpen(true)}>
        Compare versions
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Compare ${oldest.version} → ${newest.version}`}>
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {[oldest, newest].map((b) => (
              <div key={b.id} className="border border-line rounded-[9px] p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-[13px] text-ink">{b.version}</span>
                  <Pill tone={b.status === "approved" ? "done" : b.status === "superseded" ? "idle" : "in_progress"}>
                    {b.status.toUpperCase()}
                  </Pill>
                </div>
                <span className="font-mono text-[9.5px] text-muted">
                  Created {b.createdAt.slice(0, 10)}
                  {b.approvedAt ? ` · Approved ${b.approvedAt.slice(0, 10)}` : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="border border-line rounded-[9px] p-3 flex flex-col gap-1.5">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted">GO-LIVE TARGET</span>
            <div className="flex items-center gap-2 text-[12.5px] text-ink">
              <span>{oldestGoLive ?? "—"}</span>
              <span className="text-muted">→</span>
              <span>{newestGoLive ?? "—"}</span>
              {delta ? <span className="font-mono text-[10.5px] text-coral-strong ml-1">{delta}</span> : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-[9px] tracking-[.08em] text-muted px-1">
              TASKS — {allRefs.length} TOTAL
            </span>
            <div className="border border-line rounded-[9px] overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_100px] gap-2 px-3 py-2 bg-canvas border-b border-line font-mono text-[9px] tracking-[.06em] text-muted">
                <span>TASK</span>
                <span>{oldest.version.toUpperCase()}</span>
                <span>{newest.version.toUpperCase()}</span>
              </div>
              {allRefs.map((ref, i) => {
                const before = oldestByRef.get(ref);
                const after = newestByRef.get(ref);
                const added = !before && after;
                const removed = before && !after;
                const changed = before && after && before.status !== after.status;
                return (
                  <div
                    key={ref}
                    className={`grid grid-cols-[1fr_100px_100px] gap-2 px-3 py-2 text-[11.5px] ${
                      i < allRefs.length - 1 ? "border-b border-line-soft" : ""
                    } ${added || removed || changed ? "bg-coral-tint" : ""}`}
                  >
                    <span className="truncate text-ink">{(after ?? before)?.title ?? ref}</span>
                    <span className="font-mono text-[10px] text-muted">{before ? before.status.replace(/_/g, " ") : "—"}</span>
                    <span className="font-mono text-[10px] text-muted">{after ? after.status.replace(/_/g, " ") : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
