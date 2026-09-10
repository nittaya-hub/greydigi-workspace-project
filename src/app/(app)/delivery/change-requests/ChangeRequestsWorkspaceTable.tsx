"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";

const COLS = "72px 1fr 1fr 76px 108px";

const STATUS_TONE: Record<string, "in_progress" | "waiting_on_client" | "done" | "idle"> = {
  draft: "idle",
  raised: "in_progress",
  awaiting_signature: "waiting_on_client",
  approved: "done",
  rejected: "idle",
};

export interface WorkspaceChangeRequestRow {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  impact_dates_days: number | null;
  status: string;
  raised_from_ref: string | null;
  projectRef: string | null;
}

const FILTERS: FilterPillDef<WorkspaceChangeRequestRow>[] = [
  { key: "open", label: "Open", predicate: (c) => c.status !== "approved" && c.status !== "rejected" },
  { key: "approved", label: "Approved", predicate: (c) => c.status === "approved" },
  { key: "rejected", label: "Rejected", predicate: (c) => c.status === "rejected" },
];

export function ChangeRequestsWorkspaceTable({ crs }: { crs: WorkspaceChangeRequestRow[] }) {
  return (
    <FilterablePagedList
      rows={crs}
      searchPlaceholder="Search change requests by ref, title or project..."
      searchMatch={(c, q) =>
        c.ref.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.projectRef?.toLowerCase().includes(q) ?? false)
      }
      filters={FILTERS}
      emptyTitle="No change requests raised."
      emptyDescription="Scope moves only through a signed change request."
      itemNounSingular="CHANGE REQUEST"
      itemNounPlural="CHANGE REQUESTS"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>REF</span>
          <span>PROJECT</span>
          <span>REQUEST AND ORIGIN</span>
          <span>IMPACT</span>
          <span>STATUS</span>
        </TableHead>
      )}
      renderRow={(c, i, isLast) => (
        <TableRow cols={COLS} key={c.id} last={isLast}>
          <span className="font-mono text-[9.5px] text-muted">{c.ref}</span>
          {c.projectRef ? (
            <Link href={`/delivery/projects/${c.projectRef.toLowerCase()}/change-requests`} className="text-[12.5px] text-ink truncate">
              {c.projectRef}
            </Link>
          ) : (
            <span className="text-muted">—</span>
          )}
          <CellStack primary={c.title} secondary={c.raised_from_ref ? `FROM ${c.raised_from_ref}` : c.description ?? undefined} />
          <span className="font-mono text-[9.5px] text-muted">
            {c.impact_dates_days != null ? `${c.impact_dates_days > 0 ? "+" : ""}${c.impact_dates_days}d` : "—"}
          </span>
          <Pill tone={STATUS_TONE[c.status] ?? "idle"} className="justify-self-start">
            {c.status.replace(/_/g, " ").toUpperCase()}
          </Pill>
        </TableRow>
      )}
    />
  );
}
