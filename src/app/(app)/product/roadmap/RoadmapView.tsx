"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

export interface RoadmapColumn {
  label: string;
  releaseCode: string | null;
  items: { ref: string; title: string; note: string | null }[];
}

export interface TimelineItem {
  ref: string;
  title: string;
  columnLabel: string;
  /** ISO date used to position the item on the axis — a release's target_date,
   * or null when the item is unscheduled forecast work (quarter only). */
  targetDate: string | null;
  quarter: string | null;
}

function timeSortKey(it: TimelineItem): number {
  if (it.targetDate) return new Date(it.targetDate).getTime();
  // Unscheduled forecast items sort after every dated item, ordered by
  // their quarter label so "later" reads left-to-right too.
  return Number.MAX_SAFE_INTEGER - (it.quarter ? it.quarter.localeCompare("") : 0);
}

export function RoadmapView({
  heading,
  columns,
  timelineItems,
}: {
  heading: ReactNode;
  columns: RoadmapColumn[];
  timelineItems: TimelineItem[];
}) {
  const [view, setView] = useState<"list" | "timeline">("list");

  const dated = timelineItems.filter((it) => it.targetDate);
  const undated = timelineItems.filter((it) => !it.targetDate);
  const times = dated.map((it) => new Date(it.targetDate as string).getTime());
  const minT = times.length ? Math.min(...times) : 0;
  const maxT = times.length ? Math.max(...times) : 0;
  const span = maxT - minT || 1;

  const sorted = [...timelineItems].sort((a, b) => timeSortKey(a) - timeSortKey(b));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        {heading}
        <Button variant="secondary" className="flex-none" onClick={() => setView((v) => (v === "list" ? "timeline" : "list"))}>
          {view === "list" ? "Timeline view" : "List view"}
        </Button>
      </div>

      {view === "list" ? (
        columns.length === 0 ? (
          <Card className="p-10 text-center">
            <span className="text-[12.5px] text-muted">No roadmap items yet.</span>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {columns.map((col) => (
              <Card key={col.label}>
                <CardHeader title={col.label} note={String(col.items.length)} />
                <div className="px-3.5 py-3 flex flex-col gap-2.5">
                  {col.items.map((it) => (
                    <Link key={it.ref} href={`/product/features/${it.ref.toLowerCase()}`} className="flex flex-col gap-0.5">
                      <span className="text-[12.5px] font-semibold text-ink">{it.title}</span>
                      {it.note ? <span className="font-mono text-[9.5px] text-block-fg">{it.note}</span> : null}
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : timelineItems.length === 0 ? (
        <Card className="p-10 text-center">
          <span className="text-[12.5px] text-muted">No roadmap items yet.</span>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex flex-col gap-4">
            {dated.length > 0 ? (
              <div className="relative h-[64px]">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-line" />
                {dated.map((it) => {
                  const t = new Date(it.targetDate as string).getTime();
                  const pct = ((t - minT) / span) * 100;
                  return (
                    <Link
                      key={it.ref}
                      href={`/product/features/${it.ref.toLowerCase()}`}
                      className="absolute -translate-x-1/2 flex flex-col items-center gap-1 top-0 group"
                      style={{ left: `${pct}%` }}
                    >
                      <span className="text-[9px] font-mono text-muted whitespace-nowrap group-hover:text-ink">{it.title}</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-coral border-2 border-white shadow" />
                      <span className="text-[9px] font-mono text-muted-2 whitespace-nowrap">{new Date(it.targetDate as string).toLocaleDateString()}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <span className="text-[11.5px] text-muted">No dated items yet — everything below is forecast.</span>
            )}

            {undated.length > 0 ? (
              <div className="pt-3 border-t border-line-soft flex flex-col gap-2">
                <span className="font-mono text-[9px] tracking-[.09em] text-muted">FORECAST, NO TARGET DATE</span>
                <div className="flex flex-wrap gap-2">
                  {undated.map((it) => (
                    <Link
                      key={it.ref}
                      href={`/product/features/${it.ref.toLowerCase()}`}
                      className="text-[11.5px] px-2.5 py-1.5 rounded-[7px] border border-line bg-canvas text-ink"
                    >
                      {it.title}
                      {it.quarter ? <span className="font-mono text-[9px] text-muted"> · {it.quarter.toUpperCase()}</span> : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-line-soft flex flex-col gap-1.5">
              {sorted.map((it) => (
                <div key={it.ref} className="flex items-center gap-2.5 text-[11.5px]">
                  <span className="font-mono text-[9px] text-muted w-[110px] flex-none truncate">{it.columnLabel}</span>
                  <span className="flex-1 truncate">{it.title}</span>
                  <span className="font-mono text-[9px] text-muted-2 flex-none">
                    {it.targetDate ? new Date(it.targetDate).toLocaleDateString() : it.quarter ? it.quarter.toUpperCase() : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
