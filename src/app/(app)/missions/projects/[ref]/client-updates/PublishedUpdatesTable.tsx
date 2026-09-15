"use client";

import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow } from "@/components/ui/Table";
import { FilterablePagedList } from "@/components/ui/FilterablePagedList";
import type { ClientUpdateRow } from "@/lib/data/project";

const COLS = "82px 1fr 96px";

export function PublishedUpdatesTable({ updates }: { updates: ClientUpdateRow[] }) {
  return (
    <FilterablePagedList
      rows={updates}
      searchPlaceholder="Search published updates by title..."
      searchMatch={(u, q) => u.title.toLowerCase().includes(q) || u.body.toLowerCase().includes(q)}
      emptyTitle="No updates published yet."
      emptyDescription="Published updates appear here and in the client portal."
      itemNounSingular="UPDATE"
      itemNounPlural="UPDATES"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>DATE</span>
          <span>UPDATE</span>
          <span>STATUS</span>
        </TableHead>
      )}
      renderRow={(u, i, isLast) => (
        <TableRow cols={COLS} key={u.id} last={isLast}>
          <span className="font-mono text-[9.5px] text-muted">{u.publishedAt?.slice(0, 10) ?? "—"}</span>
          <span className="text-[12.5px] font-semibold text-ink truncate">{u.title}</span>
          <Pill tone="done" className="justify-self-start">
            PUBLISHED
          </Pill>
        </TableRow>
      )}
    />
  );
}
