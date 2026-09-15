"use client";

import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";
import type { ChangeRequestRow } from "@/lib/data/project";
import { DecideChangeRequestButtons } from "./DecideChangeRequestButtons";

const COLS = "66px 1fr 130px 108px 150px";

const STATUS_TONE: Record<string, "in_progress" | "waiting_on_client" | "done" | "idle"> = {
  draft: "idle",
  raised: "in_progress",
  awaiting_signature: "waiting_on_client",
  approved: "done",
  rejected: "idle",
};

const FILTERS: FilterPillDef<ChangeRequestRow>[] = [
  { key: "raised", label: "Raised", predicate: (c) => c.status === "raised" },
  { key: "awaiting_signature", label: "Awaiting signature", predicate: (c) => c.status === "awaiting_signature" },
  { key: "approved", label: "Approved", predicate: (c) => c.status === "approved" },
  { key: "rejected", label: "Rejected", predicate: (c) => c.status === "rejected" },
];

export function ChangeRequestsTable({ crs, projectId, projectRef }: { crs: ChangeRequestRow[]; projectId: string; projectRef: string }) {
  return (
    <FilterablePagedList
      rows={crs}
      searchPlaceholder="Search change requests by ref or title..."
      searchMatch={(c, q) => c.ref.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)}
      filters={FILTERS}
      emptyTitle="No change requests raised."
      emptyDescription="Scope is exactly as agreed in the current baseline. Anything outside that needs a CR before work starts."
      itemNounSingular="CHANGE REQUEST"
      itemNounPlural="CHANGE REQUESTS"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>REF</span>
          <span>REQUEST AND ORIGIN</span>
          <span>IMPACT</span>
          <span>STATUS</span>
          <span></span>
        </TableHead>
      )}
      renderRow={(c, i, isLast) => (
        <TableRow cols={COLS} key={c.id} last={isLast}>
          <span className="font-mono text-[9.5px] text-muted">{c.ref}</span>
          <CellStack primary={c.title} secondary={c.raisedFromRef ? `FROM ${c.raisedFromRef}` : c.description ?? undefined} />
          <span className="flex flex-col gap-0.5 font-mono text-[9.5px] text-muted">
            <span>{c.impactDatesDays != null ? `${c.impactDatesDays > 0 ? "+" : ""}${c.impactDatesDays}d` : "—"}</span>
            {c.impactEffort ? <span>{c.impactEffort}</span> : null}
            {c.impactPrice ? <span>{c.impactPrice}</span> : null}
          </span>
          <Pill tone={STATUS_TONE[c.status] ?? "idle"} className="justify-self-start">
            {c.status.replace(/_/g, " ").toUpperCase()}
          </Pill>
          {c.status === "raised" || c.status === "awaiting_signature" ? (
            <DecideChangeRequestButtons crId={c.id} projectId={projectId} projectRef={projectRef} />
          ) : (
            <span />
          )}
        </TableRow>
      )}
    />
  );
}
