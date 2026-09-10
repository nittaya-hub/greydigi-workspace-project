"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";

const COLS = "1fr 96px 1fr 100px";

export interface WorkspaceBaselineRow {
  id: string;
  version: string;
  status: string;
  varianceDays: number | null;
  approvedAt: string | null;
  approverName: string;
  projectRef: string | null;
  projectName: string | null;
}

const FILTERS: FilterPillDef<WorkspaceBaselineRow>[] = [
  { key: "approved", label: "Approved", predicate: (b) => b.status === "approved" },
  { key: "draft", label: "Draft", predicate: (b) => b.status === "draft" },
  { key: "superseded", label: "Superseded", predicate: (b) => b.status === "superseded" },
];

export function BaselinesWorkspaceTable({ baselines }: { baselines: WorkspaceBaselineRow[] }) {
  return (
    <FilterablePagedList
      rows={baselines}
      searchPlaceholder="Search baselines by project or version..."
      searchMatch={(b, q) =>
        b.version.toLowerCase().includes(q) ||
        (b.projectName?.toLowerCase().includes(q) ?? false) ||
        (b.projectRef?.toLowerCase().includes(q) ?? false)
      }
      filters={FILTERS}
      emptyTitle="No baselines yet."
      emptyDescription="A baseline is approved at G2, once scope and dates are agreed."
      itemNounSingular="BASELINE"
      itemNounPlural="BASELINES"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>PROJECT</span>
          <span>VER</span>
          <span>APPROVED AND SOURCE</span>
          <span>STATUS</span>
        </TableHead>
      )}
      renderRow={(b, i, isLast) => (
        <TableRow cols={COLS} key={b.id} last={isLast}>
          {b.projectRef ? (
            <Link href={`/delivery/projects/${b.projectRef.toLowerCase()}/baselines`} className="min-w-0">
              <CellStack primary={b.projectName ?? b.projectRef} secondary={b.projectRef} />
            </Link>
          ) : (
            <span className="text-muted">—</span>
          )}
          <span className="font-mono text-[9.5px] text-muted">{b.version}</span>
          <CellStack
            primary={b.approverName}
            secondary={
              b.approvedAt
                ? `Approved ${b.approvedAt}${b.varianceDays != null ? `, ${b.varianceDays > 0 ? "+" : ""}${b.varianceDays}d variance` : ""}`
                : "Not yet approved"
            }
          />
          <Pill tone={b.status === "approved" ? "done" : b.status === "superseded" ? "idle" : "in_progress"} className="justify-self-start">
            {b.status.toUpperCase()}
          </Pill>
        </TableRow>
      )}
    />
  );
}
