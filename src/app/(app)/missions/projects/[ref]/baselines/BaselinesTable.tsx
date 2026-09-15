"use client";

import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";
import type { BaselineRow } from "@/lib/data/project";
import { ApproveBaselineButton } from "./ApproveBaselineButton";

const COLS = "52px 1fr 96px 96px";

const FILTERS: FilterPillDef<BaselineRow>[] = [
  { key: "approved", label: "Approved", predicate: (b) => b.status === "approved" },
  { key: "draft", label: "Draft", predicate: (b) => b.status === "draft" },
  { key: "superseded", label: "Superseded", predicate: (b) => b.status === "superseded" },
];

export function BaselinesTable({ baselines, projectId, projectRef }: { baselines: BaselineRow[]; projectId: string; projectRef: string }) {
  return (
    <FilterablePagedList
      rows={baselines}
      searchPlaceholder="Search baselines by version or approver..."
      searchMatch={(b, q) => b.version.toLowerCase().includes(q) || b.approvedByName.toLowerCase().includes(q)}
      filters={FILTERS}
      emptyTitle="No approved baseline yet."
      emptyDescription="Scope moves only through a change request. Approve a baseline at G2 to start tracking variance."
      itemNounSingular="BASELINE"
      itemNounPlural="BASELINES"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>VER</span>
          <span>APPROVED AND SOURCE</span>
          <span>STATUS</span>
          <span></span>
        </TableHead>
      )}
      renderRow={(b, i, isLast) => (
        <TableRow cols={COLS} key={b.id} last={isLast}>
          <span className="font-mono text-[9.5px] text-muted">{b.version}</span>
          <CellStack primary={b.approvedByName} secondary={b.approvedAt ?? "Not yet approved"} />
          <Pill tone={b.status === "approved" ? "done" : b.status === "superseded" ? "idle" : "in_progress"} className="justify-self-start">
            {b.status.toUpperCase()}
          </Pill>
          {b.status === "draft" ? <ApproveBaselineButton baselineId={b.id} projectId={projectId} projectRef={projectRef} /> : <span />}
        </TableRow>
      )}
    />
  );
}
