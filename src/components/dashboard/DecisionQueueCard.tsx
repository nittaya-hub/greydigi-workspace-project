"use client";

import { useState } from "react";
import Link from "next/link";
import { CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import type { DecisionQueueItem } from "@/lib/data/workspace";

const QUEUE_COLS = "84px 1fr 130px 90px";
const VISIBLE_DEFAULT = 5;

const SPACE_PILL: Record<string, { bg: string; fg: string }> = {
  delivery: { bg: "bg-coral-tint", fg: "text-coral-strong" },
  hypercare: { bg: "bg-block-bg", fg: "text-block-fg" },
  product: { bg: "bg-neutral-bg", fg: "text-ink" },
  cross: { bg: "bg-idle-bg", fg: "text-muted" },
};

/** The 5 longest-waiting items across all three spaces, oldest first —
 * getWorkspaceOverview already merges and sorts held gates, incidents
 * and untriaged submissions by real wait time instead of "whichever 3
 * came back from each source's own query," so this scales the same way
 * whether the workspace has one client or fifty. "View more" reveals
 * the rest of what was fetched (up to 20) without a page reload; every
 * row still links straight to where it needs to be actioned. */
export function DecisionQueueCard({ items }: { items: DecisionQueueItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_DEFAULT);
  const hasMore = items.length > VISIBLE_DEFAULT;

  return (
    <>
      <CardHeader title="Needs a decision" note="ONE QUEUE, ALL THREE SPACES" />
      {items.length === 0 ? (
        <div className="py-10 px-4 text-center text-[12.5px] text-muted">Nothing waiting on a decision.</div>
      ) : (
        <>
          <TableHead cols={QUEUE_COLS}>
            <span>SPACE</span>
            <span>WHAT IS WAITING</span>
            <span>ON</span>
            <span>AGE</span>
          </TableHead>
          {visible.map((item, i) => {
            const tone = SPACE_PILL[item.space];
            return (
              <TableRow cols={QUEUE_COLS} key={i} last={i === visible.length - 1 && !hasMore}>
                <Pill className={`${tone.bg} ${tone.fg} justify-self-start`}>{item.space.toUpperCase()}</Pill>
                <Link href={item.href} className="min-w-0 hover:underline">
                  <CellStack primary={item.what} secondary={item.detail} />
                </Link>
                <span className="text-muted truncate">{item.on}</span>
                <span
                  className={`font-mono text-[10px] ${
                    item.ageTone === "block" ? "text-block-fg" : item.ageTone === "warn" ? "text-warn-fg" : "text-muted"
                  }`}
                >
                  {item.age}
                </span>
              </TableRow>
            );
          })}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full px-4 py-[11px] text-center text-[11.5px] font-semibold text-coral hover:bg-canvas"
            >
              {expanded ? "Show fewer" : `View more (${items.length - VISIBLE_DEFAULT} more)`}
            </button>
          ) : null}
        </>
      )}
    </>
  );
}
