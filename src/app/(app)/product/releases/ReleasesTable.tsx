"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";
import type { ReleaseRow } from "@/lib/data/product";

const COLS = "1fr 1fr 96px 90px 96px";

const STATUS_TONE: Record<string, "idle" | "in_progress" | "done" | "waiting_on_client"> = {
  planning: "idle",
  in_progress: "in_progress",
  ready: "waiting_on_client",
  shipped: "done",
};

const FILTERS: FilterPillDef<ReleaseRow>[] = [
  { key: "in_progress", label: "In progress", predicate: (r) => r.status === "in_progress" },
  { key: "ready", label: "Ready", predicate: (r) => r.status === "ready" },
  { key: "shipped", label: "Shipped", predicate: (r) => r.status === "shipped" },
  { key: "planning", label: "Planning", predicate: (r) => r.status === "planning" },
];

/** Rows keep listReleases' own soonest-target-first order rather than
 * being forced to newest-created-first -- for a release roadmap, "what
 * ships next" is the useful default, the same reasoning that keeps
 * Hypercare's incidents/requests pages sorted by breach time/age
 * instead of creation date. */
export function ReleasesTable({ releases }: { releases: ReleaseRow[] }) {
  return (
    <FilterablePagedList
      rows={releases}
      searchPlaceholder="Search releases by name, code or product..."
      searchMatch={(r, q) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q)}
      filters={FILTERS}
      emptyTitle="No releases yet."
      emptyDescription="A release ships a set of features together once its criteria are met."
      itemNounSingular="RELEASE"
      itemNounPlural="RELEASES"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>RELEASE</span>
          <span>PRODUCT</span>
          <span>TARGET</span>
          <span>READY</span>
          <span>STATUS</span>
        </TableHead>
      )}
      renderRow={(r, i, isLast) => (
        <TableRow cols={COLS} key={r.code} last={isLast}>
          <Link href={`/product/releases/${r.code.toLowerCase()}`} className="min-w-0">
            <CellStack primary={r.name} secondary={r.code.toUpperCase()} />
          </Link>
          <span className="text-muted truncate">{r.productName}</span>
          <span className="font-mono text-[9.5px] text-muted">{r.targetDate ?? "—"}</span>
          <span className="font-mono text-[9.5px] text-muted">{r.readinessPct}%</span>
          <Pill tone={STATUS_TONE[r.status] ?? "idle"} className="justify-self-start">
            {r.status.replace(/_/g, " ").toUpperCase()}
          </Pill>
        </TableRow>
      )}
    />
  );
}
